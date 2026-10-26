import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'
import { api, type Client, type Quote, type Request, type SessionUser, type ManagedAgent, type CatalogItem, type Incident, type RequestDocument, type DocumentRequirement, type HistoricalPolicy } from './services/api'

type View = 'inicio' | 'cotizaciones' | 'solicitudes' | 'clientes' | 'mesa-control' | 'agentes' | 'catalogos' | 'historico'

const views: Array<[View, string, string]> = [
  ['inicio', '⌂', 'Inicio'],
  ['cotizaciones', '◇', 'Cotizaciones'],
  ['solicitudes', '▣', 'Solicitudes'],
  ['clientes', '♙', 'Clientes y expedientes'],
  ['mesa-control', '◫', 'Mesa de control'],
  ['agentes', '♙', 'Agentes y ramos'],
  ['catalogos', '⚙', 'Catálogos'],
  ['historico', '↥', 'Importar histórico'],
]

function Badge({ text, tone }: { text: string; tone: string }) {
  return <span className={`badge ${tone}`}>{text}</span>
}

function previewCsv(csv: string): { rows: Array<Record<string, string>>; errors: string[] } {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return { rows: [], errors: ['El CSV debe incluir encabezados y al menos una fila.'] }
  const split = (line: string) => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  const headers = split(lines[0]).map(header => header.toLowerCase())
  const required = ['folio', 'cliente', 'ramo']
  const missing = required.filter(header => !headers.includes(header))
  if (missing.length > 0) return { rows: [], errors: [`Faltan columnas obligatorias: ${missing.join(', ')}.`] }
  const folios = new Set<string>()
  const errors: string[] = []
  const rows = lines.slice(1).map((line, index) => {
    const values = split(line)
    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] || '']))
    const rowNumber = index + 2
    if (!row.folio || !row.cliente || !row.ramo) errors.push(`Fila ${rowNumber}: folio, cliente y ramo son obligatorios.`)
    if (row.folio && folios.has(row.folio)) errors.push(`Fila ${rowNumber}: el folio ${row.folio} está duplicado en el archivo.`)
    if (row.folio) folios.add(row.folio)
    return row
  })
  return { rows, errors }
}

