import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAdminUsers } from '../../api/admins.ts'
import { useAdminPage } from '../../hooks/useAdminPage.ts'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../api/admins.ts', () => ({
  fetchAdminUsers: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockFetchAdminUsers = vi.mocked(fetchAdminUsers)

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

describe('useAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch admin users when enabled parameter is false', () => {
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue('mock-token'),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useAdminPage(false), {
      wrapper: createQueryWrapper(queryClient),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockFetchAdminUsers).not.toHaveBeenCalled()
  })

  it('fetches admin users successfully when enabled is true and token exists', async () => {
    const mockToken = 'admin-secret-token'
    const mockUsers = [
      { id: '1', name: 'Alice', role: 'ADMIN' },
      { id: '2', name: 'Bob', role: 'SUPER_ADMIN' },
    ]

    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue(mockToken),
    } as any)
    mockFetchAdminUsers.mockResolvedValue(mockUsers as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useAdminPage(true), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchAdminUsers).toHaveBeenCalledWith(mockToken)
    expect(result.current.data).toEqual(mockUsers)
  })

  it('throws an error when auth token is missing', async () => {
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue(null),
    } as any)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useAdminPage(true), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Missing auth token')
    expect(mockFetchAdminUsers).not.toHaveBeenCalled()
  })

  it('handles fetchAdminUsers failure', async () => {
    const mockToken = 'admin-secret-token'
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue(mockToken),
    } as any)
    mockFetchAdminUsers.mockRejectedValue(new Error('Forbidden resource'))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useAdminPage(true), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Forbidden resource')
  })
})
