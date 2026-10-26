import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { db } from './db.js'

const demoPassword = process.env.DEMO_PASSWORD
if (!demoPassword) throw new Error('DEMO_PASSWORD es obligatorio para ejecutar el seed')

const catalogs = [
  { type: 'RAMO' as const, name: 'Agrícola' },
  { type: 'RAMO' as const, name: 'Ganadero' },
  { type: 'RAMO' as const, name: 'Vial' },
  { type: 'RAMO' as const, name: 'Vida' },
  { type: 'PRODUCTO' as const, name: 'Cultivos', ramo: 'Agrícola' },
  { type: 'PRODUCTO' as const, name: 'Ganado bovino', ramo: 'Ganadero' },
  { type: 'PRODUCTO' as const, name: 'Auto particular', ramo: 'Vial' },
  { type: 'PRODUCTO' as const, name: 'Vida individual', ramo: 'Vida' },
  { type: 'INCIDENCIA' as const, name: 'Documento faltante' },
  { type: 'INCIDENCIA' as const, name: 'Información inconsistente' },
  { type: 'INCIDENCIA' as const, name: 'Inspección requerida' },
]

const requirements = [
  ['Agrícola', 'PERSONA_FISICA', 'Identificación oficial'],
  ['Agrícola', 'PERSONA_FISICA', 'Documento del predio'],
  ['Agrícola', 'PERSONA_MORAL', 'Acta constitutiva'],
  ['Agrícola', 'PERSONA_MORAL', 'Documento del predio'],
  ['Ganadero', 'PERSONA_FISICA', 'Identificación oficial'],
  ['Ganadero', 'PERSONA_FISICA', 'Registro de ganado'],
  ['Ganadero', 'PERSONA_MORAL', 'Acta constitutiva'],
  ['Ganadero', 'PERSONA_MORAL', 'Registro de ganado'],
  ['Vial', 'PERSONA_FISICA', 'Identificación oficial'],
  ['Vial', 'PERSONA_FISICA', 'Tarjeta de circulación'],
  ['Vial', 'PERSONA_MORAL', 'Acta constitutiva'],
  ['Vial', 'PERSONA_MORAL', 'Tarjeta de circulación'],
  ['Vida', 'PERSONA_FISICA', 'Identificación oficial'],
  ['Vida', 'PERSONA_FISICA', 'Cuestionario médico'],
  ['Vida', 'PERSONA_MORAL', 'Acta constitutiva'],
  ['Vida', 'PERSONA_MORAL', 'Cuestionario médico'],
] as const

for (const [ramo, clientType, name] of requirements) {
  await db.documentRequirement.upsert({
    where: { ramo_clientType_name: { ramo, clientType, name } },
    update: { active: true },
    create: { ramo, clientType, name },
  })
}

for (const item of catalogs) {
  await db.catalogItem.upsert({
    where: { type_name_ramo: { type: item.type, name: item.name, ramo: item.ramo || '' } },
    update: { active: true },
    create: item,
  })
}

const users = [
  { name: 'Laura Méndez', email: 'laura@nexo.local', role: UserRole.AGENT },
  { name: 'Mariana Torres', email: 'control@nexo.local', role: UserRole.CONTROL },
  { name: 'Dirección General', email: 'admin@nexo.local', role: UserRole.ADMIN },
]

for (const user of users) {
  const savedUser = await db.user.upsert({
    where: { email: user.email },
    update: { name: user.name, role: user.role, active: true },
    create: {
      name: user.name,
      email: user.email,
      passwordHash: await bcrypt.hash(demoPassword, 12),
      role: user.role,
    },
  })
  if (user.role === UserRole.AGENT) {
    for (const ramo of ['Agrícola', 'Ganadero', 'Vial', 'Vida']) {
      await db.userRamo.upsert({
        where: { userId_ramo: { userId: savedUser.id, ramo } },
        update: { active: true },
        create: { userId: savedUser.id, ramo },
      })
    }
  }
}

await db.$disconnect()
