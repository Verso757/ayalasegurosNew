import Fastify from 'fastify'
import cors from '@fastify/cors'
import { CatalogType, ClientType, DocumentStatus, IncidentStatus, QuoteStatus, RequestStatus } from '@prisma/client'
import { db } from './db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = Fastify({ logger: true })
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET es obligatorio')

type AuthUser = { id: string; role: 'AGENT' | 'CONTROL' | 'ADMIN'; name: string; email: string; ramos: string[] }
declare module 'fastify' {
  interface FastifyRequest { user: AuthUser }
}
app.decorateRequest('user')

await app.register(cors, { origin: true })

app.get('/health', async () => ({
  status: 'ok',
  service: 'nexo-seguros-api',
  timestamp: new Date().toISOString(),
}))

app.post<{ Body: { email?: string; password?: string } }>('/api/auth/login', async (request, reply) => {
  const email = request.body.email?.trim().toLowerCase()
  const password = request.body.password
  if (!email || !password) return reply.code(400).send({ error: 'Correo y contraseña son obligatorios' })
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return reply.code(401).send({ error: 'Credenciales inválidas' })
  }
  const ramos = user.role === 'AGENT'
    ? (await db.userRamo.findMany({ where: { userId: user.id, active: true }, orderBy: { ramo: 'asc' } })).map(item => item.ramo)
    : []
  const safeUser: AuthUser = { id: user.id, role: user.role, name: user.name, email: user.email, ramos }
  const token = jwt.sign(safeUser, jwtSecret, { expiresIn: '8h' })
  return { token, user: safeUser }
})

app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return reply.code(401).send({ error: 'Autenticación requerida' })
  try {
    request.user = jwt.verify(header.slice(7), jwtSecret) as AuthUser
  } catch {
    return reply.code(401).send({ error: 'Sesión inválida o expirada' })
  }
})

app.decorate('authorize', (roles: AuthUser['role'][]) => async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  if (!roles.includes(request.user.role)) return reply.code(403).send({ error: 'No tienes permisos para esta operación' })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<unknown>
    authorize: (roles: AuthUser['role'][]) => (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<unknown>
  }
}

type ClientBody = {
  name?: string
  type?: 'Persona física' | 'Persona moral'
  rfc?: string
  email?: string
}

type QuoteBody = {
  clientId?: string
  ramo?: string
  product?: string
  detail?: string
  location?: string
  insuredSum?: number
}

