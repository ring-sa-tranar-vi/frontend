import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type EventDto = {
  id: number
  name: string
  description?: string | null
  time: string
  organisationId?: number | null
  city?: string | null
  venue?: string | null
  eventType?: 'IN_PERSON' | 'ONLINE' | null
}

export type OrganisationDto = {
  id: number
  name: string
  description?: string | null
  events?: EventDto[] | null
  orgCity?: string | null
}

type ToggleEventVariables = {
  event: EventDto
  isAttending: boolean
}

type ToggleOrganisationVariables = {
  organisation: OrganisationDto
  isFollowing: boolean
}

async function requestJson<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Backend returned an unexpected response')
  }

  return response.json() as Promise<T>
}

function isArrayResponse<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function useEventsAndOrganisations(enabled: boolean) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const queryClient = useQueryClient()
  const canFetch = enabled && isLoaded && Boolean(isSignedIn) && Boolean(userId)
  const attendingKey = ['my-attending-events', userId] as const
  const followingKey = ['my-followed-organisations', userId] as const

  async function getRequiredToken() {
    const token = await getToken()

    if (!token) {
      throw new Error('Missing Clerk token')
    }

    return token
  }

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const token = await getRequiredToken()
      const events = await requestJson<unknown>('/api/events', token)

      if (!isArrayResponse<EventDto>(events)) {
        throw new Error('Backend returned invalid event data')
      }

      return events
    },
    enabled: canFetch,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const organisationsQuery = useQuery({
    queryKey: ['organisations'],
    queryFn: async () => {
      const token = await getRequiredToken()
      const organisations = await requestJson<unknown>(
        '/api/organisations',
        token,
      )

      if (!isArrayResponse<OrganisationDto>(organisations)) {
        throw new Error('Backend returned invalid organisation data')
      }

      return organisations
    },
    enabled: canFetch,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const attendingQuery = useQuery({
    queryKey: attendingKey,
    queryFn: async () => {
      const token = await getRequiredToken()
      const events = await requestJson<unknown>(
        '/api/users/me/attending-events',
        token,
      )

      if (!isArrayResponse<EventDto>(events)) {
        throw new Error('Backend returned invalid attendance data')
      }

      return events
    },
    enabled: canFetch,
    staleTime: 60_000,
    retry: 1,
  })

  const followingQuery = useQuery({
    queryKey: followingKey,
    queryFn: async () => {
      const token = await getRequiredToken()
      const organisations = await requestJson<unknown>(
        '/api/users/me/followedOrg',
        token,
      )

      if (!isArrayResponse<OrganisationDto>(organisations)) {
        throw new Error('Backend returned invalid following data')
      }

      return organisations
    },
    enabled: canFetch,
    staleTime: 60_000,
    retry: 1,
  })

  const attendanceMutation = useMutation({
    mutationFn: async ({ event, isAttending }: ToggleEventVariables) => {
      const token = await getRequiredToken()
      await requestJson<unknown>(
        `/api/users/me/attendingEvent/${event.id}`,
        token,
        isAttending ? 'DELETE' : 'POST',
      )
    },
    onSuccess: (_, { event, isAttending }) => {
      queryClient.setQueryData<EventDto[]>(attendingKey, (current = []) =>
        isAttending
          ? current.filter((item) => item.id !== event.id)
          : [...current.filter((item) => item.id !== event.id), event],
      )
      void queryClient.invalidateQueries({ queryKey: attendingKey })
      void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const followingMutation = useMutation({
    mutationFn: async ({
      organisation,
      isFollowing,
    }: ToggleOrganisationVariables) => {
      const token = await getRequiredToken()
      await requestJson<unknown>(
        `/api/users/me/followedOrg/${organisation.id}`,
        token,
        isFollowing ? 'DELETE' : 'POST',
      )
    },
    onSuccess: (_, { organisation, isFollowing }) => {
      queryClient.setQueryData<OrganisationDto[]>(
        followingKey,
        (current = []) =>
          isFollowing
            ? current.filter((item) => item.id !== organisation.id)
            : [
                ...current.filter((item) => item.id !== organisation.id),
                organisation,
              ],
      )
      void queryClient.invalidateQueries({ queryKey: followingKey })
    },
  })

  return {
    eventsQuery,
    organisationsQuery,
    attendingQuery,
    followingQuery,
    attendanceMutation,
    followingMutation,
  }
}
