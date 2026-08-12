import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedbackAdminPage from '../../features/adminPage/FeedbackAdminPage'
import * as feedbackApi from '../../api/feedbacks'

// --- Stable Mocks to prevent infinite re-render loops ---

const mockT = (key: string) => key

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}))

const mockGetToken = vi.fn().mockResolvedValue('mock-token')

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

vi.mock('../../api/feedbacks', () => ({
  fetchWorkoutFeedbackSummaryWithToken: vi.fn(),
}))

// --- Helpers ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries so error tests fail fast
      },
    },
  })

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>,
  )
}

describe('FeedbackAdminPage', () => {
  const mockSummary = [
    {
      workoutId: 1,
      workoutName: 'Alpha Workout',
      feedbackCount: 10,
      avgRating: 4.5,
      dislikeRate: 5,
      tooHardRate: 10,
      status: 'GOOD',
    },
    {
      workoutId: 2,
      workoutName: 'Beta Session',
      feedbackCount: 5,
      avgRating: 3.5,
      dislikeRate: 20,
      tooHardRate: 30,
      status: 'NEEDS_REVIEW',
    },
    {
      workoutId: 3,
      workoutName: 'Gamma Routine',
      feedbackCount: 20,
      avgRating: 2.0,
      dislikeRate: 50,
      tooHardRate: 40,
      status: 'BAD',
    },
    {
      workoutId: 4,
      workoutName: 'Delta Pump',
      feedbackCount: 50,
      avgRating: 4.8,
      dislikeRate: 1,
      tooHardRate: 5,
      status: 'GOOD',
    },
    {
      workoutId: 5,
      workoutName: 'Epsilon Burn',
      feedbackCount: 100,
      avgRating: 1.0,
      dislikeRate: 90,
      tooHardRate: 80,
      status: 'BAD',
    },
    {
      workoutId: 6,
      workoutName: 'Zeta Lift',
      feedbackCount: 2,
      avgRating: 3.0,
      dislikeRate: 30,
      tooHardRate: 20,
      status: 'NEEDS_REVIEW',
    },
    {
      workoutId: 7,
      workoutName: 'Eta Run',
      feedbackCount: 15,
      avgRating: 4.2,
      dislikeRate: 10,
      tooHardRate: 15,
      status: 'GOOD',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Mute expected query errors in console
  })

  it('renders data and correct statistics after successful fetch', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockResolvedValueOnce(mockSummary as any)

    renderWithClient(<FeedbackAdminPage />)

    // Wait for the first sorted item to appear
    await waitFor(() => {
      expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    })

    expect(screen.getByText('feedbackAdmin.title')).toBeInTheDocument()

    // GOOD: 3, NEEDS_REVIEW: 2, BAD: 2.
    // The screen.getAllByText('3')[0] matches the goodCount element
    expect(screen.getAllByText('3')[0]).toBeInTheDocument()
    expect(screen.getAllByText('2')[0]).toBeInTheDocument()

    expect(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).toHaveBeenCalledWith('mock-token')
  })

  it('shows error state when API fails', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockRejectedValueOnce(new Error('Failed to load feedbacks'))

    renderWithClient(<FeedbackAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load feedbacks')).toBeInTheDocument()
    })
  })

  it('filters data by search term', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockResolvedValueOnce(mockSummary as any)
    const user = userEvent.setup()

    renderWithClient(<FeedbackAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(
      'feedbackAdmin.searchPlaceholder',
    )
    await user.type(searchInput, 'Beta')

    // Should only show "Beta Session"
    expect(screen.queryByText('Epsilon Burn')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Session')).toBeInTheDocument()
  })

  it('filters data by status dropdown', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockResolvedValueOnce(mockSummary as any)
    const user = userEvent.setup()

    renderWithClient(<FeedbackAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    })

    const statusDropdown = screen.getByDisplayValue('feedbackAdmin.allStatus')
    await user.selectOptions(statusDropdown, 'GOOD')

    // Only GOOD items should be displayed, and there are only 3, so they all fit on Page 1
    expect(screen.getByText('Alpha Workout')).toBeInTheDocument()
    expect(screen.getByText('Delta Pump')).toBeInTheDocument()
    expect(screen.getByText('Eta Run')).toBeInTheDocument()

    // BAD item should be gone
    expect(screen.queryByText('Epsilon Burn')).not.toBeInTheDocument()
  })

  it('handles pagination correctly (shows PAGE_SIZE limit and navigates)', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockResolvedValueOnce(mockSummary as any)
    const user = userEvent.setup()

    renderWithClient(<FeedbackAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: '→' })
    const prevButton = screen.getByRole('button', { name: '←' })

    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    // Alpha Workout is the 7th item, so it should NOT be on Page 1
    expect(screen.queryByText('Alpha Workout')).not.toBeInTheDocument()

    // Click to page 2
    await user.click(nextButton)

    expect(prevButton).not.toBeDisabled()
    expect(nextButton).toBeDisabled()

    // Now Alpha Workout should be visible on Page 2
    expect(screen.getByText('Alpha Workout')).toBeInTheDocument()
    expect(screen.queryByText('Epsilon Burn')).not.toBeInTheDocument()
  })

  it('displays empty state and allows clearing filters when no results match', async () => {
    vi.mocked(
      feedbackApi.fetchWorkoutFeedbackSummaryWithToken,
    ).mockResolvedValueOnce(mockSummary as any)
    const user = userEvent.setup()

    renderWithClient(<FeedbackAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(
      'feedbackAdmin.searchPlaceholder',
    )
    await user.type(searchInput, 'NonExistentWorkout123')

    expect(
      screen.getByText('feedbackAdmin.noWorkoutsFound'),
    ).toBeInTheDocument()

    const clearButton = screen.getByRole('button', {
      name: 'feedbackAdmin.clearFilters',
    })
    await user.click(clearButton)

    // After clearing, the first sorted item should be back
    expect(screen.getByText('Epsilon Burn')).toBeInTheDocument()
    expect(searchInput).toHaveValue('')
  })
})
