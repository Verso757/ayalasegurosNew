const state = {
  role: 'agent',
  view: 'inicio',
  ramo: 'agricola',
  agentForm: false,
  reviewRequest: null,
  ramosByRole: {
    agent: ['Agrícola', 'Ganadero', 'Vial', 'Vida'],
    control: ['Todos los ramos'],
    admin: ['Todos los ramos']
  },
  requests: JSON.parse(localStorage.getItem('nexo_requests') || JSON.stringify([
    { id: 'SOL-02-26-0387', client: 'Rancho La Esperanza', type: 'Agrícola · PV 2026', amount: '$184,600', status: 'En revisión', tone: 'amber', date: '22 oct 2026' },
    { id: 'SOL-02-26-0381', client: 'Productores del Bajío S.C.', type: 'Agrícola · PV 2026', amount: '$96,240', status: 'Con observaciones', tone: 'red', date: '21 oct 2026' },
    { id: 'SOL-GAN-22-OCT', client: 'Granja El Encino', type: 'Ganadera · Alta mortalidad', amount: '$62,800', status: 'Aceptada', tone: 'green', date: '20 oct 2026' },
    { id: 'SOL-02-26-0372', client: 'María Fernanda Soto', type: 'Agrícola · PV 2026', amount: '$38,900', status: 'Emitida', tone: 'blue', date: '18 oct 2026' }
  ])),
  observations: JSON.parse(localStorage.getItem('nexo_observations') || '{}'),
  requestDocs: JSON.parse(localStorage.getItem('nexo_request_docs') || '{}'),
  quotes: JSON.parse(localStorage.getItem('nexo_quotes') || '[]'),
  catalogs: JSON.parse(localStorage.getItem('nexo_catalogs') || JSON.stringify({
    ramos: ['Agrícola', 'Ganadero', 'Vial', 'Vida'],
    productos: ['Agrícola elemental', 'Ganado alta mortalidad', 'Auto particular', 'Vida individual'],
    incidencias: ['Documentación incompleta', 'Documento ilegible', 'Datos que no coinciden', 'Firma faltante']
  })),
  agents: JSON.parse(localStorage.getItem('nexo_agents') || JSON.stringify([
    { name: 'Laura Méndez', email: 'laura.mendez@nexo.test', role: 'Agente', ramos: ['Agrícola', 'Ganadero', 'Vial', 'Vida'], status: 'Activo', tone: 'green' },
    { name: 'Carlos Ramírez', email: 'carlos.ramirez@nexo.test', role: 'Agente', ramos: ['Vial', 'Vida'], status: 'Activo', tone: 'green' },
    { name: 'Mariana Torres', email: 'mariana.torres@nexo.test', role: 'Mesa de control', ramos: ['Todos'], status: 'Activo', tone: 'green' }
  ])),
  clientForm: false,
  clients: JSON.parse(localStorage.getItem('nexo_clients') || JSON.stringify([
    { id: 'CLI-000284', name: 'Rancho La Esperanza', type: 'Persona moral', ramos: ['Agrícola', 'Ganadero'], docs: 'Completo', tone: 'green', detail: 'RFC registrado · Expediente vigente' },
    { id: 'CLI-000271', name: 'Productores del Bajío S.C.', type: 'Persona moral', ramos: ['Agrícola'], docs: 'Observado', tone: 'red', detail: 'Falta comprobante de domicilio' },
    { id: 'CLI-000263', name: 'María Fernanda Soto', type: 'Persona física', ramos: ['Vial', 'Vida'], docs: 'Completo', tone: 'green', detail: 'Expediente vigente 8 meses' }
  ])),
  roleNames: { agent: 'Laura Méndez', control: 'Mesa de control', admin: 'Dirección general' }
};

const roleCopy = {
  agent: { title: 'Buenos días, Laura', subtitle: 'Aquí tienes el pulso de tu operación y los pendientes que requieren atención.', action: 'Nueva solicitud' },
  control: { title: 'Centro de operaciones', subtitle: 'Revisa, valida y enruta los trámites recibidos de la fuerza de ventas.', action: 'Registrar recepción' },
  admin: { title: 'Visión 360°', subtitle: 'Monitorea el desempeño, el cumplimiento y la salud de la cartera completa.', action: 'Generar reporte' }
};

