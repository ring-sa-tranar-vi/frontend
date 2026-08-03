import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type CompanyMe = {
  userId: number | null
  role: string
  canManageOrganisation: boolean
  organisationId: number | null
  organisationName: string | null
}

export type CompanyOrganisation = {
  id: number
  name: string
  description: string
  orgCity: string
}

export type CompanyEvent = {
  id: number
  name: string
  description: string
  time: string
  city: string
  venue: string
  attendeesCount: number
  eventType?: string
}

export type CompanyOrganisationUpdateInput = {
  name: string
  description: string
  orgCity: string
}

export type CompanyEventInput = {
  name: string
  description: string
  time: string
  city: string
  venue: string
}

async function request(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed (${response.status})`)
  }

  return response
}

async function requestJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request(path, token, init)
  return response.json() as Promise<T>
}

export function fetchCompanyMe(token: string) {
  return requestJson<CompanyMe>('/api/company/me', token)
}

export function fetchCompanyOrganisation(token: string) {
  return requestJson<CompanyOrganisation>('/api/company/organisation', token)
}

export function updateCompanyOrganisation(
  token: string,
  payload: CompanyOrganisationUpdateInput,
) {
  return requestJson<CompanyOrganisation>('/api/company/organisation', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function fetchCompanyEvents(token: string) {
  return requestJson<CompanyEvent[]>('/api/company/events', token)
}

export function createCompanyEvent(
  token: string,
  organisationId: number,
  payload: CompanyEventInput,
) {
  return requestJson<CompanyEvent>('/api/company/events', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      eventType: 'IN_PERSON',
      organisation: { id: organisationId },
    }),
  })
}

export function updateCompanyEvent(
  token: string,
  eventId: number,
  payload: CompanyEventInput,
) {
  return requestJson<CompanyEvent>(`/api/company/events/${eventId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, eventType: 'IN_PERSON' }),
  })
}

export async function deleteCompanyEvent(token: string, eventId: number) {
  await request(`/api/company/events/${eventId}`, token, { method: 'DELETE' })
}
