const API_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'nexo_token'

export type Client = {
  id: string
  folio: string
  name: string
  type: 'PERSONA_FISICA' | 'PERSONA_MORAL'
  rfc: string | null
  email: string | null
}

export type Quote = {
  id: string
  folio: string
  ramo: string
  product: string | null
  detail: string | null
  location: string | null
  insuredSum: number | null
  status: 'BORRADOR' | 'CALCULADA' | 'CONVERTIDA'
  client: Client | null
  request?: { folio: string } | null
}

export type Request = {
  id: string
  folio: string
  type: string
  amount: number | null
  status: 'EN_REVISION' | 'CON_OBSERVACIONES' | 'ACEPTADA'
  client: Client | null
  quote: Quote
}

export type SessionUser = { id: string; name: string; email: string; role: 'AGENT' | 'CONTROL' | 'ADMIN'; ramos: string[] }
export type ManagedAgent = { id: string; name: string; email: string; active: boolean; ramos: Array<{ ramo: string; active: boolean }> }
export type CatalogItem = { id: string; type: 'RAMO' | 'PRODUCTO' | 'INCIDENCIA'; name: string; ramo: string | null; active: boolean }
export type Incident = { id: string; requestId: string; catalogId: string; note: string | null; status: 'ABIERTA' | 'RESUELTA'; catalog: CatalogItem; request: { folio: string } }
export type RequestDocument = { id: string; requestId: string; requirementId: string; status: 'PENDIENTE' | 'VALIDADO' | 'OBSERVADO'; note: string | null; requirement: { name: string; required: boolean } }
export type DocumentRequirement = { id: string; ramo: string; clientType: 'PERSONA_FISICA' | 'PERSONA_MORAL'; name: string; required: boolean; active: boolean }
export type HistoricalPolicy = { id: string; folio: string; policyNumber: string | null; ramo: string; status: string | null; client: Client | null }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    ...options,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `Error ${response.status} en la API`)
  return body as T
}

export const api = {
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, result.token)
    return result.user
  },
  logout: () => localStorage.removeItem(TOKEN_KEY),
  me: () => request<SessionUser>('/api/auth/me'),
  clients: () => request<Client[]>('/api/clients'),
  historicalPolicies: () => request<HistoricalPolicy[]>('/api/historical-policies'),
  importHistoricalPolicies: (csv: string) => request<{ imported: number }>('/api/historical-policies/import', { method: 'POST', body: JSON.stringify({ csv }) }),
  quotes: () => request<Quote[]>('/api/quotes'),
  requests: () => request<Request[]>('/api/requests'),
  incidents: () => request<Incident[]>('/api/incidents'),
  createIncident: (data: { requestId: string; catalogId: string; note?: string }) => request<Incident>('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: string, status: Incident['status']) => request<Incident>(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  documents: (requestId: string) => request<RequestDocument[]>(`/api/requests/${requestId}/documents`),
  updateDocument: (id: string, status: RequestDocument['status'], note?: string) => request<RequestDocument>(`/api/request-documents/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  requirements: () => request<DocumentRequirement[]>('/api/document-requirements'),
  createRequirement: (data: { ramo: string; clientType: DocumentRequirement['clientType']; name: string; required: boolean }) => request<DocumentRequirement>('/api/document-requirements', { method: 'POST', body: JSON.stringify(data) }),
  updateRequirement: (id: string, data: { active?: boolean; required?: boolean }) => request<DocumentRequirement>(`/api/document-requirements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  catalogs: () => request<CatalogItem[]>('/api/catalogs'),
  createCatalog: (data: { type: CatalogItem['type']; name: string; ramo?: string }) => request<CatalogItem>('/api/catalogs', { method: 'POST', body: JSON.stringify(data) }),
  updateCatalog: (id: string, active: boolean) => request<CatalogItem>(`/api/catalogs/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  agents: () => request<ManagedAgent[]>('/api/users'),
  createAgent: (data: { name: string; email: string; password: string; ramos: string[] }) => request<ManagedAgent>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAgent: (id: string, data: { name: string; email: string; active: boolean }) => request<Pick<ManagedAgent, 'id' | 'name' | 'email' | 'active'>>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  updateAgentRamos: (id: string, ramos: string[]) => request<{ id: string; ramos: string[] }>(`/api/users/${id}/ramos`, {
    method: 'PATCH',
    body: JSON.stringify({ ramos }),
  }),
  createQuote: (data: {
    clientId?: string
    ramo: string
    product?: string
    detail?: string
    location?: string
    insuredSum?: number
  }) => request<Quote>('/api/quotes', { method: 'POST', body: JSON.stringify(data) }),
  convertQuote: (id: string) => request<Request>(`/api/quotes/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
}
