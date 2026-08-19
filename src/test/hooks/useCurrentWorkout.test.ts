import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@clerk/react'
import { getJson } from '../../lib/api/fetcher'
import useCurrentUser from '../../hooks/useCurrentUser'
import useCurrentWorkout from '../../hooks/useCurrentWorkout'

// Mock localStorage for Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/api/fetcher', () => ({
  getJson: vi.fn(),
}))

vi.mock('../../hooks/useCurrentUser', () => ({
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

describe('useCurrentWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    mockUseCurrentUser.mockReturnValue({
      userId: 'user-123',
      level: 2,
      context: 'Morning routine',
      clerkId: 'clerk-123',
      isSignedIn: true,
      isProfileLoading: false,
      isProfileError: false,
      user: null,
      trainerId: null,
      refetchProfile: vi.fn(),
      updateProfile: vi.fn(),
    })
  })

  it('does not fetch data when signed out', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      getToken: vi.fn(),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.workouts).toEqual([])
    expect(result.current.currentWorkout).toBeNull()
    expect(result.current.alreadyCompletedToday).toBe(false)
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('fetches workouts and recommended workout successfully', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('test-token'),
    } as any)

    const mockWorkouts = [
      { id: 1, name: 'Full Body Prep' },
      { id: 2, name: 'Core Crusher' },
    ]

    mockGetJson.mockImplementation((url) => {
      if (url === '/api/workouts') {
        return Promise.resolve(mockWorkouts as any)
      }
      if (url.includes('/has-completed-today')) {
        return Promise.resolve({ hasCompletedToday: false } as any)
      }
      if (url.includes('/recommend-for/')) {
        return Promise.resolve({
          workoutId: 2,
          reasoning: 'Focus on core today',
        } as any)
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentWorkout).not.toBeNull()
    })

    expect(result.current.workouts).toEqual(mockWorkouts)
    expect(result.current.currentWorkoutId).toBe('2')
    expect(result.current.currentWorkout).toEqual(mockWorkouts[1])
    expect(result.current.recommendedWorkoutReasoning).toBe(
      'Focus on core today',
    )
    expect(result.current.alreadyCompletedToday).toBe(false)

    expect(
      window.localStorage.getItem('ringv2.currentWorkout.recommendation'),
    ).toContain('"workoutId":2')
  })

  it('uses cached recommendation from localStorage if profile has not changed', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('test-token'),
    } as any)

    const cachedProfile = {
      userId: 'user-123',
      level: 2,
      context: 'Morning routine',
    }
    const cachedRecommendation = {
      workoutId: 1,
      reasoning: 'Cached recommendation reasoning',
    }

    window.localStorage.setItem(
      'ringv2.currentWorkout.profile',
      JSON.stringify(cachedProfile),
    )
    window.localStorage.setItem(
      'ringv2.currentWorkout.recommendation',
      JSON.stringify(cachedRecommendation),
    )

    const mockWorkouts = [{ id: 1, name: 'Workout 1' }]
    mockGetJson.mockImplementation((url) => {
      if (url === '/api/workouts') {
        return Promise.resolve(mockWorkouts as any)
      }
      if (url.includes('/has-completed-today')) {
        return Promise.resolve({ hasCompletedToday: false } as any)
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.currentWorkoutId).toBe('1')
    expect(result.current.recommendedWorkoutReasoning).toBe(
      'Cached recommendation reasoning',
    )
    expect(mockGetJson).not.toHaveBeenCalledWith(
      expect.stringContaining('/recommend-for/'),
      expect.anything(),
    )
  })

  it('sets currentWorkout to null when user has already completed a workout today', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('test-token'),
    } as any)

    const mockWorkouts = [{ id: 1, name: 'Workout 1' }]

    mockGetJson.mockImplementation((url) => {
      if (url === '/api/workouts') {
        return Promise.resolve(mockWorkouts as any)
      }
      if (url.includes('/has-completed-today')) {
        return Promise.resolve({ hasCompletedToday: true } as any)
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.alreadyCompletedToday).toBe(true)
    })

    expect(result.current.currentWorkoutId).toBeUndefined()
    expect(result.current.currentWorkout).toBeNull()
  })

  it('allows manually selecting a workout and custom reasoning', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('test-token'),
    } as any)

    const mockWorkouts = [
      { id: 1, name: 'Workout 1' },
      { id: 2, name: 'Workout 2' },
    ]

    mockGetJson.mockImplementation((url) => {
      if (url === '/api/workouts') {
        return Promise.resolve(mockWorkouts as any)
      }
      if (url.includes('/has-completed-today')) {
        return Promise.resolve({ hasCompletedToday: false } as any)
      }
      if (url.includes('/recommend-for/')) {
        return Promise.resolve({
          workoutId: 1,
          reasoning: 'Initial reasoning',
        } as any)
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.currentWorkoutId).toBe('1')
    })

    act(() => {
      result.current.updateCurrentWorkout('2', 'Manual selection reasoning')
    })

    expect(result.current.currentWorkoutId).toBe('2')
    expect(result.current.currentWorkout).toEqual(mockWorkouts[1])
    expect(result.current.recommendedWorkoutReasoning).toBe(
      'Manual selection reasoning',
    )
  })

  it('flags isError when fetching workouts fails', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('test-token'),
    } as any)

    mockGetJson.mockRejectedValue(new Error('Network response failed'))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
