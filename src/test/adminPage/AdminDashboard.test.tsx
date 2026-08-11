import AdminDashboard from '../../features/adminPage/AdminDashboard.tsx'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'

// --- Helper wrapper for React Query ---
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries in tests to fail fast
        gcTime: 0,
      },
    },
  })

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.percent !== undefined) return `${key}:${options.percent}`
      if (options?.count !== undefined) return `${key}:${options.count}`
      return key
    },
  }),
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGetToken = vi.fn().mockResolvedValue('mock-token')
vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

const mockFetchWorkouts = vi.fn()
vi.mock('../../api/workouts', () => ({
  fetchWorkouts: (...args: any[]) => mockFetchWorkouts(...args),
}))

const mockFetchFeedbackSummary = vi.fn()
vi.mock('../../api/feedbacks', () => ({
  fetchWorkoutFeedbackSummaryWithToken: (...args: any[]) =>
    mockFetchFeedbackSummary(...args),
}))

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWorkouts.mockResolvedValue([
      { id: 1, name: 'Workout One', type: 'STRENGTH', enabled: true },
      { id: 2, name: 'Workout Two', type: 'CARDIO', enabled: true },
    ])
    mockFetchFeedbackSummary.mockResolvedValue([
      {
        workoutId: 1,
        workoutName: 'Workout One',
        status: 'GOOD',
        feedbackCount: 10,
      },
      {
        workoutId: 2,
        workoutName: 'Workout Two',
        status: 'NEEDS_REVIEW',
        feedbackCount: 5,
      },
    ])
  })

  it('renders stats and loads data on mount', async () => {
    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByText('admin.totalWorkouts')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockFetchWorkouts).toHaveBeenCalledTimes(1)
      expect(mockFetchFeedbackSummary).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText('Workout One')).toBeInTheDocument()
    expect(screen.getByText('Workout Two')).toBeInTheDocument()
  })

  it('filters recent feedbacks based on the search term', async () => {
    renderWithQueryClient(<AdminDashboard searchTerm="Workout One" />)

    await waitFor(() => {
      expect(screen.getByText('Workout One')).toBeInTheDocument()
    })

    expect(screen.queryByText('Workout Two')).not.toBeInTheDocument()
  })

  it('triggers view workouts button callback when clicked', async () => {
    const user = userEvent.setup()
    const mockOnOpenWorkouts = vi.fn()

    renderWithQueryClient(
      <AdminDashboard onOpenWorkouts={mockOnOpenWorkouts} />,
    )

    await waitFor(() => {
      expect(screen.getByText('admin.totalWorkouts')).toBeInTheDocument()
    })

    const openWorkoutsButton = screen.getByRole('button', {
      name: 'admin.openWorkouts',
    })
    await user.click(openWorkoutsButton)

    expect(mockOnOpenWorkouts).toHaveBeenCalledTimes(1)
  })
})
