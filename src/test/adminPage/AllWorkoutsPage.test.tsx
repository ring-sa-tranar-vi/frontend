import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AllWorkoutsPage from '../../features/adminPage/AllWorkoutsPage.tsx'

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.name) return `Delete ${options.name}?`
      return key
    },
  }),
}))

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
}))

const mockFetchWorkouts = vi.fn()
const mockDeleteWorkout = vi.fn()
vi.mock('../../api/workouts', () => ({
  fetchWorkouts: (token: string) => mockFetchWorkouts(token),
  deleteWorkout: (id: number, token: string) => mockDeleteWorkout(id, token),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('AllWorkoutsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially and then shows workouts list', async () => {
    mockFetchWorkouts.mockResolvedValueOnce([
      { id: 1, name: 'Morning HIIT', type: 'Cardio', level: 2 },
      { id: 2, name: 'Core Crusher', type: 'Strength', level: 4 },
    ])

    renderWithQueryClient(
      <AllWorkoutsPage onEdit={vi.fn()} onCreate={vi.fn()} />,
    )

    expect(screen.getByText('Loading workouts...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Morning HIIT')).toBeInTheDocument()
    })

    expect(screen.getByText('Core Crusher')).toBeInTheDocument()
    expect(screen.getByText('Cardio • Level 2')).toBeInTheDocument()
  })

  it('shows error state when fetching workouts fails', async () => {
    mockFetchWorkouts.mockRejectedValueOnce(new Error('Failed to load'))

    renderWithQueryClient(
      <AllWorkoutsPage onEdit={vi.fn()} onCreate={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })
  })

  it('triggers onCreate callback when add workout button is clicked', async () => {
    mockFetchWorkouts.mockResolvedValueOnce([])
    const handleCreate = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(
      <AllWorkoutsPage onEdit={vi.fn()} onCreate={handleCreate} />,
    )

    await waitFor(() => {
      expect(screen.getByText('workoutsAdmin.allWorkouts')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', {
      name: 'workoutsAdmin.addWorkout',
    })
    await user.click(addButton)

    expect(handleCreate).toHaveBeenCalledTimes(1)
  })

  it('triggers onEdit callback when clicking a workout row', async () => {
    mockFetchWorkouts.mockResolvedValueOnce([
      { id: 1, name: 'Morning HIIT', type: 'Cardio', level: 2 },
    ])
    const handleEdit = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(
      <AllWorkoutsPage onEdit={handleEdit} onCreate={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Morning HIIT')).toBeInTheDocument()
    })

    const workoutRow = screen.getByText('Morning HIIT').closest('div')!
    await user.click(workoutRow)

    expect(handleEdit).toHaveBeenCalledWith(1)
  })

  it('opens confirmation modal and deletes a workout successfully', async () => {
    mockFetchWorkouts.mockResolvedValueOnce([
      { id: 1, name: 'Morning HIIT', type: 'Cardio', level: 2 },
    ])
    mockDeleteWorkout.mockResolvedValueOnce({})

    const handleStatusChange = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(
      <AllWorkoutsPage
        onEdit={vi.fn()}
        onCreate={vi.fn()}
        onStatusChange={handleStatusChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Morning HIIT')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', {
      name: 'workoutsAdmin.delete',
    })
    await user.click(deleteButton)

    // Confirm modal should open requiring DELETE input
    expect(screen.getByText('Delete Morning HIIT?')).toBeInTheDocument()

    const typingInput = screen.getByRole('textbox')
    await user.type(typingInput, 'DELETE')

    const confirmButton = screen.getByRole('button', {
      name: 'workoutsAdmin.deleteConfirm',
    })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockDeleteWorkout).toHaveBeenCalledWith(1, 'mock-token')
    })

    expect(handleStatusChange).toHaveBeenCalledWith('Workout deleted.', {
      type: 'success',
    })
  })
})
