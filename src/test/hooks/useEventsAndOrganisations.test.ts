import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type EventDto,
  useEventsAndOrganisations,
} from '../../hooks/useEventsAndOrganisations.ts'

// --- Mocks ---

const mockGetToken = vi.fn()
const mockAuthReturn = {
  getToken: mockGetToken,
  isLoaded: true,
  isSignedIn: true,
  userId: 'user-123',
}

vi.mock('@clerk/react', () => ({ useAuth: () => mockAuthReturn }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => mockAuthReturn }))
vi.mock('@clerk/nextjs', () => ({ useAuth: () => mockAuthReturn }))

vi.mock('../../lib/apiBaseUrl', () => ({
  getApiBaseUrl: () => 'http://localhost:8080',
}))
vi.mock('../lib/apiBaseUrl', () => ({
  getApiBaseUrl: () => 'http://localhost:8080',
}))
vi.mock('@/lib/apiBaseUrl', () => ({
  getApiBaseUrl: () => 'http://localhost:8080',
}))

// --- Helper Utilities ---

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createTextResponse(
  text: string,
  status = 200,
  contentType = 'text/plain',
): Response {
  return new Response(text, {
    status,
    headers: { 'content-type': contentType },
  })
}

describe('useEventsAndOrganisations - Edge Cases & State Tests', () => {
  const mockToken = 'mock-bearer-token'
  const mockUserId = 'user-123'

  const sampleEvent1: EventDto = {
    id: 1,
    name: 'React Summit',
    time: '2026-09-01T10:00:00Z',
  }
  const sampleEvent2: EventDto = {
    id: 2,
    name: 'Node Conference',
    time: '2026-10-15T18:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue(mockToken)
    mockAuthReturn.isLoaded = true
    mockAuthReturn.isSignedIn = true
    mockAuthReturn.userId = mockUserId
    global.fetch = vi.fn()
  })

  describe('Dynamic Prop & Re-render Behavior', () => {
    it('triggers queries when enabled prop changes from false to true dynamically', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createJsonResponse([sampleEvent1])),
      )

      const queryClient = createTestQueryClient()
      const { result, rerender } = renderHook(
        ({ enabled }) => useEventsAndOrganisations(enabled),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { enabled: false },
        },
      )

      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.eventsQuery.isFetching).toBe(false)

      rerender({ enabled: true })

      await waitFor(() => {
        expect(result.current.eventsQuery.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalled()
      expect(result.current.eventsQuery.data).toEqual([sampleEvent1])
    })

    it('fetches new endpoints when fetchOptions flags change on re-render', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createJsonResponse([sampleEvent1])),
      )

      const queryClient = createTestQueryClient()
      const { rerender } = renderHook(
        ({ options }) => useEventsAndOrganisations(true, options),
        {
          wrapper: createWrapper(queryClient),
          initialProps: {
            options: {
              fetchEvents: true,
              fetchOrganisations: false,
              fetchAttendance: false,
              fetchFollowing: false,
            },
          },
        },
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      rerender({
        options: {
          fetchEvents: true,
          fetchOrganisations: true,
          fetchAttendance: false,
          fetchFollowing: false,
        },
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Auth Edge Cases & Exceptions', () => {
    it('handles unexpected exceptions thrown during token retrieval', async () => {
      mockGetToken.mockRejectedValue(new Error('Clerk SDK session expired'))

      const queryClient = createTestQueryClient()
      const { result } = renderHook(
        () =>
          useEventsAndOrganisations(true, {
            fetchEvents: true,
            fetchOrganisations: false,
            fetchAttendance: false,
            fetchFollowing: false,
          }),
        { wrapper: createWrapper(queryClient) },
      )

      await waitFor(
        () => {
          expect(result.current.eventsQuery.isError).toBe(true)
        },
        { timeout: 3000 },
      )

      expect(result.current.eventsQuery.error?.message).toBe(
        'Clerk SDK session expired',
      )
    })

    it('stops fetching when user logs out mid-lifecycle', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createJsonResponse([sampleEvent1])),
      )

      const queryClient = createTestQueryClient()
      const { result, rerender } = renderHook(
        () => useEventsAndOrganisations(true),
        {
          wrapper: createWrapper(queryClient),
        },
      )

      await waitFor(() => {
        expect(result.current.eventsQuery.isSuccess).toBe(true)
      })

      mockAuthReturn.isSignedIn = false
      mockAuthReturn.userId = 'user-123'
      mockGetToken.mockResolvedValue(null)

      rerender()

      expect(result.current.attendingQuery.fetchStatus).toBe('idle')
    })
  })

  describe('Network Failures & Payload Handling', () => {
    it('handles total network failures (fetch throws TypeError)', async () => {
      vi.mocked(global.fetch).mockRejectedValue(
        new TypeError('Failed to fetch'),
      )

      const queryClient = createTestQueryClient()
      const { result } = renderHook(
        () =>
          useEventsAndOrganisations(true, {
            fetchEvents: true,
            fetchOrganisations: false,
            fetchAttendance: false,
            fetchFollowing: false,
          }),
        { wrapper: createWrapper(queryClient) },
      )

      await waitFor(
        () => {
          expect(result.current.eventsQuery.isError).toBe(true)
        },
        { timeout: 3000 },
      )

      expect(result.current.eventsQuery.error?.message).toBe('Failed to fetch')
    })

    it('successfully parses empty array responses', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createJsonResponse([])),
      )

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useEventsAndOrganisations(true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.eventsQuery.isSuccess).toBe(true)
      })

      expect(result.current.eventsQuery.data).toEqual([])
    })
  })

  describe('Cache Integrity & Mutations', () => {
    it('preserves existing items when adding an event to attendance list', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createTextResponse('OK', 200)),
      )

      const queryClient = createTestQueryClient()
      const attendingKey = ['my-attending-events', mockUserId]

      queryClient.setQueryData(attendingKey, [sampleEvent1])

      const { result } = renderHook(
        () =>
          useEventsAndOrganisations(true, {
            fetchEvents: false,
            fetchOrganisations: false,
            fetchAttendance: false,
            fetchFollowing: false,
          }),
        { wrapper: createWrapper(queryClient) },
      )

      await act(async () => {
        await result.current.attendanceMutation.mutateAsync({
          event: sampleEvent2,
          isAttending: false,
        })
      })

      expect(queryClient.getQueryData(attendingKey)).toEqual([
        sampleEvent1,
        sampleEvent2,
      ])
    })

    it('rejects attendance mutation when API returns a server error and leaves cache intact', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(createTextResponse('Database Connection Error', 500)),
      )

      const queryClient = createTestQueryClient()
      const attendingKey = ['my-attending-events', mockUserId]

      queryClient.setQueryData(attendingKey, [sampleEvent1])

      const { result } = renderHook(
        () =>
          useEventsAndOrganisations(true, {
            fetchEvents: false,
            fetchOrganisations: false,
            fetchAttendance: false,
            fetchFollowing: false,
          }),
        { wrapper: createWrapper(queryClient) },
      )

      await expect(
        result.current.attendanceMutation.mutateAsync({
          event: sampleEvent1,
          isAttending: true,
        }),
      ).rejects.toThrow('Database Connection Error')

      expect(queryClient.getQueryData(attendingKey)).toEqual([sampleEvent1])
    })
  })
})