function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [view, setView] = useState<View>('inicio')
  const [ramo, setRamo] = useState('')
  const [saved, setSaved] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [agents, setAgents] = useState<ManagedAgent[]>([])
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [historicalPolicies, setHistoricalPolicies] = useState<HistoricalPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const role = user?.role === 'CONTROL' ? 'control' : user?.role === 'ADMIN' ? 'admin' : 'agent'
  const availableRamos = role === 'agent' ? user?.ramos || [] : catalogs.filter(item => item.type === 'RAMO').map(item => item.name)
  const selectedRamo = availableRamos.includes(ramo) ? ramo : availableRamos[0] || ''

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [loadedClients, loadedQuotes, loadedRequests, loadedCatalogs, loadedIncidents, loadedRequirements, loadedHistorical] = await Promise.all([api.clients(), api.quotes(), api.requests(), api.catalogs(), api.incidents(), api.requirements(), api.historicalPolicies()])
      setClients(loadedClients)
      setQuotes(loadedQuotes)
      setRequests(loadedRequests)
      setCatalogs(loadedCatalogs)
      setIncidents(loadedIncidents)
      setRequirements(loadedRequirements)
      setHistoricalPolicies(loadedHistorical)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('nexo_token')
    if (!token) return
    api.me().then(loadedUser => { setUser(loadedUser); void loadData() }).catch(() => api.logout())
  }, [])
  const loadAgents = useCallback(async () => setAgents(await api.agents()), [])

  if (!user) return <Login onLogin={loadedUser => { setUser(loadedUser); void loadData() }} />

  const title = role === 'agent' ? 'Buenos días, Laura' : role === 'control' ? 'Centro de operaciones' : 'Visión 360°'
  const subtitle = role === 'agent'
    ? 'Aquí tienes el pulso de tu operación y los pendientes que requieren atención.'
    : role === 'control'
      ? 'Revisa, valida y enruta los trámites recibidos de la fuerza de ventas.'
      : 'Monitorea el desempeño, el cumplimiento y la salud de la cartera completa.'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">N</div><div><strong>Nexo</strong><small>seguros</small></div></div>
        <div className="role-card"><span className="eyebrow">SESIÓN ACTIVA</span><label>{user.name}</label><strong className="role-name">{user.role === 'AGENT' ? 'Agente · Fuerza de ventas' : user.role === 'CONTROL' ? 'Recepción · Mesa de control' : 'Dirección · Administrador'}</strong><span className="eyebrow ramo-title">RAMOS AUTORIZADOS</span><div className="pills">{(role === 'agent' ? availableRamos : ['Todos los ramos']).map(r => <span className="pill" key={r}>{r}</span>)}</div><button className="logout" onClick={() => { api.logout(); setUser(null) }}>Cerrar sesión</button></div>
        <nav>{views.filter(([key]) => !['agentes', 'catalogos', 'historico'].includes(key) || role !== 'agent').map(([key, icon, label]) => <button className={view === key ? 'nav active' : 'nav'} key={key} onClick={() => setView(key)}><span>{icon}</span>{label}</button>)}</nav>
        <div className="user"><div className="avatar">LM</div><div><b>Laura Méndez</b><small>Agente 02 · En línea</small></div></div>
      </aside>
      <main>
        <header><span>Operación / <b>{views.find(item => item[0] === view)?.[2]}</b></span><div className="date">Jueves, 23 oct 2026</div></header>
        {loading && <div className="notice">Cargando datos de operación…</div>}
        {error && <div className="notice error">No se pudo cargar la operación: {error} <button className="link" onClick={() => void loadData()}>Reintentar</button></div>}
        {!loading && !error && view === 'inicio' && <Dashboard title={title} subtitle={subtitle} requests={requests} onNew={() => setView('cotizaciones')} />}
        {!loading && !error && view === 'cotizaciones' && <QuoteForm ramo={selectedRamo} setRamo={setRamo} ramos={availableRamos} products={catalogs.filter(item => item.type === 'PRODUCTO' && item.ramo === selectedRamo)} clients={clients} quotes={quotes} saved={saved} onSave={async data => { await api.createQuote(data); setSaved(true); await loadData() }} onConvert={async id => { await api.convertQuote(id); await loadData() }} />}
        {!loading && !error && view === 'solicitudes' && <List title="Solicitudes" description="Un expediente digital para cada trámite." requests={requests} />}
        {!loading && !error && view === 'clientes' && <List title="Clientes y expedientes" description="Consulta el conocimiento del cliente y sus documentos." requests={requests} />}
        {!loading && !error && view === 'mesa-control' && <List title="Mesa de control" description="Valida documentos, registra observaciones y enruta solicitudes." requests={requests} control incidents={incidents} incidentCatalog={catalogs.filter(item => item.type === 'INCIDENCIA')} onIncident={async data => { await api.createIncident(data); await loadData() }} onResolve={async id => { await api.updateIncident(id, 'RESUELTA'); await loadData() }} onDocument={async (id, status, note) => { await api.updateDocument(id, status, note); await loadData() }} />}
        {!loading && !error && view === 'agentes' && <Agents agents={agents} onLoad={loadAgents} onSaveRamos={async (id, ramos) => { await api.updateAgentRamos(id, ramos); await loadAgents() }} onCreate={async data => { await api.createAgent(data); await loadAgents() }} onSaveAgent={async (id, data) => { await api.updateAgent(id, data); await loadAgents() }} />}
        {!loading && !error && view === 'catalogos' && <Catalogs items={catalogs} requirements={requirements} onCreate={async data => { await api.createCatalog(data); await loadData() }} onToggle={async (id, active) => { await api.updateCatalog(id, active); await loadData() }} onCreateRequirement={async data => { await api.createRequirement(data); await loadData() }} onUpdateRequirement={async (id, data) => { await api.updateRequirement(id, data); await loadData() }} />}
        {!loading && !error && view === 'historico' && <HistoricalImport policies={historicalPolicies} onImport={async csv => { await api.importHistoricalPolicies(csv); await loadData() }} />}
      </main>
    </div>
  )
}