async function validRamos(ramos: unknown): Promise<boolean> {
  if (!Array.isArray(ramos) || ramos.length === 0 || ramos.some(ramo => typeof ramo !== 'string')) return false
  const active = await db.catalogItem.findMany({ where: { type: CatalogType.RAMO, active: true, name: { in: ramos as string[] } } })
  return new Set(active.map(item => item.name)).size === new Set(ramos).size
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} es obligatorio`)
  }
  return value.trim()
}

function clientType(value: ClientBody['type']): ClientType {
  return value === 'Persona moral' ? ClientType.PERSONA_MORAL : ClientType.PERSONA_FISICA
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) { cells.push(cell.trim()); cell = '' } else cell += character
  }
  cells.push(cell.trim())
  return cells
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) throw new Error('El CSV debe incluir encabezados y al menos una fila')
  const headers = parseCsvLine(lines[0]).map(header => header.toLowerCase())
  const required = ['folio', 'cliente', 'ramo']
  if (required.some(header => !headers.includes(header))) throw new Error('El CSV requiere las columnas folio, cliente y ramo')
  return lines.slice(1).map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])))
}

app.get('/api/auth/me', { onRequest: [app.authenticate] }, async request => {
  if (request.user.role !== 'AGENT') return request.user
  const ramos = await db.userRamo.findMany({ where: { userId: request.user.id, active: true }, orderBy: { ramo: 'asc' } })
  return { ...request.user, ramos: ramos.map(item => item.ramo) }
})

app.get('/api/catalogs', { onRequest: [app.authenticate] }, async () => {
  const items = await db.catalogItem.findMany({ where: { active: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] })
  return items
})

app.get('/api/document-requirements', { onRequest: [app.authenticate] }, async () => db.documentRequirement.findMany({
  orderBy: [{ ramo: 'asc' }, { clientType: 'asc' }, { name: 'asc' }],
}))

app.post<{ Body: { ramo?: string; clientType?: ClientType; name?: string; required?: boolean } }>('/api/document-requirements', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const ramo = request.body.ramo?.trim()
  const name = request.body.name?.trim()
  if (!ramo || !name || !request.body.clientType || !Object.values(ClientType).includes(request.body.clientType)) {
    return reply.code(400).send({ error: 'Ramo, tipo de cliente y nombre son obligatorios' })
  }
  const activeRamo = await db.catalogItem.findFirst({ where: { type: CatalogType.RAMO, name: ramo, active: true } })
  if (!activeRamo) return reply.code(400).send({ error: 'El ramo no está activo en el catálogo' })
  try {
    return reply.code(201).send(await db.documentRequirement.create({
      data: { ramo, clientType: request.body.clientType, name, required: request.body.required !== false },
    }))
  } catch {
    return reply.code(409).send({ error: 'Ese requisito ya existe para el ramo y tipo de cliente' })
  }
})

app.patch<{ Params: { id: string }; Body: { active?: boolean; required?: boolean } }>('/api/document-requirements/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  if (typeof request.body.active !== 'boolean' && typeof request.body.required !== 'boolean') return reply.code(400).send({ error: 'Debes indicar un cambio válido' })
  const requirement = await db.documentRequirement.findUnique({ where: { id: request.params.id } })
  if (!requirement) return reply.code(404).send({ error: 'Requisito documental no encontrado' })
  return db.documentRequirement.update({
    where: { id: requirement.id },
    data: {
      active: request.body.active,
      required: request.body.required,
    },
  })
})

app.post<{ Body: { type?: CatalogType; name?: string; ramo?: string } }>('/api/catalogs', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const { type, name, ramo } = request.body
  if (!type || !Object.values(CatalogType).includes(type) || !name?.trim()) return reply.code(400).send({ error: 'Tipo y nombre son obligatorios' })
  if (type === CatalogType.PRODUCTO && !ramo?.trim()) return reply.code(400).send({ error: 'El producto requiere un ramo' })
  try {
    return reply.code(201).send(await db.catalogItem.create({ data: { type, name: name.trim(), ramo: type === CatalogType.PRODUCTO ? ramo?.trim() : '' } }))
  } catch {
    return reply.code(409).send({ error: 'Ese elemento ya existe en el catálogo' })
  }
})

app.patch<{ Params: { id: string }; Body: { active?: boolean; name?: string } }>('/api/catalogs/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  if (typeof request.body.active !== 'boolean') return reply.code(400).send({ error: 'El estado activo es obligatorio' })
  const item = await db.catalogItem.findUnique({ where: { id: request.params.id } })
  if (!item) return reply.code(404).send({ error: 'Elemento de catálogo no encontrado' })
  return db.catalogItem.update({ where: { id: item.id }, data: { active: request.body.active, name: request.body.name?.trim() || undefined } })
})

app.get('/api/users', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async () => {
  const users = await db.user.findMany({
    where: { role: 'AGENT' },
    include: { ramos: { orderBy: { ramo: 'asc' } } },
    orderBy: { name: 'asc' },
  })
  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    ramos: user.ramos.map(ramo => ({ ramo: ramo.ramo, active: ramo.active })),
  }))
})

app.post<{ Body: { name?: string; email?: string; password?: string; ramos?: string[] } }>('/api/users', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const name = request.body.name?.trim()
  const email = request.body.email?.trim().toLowerCase()
  const password = request.body.password
  const ramos = request.body.ramos
  if (!name || !email || !password || password.length < 8) {
    return reply.code(400).send({ error: 'Nombre, correo y una contraseña de al menos 8 caracteres son obligatorios' })
  }
  if (!await validRamos(ramos)) {
    return reply.code(400).send({ error: 'Selecciona al menos un ramo válido' })
  }
  if (await db.user.findUnique({ where: { email } })) return reply.code(409).send({ error: 'El correo ya está registrado' })
  const agent = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'AGENT',
      ramos: { create: [...new Set(ramos)].map(ramo => ({ ramo })) },
    },
    include: { ramos: true },
  })
  return reply.code(201).send({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    active: agent.active,
    ramos: agent.ramos.map(ramo => ({ ramo: ramo.ramo, active: ramo.active })),
  })
})

app.patch<{ Params: { id: string }; Body: { name?: string; email?: string; active?: boolean } }>('/api/users/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const existing = await db.user.findUnique({ where: { id: request.params.id } })
  if (!existing || existing.role !== 'AGENT') return reply.code(404).send({ error: 'Agente no encontrado' })
  const name = request.body.name?.trim()
  const email = request.body.email?.trim().toLowerCase()
  if (!name || !email || typeof request.body.active !== 'boolean') {
    return reply.code(400).send({ error: 'Nombre, correo y estado son obligatorios' })
  }
  const duplicate = await db.user.findFirst({ where: { email, id: { not: existing.id } } })
  if (duplicate) return reply.code(409).send({ error: 'El correo ya está registrado' })
  return db.user.update({
    where: { id: existing.id },
    data: { name, email, active: request.body.active },
    select: { id: true, name: true, email: true, active: true },
  })
})

app.patch<{ Params: { id: string }; Body: { ramos?: string[] } }>('/api/users/:id/ramos', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const ramos = request.body.ramos
  if (!await validRamos(ramos)) {
    return reply.code(400).send({ error: 'La lista de ramos no es válida' })
  }
  const agent = await db.user.findUnique({ where: { id: request.params.id } })
  if (!agent || agent.role !== 'AGENT') return reply.code(404).send({ error: 'Agente no encontrado' })
  await db.$transaction(async transaction => {
    await transaction.userRamo.updateMany({ where: { userId: agent.id }, data: { active: false } })
    for (const ramo of [...new Set(ramos)]) {
      await transaction.userRamo.upsert({
        where: { userId_ramo: { userId: agent.id, ramo } },
        update: { active: true },
        create: { userId: agent.id, ramo, active: true },
      })
    }
  })
  return { id: agent.id, ramos: [...new Set(ramos)] }
})

app.get('/api/clients', { onRequest: [app.authenticate] }, async () => db.client.findMany({ orderBy: { createdAt: 'desc' } }))

app.get('/api/historical-policies', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async () => db.historicalPolicy.findMany({ include: { client: true }, orderBy: { createdAt: 'desc' } }))

app.post<{ Body: { csv?: string } }>('/api/historical-policies/import', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  try {
    const rows = parseCsv(request.body.csv || '')
    const result = await db.$transaction(async transaction => {
      let imported = 0
      for (const row of rows) {
        const folio = row.folio?.trim()
        const name = row.cliente?.trim()
        const ramo = row.ramo?.trim()
        if (!folio || !name || !ramo) throw new Error('Cada fila debe tener folio, cliente y ramo')
        const existing = await transaction.client.findFirst({ where: row.rfc ? { rfc: row.rfc.trim() } : { name } })
        const client = existing || await transaction.client.create({
          data: {
            folio: `CLI-${String(285 + await transaction.client.count()).padStart(6, '0')}`,
            name,
            type: row.tipocliente?.toLowerCase().includes('moral') ? ClientType.PERSONA_MORAL : ClientType.PERSONA_FISICA,
            rfc: row.rfc?.trim() || null,
            email: row.email?.trim() || null,
          },
        })
        await transaction.historicalPolicy.upsert({
          where: { folio },
          update: { policyNumber: row.poliza || null, ramo, status: row.estatus || null, startDate: row.fechainicio || null, endDate: row.fechafin || null, clientId: client.id },
          create: { folio, policyNumber: row.poliza || null, ramo, status: row.estatus || null, startDate: row.fechainicio || null, endDate: row.fechafin || null, clientId: client.id },
        })
        imported += 1
      }
      return imported
    })
    return { imported: result }
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : 'No se pudo importar el CSV' })
  }
})

app.post<{ Body: ClientBody }>('/api/clients', { onRequest: [app.authenticate] }, async (request, reply) => {
  try {
    const name = requiredText(request.body.name, 'name')
    const type = request.body.type
    if (type !== 'Persona física' && type !== 'Persona moral') {
      return reply.code(400).send({ error: 'type debe ser Persona física o Persona moral' })
    }
    const count = await db.client.count()
    const client = await db.client.create({
      data: {
        folio: `CLI-${String(285 + count).padStart(6, '0')}`,
        name,
        type: clientType(type),
        rfc: request.body.rfc?.trim() || null,
        email: request.body.email?.trim() || null,
      },
    })
    return reply.code(201).send(client)
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : 'No se pudo crear el cliente' })
  }
})

app.get('/api/quotes', { onRequest: [app.authenticate] }, async () => db.quote.findMany({ include: { client: true, request: true }, orderBy: { createdAt: 'desc' } }))

app.post<{ Body: QuoteBody }>('/api/quotes', { onRequest: [app.authenticate] }, async (request, reply) => {
  try {
    const ramo = requiredText(request.body.ramo, 'ramo')
    const activeRamo = await db.catalogItem.findFirst({ where: { type: CatalogType.RAMO, name: ramo, active: true } })
    if (!activeRamo) return reply.code(400).send({ error: 'El ramo no está activo en el catálogo' })
    if (request.user.role === 'AGENT') {
      const authorized = await db.userRamo.findUnique({
        where: { userId_ramo: { userId: request.user.id, ramo } },
      })
      if (!authorized?.active) return reply.code(403).send({ error: 'No tienes autorizado este ramo' })
    }
    const count = await db.quote.count()
    if (request.body.clientId) {
      const client = await db.client.findUnique({ where: { id: request.body.clientId } })
      if (!client) return reply.code(400).send({ error: 'El cliente no existe' })
    }
    if (request.body.product) {
      const activeProduct = await db.catalogItem.findFirst({ where: { type: CatalogType.PRODUCTO, name: request.body.product.trim(), ramo, active: true } })
      if (!activeProduct) return reply.code(400).send({ error: 'El producto no está activo para el ramo seleccionado' })
    }
    const quote = await db.quote.create({
      data: {
        folio: `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        ramo,
        product: request.body.product?.trim() || null,
        detail: request.body.detail?.trim() || null,
        location: request.body.location?.trim() || null,
        insuredSum: typeof request.body.insuredSum === 'number' ? request.body.insuredSum : null,
        status: QuoteStatus.BORRADOR,
        clientId: request.body.clientId || null,
      },
      include: { client: true },
    })
    return reply.code(201).send(quote)
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : 'No se pudo crear la cotización' })
  }
})

