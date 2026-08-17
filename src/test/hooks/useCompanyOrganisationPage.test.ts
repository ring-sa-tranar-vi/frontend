import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, render, waitFor, act } from '@testing-library/react'
import { useAuth } from '@clerk/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCompanyEvent,
  deleteCompanyEvent,
  fetchMyOrganisations,
  fetchOrganisationEvents,
  updateCompanyEvent,
  updateCompanyOrganisation,
  type CompanyEvent,
} from '../../api/companyPortal.ts'
import {
  useCompanyOrganisationPage,
  formatDate,
  formatTime,
  wordCount,
  formatDayNumber,
  formatMonthShort,
} from '../../hooks/useCompanyOrganisationPage.ts'

vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../api/companyPortal.ts', () => ({
  createCompanyEvent: vi.fn(),
  deleteCompanyEvent: vi.fn(),
  fetchMyOrganisations: vi.fn(),
  fetchOrganisationEvents: vi.fn(),
  updateCompanyEvent: vi.fn(),
  updateCompanyOrganisation: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockFetchMyOrganisations = vi.mocked(fetchMyOrganisations)
const mockFetchOrganisationEvents = vi.mocked(fetchOrganisationEvents)
const mockUpdateCompanyOrganisation = vi.mocked(updateCompanyOrganisation)
const mockCreateCompanyEvent = vi.mocked(createCompanyEvent)
const mockUpdateCompanyEvent = vi.mocked(updateCompanyEvent)
const mockDeleteCompanyEvent = vi.mocked(deleteCompanyEvent)

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