function HistoricalImport({ policies, onImport }: { policies: HistoricalPolicy[]; onImport: (csv: string) => Promise<void> }) {
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ rows: Array<Record<string, string>>; errors: string[] }>({ rows: [], errors: [] })
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setFileName(file.name); setCsv(content); setPreview(previewCsv(content)); setMessage(''); setError('')
  }
  const submit = async () => {
    setSaving(true); setError(''); setMessage('')
    if (preview.errors.length > 0) return
    try { await onImport(csv); setMessage('Importación completada correctamente.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo importar el archivo') } finally { setSaving(false) }
  }
  return <div className="page"><div className="heading"><div><h1>Importar histórico</h1><p>Carga clientes y pólizas anteriores sin mezclar su origen con la operación nueva.</p></div></div><section className="panel import-panel"><h2>Archivo CSV</h2><p className="section-help">Columnas obligatorias: folio, cliente, ramo. Opcionales: poliza, rfc, email, tipocliente, estatus, fechainicio, fechafin.</p><input type="file" accept=".csv,text/csv" onChange={event => void selectFile(event)} /><small className="file-name">{fileName || 'Ningún archivo seleccionado'}</small>{error && <div className="notice error">{error}</div>}{message && <div className="success">{message}</div>}{csv && <div className={preview.errors.length ? 'preview invalid' : 'preview valid'}><strong>{preview.errors.length ? 'Corrige estos errores antes de importar' : `Vista previa válida: ${preview.rows.length} filas`}</strong>{preview.errors.length > 0 && <ul>{preview.errors.map(item => <li key={item}>{item}</li>)}</ul>}{preview.errors.length === 0 && <div className="table-wrap"><table><thead><tr><th>Folio</th><th>Cliente</th><th>Ramo</th></tr></thead><tbody>{preview.rows.slice(0, 5).map(row => <tr key={row.folio}><td>{row.folio}</td><td>{row.cliente}</td><td>{row.ramo}</td></tr>)}</tbody></table>{preview.rows.length > 5 && <small className="section-help">Mostrando las primeras 5 filas.</small>}</div>}</div>}<div className="form-actions"><button className="primary" disabled={!csv || saving || preview.errors.length > 0} onClick={() => void submit()}>{saving ? 'Importando…' : 'Confirmar importación'}</button></div></section><section className="panel"><div className="panel-head"><h2>Pólizas históricas ({policies.length})</h2></div><div className="table-wrap"><table><thead><tr><th>Folio</th><th>Póliza</th><th>Cliente</th><th>Ramo</th><th>Estatus</th></tr></thead><tbody>{policies.map(policy => <tr key={policy.id}><td>{policy.folio}</td><td>{policy.policyNumber || '—'}</td><td>{policy.client?.name || '—'}</td><td>{policy.ramo}</td><td>{policy.status || '—'}</td></tr>)}</tbody></table></div></section></div>
}