app.post<{ Params: { id: string } }>('/api/quotes/:id/convert', { onRequest: [app.authenticate] }, async (request, reply) => {
  const quote = await db.quote.findUnique({ where: { id: request.params.id }, include: { request: true } })
  if (!quote) return reply.code(404).send({ error: 'Cotización no encontrada' })
  if (quote.request || quote.status === QuoteStatus.CONVERTIDA) return reply.code(409).send({ error: 'La cotización ya fue convertida' })
  const requestCount = await db.request.count()
  const result = await db.$transaction(async transaction => {
    const createdRequest = await transaction.request.create({
      data: {
        folio: `SOL-${new Date().getFullYear()}-${String(requestCount + 1).padStart(4, '0')}`,
        type: quote.ramo,
        amount: quote.insuredSum,
        status: RequestStatus.EN_REVISION,
        clientId: quote.clientId,
        quoteId: quote.id,
      },
    })
    const clientType = quote.clientId
      ? (await transaction.client.findUnique({ where: { id: quote.clientId }, select: { type: true } }))?.type || ClientType.PERSONA_FISICA
      : ClientType.PERSONA_FISICA
    const requirements = await transaction.documentRequirement.findMany({ where: { ramo: quote.ramo, clientType, active: true, required: true } })
    await Promise.all(requirements.map(requirement => transaction.requestDocument.create({
      data: { requestId: createdRequest.id, requirementId: requirement.id },
    })))
    await transaction.quote.update({ where: { id: quote.id }, data: { status: QuoteStatus.CONVERTIDA } })
    return createdRequest
  })
  return reply.code(201).send(result)
})

