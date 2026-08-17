import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWorkoutWithToken } from '../../api/workouts'
import { useCreateWorkout } from '../../hooks/useCreateWorkoutHook.ts'

vi.mock('../../api/workouts', () => ({
  createWorkoutWithToken: vi.fn(),
}))

const mockCreateWorkoutWithToken = vi.mocked(createWorkoutWithToken)

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createQueryWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCreateWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches token, calls API, and invalidates queries on success', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('valid-jwt-token')
    const workoutData = { title: 'Morning Run', duration: 30 }
    const createdWorkout = { id: '123', ...workoutData }

    mockCreateWorkoutWithToken.mockResolvedValueOnce(createdWorkout as any)

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateWorkout(mockGetToken), {
      wrapper: createQueryWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(workoutData as any)
    })

    expect(mockGetToken).toHaveBeenCalledTimes(1)
    expect(mockCreateWorkoutWithToken).toHaveBeenCalledWith(
      workoutData,
      'valid-jwt-token',
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workouts'] })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('throws an error when token is null', async () => {
    const mockGetToken = vi.fn().mockResolvedValue(null)
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useCreateWorkout(mockGetToken), {
      wrapper: createQueryWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Bench Press' } as any),
      ).rejects.toThrow('Missing Clerk token')
    })

    expect(mockCreateWorkoutWithToken).not.toHaveBeenCalled()
  })

  it('propagates API failures', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('valid-jwt-token')
    mockCreateWorkoutWithToken.mockRejectedValueOnce(
      new Error('Failed to create workout'),
    )

    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useCreateWorkout(mockGetToken), {
      wrapper: createQueryWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Squats' } as any),
      ).rejects.toThrow('Failed to create workout')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
