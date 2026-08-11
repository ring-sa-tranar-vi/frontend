import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type CompanyEvent = {
  id: number
  name: string
  description?: string | null
  time: string
  organisationId?: number | null
}

export type CompanyOrganisation = {
  id: number
  name: string
  description?: string | null
  events?: CompanyEvent[] | null
  orgCity?: string | null
  organizerId?: number | null
}

type CreateOrganisationInput = {
  name: string
  description?: string
  orgCity: string
  organizerId: number
}

type CreateEventInput = {
  organisationId: number
  name: string
  description?: string
  time: string
}

type UpdateOrganisationInput = {
  name: string
  description?: string
  orgCity: string
  organizerId: number
}

async function request(
  path: string,
  token?: string | null,
  init?: RequestInit,
): Promise<Response> {
  const url = `${API_URL}${path}`
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected non-JSON response from ${url}`)
  }

  return response
}

async function requestJson<T>(
  path: string,
  token?: string | null,
  init?: RequestInit,
): Promise<T> {
  const response = await request(path, token, init)
  return response.json() as Promise<T>
}

export async function fetchCompanyOrganisations(
  token?: string | null,
): Promise<CompanyOrganisation[]> {
  try {
    return await requestJson<CompanyOrganisation[]>(
      '/api/admin/organizations',
      token,
    )
  } catch {
    return requestJson<CompanyOrganisation[]>('/api/organizations', token)
  }
}

export async function createCompanyOrganisation(
  token: string | null | undefined,
  payload: CreateOrganisationInput,
): Promise<CompanyOrganisation> {
  return requestJson<CompanyOrganisation>('/api/admin/organizations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description ?? '',
      events: [],
      orgCity: payload.orgCity,
      organizerId: payload.organizerId,
    }),
  })
}

export async function updateCompanyOrganisation(
  token: string | null | undefined,
  id: number,
  payload: UpdateOrganisationInput,
): Promise<CompanyOrganisation> {
  const body = {
    name: payload.name,
    description: payload.description ?? '',
    events: [],
    orgCity: payload.orgCity.trim(),
    organizerId: payload.organizerId,
  }
  return requestJson<CompanyOrganisation>(`/api/organizations${id}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteCompanyOrganisation(
  token: string | null | undefined,
  id: number,
) {
  await request(`/api/admin/organizations/${id}`, token, { method: 'DELETE' })
}

export async function createCompanyEvent(
  token: string | null | undefined,
  payload: CreateEventInput,
): Promise<CompanyEvent> {
  return requestJson<CompanyEvent>('/api/admin/events', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteCompanyEvent(
  token: string | null | undefined,
  id: number,
) {
  await request(`/api/admin/events/${id}`, token, { method: 'DELETE' })
}
