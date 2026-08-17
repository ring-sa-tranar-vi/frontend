import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getApiBaseUrl } from '../../lib/apiBaseUrl.ts'
import useCurrentUser from '../../hooks/useCurrentUser.ts'
import { useCallbackPreferences } from '../../hooks/useCallbackPreferences.ts'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/apiBaseUrl.ts', () => ({
  getApiBaseUrl: vi.fn(),
}))

vi.mock('../../hooks/useCurrentUser.ts', () => ({
  default: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetApiBaseUrl = vi.mocked(getApiBaseUrl)
const mockUseCurrentUser = vi.mocked(useCurrentUser)
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createQueryWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCallbackPreferences', () => {
  const defaultAuth = {
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }

  const defaultUser = {
    userId: 'user_123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuth as any)
    mockUseCurrentUser.mockReturnValue(defaultUser as any)
    mockGetApiBaseUrl.mockReturnValue('https://api.example.com')
  })

  describe('saveCallbackMutation', () => {
    it('successfully posts callback preference with weekly repetition and invalidates calendar query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await result.current.saveCallbackMutation.mutateAsync({
        weekday: 'monday',
        time: '14:30',
        repeat: 'weekly',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/user_123/callback-preference',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            day: 'MONDAY',
            time: '14:30:00',
            repeatType: 'WEEKLY',
          }),
        },
      )

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['calendar'] })
    })

    it('maps repeat type "never" to "NEVER"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await result.current.saveCallbackMutation.mutateAsync({
        weekday: 'friday',
        time: '09:00',
        repeat: 'never',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            day: 'FRIDAY',
            time: '09:00:00',
            repeatType: 'NEVER',
          }),
        }),
      )
    })
  })

  describe('removeCallbackMutation', () => {
    it('successfully sends delete request for weekday and invalidates calendar query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await result.current.removeCallbackMutation.mutateAsync({
        activityId: 'activity-123',
        weekday: 'wednesday',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/user_123/callback-preference/WEDNESDAY',
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer mock-token',
          },
        },
      )

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['calendar'] })
    })
  })

  describe('error handling & authentication constraints', () => {
    it('throws error when user is not signed in', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuth,
        isSignedIn: false,
      } as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await expect(
        result.current.saveCallbackMutation.mutateAsync({
          weekday: 'tuesday',
          time: '10:00',
          repeat: 'weekly',
        }),
      ).rejects.toThrow('Missing signed-in user')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws error when auth token is missing', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuth,
        getToken: vi.fn().mockResolvedValue(null),
      } as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await expect(
        result.current.saveCallbackMutation.mutateAsync({
          weekday: 'tuesday',
          time: '10:00',
          repeat: 'weekly',
        }),
      ).rejects.toThrow('Missing Clerk token')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws custom backend message when API responds with non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Invalid time slot'),
      })

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await expect(
        result.current.saveCallbackMutation.mutateAsync({
          weekday: 'thursday',
          time: '11:00',
          repeat: 'weekly',
        }),
      ).rejects.toThrow('Invalid time slot')
    })

    it('falls back to status code message when backend error text is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockRejectedValue(new Error()),
      })

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCallbackPreferences(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await expect(
        result.current.removeCallbackMutation.mutateAsync({
          activityId: 'act-1',
          weekday: 'sunday',
        }),
      ).rejects.toThrow('Request failed (500)')
    })
  })
})
