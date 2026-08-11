import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type CompanyOrganisation = {
  id: number
  name: string
  description: string
  orgCity: string
  organizerId: number | null
}

export type CompanyEvent = {
  id: number
  name: string
  description: string
  time: string
  organisationId: number
  city: string
  venue: string
  eventType: 'IN_PERSON' | 'ONLINE'
  attendeesCount?: number
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
  eventType: 'IN_PERSON' | 'ONLINE'
}

async function request(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed (${response.status})`)
  }

  return response
}

async function requestJson<T>(path: string, token: string, init?: RequestInit) {
  const response = await request(path, token, init)
  return response.json() as Promise<T>
}

export function fetchMyOrganisations(token: string) {
  return requestJson<CompanyOrganisation[]>('/api/organizations/me', token)
}

export function fetchOrganisationEvents(token: string, organisationId: number) {
  return requestJson<CompanyEvent[]>(
    `/api/organizations${organisationId}/events`,
    token,
  )
}

export function updateCompanyOrganisation(
  token: string,
  organisationId: number,
  payload: CompanyOrganisationUpdateInput,
) {
  return requestJson<CompanyOrganisation>(
    `/api/organizations${organisationId}`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export function createCompanyEvent(
  token: string,
  organisationId: number,
  payload: CompanyEventInput,
) {
  return requestJson<CompanyEvent>('/api/events', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      organisationId,
    }),
  })
}

export function updateCompanyEvent(
  token: string,
  eventId: number,
  payload: CompanyEventInput,
) {
  return requestJson<CompanyEvent>(`/api/events/${eventId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteCompanyEvent(token: string, eventId: number) {
  return request(`/api/events/${eventId}`, token, { method: 'DELETE' })
}
