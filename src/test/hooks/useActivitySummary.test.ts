import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJson } from '../../lib/api/fetcher.ts'
import {
  activityProgressQueryKey,
  buildActivitySummary,
  type ProgressResponse,
  useActivitySummary,
} from '../../hooks/useActivitySummary.ts'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/api/fetcher.ts', () => ({
  getJson: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetJson = vi.mocked(getJson)

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

describe('Activity Summary Utilities & Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('activityProgressQueryKey', () => {
    it('returns formatted query key with user ID', () => {
      expect(activityProgressQueryKey('user_123')).toEqual([
        'my-progress',
        'user_123',
      ])
    })

    it('handles null or undefined user ID', () => {
      expect(activityProgressQueryKey(null)).toEqual(['my-progress', null])
      expect(activityProgressQueryKey(undefined)).toEqual([
        'my-progress',
        undefined,
      ])
    })
  })

  describe('buildActivitySummary', () => {
    it('returns default zeroed summary for invalid or empty input', () => {
      const summary = buildActivitySummary(null, 'invalid-date')

      expect(summary).toEqual({
        currentStreak: 0,
        personalRecord: 0,
        activeWeekdays: [],
        hasCompletedWorkouts: false,
        hasDetailedHistory: true,
      })
    })

    it('calculates current streak when workout is completed today', () => {
      const completedDates = ['2026-08-11', '2026-08-12', '2026-08-13']
      const summary = buildActivitySummary(completedDates, '2026-08-13')

      expect(summary.currentStreak).toBe(3)
      expect(summary.personalRecord).toBe(3)
      expect(summary.hasCompletedWorkouts).toBe(true)
    })

    it('maintains current streak when today is not completed but yesterday was', () => {
      const completedDates = ['2026-08-11', '2026-08-12']
      const summary = buildActivitySummary(completedDates, '2026-08-13')

      expect(summary.currentStreak).toBe(2)
      expect(summary.personalRecord).toBe(2)
    })

    it('resets current streak to 0 if streak was broken before yesterday', () => {
      const completedDates = ['2026-08-10']
      const summary = buildActivitySummary(completedDates, '2026-08-13')

      expect(summary.currentStreak).toBe(0)
      expect(summary.personalRecord).toBe(1)
    })

    it('ignores completed dates in the future relative to todayKey', () => {
      const completedDates = ['2026-08-13', '2026-08-14', '2026-08-15']
      const summary = buildActivitySummary(completedDates, '2026-08-13')

      expect(summary.currentStreak).toBe(1)
      expect(summary.hasCompletedWorkouts).toBe(true)
    })

    it('identifies active weekdays for the current week', () => {
      const completedDates = ['2026-08-10', '2026-08-12', '2026-08-13']
      const summary = buildActivitySummary(completedDates, '2026-08-13')

      expect(summary.activeWeekdays.length).toBeGreaterThan(0)
    })
  })

  describe('useActivitySummary', () => {
    const defaultAuthProps = {
      getToken: vi.fn().mockResolvedValue('mock-token'),
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_123',
      orgId: null,
      orgRole: null,
      orgSlug: null,
      signOut: vi.fn(),
      has: vi.fn(),
    }

    it('does not fetch when enabled parameter is false', () => {
      mockUseAuth.mockReturnValue(defaultAuthProps as any)
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useActivitySummary(false), {
        wrapper: createQueryWrapper(queryClient),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockGetJson).not.toHaveBeenCalled()
    })

    it('does not fetch when user is not signed in', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthProps,
        isSignedIn: false,
      } as any)
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useActivitySummary(true), {
        wrapper: createQueryWrapper(queryClient),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockGetJson).not.toHaveBeenCalled()
    })

    it('fetches progress data and processes completedDates when present', async () => {
      mockUseAuth.mockReturnValue(defaultAuthProps as any)

      const mockResponse: ProgressResponse = {
        currentStreak: 2,
        completedDates: ['2026-08-12', '2026-08-13'],
        completedWorkouts: [{ dateLabel: 'Idag', workoutName: 'Leg Day' }],
      }
      mockGetJson.mockResolvedValue(mockResponse)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useActivitySummary(true), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetJson).toHaveBeenCalledWith('/api/users/me/progress', {
        token: 'mock-token',
      })
      expect(result.current.data?.hasCompletedWorkouts).toBe(true)
      expect(result.current.data?.hasDetailedHistory).toBe(true)
    })

    it('falls back to buildCurrentProgressSummary when completedDates is missing', async () => {
      mockUseAuth.mockReturnValue(defaultAuthProps as any)

      const mockResponse: ProgressResponse = {
        currentStreak: 5,
        completedWorkouts: [{ dateLabel: 'Igår', workoutName: 'Cardio' }],
      }
      mockGetJson.mockResolvedValue(mockResponse)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useActivitySummary(true), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.currentStreak).toBe(5)
      expect(result.current.data?.hasCompletedWorkouts).toBe(true)
      expect(result.current.data?.hasDetailedHistory).toBe(false)
    })

    it('throws error when token is missing', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthProps,
        getToken: vi.fn().mockResolvedValue(null),
      } as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useActivitySummary(true), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Missing Clerk token')
    })
  })
})