function badge(status, tone) { return `<span class="badge ${tone}">${status}</span>`; }
function renderRamosSidebar() {
  const target = document.getElementById('ramosSidebar');
  if (!target) return;
  target.innerHTML = `<span class="line-label">Ramos autorizados</span><div class="ramo-list">${state.ramosByRole[state.role].map(ramo => `<span class="ramo-pill">${ramo}</span>`).join('')}</div>`;
}
function stat(label, value, foot, icon, trend = '') {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot ${trend.includes('↓') ? 'trend down' : 'trend'}">${trend || foot}</div></article>`;
}
function requestRows() {
  return state.requests.map(r => `<tr><td>${r.id}<span class="subtext">${r.client}</span></td><td>${r.type}</td><td>${r.amount}</td><td>${badge(r.status, r.tone)}</td><td>${r.date}</td></tr>`).join('');
}
function cotizacionView() {
  const fields = {
    agricola: `<div class="field"><label>Ciclo agrícola</label><select data-field="periodo"><option>Primavera - Verano 2026</option><option>Otoño - Invierno 2026</option></select></div><div class="field"><label>Cultivo y variedad</label><input data-field="detalle" placeholder="Ej. Maíz blanco" /></div><div class="field"><label>Superficie (hectáreas)</label><input data-field="cantidad" type="number" placeholder="0.00" /></div><div class="field"><label>Estado y municipio</label><input data-field="ubicacion" placeholder="Ej. Querétaro, El Marqués" /></div>`,
    ganadero: `<div class="field"><label>Especie</label><select data-field="periodo"><option>Bovino</option><option>Porcino</option><option>Avícola</option><option>Otra</option></select></div><div class="field"><label>Tipo de producción</label><select data-field="detalle"><option>Engorda</option><option>Leche</option><option>Cría</option></select></div><div class="field"><label>Número de animales</label><input data-field="cantidad" type="number" placeholder="0" /></div><div class="field"><label>Estado y municipio</label><input data-field="ubicacion" placeholder="Ej. Jalisco, Tepatitlán" /></div>`,
    vial: `<div class="field"><label>Tipo de vehículo</label><select data-field="periodo"><option>Automóvil</option><option>Camioneta</option><option>Camión</option><option>Motocicleta</option></select></div><div class="field"><label>Marca, modelo y año</label><input data-field="detalle" placeholder="Ej. Toyota Hilux 2024" /></div><div class="field"><label>Uso del vehículo</label><select data-field="cantidad"><option>Particular</option><option>Comercial</option><option>Carga</option></select></div><div class="field"><label>Código postal de circulación</label><input data-field="ubicacion" placeholder="00000" /></div>`,
    vida: `<div class="field"><label>Fecha de nacimiento</label><input data-field="periodo" type="date" /></div><div class="field"><label>Ocupación</label><input data-field="detalle" placeholder="Actividad principal" /></div><div class="field"><label>Suma asegurada</label><input data-field="cantidad" type="number" placeholder="$ 0.00" /></div><div class="field"><label>Periodicidad de pago</label><select data-field="ubicacion"><option>Mensual</option><option>Anual</option><option>Semestral</option></select></div>`
  };
  const ramoLabels = { agricola: ['🌱', 'Agrícola'], ganadero: ['🐄', 'Ganadero'], vial: ['🚗', 'Vial'], vida: ['♡', 'Vida'] };
  const clientOptions = state.clients.filter(client => client.ramos.some(ramo => ramo.toLowerCase() === ramoLabels[state.ramo][1].toLowerCase()) || client.ramos.includes('Todos')).map(client => `<option value="${client.id}">${client.name} · ${client.id}</option>`).join('');
  const savedQuotes = state.quotes.length ? `<section class="panel" style="margin-top:20px"><div class="panel-header"><h2>Cotizaciones guardadas</h2><span class="muted">${state.quotes.length} registros</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Folio</th><th>Cliente</th><th>Ramo</th><th>Estatus</th><th>Acción</th></tr></thead><tbody>${state.quotes.map(quote => `<tr><td>${quote.id}</td><td>${quote.cliente}</td><td>${quote.ramo}</td><td>${badge(quote.status, quote.status === 'Borrador' ? 'amber' : 'green')}</td><td>${quote.status !== 'Convertida' ? `<button class="text-button" data-convert-quote="${quote.id}">Convertir en solicitud</button>` : '<span class="muted">Solicitud creada</span>'}</td></tr>`).join('')}</tbody></table></div></section>` : '';
  return `<div class="page"><div class="page-heading"><div><h1>Nueva cotización</h1><p>Selecciona el ramo y captura solo la información necesaria para iniciar.</p></div><button class="secondary" data-view="solicitudes">Ver solicitudes →</button></div>
    <section class="panel"><div class="panel-header"><h2>1. Selecciona el ramo</h2><span class="muted">El formulario se adapta automáticamente</span></div><div class="quote-choice">${Object.entries(ramoLabels).map(([key, val]) => `<button class="${state.ramo === key ? 'selected' : ''}" data-ramo="${key}"><span>${val[0]}</span>${val[1]}</button>`).join('')}</div>
    <div class="panel-header"><h2>2. Datos de la cotización ${badge(ramoLabels[state.ramo][1], 'green')}</h2><span class="muted">Los campos se guardan como borrador</span></div><div class="form-grid"><div class="field full"><label>Cliente existente</label><select data-field="cliente"><option value="">Selecciona un cliente compatible</option>${clientOptions}</select><span class="subtext">¿Aún no existe? Puedes crear el cliente desde Clientes y expedientes.</span></div>${fields[state.ramo]}<div class="field"><label>Suma asegurada estimada</label><input data-field="suma" type="number" placeholder="$ 0.00" /></div><div class="field"><label>Agente responsable</label><select data-field="agente"><option>Laura Méndez · Agente 02</option></select></div><div class="field full"><label>Notas para la cotización</label><input data-field="notas" placeholder="Información adicional para el área comercial" /></div></div><div class="form-actions"><button class="secondary" data-action="draft">Guardar borrador</button><button class="primary" data-action="quote">Calcular cotización →</button></div></section>${savedQuotes}</div>`;
}
function catalogosView() {
  const labels = { ramos: 'Ramos', productos: 'Productos', incidencias: 'Incidencias' };
  return `<div class="page"><div class="page-heading"><div><h1>Catálogos operativos</h1><p>Opciones controladas para reducir errores de captura. Los cambios aplican a nuevas operaciones.</p></div><span class="badge green">Edición autorizada</span></div><div class="catalog-grid">${Object.entries(state.catalogs).map(([key, items]) => `<section class="panel catalog-card"><div class="panel-header"><h2>${labels[key]}</h2><button class="text-button" data-add-catalog="${key}">＋ Agregar</button></div><div class="catalog-list">${items.map((item, index) => `<div><span>${item}</span><button aria-label="Desactivar ${item}" data-remove-catalog="${key}" data-index="${index}">×</button></div>`).join('')}</div><span class="muted">${items.length} opciones activas</span></section>`).join('')}</div></div>`;
}
function agentesView() {
  if (state.agentForm) return `<div class="page"><div class="page-heading"><div><h1>Nuevo agente</h1><p>Define el perfil y los ramos que podrá operar.</p></div><button class="secondary" data-action="cancel-agent">Cancelar</button></div><section class="panel"><div class="form-grid"><div class="field"><label>Nombre completo</label><input data-agent-field="name" placeholder="Ej. Ana López" /></div><div class="field"><label>Correo de acceso</label><input data-agent-field="email" type="email" placeholder="ana@empresa.com" /></div><div class="field"><label>Perfil</label><select data-agent-field="role"><option>Agente</option><option>Mesa de control</option><option>Administrador</option></select></div><div class="field"><label>Estado inicial</label><select data-agent-field="status"><option>Activo</option><option>Suspendido</option></select></div><div class="field full"><label>Ramos autorizados</label><div class="ramo-checks">${['Agrícola', 'Ganadero', 'Vial', 'Vida'].map(r => `<label><input type="checkbox" data-agent-ramo value="${r}" /> ${r}</label>`).join('')}</div></div></div><div class="form-actions"><button class="primary" data-action="save-agent">Guardar agente</button></div></section></div>`;
  if (state.role === 'agent') {
    return `<div class="page"><div class="page-heading"><div><h1>Agentes y usuarios</h1><p>Consulta el directorio de operación y los ramos asignados a cada persona.</p></div></div>${agentsTable(false)}</div>`;
  }
  function clientesView() {
    if (state.clientForm) return `<div class="page"><div class="page-heading"><div><h1>Nuevo cliente</h1><p>Registra al cliente una sola vez para reutilizar sus datos en cotizaciones y solicitudes.</p></div><button class="secondary" data-action="cancel-client">Cancelar</button></div><section class="panel"><div class="form-grid"><div class="field"><label>Nombre o razón social</label><input data-client-field="name" placeholder="Ej. Grupo Los Pinos S.A. de C.V." /></div><div class="field"><label>Tipo de persona</label><select data-client-field="type"><option>Persona física</option><option>Persona moral</option></select></div><div class="field"><label>RFC</label><input data-client-field="rfc" placeholder="RFC del cliente" /></div><div class="field"><label>Correo electrónico</label><input data-client-field="email" type="email" placeholder="cliente@correo.com" /></div><div class="field full"><label>Ramos de interés</label><div class="ramo-checks">${['Agrícola', 'Ganadero', 'Vial', 'Vida'].map(r => `<label><input type="checkbox" data-client-ramo value="${r}" /> ${r}</label>`).join('')}</div></div><div class="field full"><label>Nota inicial del expediente</label><input data-client-field="note" placeholder="Ej. Cliente nuevo referido por agente" /></div></div><div class="form-actions"><button class="primary" data-action="save-client">Guardar cliente</button></div></section></div>`;
    const canManage = state.role !== 'agent';
    return `<div class="page"><div class="page-heading"><div><h1>Clientes y expedientes</h1><p>Un expediente centralizado para reutilizar información y detectar documentos pendientes.</p></div>${canManage || state.role === 'agent' ? '<button class="primary" data-action="client-form">Nuevo cliente ＋</button>' : ''}</div><section class="panel"><div class="panel-header"><h2>${state.clients.length} clientes registrados</h2><div><button class="secondary">Filtros</button> <button class="secondary">Exportar</button></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Ramos</th><th>Expediente</th><th>Detalle</th></tr></thead><tbody>${state.clients.map(client => `<tr><td>${client.id}<span class="subtext">${client.name}</span></td><td>${client.type}</td><td><div class="ramo-list">${client.ramos.map(r => `<span class="ramo-pill">${r}</span>`).join('')}</div></td><td>${badge(client.docs, client.tone)}</td><td>${client.detail}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }
  function businessDaysFrom(date, days) {
    const result = new Date(date);
    let remaining = days;
    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      if (![0, 6].includes(result.getDay())) remaining -= 1;
    }
    return result;
  }
  function requestPriority(request) {
    if (request.status === 'Con observaciones') return ['Crítica', 'red'];
    if (request.status === 'En revisión' && request.date?.includes('22')) return ['Alta', 'amber'];
    return ['Normal', 'green'];
  }
  function requestChecklist(request) {
    const ramo = request.type.toLowerCase();
    const client = state.clients.find(item => item.name === request.client);
    const common = ['Solicitud de aseguramiento', 'Identificación del cliente', 'Comprobante de domicilio'];
    const byRamo = ramo.includes('vial')
      ? ['Tarjeta de circulación', 'Licencia del conductor']
      : ramo.includes('vida')
        ? ['Designación de beneficiarios', 'Cuestionario médico']
        : ramo.includes('ganad')
          ? ['Anexo ganadero', 'Relación de animales']
          : ['Anexo agrícola', 'Relación de predios'];
    if (client?.type === 'Persona moral') byRamo.push('Acta constitutiva y poder legal');
    return [...common, ...byRamo, 'Formato de conocimiento del cliente'];
  }
  function requestDocumentState(requestId) {
    if (!state.requestDocs[requestId]) {
      state.requestDocs[requestId] = {};
    }
    return state.requestDocs[requestId];
  }
  function mesaControlView() {
    if (state.reviewRequest) return reviewRequestView(state.reviewRequest);
    const active = state.requests.filter(request => !['Emitida', 'Aceptada'].includes(request.status));
    return `<div class="page"><div class="page-heading"><div><h1>Mesa de control</h1><p>Valida documentos, registra observaciones y enruta cada solicitud al siguiente responsable.</p></div><span class="badge blue">${active.length} pendientes</span></div>
      <div class="stats-grid"><article class="stat-card"><div class="stat-top"><span>Por validar</span><span class="stat-icon">◷</span></div><div class="stat-value">${active.length}</div><div class="stat-foot">Solicitudes en bandeja</div></article><article class="stat-card"><div class="stat-top"><span>Críticas</span><span class="stat-icon">!</span></div><div class="stat-value">${active.filter(r => requestPriority(r)[1] === 'red').length}</div><div class="stat-foot trend down">Requieren atención</div></article><article class="stat-card"><div class="stat-top"><span>SLA objetivo</span><span class="stat-icon">↗</span></div><div class="stat-value">2 días</div><div class="stat-foot">Validación documental</div></article><article class="stat-card"><div class="stat-top"><span>Observaciones</span><span class="stat-icon">☷</span></div><div class="stat-value">${Object.keys(state.observations).length}</div><div class="stat-foot">Casos registrados</div></article></div>
      <section class="panel"><div class="panel-header"><h2>Bandeja de solicitudes</h2><div><button class="secondary">Filtrar prioridad</button> <button class="secondary">Filtrar ramo</button></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Solicitud / cliente</th><th>Ramo</th><th>Recepción</th><th>Prioridad</th><th>SLA</th><th>Acción</th></tr></thead><tbody>${active.map(request => { const priority = requestPriority(request); const deadline = businessDaysFrom(new Date(), request.status === 'Con observaciones' ? 0 : 2); return `<tr><td>${request.id}<span class="subtext">${request.client}</span></td><td>${request.type}</td><td>${request.date}</td><td>${badge(priority[0], priority[1])}</td><td><span class="sla-chip ${priority[1]}">${priority[1] === 'red' ? 'Vencido' : `Vence ${deadline.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}</span></td><td><button class="text-button" data-review-request="${request.id}">Revisar →</button></td></tr>`; }).join('')}</tbody></table></div></section></div>`;
  }
  function reviewRequestView(requestId) {
    const request = state.requests.find(item => item.id === requestId);
    if (!request) return '';
    const observation = state.observations[requestId] || '';
    const docs = requestDocumentState(requestId);
    const checklist = requestChecklist(request);
    const complete = checklist.filter(item => docs[item]).length;
    return `<div class="page"><div class="page-heading"><div><h1>Revisión de solicitud</h1><p>${request.id} · ${request.client} · ${request.type}</p></div><button class="secondary" data-action="back-control">← Volver a bandeja</button></div><div class="content-grid"><section class="panel"><div class="panel-header"><h2>Checklist documental</h2><span class="muted">${complete}/${checklist.length} validados</span></div><div class="checklist">${checklist.map(item => `<label class="check-row"><input type="checkbox" data-request-doc="${item}" ${docs[item] ? 'checked' : ''} /> <span>${item}</span><small>${docs[item] ? 'Validado' : 'Pendiente de revisión'}</small></label>`).join('')}</div><div class="form-actions"><button class="secondary" data-request-action="save-docs" data-request-id="${request.id}">Guardar revisión</button><button class="secondary" data-request-action="observe" data-request-id="${request.id}">Devolver con observaciones</button><button class="primary" data-request-action="accept" data-request-id="${request.id}">Marcar completa →</button></div></section><section class="panel"><div class="panel-header"><h2>Resumen del trámite</h2><span class="muted">SLA: 2 días hábiles</span></div><div class="detail-list"><div><span>Cliente</span><strong>${request.client}</strong></div><div><span>Ramo</span><strong>${request.type}</strong></div><div><span>Prima estimada</span><strong>${request.amount}</strong></div><div><span>Prioridad</span><strong>${badge(requestPriority(request)[0], requestPriority(request)[1])}</strong></div></div><div class="observation-box"><span class="eyebrow">OBSERVACIÓN ACTUAL</span><p>${observation || 'No hay observaciones registradas.'}</p></div></section></div></div>`;
  }
  return `<div class="page"><div class="page-heading"><div><h1>Agentes y usuarios</h1><p>Administra accesos, ramos autorizados y estado operativo.</p></div><button class="primary" data-action="agent-form">Nuevo agente ＋</button></div>${agentsTable(true)}</div>`;
}
function agentsTable(canManage) {
  return `<section class="panel"><div class="panel-header"><h2>${state.agents.length} usuarios registrados</h2><span class="muted">Los cambios quedan registrados en bitácora</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Persona</th><th>Perfil</th><th>Ramos autorizados</th><th>Estado</th>${canManage ? '<th>Acción</th>' : ''}</tr></thead><tbody>${state.agents.map((agent, index) => `<tr><td>${agent.name}<span class="subtext">${agent.email}</span></td><td>${agent.role}</td><td><div class="ramo-list">${agent.ramos.map(r => `<span class="ramo-pill">${r}</span>`).join('')}</div></td><td>${badge(agent.status, agent.tone)}</td>${canManage ? `<td><button class="text-button" data-toggle-agent="${index}">${agent.status === 'Activo' ? 'Suspender' : 'Activar'}</button></td>` : ''}</tr>`).join('')}</tbody></table></div></section>`;
}
function dashboard() {
  const c = roleCopy[state.role];
  const roleStats = state.role === 'control'
    ? [stat('Por validar hoy', '12', '4 son prioritarias', '◷'), stat('Expedientes completos', '86%', '↑ 8% vs. semana anterior', '✓', '↑ 8% vs. semana anterior'), stat('Tiempo medio de revisión', '1.8 d', 'Meta operativa: 2 días', '↗'), stat('Observaciones abiertas', '7', '3 vencen esta semana', '!', '↑ 2 vs. ayer')]
    : state.role === 'admin'
      ? [stat('Prima emitida', '$2.84 M', '↑ 14.2% vs. mes anterior', '$', '↑ 14.2% vs. mes anterior'), stat('Pólizas vigentes', '1,248', '↑ 6.8% este ciclo', '▤', '↑ 6.8% este ciclo'), stat('Índice de cobranza', '91.6%', 'Meta: 90%', '↗'), stat('Cumplimiento documental', '94%', '↑ 3.4% vs. trimestre anterior', '✓', '↑ 3.4% vs. trimestre anterior')]
      : [stat('Solicitudes activas', '24', '↑ 12% vs. mes anterior', '▣', '↑ 12% vs. mes anterior'), stat('Por cobrar', '$486,200', '8 pólizas vencen en 7 días', '$'), stat('Pólizas vigentes', '138', '↑ 9 este mes', '▤', '↑ 9 este mes'), stat('Siniestros abiertos', '6', '2 requieren seguimiento', '◈')];
  return `<div class="page">
    <div class="page-heading"><div><h1>${c.title}</h1><p>${c.subtitle}</p></div><div class="heading-actions"><button class="secondary" data-action="export">↥ Exportar</button><button class="primary" data-action="new">${c.action} <span>＋</span></button></div></div>
    <div class="stats-grid">${roleStats.join('')}</div>
    <div class="content-grid">
      <section class="panel"><div class="panel-header"><h2>Solicitudes recientes</h2><button class="text-button" data-view="solicitudes">Ver todas →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Folio / cliente</th><th>Producto</th><th>Prima</th><th>Estatus</th><th>Recepción</th></tr></thead><tbody>${requestRows()}</tbody></table></div></section>
      <section class="panel"><div class="panel-header"><h2>Actividad reciente</h2><button class="text-button">Ver bitácora</button></div><div class="activity">
        <div class="activity-item"><div class="activity-dot">✓</div><div class="activity-text"><strong>Solicitud aceptada</strong><br>Granja El Encino pasó a emisión.<span class="activity-time">Hace 32 min · Mesa de control</span></div></div>
        <div class="activity-item"><div class="activity-dot">!</div><div class="activity-text"><strong>Documento observado</strong><br>Falta comprobante de domicilio en SOL-02-26-0381.<span class="activity-time">Hace 1 h · Suscripción</span></div></div>
        <div class="activity-item"><div class="activity-dot">↗</div><div class="activity-text"><strong>Pago aplicado</strong><br>Póliza POL-02-26-0142 por $48,900.<span class="activity-time">Hace 2 h · Cobranza</span></div></div>
      </div></section>
    </div>
    <div class="section-grid" style="margin-top:20px"><section class="panel"><div class="panel-header"><h2>Flujo de operación</h2><span class="muted">Este mes</span></div><div class="kpi">68% <span class="muted">de solicitudes emitidas</span></div><div class="progress"><i style="width:68%"></i></div><span class="muted">24 activas · 16 emitidas · 4 observadas</span></section><section class="panel"><div class="panel-header"><h2>Próximos vencimientos</h2><span class="muted">7 días</span></div><div class="kpi" style="color:var(--amber)">8 <span class="muted">pólizas por cobrar</span></div><div class="progress"><i style="width:35%;background:#d6a241"></i></div><span class="muted">$186,400 en prima pendiente</span></section><section class="panel"><div class="panel-header"><h2>Alertas de cumplimiento</h2><span class="muted">Prioridad alta</span></div><div class="kpi" style="color:var(--red)">3 <span class="muted">expedientes incompletos</span></div><div class="progress"><i style="width:22%;background:var(--red)"></i></div><span class="muted">Requieren acción antes del viernes</span></section></div>
  </div>`;
}
function listView(title, desc, button, rows) {
  return `<div class="page"><div class="page-heading"><div><h1>${title}</h1><p>${desc}</p></div><button class="primary" data-action="new">${button} ＋</button></div><section class="panel"><div class="panel-header"><h2>${rows.length} registros encontrados</h2><div><button class="secondary">Filtros</button> <button class="secondary">Exportar</button></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Folio / nombre</th><th>Detalle</th><th>Importe</th><th>Estatus</th><th>Fecha</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.id}<span class="subtext">${r.client}</span></td><td>${r.type}</td><td>${r.amount}</td><td>${badge(r.status,r.tone)}</td><td>${r.date}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}
