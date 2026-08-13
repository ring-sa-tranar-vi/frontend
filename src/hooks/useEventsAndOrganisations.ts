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
  attendeesCount?: number
}

export type OrganisationDto = {
  id: number
  name: string
  description?: string | null
  events?: EventDto[] | null
  orgCity?: string | null
  followersCount?: number
}

type ToggleEventVariables = {
  event: EventDto
  isAttending: boolean
}

type ToggleOrganisationVariables = {
  organisation: OrganisationDto
  isFollowing: boolean
}

type EventsAndOrganisationsOptions = {
  fetchEvents?: boolean
  fetchOrganisations?: boolean
  fetchAttendance?: boolean
  fetchFollowing?: boolean
}

function adjustOptionalCount(value: number | undefined, delta: number) {
  return typeof value === 'number' ? Math.max(0, value + delta) : undefined
}

async function request(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
): Promise<Response> {
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

  return response
}

async function requestJson<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
): Promise<T> {
  const response = await request(path, token, method)
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Backend returned an unexpected response')
  }

  return response.json() as Promise<T>
}

function isArrayResponse<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function useEventsAndOrganisations(
  enabled: boolean,
  {
    fetchEvents = true,
    fetchOrganisations = true,
    fetchAttendance = true,
    fetchFollowing = true,
  }: EventsAndOrganisationsOptions = {},
) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const queryClient = useQueryClient()
  const canFetch = enabled && isLoaded && Boolean(isSignedIn) && Boolean(userId)
  const eventsKey = ['events', 'list'] as const
  const organisationsKey = ['organisations', 'list'] as const
  const attendingKey = ['viewer', userId, 'attending-events'] as const
  const followingKey = ['viewer', userId, 'followed-organisations'] as const

  async function getRequiredToken() {
    const token = await getToken()

    if (!token) {
      throw new Error('Missing Clerk token')
    }

    return token
  }

  const eventsQuery = useQuery({
    queryKey: eventsKey,
    queryFn: async () => {
      const token = await getRequiredToken()
      const events = await requestJson<unknown>('/api/events', token)

      if (!isArrayResponse<EventDto>(events)) {
        throw new Error('Backend returned invalid event data')
      }

      return events
    },
    enabled: canFetch && fetchEvents,
    staleTime: 60_000,
    retry: 1,
  })

  const organisationsQuery = useQuery({
    queryKey: organisationsKey,
    queryFn: async () => {
      const token = await getRequiredToken()
      const organisations = await requestJson<unknown>(
        '/api/organizations',
        token,
      )

      if (!isArrayResponse<OrganisationDto>(organisations)) {
        throw new Error('Backend returned invalid organisation data')
      }

      return organisations
    },
    enabled: canFetch && fetchOrganisations,
    staleTime: 60_000,
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
    enabled: canFetch && fetchAttendance,
    staleTime: 60_000,
    retry: 1,
  })

  const followingQuery = useQuery({
    queryKey: followingKey,
    queryFn: async () => {
      const token = await getRequiredToken()
      const organisations = await requestJson<unknown>(
        '/api/users/me/followed-orgs',
        token,
      )

      if (!isArrayResponse<OrganisationDto>(organisations)) {
        throw new Error('Backend returned invalid following data')
      }

      return organisations
    },
    enabled: canFetch && fetchFollowing,
    staleTime: 60_000,
    retry: 1,
  })

  const attendanceMutation = useMutation({
    mutationFn: async ({ event, isAttending }: ToggleEventVariables) => {
      const token = await getRequiredToken()
      await request(
        `/api/users/me/attending-events/${event.id}`,
        token,
        isAttending ? 'DELETE' : 'POST',
      )
    },
    onMutate: async ({ event, isAttending }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: attendingKey }),
        queryClient.cancelQueries({ queryKey: eventsKey }),
        queryClient.cancelQueries({ queryKey: organisationsKey }),
      ])
      const previous = queryClient.getQueryData<EventDto[]>(attendingKey)
      const previousEvents = queryClient.getQueryData<EventDto[]>(eventsKey)
      const previousOrganisations =
        queryClient.getQueryData<OrganisationDto[]>(organisationsKey)
      const countDelta = isAttending ? -1 : 1

      queryClient.setQueryData<EventDto[]>(attendingKey, (current = []) =>
        isAttending
          ? current.filter((item) => item.id !== event.id)
          : [...current.filter((item) => item.id !== event.id), event],
      )

      queryClient.setQueryData<EventDto[]>(eventsKey, (current) =>
        current?.map((item) =>
          item.id === event.id
            ? {
                ...item,
                attendeesCount: adjustOptionalCount(
                  item.attendeesCount,
                  countDelta,
                ),
              }
            : item,
        ),
      )

      queryClient.setQueryData<OrganisationDto[]>(organisationsKey, (current) =>
        current?.map((organisation) => ({
          ...organisation,
          events: organisation.events?.map((item) =>
            item.id === event.id
              ? {
                  ...item,
                  attendeesCount: adjustOptionalCount(
                    item.attendeesCount,
                    countDelta,
                  ),
                }
              : item,
          ),
        })),
      )

      return { previous, previousEvents, previousOrganisations }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(attendingKey, context?.previous)
      queryClient.setQueryData(eventsKey, context?.previousEvents)
      queryClient.setQueryData(organisationsKey, context?.previousOrganisations)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: attendingKey })
      void queryClient.invalidateQueries({ queryKey: eventsKey })
      void queryClient.invalidateQueries({ queryKey: organisationsKey })
      void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const followingMutation = useMutation({
    mutationFn: async ({
      organisation,
      isFollowing,
    }: ToggleOrganisationVariables) => {
      const token = await getRequiredToken()
      await request(
        `/api/users/me/followed-orgs/${organisation.id}`,
        token,
        isFollowing ? 'DELETE' : 'POST',
      )
    },
    onMutate: async ({ organisation, isFollowing }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: followingKey }),
        queryClient.cancelQueries({ queryKey: organisationsKey }),
      ])
      const previous = queryClient.getQueryData<OrganisationDto[]>(followingKey)
      const previousOrganisations =
        queryClient.getQueryData<OrganisationDto[]>(organisationsKey)
      const countDelta = isFollowing ? -1 : 1

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

      queryClient.setQueryData<OrganisationDto[]>(organisationsKey, (current) =>
        current?.map((item) =>
          item.id === organisation.id
            ? {
                ...item,
                followersCount: adjustOptionalCount(
                  item.followersCount,
                  countDelta,
                ),
              }
            : item,
        ),
      )

      return { previous, previousOrganisations }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(followingKey, context?.previous)
      queryClient.setQueryData(organisationsKey, context?.previousOrganisations)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: followingKey })
      void queryClient.invalidateQueries({ queryKey: organisationsKey })
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