app.get('/api/requests', { onRequest: [app.authenticate] }, async () => db.request.findMany({ include: { client: true, quote: true }, orderBy: { createdAt: 'desc' } }))

app.get('/api/incidents', { onRequest: [app.authenticate] }, async () => db.incident.findMany({
  include: { catalog: true, request: { select: { folio: true } } },
  orderBy: { createdAt: 'desc' },
}))

app.get<{ Params: { requestId: string } }>('/api/requests/:requestId/documents', { onRequest: [app.authenticate] }, async (request, reply) => {
  const record = await db.request.findUnique({ where: { id: request.params.requestId } })
  if (!record) return reply.code(404).send({ error: 'Solicitud no encontrada' })
  return db.requestDocument.findMany({ where: { requestId: record.id }, include: { requirement: true }, orderBy: { requirementId: 'asc' } })
})

app.patch<{ Params: { id: string }; Body: { status?: DocumentStatus; note?: string } }>('/api/request-documents/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  if (!request.body.status || !Object.values(DocumentStatus).includes(request.body.status)) return reply.code(400).send({ error: 'Estatus documental inválido' })
  const document = await db.requestDocument.findUnique({ where: { id: request.params.id } })
  if (!document) return reply.code(404).send({ error: 'Documento no encontrado' })
  return db.requestDocument.update({ where: { id: document.id }, data: { status: request.body.status, note: request.body.note?.trim() || undefined }, include: { requirement: true } })
})