function render() {
  const app = document.getElementById('app');
  const names = { inicio: 'Resumen general', cotizaciones: 'Cotizaciones', solicitudes: 'Solicitudes', 'mesa-control': 'Mesa de control', clientes: 'Clientes y expedientes', polizas: 'Pólizas y pagos', siniestros: 'Siniestros', reportes: 'Reportes', catalogos: 'Catálogos', agentes: 'Agentes y usuarios' };
  document.getElementById('breadcrumbCurrent').textContent = names[state.view];
  if (state.view === 'inicio') app.innerHTML = dashboard();
  else if (state.view === 'cotizaciones') app.innerHTML = cotizacionView();
  else if (state.view === 'mesa-control') app.innerHTML = mesaControlView();
  else if (state.view === 'catalogos') app.innerHTML = catalogosView();
  else if (state.view === 'agentes') app.innerHTML = agentesView();
  else if (state.view === 'solicitudes') app.innerHTML = listView('Solicitudes', 'Un solo expediente digital para cada trámite, sin correos ni carpetas dispersas.', roleCopy[state.role].action, state.requests);
  else if (state.view === 'clientes') app.innerHTML = clientesView();
  else if (state.view === 'polizas') app.innerHTML = listView('Pólizas y pagos', 'Consulta documentos emitidos, fechas límite y aplicación de pagos referenciados.', 'Registrar pago', [
    { id:'POL-02-26-0142', client:'Granja El Encino', type:'Ganadera · Alta mortalidad', amount:'$62,800', status:'Pagada', tone:'green', date:'20 oct 2026' },
    { id:'POL-02-26-0138', client:'Rancho La Esperanza', type:'Agrícola · PV 2026', amount:'$184,600', status:'Por cobrar', tone:'amber', date:'Vence 28 oct' },
    { id:'POL-02-26-0127', client:'Agroservicios del Centro', type:'Agrícola · PV 2026', amount:'$78,400', status:'Vencida', tone:'red', date:'18 oct 2026' }
  ]);
  else if (state.view === 'siniestros') app.innerHTML = listView('Siniestros', 'Reporta el aviso el mismo día y da seguimiento a dictámenes, ajustes y finiquitos.', 'Nuevo aviso', [
    { id:'AV-2026-0087', client:'Rancho La Esperanza', type:'Granizo · 12.4 ha', amount:'En evaluación', status:'En inspección', tone:'amber', date:'21 oct 2026' },
    { id:'AV-2026-0081', client:'José Luis Ramírez', type:'Sequía · 8.0 ha', amount:'$34,200', status:'Dictaminado', tone:'blue', date:'16 oct 2026' },
    { id:'AV-2026-0076', client:'Granja El Encino', type:'Mortalidad · 125 animales', amount:'$18,700', status:'Pagado', tone:'green', date:'10 oct 2026' }
  ]);
  else app.innerHTML = `<div class="page"><div class="page-heading"><div><h1>Reportes y métricas</h1><p>Indicadores para tomar decisiones con trazabilidad y cumplimiento.</p></div><button class="primary" data-action="export">Generar reporte ↥</button></div><div class="section-grid"><section class="panel"><div class="panel-header"><h2>Conversión comercial</h2></div><div class="kpi">74.2%</div><p class="muted">Cotizaciones que se convierten en solicitud</p><div class="progress"><i style="width:74%"></i></div></section><section class="panel"><div class="panel-header"><h2>Tiempo de ciclo</h2></div><div class="kpi">6.4 días</div><p class="muted">Recepción hasta emisión promedio</p><div class="progress"><i style="width:64%;background:#5b9bc8"></i></div></section><section class="panel"><div class="panel-header"><h2>Expedientes al día</h2></div><div class="kpi">94%</div><p class="muted">Documentación completa y vigente</p><div class="progress"><i style="width:94%"></i></div></section></div></div>`;
  bind();
}
function bind() {
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { state.view = el.dataset.view; document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === state.view)); render(); }));
  document.querySelectorAll('[data-ramo]').forEach(el => el.addEventListener('click', () => { state.ramo = el.dataset.ramo; render(); }));
  document.querySelectorAll('[data-action="quote"], [data-action="draft"]').forEach(el => el.addEventListener('click', () => saveQuote(el.dataset.action === 'quote')));
  document.querySelectorAll('[data-convert-quote]').forEach(el => el.addEventListener('click', () => convertQuote(el.dataset.convertQuote)));
  document.querySelectorAll('[data-review-request]').forEach(el => el.addEventListener('click', () => { state.reviewRequest = el.dataset.reviewRequest; render(); }));
  document.querySelectorAll('[data-action="back-control"]').forEach(el => el.addEventListener('click', () => { state.reviewRequest = null; render(); }));
  document.querySelectorAll('[data-request-action="observe"]').forEach(el => el.addEventListener('click', () => observeRequest(el.dataset.requestId)));
  document.querySelectorAll('[data-request-action="save-docs"]').forEach(el => el.addEventListener('click', () => saveDocumentReview(el.dataset.requestId)));
  document.querySelectorAll('[data-request-action="accept"]').forEach(el => el.addEventListener('click', () => acceptRequest(el.dataset.requestId)));
  document.querySelectorAll('[data-add-catalog]').forEach(el => el.addEventListener('click', () => addCatalogItem(el.dataset.addCatalog)));
  document.querySelectorAll('[data-remove-catalog]').forEach(el => el.addEventListener('click', () => removeCatalogItem(el.dataset.removeCatalog, Number(el.dataset.index))));
  document.querySelectorAll('[data-toggle-agent]').forEach(el => el.addEventListener('click', () => toggleAgent(Number(el.dataset.toggleAgent))));
  document.querySelectorAll('[data-action="agent-form"]').forEach(el => el.addEventListener('click', () => { state.agentForm = true; render(); }));
  document.querySelectorAll('[data-action="cancel-agent"]').forEach(el => el.addEventListener('click', () => { state.agentForm = false; render(); }));
  document.querySelectorAll('[data-action="save-agent"]').forEach(el => el.addEventListener('click', saveAgent));
  document.querySelectorAll('[data-action="client-form"]').forEach(el => el.addEventListener('click', () => { state.clientForm = true; render(); }));
  document.querySelectorAll('[data-action="cancel-client"]').forEach(el => el.addEventListener('click', () => { state.clientForm = false; render(); }));
  document.querySelectorAll('[data-action="save-client"]').forEach(el => el.addEventListener('click', saveClient));
  document.querySelectorAll('[data-action="new"]').forEach(el => el.addEventListener('click', () => showToast('Flujo iniciado. Completa los datos para continuar.')));
  document.querySelectorAll('[data-action="export"]').forEach(el => el.addEventListener('click', () => showToast('Reporte preparado para descargar.')));
}
function saveAgent() {
  const read = key => document.querySelector(`[data-agent-field="${key}"]`)?.value.trim() || '';
  const ramos = [...document.querySelectorAll('[data-agent-ramo]:checked')].map(input => input.value);
  if (!read('name') || !read('email') || !ramos.length) {
    showToast('Captura nombre, correo y al menos un ramo.');
    return;
  }
  function saveClient() {
    const read = key => document.querySelector(`[data-client-field="${key}"]`)?.value.trim() || '';
    const ramos = [...document.querySelectorAll('[data-client-ramo]:checked')].map(input => input.value);
    if (!read('name') || !read('type') || !ramos.length) {
      showToast('Captura nombre, tipo de persona y al menos un ramo.');
      return;
    }
    const nextNumber = 264 + state.clients.length;
    state.clients.unshift({
      id: `CLI-${String(nextNumber).padStart(6, '0')}`,
      name: read('name'),
      type: read('type'),
      ramos,
      docs: 'Pendiente',
      tone: 'amber',
      detail: read('note') || 'Requiere integrar documentación inicial'
    });
    localStorage.setItem('nexo_clients', JSON.stringify(state.clients));
    state.clientForm = false;
    render();
    showToast('Cliente creado. Ya puedes utilizarlo en una cotización.');
  }
  state.agents.push({ name: read('name'), email: read('email'), role: read('role'), ramos, status: read('status'), tone: read('status') === 'Activo' ? 'green' : 'red' });
  localStorage.setItem('nexo_agents', JSON.stringify(state.agents));
  state.agentForm = false;
  render();
  showToast('Agente creado correctamente.');
}
function toggleAgent(index) {
  if (state.role === 'agent') return;
  const agent = state.agents[index];
  agent.status = agent.status === 'Activo' ? 'Suspendido' : 'Activo';
  agent.tone = agent.status === 'Activo' ? 'green' : 'red';
  localStorage.setItem('nexo_agents', JSON.stringify(state.agents));
  render();
  showToast(`${agent.name}: ${agent.status.toLowerCase()}.`);
}
function saveQuote(calculated) {
  const read = key => document.querySelector(`[data-field="${key}"]`)?.value.trim() || '';
  const selectedClient = state.clients.find(client => client.id === read('cliente'));
  const quote = {
    id: `COT-${new Date().getFullYear()}-${String(state.quotes.length + 1).padStart(4, '0')}`,
    ramo: state.ramo,
    clientId: selectedClient?.id || '',
    cliente: selectedClient?.name || 'Prospecto sin nombre',
    detalle: read('detalle') || 'Información pendiente',
    ubicacion: read('ubicacion') || 'No especificada',
    suma: read('suma') || '0',
    status: calculated ? 'Calculada' : 'Borrador',
    createdAt: new Date().toISOString()
  };
  state.quotes.unshift(quote);
  localStorage.setItem('nexo_quotes', JSON.stringify(state.quotes));
  showToast(`${quote.id} guardada como ${quote.status.toLowerCase()}.`);
}
function convertQuote(quoteId) {
  const quote = state.quotes.find(item => item.id === quoteId);
  if (!quote || quote.status === 'Convertida') return;
  const requestId = `SOL-${new Date().getFullYear()}-${String(state.requests.length + 1).padStart(4, '0')}`;
  state.requests.unshift({
    id: requestId,
    client: quote.cliente,
    type: quote.ramo,
    amount: quote.suma ? `$${Number(quote.suma).toLocaleString('es-MX')}` : '$0',
    status: 'En revisión',
    tone: 'amber',
    date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  });
  quote.status = 'Convertida';
  localStorage.setItem('nexo_quotes', JSON.stringify(state.quotes));
  localStorage.setItem('nexo_requests', JSON.stringify(state.requests));
  showToast(`${quoteId} se convirtió en ${requestId}.`);
  render();
}
function observeRequest(requestId) {
  const observation = window.prompt('Describe la observación para el agente:');
  if (!observation || !observation.trim()) return;
  const request = state.requests.find(item => item.id === requestId);
  if (!request) return;
  request.status = 'Con observaciones';
  request.tone = 'red';
  state.observations[requestId] = observation.trim();
  localStorage.setItem('nexo_requests', JSON.stringify(state.requests));
  localStorage.setItem('nexo_observations', JSON.stringify(state.observations));
  state.reviewRequest = null;
  render();
  showToast('Solicitud devuelta con observaciones.');
}
function saveDocumentReview(requestId) {
  const docs = {};
  document.querySelectorAll('[data-request-doc]').forEach(input => { docs[input.dataset.requestDoc] = input.checked; });
  state.requestDocs[requestId] = docs;
  localStorage.setItem('nexo_request_docs', JSON.stringify(state.requestDocs));
  showToast('Revisión documental guardada.');
}
function acceptRequest(requestId) {
  const request = state.requests.find(item => item.id === requestId);
  if (!request) return;
  const checklist = requestChecklist(request);
  const docs = requestDocumentState(requestId);
  const currentDocs = {};
  document.querySelectorAll('[data-request-doc]').forEach(input => { currentDocs[input.dataset.requestDoc] = input.checked; });
  const missing = checklist.filter(item => !currentDocs[item] && !docs[item]);
  if (missing.length) {
    showToast(`Faltan ${missing.length} documentos por validar.`);
    return;
  }
  state.requestDocs[requestId] = { ...docs, ...currentDocs };
  localStorage.setItem('nexo_request_docs', JSON.stringify(state.requestDocs));
  request.status = 'Aceptada';
  request.tone = 'green';
  localStorage.setItem('nexo_requests', JSON.stringify(state.requests));
  state.reviewRequest = null;
  render();
  showToast('Solicitud completa y enviada a suscripción.');
}
function addCatalogItem(key) {
  if (!['control', 'admin'].includes(state.role)) {
    showToast('Solo Mesa de Control y Administración pueden modificar catálogos.');
    return;
  }
  const value = window.prompt('Nombre de la nueva opción:');
  if (!value || !value.trim()) return;
  state.catalogs[key].push(value.trim());
  localStorage.setItem('nexo_catalogs', JSON.stringify(state.catalogs));
  render();
  showToast('Opción agregada al catálogo.');
}
function removeCatalogItem(key, index) {
  if (!['control', 'admin'].includes(state.role)) {
    showToast('Solo Mesa de Control y Administración pueden modificar catálogos.');
    return;
  }
  const item = state.catalogs[key][index];
  if (!window.confirm(`¿Desactivar "${item}"? Se conservará en históricos.`)) return;
  state.catalogs[key].splice(index, 1);
  localStorage.setItem('nexo_catalogs', JSON.stringify(state.catalogs));
  render();
  showToast('Opción desactivada; los históricos se conservarán.');
}
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
document.getElementById('roleSelect').addEventListener('change', e => { state.role = e.target.value; state.view = 'inicio'; document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === 'inicio')); render(); renderRamosSidebar(); showToast(`Vista cambiada a ${roleCopy[state.role].title.replace('Buenos días, ', '')}`); });
document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => { state.view = el.dataset.view; document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === state.view)); render(); document.getElementById('sidebar').classList.remove('open'); }));
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
render();
renderRamosSidebar();
