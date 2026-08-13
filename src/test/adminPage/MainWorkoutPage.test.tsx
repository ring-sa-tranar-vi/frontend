import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MainWorkoutPage from '../../features/adminPage/MainWorkoutPage'
import * as workoutApi from '../../api/workouts'

// --- Mocks ---

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

const mockShowToast = vi.fn()

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showToast: mockShowToast,
  }),
}))

vi.mock('../../components/ConfirmModal', () => ({
  default: ({ onConfirm, onCancel }: any) => (
    <div data-testid="confirm-modal">
      <button type="button" onClick={onConfirm}>
        Confirm Delete
      </button>
      <button type="button" onClick={onCancel}>
        Cancel Delete
      </button>
    </div>
  ),
}))

vi.mock('../../api/workouts', () => ({
  fetchWorkouts: vi.fn(),
  createWorkoutWithToken: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  setWorkoutEnabledWithToken: vi.fn(),
}))

// --- Helpers ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('MainWorkoutPage', () => {
  const mockWorkouts = [
    {
      id: 1,
      name: 'Push Alpha',
      dashboardName: 'Push Session A',
      description: 'Chest & Shoulders Focus',
      dashboardDescription: 'Upper body power',
      instructions: 'Keep elbows tucked',
      guidance: 'Warmup properly',
      type: 'STRENGTH',
      level: 2,
      enabled: true,
      image: 'https://example.com/push.jpg',
      video: 'https://example.com/push.mp4',
    },
    {
      id: 2,
      name: 'Cardio Blast',
      dashboardName: 'HIIT Session B',
      description: 'High Intensity Intervals',
      dashboardDescription: 'Fat burning session',
      instructions: 'Push hard',
      guidance: 'Stay hydrated',
      type: 'CARDIO',
      level: 1,
      enabled: false,
      image: null,
      video: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders loading state and displays loaded workouts', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockResolvedValue(mockWorkouts as any)

    renderWithClient(<MainWorkoutPage />)

    expect(screen.getByText('workoutsAdmin.loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Push Session A')).toBeInTheDocument()
      expect(screen.getByText('HIIT Session B')).toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', { name: 'workoutsAdmin.enableWorkout' }),
    ).toBeInTheDocument()
  })

  it('shows error state when API call fails', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockRejectedValue(
      new Error('Failed to load workouts'),
    )

    renderWithClient(<MainWorkoutPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load workouts')).toBeInTheDocument()
    })
  })

  it('filters workouts using search term prop and category dropdown', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockResolvedValue(mockWorkouts as any)
    const user = userEvent.setup()

    renderWithClient(<MainWorkoutPage searchTerm="Push" />)

    await waitFor(() => {
      expect(screen.getByText('Push Session A')).toBeInTheDocument()
      expect(screen.queryByText('HIIT Session B')).not.toBeInTheDocument()
    })

    const categoryDropdown = screen.getByDisplayValue(
      'workoutsAdmin.allCategories',
    )
    await user.selectOptions(categoryDropdown, 'CARDIO')

    expect(screen.getAllByText('workoutsAdmin.noWorkoutsFound')).toHaveLength(2)
  })

  it('toggles enable/disable workout status', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockResolvedValue(mockWorkouts as any)
    vi.mocked(workoutApi.setWorkoutEnabledWithToken).mockResolvedValue({
      ...mockWorkouts[0],
      enabled: false,
    } as any)
    const user = userEvent.setup()

    renderWithClient(<MainWorkoutPage />)

    await waitFor(() => {
      expect(screen.getByText('Push Session A')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Push Session A'))

    const disableButton = screen.getByRole('button', {
      name: 'workoutsAdmin.disableWorkout',
    })
    await user.click(disableButton)

    await waitFor(() => {
      expect(workoutApi.setWorkoutEnabledWithToken).toHaveBeenCalledWith(
        1,
        false,
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith('workoutsAdmin.toastDisabled', {
      type: 'success',
    })
  })

  it('opens create mode, validates form fields, and submits new workout', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockResolvedValue(mockWorkouts as any)
    vi.mocked(workoutApi.createWorkoutWithToken).mockResolvedValue({
      id: 3,
      name: 'Legs Power',
      description: 'Quads & Glutes',
      type: 'STRENGTH',
      level: 1,
    } as any)
    const user = userEvent.setup()

    const { container } = renderWithClient(<MainWorkoutPage />)

    await waitFor(() => {
      expect(screen.getByText('Push Session A')).toBeInTheDocument()
    })

    const addButton = screen.getAllByRole('button', {
      name: 'workoutsAdmin.addWorkout',
    })[0]
    await user.click(addButton)

    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    expect(
      screen.getByText(/workoutsAdmin.validation.nameRequired/i),
    ).toBeInTheDocument()

    const nameInput = container.querySelector('input[name="name"]')!
    const typeInput = container.querySelector('input[name="type"]')!
    const imageInput = container.querySelector('input[name="image"]')!

    await user.type(nameInput, 'Legs Power')
    await user.type(typeInput, 'STRENGTH')
    await user.type(imageInput, 'https://example.com/legs.jpg')

    await user.click(submitButton)

    await waitFor(() => {
      expect(workoutApi.createWorkoutWithToken).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Legs Power',
          type: 'STRENGTH',
          image: 'https://example.com/legs.jpg',
        }),
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith('workoutsAdmin.toastCreated', {
      type: 'success',
    })
  })

  it('opens edit mode, updates workout fields, and handles delete', async () => {
    vi.mocked(workoutApi.fetchWorkouts).mockResolvedValue(mockWorkouts as any)
    vi.mocked(workoutApi.updateWorkout).mockResolvedValue({
      ...mockWorkouts[0],
      dashboardName: 'Push Session A Updated',
    } as any)
    vi.mocked(workoutApi.deleteWorkout).mockResolvedValue({ ok: true } as any)
    const user = userEvent.setup()

    const { container } = renderWithClient(<MainWorkoutPage />)

    await waitFor(() => {
      expect(screen.getByText('Push Session A')).toBeInTheDocument()
    })

    // Select Push Session A (id: 1)
    await user.click(screen.getByText('Push Session A'))

    // Click Edit button
    const editButton = screen.getByRole('button', {
      name: 'workoutsAdmin.editWorkout',
    })
    await user.click(editButton)

    // Edit dashboardName cleanly by clearing then typing
    const dashboardNameInput = container.querySelector(
      'input[name="dashboardName"]',
    )!
    await user.clear(dashboardNameInput)
    await user.type(dashboardNameInput, 'Push Session A Updated')

    // Submit update
    const saveButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(workoutApi.updateWorkout).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          dashboardName: 'Push Session A Updated',
        }),
        'mock-token',
      )
    })

    // Re-open edit mode to test delete button
    await user.click(
      screen.getByRole('button', { name: 'workoutsAdmin.editWorkout' }),
    )

    const deleteButton = screen.getByRole('button', {
      name: 'workoutsAdmin.delete',
    })
    await user.click(deleteButton)

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()

    const confirmDeleteButton = screen.getByRole('button', {
      name: 'Confirm Delete',
    })
    await user.click(confirmDeleteButton)

    await waitFor(() => {
      expect(workoutApi.deleteWorkout).toHaveBeenCalledWith(1, 'mock-token')
    })

    expect(mockShowToast).toHaveBeenCalledWith('workoutsAdmin.toastDeleted', {
      type: 'success',
    })
  })
})