app.post<{ Body: { requestId?: string; catalogId?: string; note?: string } }>('/api/incidents', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const requestId = request.body.requestId?.trim()
  const catalogId = request.body.catalogId?.trim()
  if (!requestId || !catalogId) return reply.code(400).send({ error: 'Solicitud e incidencia son obligatorias' })
  const [requestRecord, catalog] = await Promise.all([
    db.request.findUnique({ where: { id: requestId } }),
    db.catalogItem.findFirst({ where: { id: catalogId, type: CatalogType.INCIDENCIA, active: true } }),
  ])
  if (!requestRecord) return reply.code(404).send({ error: 'Solicitud no encontrada' })
  if (!catalog) return reply.code(400).send({ error: 'La incidencia no está activa en el catálogo' })
  return reply.code(201).send(await db.incident.create({
    data: { requestId, catalogId, note: request.body.note?.trim() || null },
    include: { catalog: true },
  }))
})

app.patch<{ Params: { id: string }; Body: { status?: IncidentStatus } }>('/api/incidents/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  if (!request.body.status || !Object.values(IncidentStatus).includes(request.body.status)) return reply.code(400).send({ error: 'Estatus de incidencia inválido' })
  const incident = await db.incident.findUnique({ where: { id: request.params.id } })
  if (!incident) return reply.code(404).send({ error: 'Incidencia no encontrada' })
  return db.incident.update({ where: { id: incident.id }, data: { status: request.body.status }, include: { catalog: true } })
})

app.patch<{ Params: { id: string }; Body: { status?: RequestStatus; observation?: string } }>('/api/requests/:id', { onRequest: [app.authenticate, app.authorize(['CONTROL', 'ADMIN'])] }, async (request, reply) => {
  const requestRecord = await db.request.findUnique({ where: { id: request.params.id } })
  if (!requestRecord) return reply.code(404).send({ error: 'Solicitud no encontrada' })
  const allowed = Object.values(RequestStatus)
  if (request.body.status && !allowed.includes(request.body.status)) {
    return reply.code(400).send({ error: 'Estatus de solicitud inválido' })
  }
  if (request.body.status === RequestStatus.ACEPTADA) {
    const pending = await db.requestDocument.count({ where: { requestId: requestRecord.id, status: { not: DocumentStatus.VALIDADO } } })
    if (pending > 0) return reply.code(409).send({ error: 'No se puede aceptar: faltan documentos por validar' })
  }
  return db.request.update({
    where: { id: request.params.id },
    data: { status: request.body.status, observation: request.body.observation?.trim() || undefined },
  })
})

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}

process.on('SIGTERM', async () => {
  await db.$disconnect()
  await app.close()
})
