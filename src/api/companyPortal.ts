import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

type LegacyOrganisation = {
  id: number
  name: string
  description?: string | null
  orgCity?: string | null
}

type LegacyEvent = {
  id: number
  name: string
  description?: string | null
  time: string
  city?: string | null
  venue?: string | null
}

type HttpError = Error & {
  status?: number
}

let fallbackOrganisationId: number | null = null

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

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const error = new Error(
      text || `Request failed (${response.status})`,
    ) as HttpError
    error.status = response.status
    throw error
  }

  return response
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)
  return response.json() as Promise<T>
}

export function fetchCompanyMe() {
  return requestJson<CompanyMe>('/api/company/me').catch(async (error) => {
    if ((error as HttpError).status !== 404) {
      throw error
    }

    const organisations =
      await requestJson<LegacyOrganisation[]>('/api/organisations')
    const first = organisations[0]

    fallbackOrganisationId = first?.id ?? null

    return {
      userId: null,
      role: 'ORGANIZER',
      canManageOrganisation: true,
      organisationId: first?.id ?? null,
      organisationName: first?.name ?? null,
    } satisfies CompanyMe
  })
}

export function fetchCompanyOrganisation() {
  return requestJson<CompanyOrganisation>('/api/company/organisation')
    .then((org) => {
      fallbackOrganisationId = org.id
      return org
    })
    .catch(async (error) => {
      if ((error as HttpError).status !== 404) {
        throw error
      }

      const organisations =
        await requestJson<LegacyOrganisation[]>('/api/organisations')
      const first = organisations[0]
      if (!first) {
        return {
          id: 0,
          name: '',
          description: '',
          orgCity: '',
        } satisfies CompanyOrganisation
      }

      fallbackOrganisationId = first.id

      return {
        id: first.id,
        name: first.name,
        description: first.description ?? '',
        orgCity: first.orgCity ?? '',
      } satisfies CompanyOrganisation
    })
}

export function updateCompanyOrganisation(
  organisationId: number,
  payload: CompanyOrganisationUpdateInput,
) {
  return requestJson<CompanyOrganisation>('/api/company/organisation', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    if ((error as HttpError).status !== 404) {
      throw error
    }

    const id = fallbackOrganisationId ?? organisationId
    if (!id || id <= 0) {
      return requestJson<CompanyOrganisation>('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
        }),
      }).then((created) => {
        fallbackOrganisationId = created.id
        return created
      })
    }

    return requestJson<CompanyOrganisation>(`/api/organisations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description,
        events: [],
        orgCity: payload.orgCity,
        organizerId: 1,
      }),
    })
  })
}

export function fetchCompanyEvents() {
  return requestJson<CompanyEvent[]>('/api/company/events').catch(
    async (error) => {
      if ((error as HttpError).status !== 404) {
        throw error
      }

      const organisationId = fallbackOrganisationId
      if (!organisationId) {
        return []
      }

      const events = await requestJson<LegacyEvent[]>(
        `/api/organisations/${organisationId}/events`,
      )
      return events.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description ?? '',
        time: event.time,
        city: event.city ?? '',
        venue: event.venue ?? '',
        attendeesCount: 0,
      }))
    },
  )
}

export function createCompanyEvent(payload: CompanyEventInput) {
  return requestJson<CompanyEvent>('/api/company/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    if ((error as HttpError).status !== 404) {
      throw error
    }

    const organisationId = fallbackOrganisationId
    if (!organisationId) {
      throw new Error('No organisation available for event creation')
    }

    return requestJson<CompanyEvent>('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description,
        time: payload.time,
        organisation: { id: organisationId },
        city: payload.city,
        venue: payload.venue,
        eventType: 'IN_PERSON',
      }),
    }).then((event) => ({
      ...event,
      attendeesCount: (event as CompanyEvent).attendeesCount ?? 0,
    }))
  })
}

export function updateCompanyEvent(
  eventId: number,
  payload: CompanyEventInput,
) {
  return requestJson<CompanyEvent>(`/api/company/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    if ((error as HttpError).status !== 404) {
      throw error
    }

    const organisationId = fallbackOrganisationId
    if (!organisationId) {
      throw new Error('No organisation available for event update')
    }

    return requestJson<CompanyEvent>(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description,
        time: payload.time,
        organisation: { id: organisationId },
        city: payload.city,
        venue: payload.venue,
        eventType: 'IN_PERSON',
      }),
    }).then((event) => ({
      ...event,
      attendeesCount: (event as CompanyEvent).attendeesCount ?? 0,
    }))
  })
}

export async function deleteCompanyEvent(eventId: number) {
  try {
    await request(`/api/company/events/${eventId}`, { method: 'DELETE' })
  } catch (error) {
    if ((error as HttpError).status !== 404) {
      throw error
    }

    await request(`/api/events/${eventId}`, { method: 'DELETE' })
  }
}