describe('useCompanyOrganisationPage', () => {
  const defaultAuth = {
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true,
  }

  const mockOrganisations = [
    {
      id: 1,
      name: 'Acme Corp',
      description: 'Building tools',
      orgCity: 'Stockholm',
    },
    {
      id: 2,
      name: 'Globex',
      description: 'Global solutions',
      orgCity: 'Göteborg',
    },
  ]

  const mockEvents: CompanyEvent[] = [
    {
      id: 102,
      name: 'Late Event',
      description: 'In evening',
      time: '2026-09-20T18:00:00',
      organisationId: 1,
      city: 'Stockholm',
      venue: 'Main Stage',
      eventType: 'IN_PERSON',
    },
    {
      id: 101,
      name: 'Early Event',
      description: 'In morning',
      time: '2026-09-20T09:00:00',
      organisationId: 2,
      city: 'Stockholm',
      venue: 'Room A',
      eventType: 'ONLINE',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuth as any)
    mockFetchMyOrganisations.mockResolvedValue(mockOrganisations as any)
    mockFetchOrganisationEvents.mockResolvedValue(mockEvents as any)
  })

  describe('utility helper functions', () => {
    it('formatDate formats valid date strings and returns raw string on invalid input', () => {
      expect(formatDate('2026-08-17')).toContain('2026')
      expect(formatDate('invalid-date')).toBe('invalid-date')
    })

    it('formatTime formats valid ISO time strings and returns placeholder on invalid input', () => {
      expect(formatTime('2026-08-17T14:30:00')).toMatch(/\d{2}:\d{2}/)
      expect(formatTime('invalid-time')).toBe('--:--')
    })

    it('wordCount accurately calculates total non-empty words', () => {
      expect(wordCount('   Hello   world   from Vitest  ')).toBe(4)
      expect(wordCount('  ')).toBe(0)
    })

    it('formatDayNumber returns two-digit day or fallback', () => {
      expect(formatDayNumber('2026-08-05T10:00:00')).toBe('05')
      expect(formatDayNumber('invalid')).toBe('--')
    })

    it('formatMonthShort returns uppercase short month or fallback', () => {
      expect(formatMonthShort('2026-08-17')).toMatch(/AUG/i)
      expect(formatMonthShort('invalid')).toBe('---')
    })
  })

  describe('data fetching and state initialization', () => {
    it('fetches organisations and events for the active organisation and sorts events chronologically', async () => {
      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockFetchMyOrganisations).toHaveBeenCalledWith('mock-token')
      expect(mockFetchOrganisationEvents).toHaveBeenCalledWith('mock-token', 1)
      expect(result.current.organisations).toEqual(mockOrganisations)
      expect(result.current.selectedOrganisationId).toBe(1)
      expect(result.current.orgName).toBe('Acme Corp')
      expect(result.current.orgDescription).toBe('Building tools')
      expect(result.current.orgCity).toBe('Stockholm')

      expect(result.current.events[0].id).toBe(101)
      expect(result.current.events[1].id).toBe(102)
    })

    it('allows changing selected organisation and fetches corresponding events', async () => {
      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setSelectedOrganisationId(2)
      })

      await waitFor(() =>
        expect(mockFetchOrganisationEvents).toHaveBeenCalledWith(
          'mock-token',
          2,
        ),
      )

      expect(result.current.selectedOrganisationId).toBe(2)
      expect(result.current.orgName).toBe('Globex')
      expect(result.current.orgCity).toBe('Göteborg')
    })
  })

  describe('validation flags', () => {
    it('evaluates canSaveOrg based on input length', async () => {
      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.canSaveOrg).toBe(true)

      act(() => {
        result.current.setOrgName('A')
      })

      expect(result.current.canSaveOrg).toBe(false)
    })

    it('evaluates canCreateEvent based on form fields', async () => {
      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.canCreateEvent).toBe(false)

      act(() => {
        result.current.setEventForm({
          name: 'Conference',
          description: 'Annual meet',
          time: '2026-10-01T09:00',
          city: 'Stockholm',
          venue: 'Kistamässan',
          eventType: 'IN_PERSON',
        })
      })

      expect(result.current.canCreateEvent).toBe(true)
    })
  })

  describe('mutations', () => {
    it('updates organisation details via saveOrganisation', async () => {
      mockUpdateCompanyOrganisation.mockResolvedValueOnce({
        id: 1,
        name: 'Acme Corp Updated',
        description: 'Updated desc',
        orgCity: 'Stockholm',
      } as any)

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setOrgName('Acme Corp Updated')
      })

      await act(async () => {
        await result.current.saveOrganisation()
      })

      expect(mockUpdateCompanyOrganisation).toHaveBeenCalledWith(
        'mock-token',
        1,
        {
          name: 'Acme Corp Updated',
          description: 'Building tools',
          orgCity: 'Stockholm',
        },
      )

      expect(result.current.statusMessage).toBe('Organisationen sparades.')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['my-organisations'],
      })
    })

    it('creates a new company event via createEvent', async () => {
      mockCreateCompanyEvent.mockResolvedValueOnce(mockEvents[0] as any)

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setEventForm({
          name: 'New Workshop',
          description: 'Hands-on',
          time: '2026-11-01T10:00',
          city: 'Stockholm',
          venue: 'Hub',
          eventType: 'IN_PERSON',
        })
      })

      await act(async () => {
        await result.current.createEvent()
      })

      expect(mockCreateCompanyEvent).toHaveBeenCalledWith('mock-token', 1, {
        name: 'New Workshop',
        description: 'Hands-on',
        time: '2026-11-01T10:00:00',
        city: 'Stockholm',
        venue: 'Hub',
        eventType: 'IN_PERSON',
      })

      expect(result.current.statusMessage).toBe('Event skapades.')
      expect(result.current.eventForm.name).toBe('')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['organisation-events'],
      })
    })

    it('manages editing state and updates event via updateEvent', async () => {
      mockUpdateCompanyEvent.mockResolvedValueOnce(mockEvents[0] as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.startEditingEvent(mockEvents[0])
      })

      expect(result.current.editingEventId).toBe(102)
      expect(result.current.editingEventForm.name).toBe('Late Event')

      act(() => {
        result.current.setEditingEventForm((prev) => ({
          ...prev,
          name: 'Updated Late Event',
        }))
      })

      await act(async () => {
        await result.current.updateEvent()
      })

      expect(mockUpdateCompanyEvent).toHaveBeenCalledWith('mock-token', 102, {
        name: 'Updated Late Event',
        description: 'In evening',
        time: '2026-09-20T18:00:00',
        city: 'Stockholm',
        venue: 'Main Stage',
        eventType: 'IN_PERSON',
      })

      expect(result.current.editingEventId).toBeNull()
      expect(result.current.statusMessage).toBe('Event uppdaterades.')
    })

    it('deletes an event via deleteEvent', async () => {
      mockDeleteCompanyEvent.mockResolvedValueOnce(undefined as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.deleteEvent(101)
      })

      expect(mockDeleteCompanyEvent).toHaveBeenCalledWith('mock-token', 101)
      expect(result.current.statusMessage).toBe('Event togs bort.')
    })
  })

  describe('error handling', () => {
    it('sets statusMessage when mutation fails', async () => {
      mockCreateCompanyEvent.mockRejectedValueOnce(
        new Error('Nätverksfel vid skapande'),
      )

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.createEvent()
      })

      expect(result.current.statusMessage).toBe('Nätverksfel vid skapande')
    })

    it('throws error when auth token is missing', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuth,
        getToken: vi.fn().mockResolvedValue(null),
      } as any)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useCompanyOrganisationPage(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.errorMessage).toBe(
        'Du behöver vara inloggad för att hantera organisationer.',
      )
    })
  })

  describe('layout observer', () => {
    it('updates isWideLayout using ResizeObserver when element is mounted', async () => {
      let observerCallback: (entries: any[]) => void = () => {}
      const mockObserve = vi.fn()
      const mockDisconnect = vi.fn()

      const MockResizeObserver = vi.fn().mockImplementation(function (
        cb: (entries: any[]) => void,
      ) {
        observerCallback = cb
        return {
          observe: mockObserve,
          disconnect: mockDisconnect,
          unobserve: vi.fn(),
        }
      })

      vi.stubGlobal('ResizeObserver', MockResizeObserver)

      const queryClient = createTestQueryClient()
      let hookResult: ReturnType<typeof useCompanyOrganisationPage> | undefined

      function TestComponent() {
        hookResult = useCompanyOrganisationPage()
        return createElement('div', { ref: hookResult.layoutRef })
      }

      const { unmount } = render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(TestComponent),
        ),
      )

      await waitFor(() => expect(hookResult?.isLoading).toBe(false))

      const dummyDiv = document.createElement('div')
      Object.defineProperty(dummyDiv, 'clientWidth', {
        value: 900,
        configurable: true,
      })

      if (typeof hookResult?.layoutRef === 'function') {
        act(() => {
          // @ts-ignore
          ;(hookResult!.layoutRef as Function)(dummyDiv)
        })
      }

      expect(mockObserve).toHaveBeenCalled()

      act(() => {
        observerCallback([
          {
            target: dummyDiv,
            contentRect: { width: 900 },
          },
        ])
      })

      unmount()
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })
})
