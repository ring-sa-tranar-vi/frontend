import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@clerk/react'
import { getJson } from '../../lib/api/fetcher'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useUpdateProfile } from '../../hooks/useUpdateProfile'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/api/fetcher', () => ({
  getJson: vi.fn(),
}))

vi.mock('../../hooks/useUpdateProfile', () => ({
  useUpdateProfile: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetJson = vi.mocked(getJson)
const mockUseUpdateProfile = vi.mocked(useUpdateProfile)

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

describe('useCurrentUser', () => {
  const mockMutateAsync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateProfile.mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as any)
  })

  it('does not fetch profile data when user is signed out', () => {
    mockUseAuth.mockReturnValue({
      userId: null,
      isSignedIn: false,
      getToken: vi.fn(),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isProfileLoading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.userId).toBeNull()
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('fetches profile successfully when authenticated', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('valid-token')
    mockUseAuth.mockReturnValue({
      userId: 'clerk-user-123',
      isSignedIn: true,
      getToken: mockGetToken,
    } as any)

    const mockProfile = {
      id: 42,
      trainerId: 7,
      intensityLevel: 4,
      name: 'Jane Doe',
      context: 'Fitness goals',
      city: 'Stockholm',
      onboarding: true,
    }
    mockGetJson.mockResolvedValueOnce(mockProfile)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isProfileLoading).toBe(false)
    })

    expect(mockGetToken).toHaveBeenCalledTimes(1)
    expect(mockGetJson).toHaveBeenCalledWith('/api/users/me/profile', {
      token: 'valid-token',
    })
    expect(result.current.user).toEqual(mockProfile)
    expect(result.current.userId).toBe('42')
    expect(result.current.trainerId).toBe(7)
    expect(result.current.level).toBe(4)
    expect(result.current.context).toBe('Fitness goals')
  })

  it('flags isProfileError when profile API fails', async () => {
    mockUseAuth.mockReturnValue({
      userId: 'clerk-user-123',
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('valid-token'),
    } as any)

    mockGetJson.mockRejectedValue(new Error('Profile request failed'))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isProfileError).toBe(true)
    })
  })

  it('updates profile, invalidates queries, and triggers mutation', async () => {
    mockUseAuth.mockReturnValue({
      userId: 'clerk-user-123',
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('valid-token'),
    } as any)

    const existingProfile = {
      id: 42,
      trainerId: 5,
      intensityLevel: 2,
      name: 'John',
      context: 'Initial context',
      city: 'Paris',
      onboarding: false,
    }
    mockGetJson.mockResolvedValueOnce(existingProfile)
    mockMutateAsync.mockResolvedValueOnce({})

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(existingProfile)
    })

    await act(async () => {
      await result.current.updateProfile({
        name: 'John Updated',
        trainerId: 10,
      })
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: 'John Updated',
      intensityLevel: 2,
      context: 'Initial context',
      trainerId: 10,
      city: 'Paris',
      onboarding: false,
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['myProfile'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trainer', '10'] })
  })
})
