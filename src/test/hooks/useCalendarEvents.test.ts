import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJson } from '../../lib/api/fetcher.ts'
import useCurrentUser from '../../hooks/useCurrentUser.ts'
import { useCalendarEvents } from '../../hooks/useCalendarEvents.ts'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/api/fetcher.ts', () => ({
  getJson: vi.fn(),
}))

vi.mock('../../hooks/useCurrentUser.ts', () => ({
  default: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetJson = vi.mocked(getJson)
const mockUseCurrentUser = vi.mocked(useCurrentUser)

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
    },
  })
}

function createQueryWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCalendarEvents', () => {
  const defaultAuth = {
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }

  const defaultUser = {
    userId: 'user_123',
    isSignedIn: true,
    isProfileLoading: false,
    isProfileError: false,
    refetchProfile: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuth as any)
    mockUseCurrentUser.mockReturnValue(defaultUser as any)
  })

  it('does not fetch events when enabled is false', () => {
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8, false), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('does not fetch when profile is loading or user is not signed in', () => {
    mockUseCurrentUser.mockReturnValue({
      ...defaultUser,
      isProfileLoading: true,
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8, true), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('fetches calendar events, maps DTOs correctly, and sorts them chronologically', async () => {
    const rawEvents = [
      {
        id: 'event-2',
        type: 'EVENT',
        title: ' Team Meeting ',
        time: '2026-08-15T14:30:00',
        description: '  Sync up on q3 targets  ',
        completed: false,
      },
      {
        id: 'event-1',
        type: 'WORKOUT',
        title: 'Leg Day',
        time: '2026-08-15T09:00:00',
        completed: true,
      },
      {
        id: 'event-3',
        type: 'CALL',
        title: 'Client Call',
        time: '2026-08-15T14:30:00',
        description: 'Should be stripped for callback kind',
        completed: 0,
      },
    ]

    mockGetJson.mockResolvedValue(rawEvents)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetJson).toHaveBeenCalledWith(
      '/api/v1/calendar?userId=user_123&year=2026&month=8',
      { token: 'mock-token' },
    )

    expect(result.current.hasData).toBe(true)
    expect(result.current.activities).toEqual([
      {
        id: 'event-1',
        date: '2026-08-15',
        kind: 'workout',
        title: 'Leg Day',
        time: '09:00',
        description: undefined,
        completed: true,
      },
      {
        id: 'event-2',
        date: '2026-08-15',
        kind: 'event',
        title: 'Team Meeting',
        time: '14:30',
        description: 'Sync up on q3 targets',
        completed: false,
      },
      {
        id: 'event-3',
        date: '2026-08-15',
        kind: 'callback',
        title: 'Client Call',
        time: '14:30',
        description: undefined,
        completed: false,
      },
    ])
  })

  it('filters out invalid or malformed event DTOs', async () => {
    const malformedEvents = [
      {
        id: 'valid-1',
        type: 'WORKOUT',
        title: 'Valid Workout',
        time: '2026-08-10T10:00:00',
      },
      {
        id: 'invalid-date',
        type: 'WORKOUT',
        title: 'Bad Date',
        time: '2026-02-30T10:00:00',
      },
      {
        id: 'invalid-time',
        type: 'WORKOUT',
        title: 'Bad Time',
        time: '2026-08-10T25:99:00',
      },
      {
        id: 'unknown-kind',
        type: 'UNSUPPORTED_TYPE',
        title: 'Unknown',
        time: '2026-08-10T10:00:00',
      },
    ]

    mockGetJson.mockResolvedValue(malformedEvents)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.activities).toHaveLength(1)
    expect(result.current.activities[0].id).toBe('valid-1')
  })

  it('throws an error when auth token is missing', async () => {
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue(null),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Missing Clerk token')
  })

  it('throws an error if backend returns a non-array response', async () => {
    mockGetJson.mockResolvedValue({ error: 'Invalid parameters' })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Invalid calendar response')
  })

  it('delegates refetch to refetchProfile when profile error occurs', async () => {
    const mockRefetchProfile = vi.fn().mockResolvedValue({} as any)
    mockUseCurrentUser.mockReturnValue({
      ...defaultUser,
      isProfileError: true,
      refetchProfile: mockRefetchProfile,
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCalendarEvents(2026, 8, false), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isError).toBe(true)

    await result.current.refetch()
    expect(mockRefetchProfile).toHaveBeenCalled()
  })
})