function Catalogs({ items, requirements, onCreate, onToggle, onCreateRequirement, onUpdateRequirement }: { items: CatalogItem[]; requirements: DocumentRequirement[]; onCreate: (data: { type: CatalogItem['type']; name: string; ramo?: string }) => Promise<void>; onToggle: (id: string, active: boolean) => Promise<void>; onCreateRequirement: (data: { ramo: string; clientType: DocumentRequirement['clientType']; name: string; required: boolean }) => Promise<void>; onUpdateRequirement: (id: string, data: { active?: boolean; required?: boolean }) => Promise<void> }) {
  const [type, setType] = useState<CatalogItem['type']>('PRODUCTO')
  const [name, setName] = useState('')
  const [ramo, setRamo] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    try { await onCreate({ type, name, ramo: type === 'PRODUCTO' ? ramo : undefined }); setName(''); setRamo('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar') }
  }
  const [requirementName, setRequirementName] = useState('')
  const [requirementRamo, setRequirementRamo] = useState('')
  const [requirementType, setRequirementType] = useState<DocumentRequirement['clientType']>('PERSONA_FISICA')
  const [requirementRequired, setRequirementRequired] = useState(true)
  const createRequirement = async (event: FormEvent) => { event.preventDefault(); await onCreateRequirement({ ramo: requirementRamo, clientType: requirementType, name: requirementName, required: requirementRequired }); setRequirementName('') }
  return <div className="page"><div className="heading"><div><h1>Catálogos</h1><p>Administra opciones controladas para reducir errores de captura.</p></div></div><form className="panel catalog-form" onSubmit={submit}><h2>Agregar opción</h2><div className="form-grid"><label>Tipo<select value={type} onChange={event => setType(event.target.value as CatalogItem['type'])}><option value="PRODUCTO">Producto</option><option value="RAMO">Ramo</option><option value="INCIDENCIA">Incidencia</option></select></label><label>Nombre<input value={name} onChange={event => setName(event.target.value)} required /></label>{type === 'PRODUCTO' && <label>Ramo<select value={ramo} onChange={event => setRamo(event.target.value)} required><option value="">Selecciona ramo</option>{items.filter(item => item.type === 'RAMO').map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>}</div>{error && <div className="notice error">{error}</div>}<div className="form-actions"><button className="primary">Agregar al catálogo</button></div></form><section className="panel"><div className="panel-head"><h2>Opciones activas e históricas</h2></div><div className="catalog-list">{items.map(item => <div className="catalog-row" key={item.id}><div><strong>{item.name}</strong><small>{item.type}{item.ramo ? ` · ${item.ramo}` : ''}</small></div><Badge text={item.active ? 'Activo' : 'Inactivo'} tone={item.active ? 'green' : 'red'} /><button className="secondary" onClick={() => void onToggle(item.id, !item.active)}>{item.active ? 'Desactivar' : 'Activar'}</button></div>)}</div></section><form className="panel catalog-form" onSubmit={event => void createRequirement(event)}><h2>Requisitos documentales</h2><div className="form-grid"><label>Ramo<select value={requirementRamo} onChange={event => setRequirementRamo(event.target.value)} required><option value="">Selecciona ramo</option>{items.filter(item => item.type === 'RAMO').map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label>Tipo de cliente<select value={requirementType} onChange={event => setRequirementType(event.target.value as DocumentRequirement['clientType'])}><option value="PERSONA_FISICA">Persona física</option><option value="PERSONA_MORAL">Persona moral</option></select></label><label>Documento<input value={requirementName} onChange={event => setRequirementName(event.target.value)} required /></label><label className="checkbox-label"><input type="checkbox" checked={requirementRequired} onChange={event => setRequirementRequired(event.target.checked)} /> Obligatorio</label></div><div className="form-actions"><button className="primary">Agregar requisito</button></div></form><section className="panel"><div className="panel-head"><h2>Requisitos configurados</h2></div><div className="catalog-list">{requirements.map(item => <div className="catalog-row" key={item.id}><div><strong>{item.name}</strong><small>{item.ramo} · {item.clientType === 'PERSONA_FISICA' ? 'Persona física' : 'Persona moral'} · {item.required ? 'Obligatorio' : 'Opcional'}</small></div><Badge text={item.active ? 'Activo' : 'Inactivo'} tone={item.active ? 'green' : 'red'} /><button className="secondary" onClick={() => void onUpdateRequirement(item.id, { active: !item.active })}>{item.active ? 'Desactivar' : 'Activar'}</button></div>)}</div></section></div>
}

function Agents({ agents, onLoad, onSaveRamos, onCreate, onSaveAgent }: { agents: ManagedAgent[]; onLoad: () => Promise<void>; onSaveRamos: (id: string, ramos: string[]) => Promise<void>; onCreate: (data: { name: string; email: string; password: string; ramos: string[] }) => Promise<void>; onSaveAgent: (id: string, data: { name: string; email: string; active: boolean }) => Promise<void> }) {
  const catalog = ['Agrícola', 'Ganadero', 'Vial', 'Vida']
  const [creating, setCreating] = useState(false)
  useEffect(() => { void onLoad() }, [onLoad])
  return <div className="page"><div className="heading"><div><h1>Agentes y ramos</h1><p>Administra qué ramos puede operar cada agente. Desactivar conserva el historial.</p></div><button className="primary" onClick={() => setCreating(current => !current)}>{creating ? 'Cancelar' : 'Nuevo agente ＋'}</button></div>{creating && <CreateAgent catalog={catalog} onCreate={async data => { await onCreate(data); setCreating(false) }} /> }<section className="panel"><div className="panel-head"><h2>Fuerza de ventas</h2><button className="link" onClick={() => void onLoad()}>Actualizar</button></div>{agents.map(agent => <AgentCard key={agent.id} agent={agent} catalog={catalog} onSaveRamos={onSaveRamos} onSaveAgent={onSaveAgent} />)}{agents.length === 0 && <p className="notice">No hay agentes registrados.</p>}</section></div>
}

function CreateAgent({ catalog, onCreate }: { catalog: string[]; onCreate: (data: { name: string; email: string; password: string; ramos: string[] }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ramos, setRamos] = useState<string[]>(catalog)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try { await onCreate({ name, email, password, ramos }) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el agente') } finally { setSaving(false) }
  }
  return <form className="panel agent-form" onSubmit={submit}><h2>Nuevo agente</h2><div className="form-grid"><label>Nombre<input value={name} onChange={event => setName(event.target.value)} required /></label><label>Correo electrónico<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>Contraseña inicial<input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /><small className="field-help">Mínimo 8 caracteres.</small></label></div><div className="agent-ramos">{catalog.map(ramo => <button type="button" className={ramos.includes(ramo) ? 'selected' : ''} key={ramo} onClick={() => setRamos(current => current.includes(ramo) ? current.filter(item => item !== ramo) : [...current, ramo])}>{ramo}</button>)}</div>{error && <div className="notice error">{error}</div>}<div className="form-actions"><button className="primary" disabled={saving || ramos.length === 0}>{saving ? 'Creando…' : 'Crear agente'}</button></div></form>
}

function AgentCard({ agent, catalog, onSaveRamos, onSaveAgent }: { agent: ManagedAgent; catalog: string[]; onSaveRamos: (id: string, ramos: string[]) => Promise<void>; onSaveAgent: (id: string, data: { name: string; email: string; active: boolean }) => Promise<void> }) {
  const [name, setName] = useState(agent.name)
  const [email, setEmail] = useState(agent.email)
  const [selected, setSelected] = useState(agent.ramos.filter(item => item.active).map(item => item.ramo))
  const [saving, setSaving] = useState(false)
  const toggle = (ramo: string) => setSelected(current => current.includes(ramo) ? current.filter(item => item !== ramo) : [...current, ramo])
  const save = async () => { setSaving(true); try { await onSaveAgent(agent.id, { name, email, active: agent.active }); await onSaveRamos(agent.id, selected) } finally { setSaving(false) } }
  const toggleActive = async () => { setSaving(true); try { await onSaveAgent(agent.id, { name, email, active: !agent.active }) } finally { setSaving(false) } }
  return <article className="agent-card"><div><strong>{agent.name}</strong><small>{agent.email}</small><Badge text={agent.active ? 'Activo' : 'Suspendido'} tone={agent.active ? 'green' : 'red'} /></div><div className="agent-fields"><input value={name} onChange={event => setName(event.target.value)} aria-label="Nombre del agente" /><input value={email} onChange={event => setEmail(event.target.value)} type="email" aria-label="Correo del agente" /></div><div className="agent-ramos">{catalog.map(ramo => <button type="button" className={selected.includes(ramo) ? 'selected' : ''} key={ramo} onClick={() => toggle(ramo)}>{ramo}</button>)}</div><div className="agent-actions"><button className="secondary" disabled={saving} onClick={() => void toggleActive()}>{agent.active ? 'Suspender' : 'Activar'}</button><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div></article>
}

function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try { onLogin(await api.login(email, password)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión') } finally { setLoading(false) }
  }
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand login-brand"><div className="brand-mark">N</div><div><strong>Nexo</strong><small>seguros</small></div></div><h1>Iniciar sesión</h1><p>Accede a tu operación centralizada.</p><label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <div className="notice error">{error}</div>}<button className="primary login-button" disabled={loading}>{loading ? 'Validando…' : 'Entrar'}</button></form></div>
}

function Dashboard({ title, subtitle, requests, onNew }: { title: string; subtitle: string; requests: Request[]; onNew: () => void }) {
  return <div className="page"><div className="heading"><div><h1>{title}</h1><p>{subtitle}</p></div><button className="primary" onClick={onNew}>Nueva cotización ＋</button></div><div className="stats">{[['Solicitudes activas', String(requests.length), 'Desde la API'], ['Por cobrar', '$486,200', '8 pólizas vencen en 7 días'], ['Pólizas vigentes', '138', '↑ 9 este mes'], ['Siniestros abiertos', '6', '2 requieren seguimiento']].map(([label, value, foot]) => <article className="stat" key={label}><span>{label}</span><strong>{value}</strong><small>{foot}</small></article>)}</div><div className="columns"><section className="panel"><div className="panel-head"><h2>Solicitudes recientes</h2><button className="link">Ver todas →</button></div><RequestTable requests={requests} /></section><section className="panel"><div className="panel-head"><h2>Actividad reciente</h2></div><div className="activity"><p><b>Datos sincronizados</b><br />La información proviene de la API Node.js.<small>Actualizado ahora</small></p><p><b>Flujo conectado</b><br />Clientes, cotizaciones y solicitudes están vinculados.<small>Persistencia Prisma</small></p></div></section></div></div>
}

function RequestTable({ requests }: { requests: Request[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Folio / cliente</th><th>Producto</th><th>Prima</th><th>Estatus</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td><b>{request.folio}</b><small>{request.client?.name || 'Sin cliente'}</small></td><td>{request.type}</td><td>{request.amount ? `$${request.amount.toLocaleString('es-MX')}` : 'Pendiente'}</td><td><Badge text={request.status} tone={request.status === 'ACEPTADA' ? 'green' : request.status === 'CON_OBSERVACIONES' ? 'red' : 'amber'} /></td></tr>)}</tbody></table></div>
}

function QuoteForm({ ramo, setRamo, ramos, products, clients, quotes, saved, onSave, onConvert }: { ramo: string; setRamo: (value: string) => void; ramos: string[]; products: CatalogItem[]; clients: Client[]; quotes: Quote[]; saved: boolean; onSave: (data: { clientId?: string; ramo: string; product?: string; location?: string; insuredSum?: number }) => Promise<void>; onConvert: (id: string) => Promise<void> }) {
  const [clientId, setClientId] = useState('')
  const [product, setProduct] = useState('')
  const [location, setLocation] = useState('')
  const [insuredSum, setInsuredSum] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); try { await onSave({ clientId: clientId || undefined, ramo, product, location, insuredSum: insuredSum ? Number(insuredSum) : undefined }) } finally { setSaving(false) } }
  return <div className="page"><div className="heading"><div><h1>Nueva cotización</h1><p>Selecciona el ramo y captura solo la información necesaria.</p></div></div><section className="panel"><h2>1. Selecciona el ramo</h2><div className="quote-choice">{ramos.map(item => <button className={ramo === item ? 'selected' : ''} onClick={() => setRamo(item)} key={item}>{item}</button>)}</div><h2>2. Datos de la cotización <Badge text={ramo} tone="green" /></h2><div className="form-grid"><label>Cliente existente<select value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Selecciona cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.folio}</option>)}</select></label>  <label>Producto<select value={product} onChange={e => setProduct(e.target.value)}><option value="">Selecciona producto</option>{products.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label>Ubicación<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Estado y municipio" /></label><label>Suma asegurada<input value={insuredSum} onChange={e => setInsuredSum(e.target.value)} type="number" placeholder="$ 0.00" /></label></div><div className="form-actions"><button className="secondary" disabled={saving} onClick={() => void save()}>Guardar borrador</button><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Calcular cotización →'}</button></div>{saved && <p className="success">Cotización guardada en la base de datos.</p>}</section>{quotes.length > 0 && <section className="panel quote-history"><div className="panel-head"><h2>Cotizaciones guardadas</h2></div><div className="table-wrap"><table><thead><tr><th>Folio</th><th>Cliente</th><th>Ramo</th><th>Estatus</th><th>Acción</th></tr></thead><tbody>{quotes.map(quote => <tr key={quote.id}><td>{quote.folio}</td><td>{quote.client?.name || 'Sin cliente'}</td><td>{quote.ramo}</td><td>{quote.status}</td><td>{quote.status !== 'CONVERTIDA' && <button className="link" onClick={() => void onConvert(quote.id)}>Convertir en solicitud</button>}</td></tr>)}</tbody></table></div></section>}</div>
}

