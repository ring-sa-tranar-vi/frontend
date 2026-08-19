import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type CompanyOrganisation = {
  id: number
  name: string
  description: string | null
  orgCity: string
  organizerId?: number | null
  followerCount?: number
}

export type CompanyEvent = {
  id: number
  name: string
  description: string | null
  time: string
  city: string
  venue: string | null
  eventType: 'IN_PERSON' | 'ONLINE'
  organisationId?: number
  attendeesCount?: number
}

export type CompanyMe = {
  userId: number
  role: string
  canManageOrganisation: boolean
  organisationId: number | null
  organisationName: string | null
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
    if (!text) throw new Error(`Request failed (${response.status})`)

    try {
      const problem = JSON.parse(text) as {
        detail?: unknown
        message?: unknown
        title?: unknown
      }
      const message = problem.detail ?? problem.message ?? problem.title
      throw new Error(
        typeof message === 'string' && message.trim() ? message : text,
      )
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text)
      throw error
    }
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
    `/api/organizations/${organisationId}/events`,
    token,
  )
}

export function fetchCompanyMe(token: string) {
  return requestJson<CompanyMe>('/api/company/me', token)
}

export function fetchManagedOrganisation(token: string) {
  return requestJson<CompanyOrganisation>('/api/company/organization', token)
}

export function updateCompanyOrganisation(
  token: string,
  payload: CompanyOrganisationUpdateInput,
) {
  return requestJson<CompanyOrganisation>('/api/company/organization', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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
    body: JSON.stringify(payload),
  })
}

export function deleteCompanyEvent(token: string, eventId: number) {
  return request(`/api/company/events/${eventId}`, token, { method: 'DELETE' })
}

export function fetchManagedOrganisationEvents(token: string) {
  return requestJson<CompanyEvent[]>('/api/company/events', token)
}
