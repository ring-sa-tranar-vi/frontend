import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@clerk/react'
import { getJson } from '../../lib/api/fetcher'
import { useCurrentTrainer } from '../../hooks/useCurrentTrainer'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/api/fetcher', () => ({
  getJson: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockGetJson = vi.mocked(getJson)

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function createQueryWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCurrentTrainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch trainer data when user is signed out', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      getToken: vi.fn(),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentTrainer('trainer-123'), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isTrainerLoading).toBe(false)
    expect(result.current.trainer).toBeUndefined()
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('does not fetch trainer data when trainerId is empty', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn(),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentTrainer(''), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isTrainerLoading).toBe(false)
    expect(mockGetJson).not.toHaveBeenCalled()
  })

  it('fetches trainer data successfully when authenticated', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('valid-token')
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: mockGetToken,
    } as any)

    const mockTrainer = {
      id: 'trainer-123',
      name: 'Coach Alex',
      voice: 'Echo',
      prompt: 'Stay focused!',
    }
    mockGetJson.mockResolvedValueOnce(mockTrainer)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentTrainer('trainer-123'), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isTrainerLoading).toBe(false)
    })

    expect(mockGetToken).toHaveBeenCalledTimes(1)
    expect(mockGetJson).toHaveBeenCalledWith('/api/trainers/trainer-123', {
      token: 'valid-token',
    })
    expect(result.current.trainer).toEqual(mockTrainer)
    expect(result.current.voice).toBe('Echo')
    expect(result.current.coachPrompt).toBe('Stay focused!')
  })

  it('uses default voice fallback when trainer has no custom voice', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('valid-token'),
    } as any)

    mockGetJson.mockResolvedValueOnce({
      id: 'trainer-123',
      name: 'Coach Alex',
      prompt: 'Let us begin.',
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentTrainer('trainer-123'), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isTrainerLoading).toBe(false)
    })

    expect(result.current.voice).toBe('Kore')
  })

  it('flags isTrainerError when API request fails', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('valid-token'),
    } as any)

    mockGetJson.mockRejectedValueOnce(new Error('Network response failed'))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCurrentTrainer('trainer-123'), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isTrainerError).toBe(true)
    })
  })
})