function List({ title, description, requests, control = false, incidents = [], incidentCatalog = [], onIncident, onResolve, onDocument }: { title: string; description: string; requests: Request[]; control?: boolean; incidents?: Incident[]; incidentCatalog?: CatalogItem[]; onIncident?: (data: { requestId: string; catalogId: string; note?: string }) => Promise<void>; onResolve?: (id: string) => Promise<void>; onDocument?: (id: string, status: RequestDocument['status'], note?: string) => Promise<void> }) {
  return <div className="page"><div className="heading"><div><h1>{title}</h1><p>{description}</p></div><button className="primary">{control ? 'Filtrar pendientes' : 'Nuevo registro'} ＋</button></div><section className="panel"><div className="panel-head"><h2>{control ? `${requests.length} solicitudes pendientes` : 'Registros recientes'}</h2><button className="secondary">Exportar</button></div><RequestTable requests={requests} /></section>{control && onIncident && onResolve && onDocument && <IncidentBoard requests={requests} incidents={incidents} catalog={incidentCatalog} onCreate={onIncident} onResolve={onResolve} onDocument={onDocument} />}</div>
}

function IncidentBoard({ requests, incidents, catalog, onCreate, onResolve, onDocument }: { requests: Request[]; incidents: Incident[]; catalog: CatalogItem[]; onCreate: (data: { requestId: string; catalogId: string; note?: string }) => Promise<void>; onResolve: (id: string) => Promise<void>; onDocument: (id: string, status: RequestDocument['status'], note?: string) => Promise<void> }) {
  const [requestId, setRequestId] = useState(requests[0]?.id || '')
  const [catalogId, setCatalogId] = useState(catalog[0]?.id || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState<RequestDocument[]>([])
  useEffect(() => { if (requestId) void api.documents(requestId).then(setDocuments) }, [requestId])
  const create = async () => { setSaving(true); try { await onCreate({ requestId, catalogId, note }); setNote('') } finally { setSaving(false) } }
  return <section className="panel incident-board"><div className="panel-head"><div><h2>Checklist documental</h2><small className="section-help">Valida cada documento antes de aceptar la solicitud.</small></div></div><div className="document-list">{documents.map(document => <div className="document-row" key={document.id}><div><strong>{document.requirement.name}</strong><small>{document.requirement.required ? 'Obligatorio' : 'Opcional'}</small></div><select value={document.status} onChange={event => void onDocument(document.id, event.target.value as RequestDocument['status'])}><option value="PENDIENTE">Pendiente</option><option value="VALIDADO">Validado</option><option value="OBSERVADO">Observado</option></select></div>)}</div><h2 className="incident-title">Incidencias</h2><div className="incident-form"><select value={requestId} onChange={event => setRequestId(event.target.value)}><option value="">Solicitud</option>{requests.map(item => <option key={item.id} value={item.id}>{item.folio}</option>)}</select><select value={catalogId} onChange={event => setCatalogId(event.target.value)}><option value="">Tipo de incidencia</option>{catalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={note} onChange={event => setNote(event.target.value)} placeholder="Nota opcional" /><button className="primary" disabled={saving || !requestId || !catalogId} onClick={() => void create()}>{saving ? 'Guardando…' : 'Registrar'}</button></div><div className="incident-list">{incidents.map(item => <div className="incident-row" key={item.id}><div><strong>{item.catalog.name}</strong><small>{item.request.folio}{item.note ? ` · ${item.note}` : ''}</small></div><Badge text={item.status} tone={item.status === 'RESUELTA' ? 'green' : 'red'} />{item.status === 'ABIERTA' && <button className="link" onClick={() => void onResolve(item.id)}>Marcar resuelta</button>}</div>)}</div></section>
}

export default App
