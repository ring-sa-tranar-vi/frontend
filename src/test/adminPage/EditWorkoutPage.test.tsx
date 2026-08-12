import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditWorkoutPage from '../../features/adminPage/EditWorkoutPage'
import * as workoutApi from '../../api/workouts'

// --- Stable Mocks to prevent infinite re-render loops ---

const mockT = (key: string) => key

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { changeLanguage: () => new Promise(() => {}) },
  }),
}))

// By defining this outside the mock factory, the function reference remains stable
// across renders, preventing the useEffect from looping infinitely.
const mockGetToken = vi.fn().mockResolvedValue('mock-token')

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

vi.mock('../../api/workouts', () => ({
  fetchWorkoutById: vi.fn(),
  updateWorkout: vi.fn(),
}))

describe('EditWorkoutPage', () => {
  const sampleWorkout = {
    id: 1,
    name: 'Push Workout',
    description: 'Chest and shoulders focus',
    dashboardName: 'Push Session',
    dashboardDescription: 'Upper body power',
    instructions: 'Warm up well',
    guidance: 'Keep form strict',
    level: 3,
    type: 'Strength',
    image: 'https://example.com/image.jpg',
    video: 'https://example.com/video.mp4',
  }

  // Stable callback references for component props
  const onBack = vi.fn()
  const onStatusChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Mute expected console.errors
    vi.mocked(workoutApi.fetchWorkoutById).mockResolvedValue(sampleWorkout)
  })

  it('renders loading state initially and populates form data correctly', async () => {
    vi.mocked(workoutApi.fetchWorkoutById).mockResolvedValueOnce(sampleWorkout)

    render(
      <EditWorkoutPage
        workoutId={1}
        onBack={onBack}
        onStatusChange={onStatusChange}
      />,
    )

    expect(screen.getByText('workoutsAdmin.loadingWorkout')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Push Workout')).toBeInTheDocument()
    })

    expect(
      screen.getByDisplayValue('Chest and shoulders focus'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Strength')).toBeInTheDocument()
  })

  it('handles API loading failure and triggers error status callback', async () => {
    vi.mocked(workoutApi.fetchWorkoutById).mockRejectedValueOnce(
      new Error('API Error'),
    )

    render(
      <EditWorkoutPage
        workoutId={1}
        onBack={onBack}
        onStatusChange={onStatusChange}
      />,
    )

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(
        'workoutsAdmin.toastLoadWorkoutFailed',
        { type: 'error' },
      )
    })
  })

  it('shows validation errors when required fields are empty or URLs are invalid', async () => {
    vi.mocked(workoutApi.fetchWorkoutById).mockResolvedValueOnce(sampleWorkout)
    const user = userEvent.setup()

    render(
      <EditWorkoutPage
        workoutId={1}
        onBack={onBack}
        onStatusChange={onStatusChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Push Workout')).toBeInTheDocument()
    })

    // Target inputs safely using their semantic labels (from the t() function)
    const nameInput = screen.getByRole('textbox', {
      name: (content) => content.includes('workoutsAdmin.name'),
    })
    await user.clear(nameInput)

    const imageInput = screen.getByRole('textbox', {
      name: (content) => content.includes('workoutsAdmin.workoutImage'),
    })
    await user.clear(imageInput)
    await user.type(imageInput, 'invalid-url-format')

    const saveButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes('nameRequired')),
      ).toBeInTheDocument()
      expect(
        screen.getByText((content) => content.includes('workoutImageUrl')),
      ).toBeInTheDocument()
    })

    expect(workoutApi.updateWorkout).not.toHaveBeenCalled()
  })

  it('successfully updates a workout and triggers success status/navigation', async () => {
    vi.mocked(workoutApi.fetchWorkoutById).mockResolvedValueOnce(sampleWorkout)
    vi.mocked(workoutApi.updateWorkout).mockResolvedValueOnce({
      ...sampleWorkout,
      name: 'Updated Push',
    })
    const user = userEvent.setup()

    render(
      <EditWorkoutPage
        workoutId={1}
        onBack={onBack}
        onStatusChange={onStatusChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Push Workout')).toBeInTheDocument()
    })

    const nameInput = screen.getByRole('textbox', {
      name: (content) => content.includes('workoutsAdmin.name'),
    })
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Push')

    const saveButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(workoutApi.updateWorkout).toHaveBeenCalledTimes(1)
    })

    expect(workoutApi.updateWorkout).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Updated Push' }),
      'mock-token',
    )

    expect(onStatusChange).toHaveBeenCalledWith(
      'workoutsAdmin.toastChangesSaved',
      { type: 'success' },
    )
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('triggers onBack when back or cancel button is clicked', async () => {
    vi.mocked(workoutApi.fetchWorkoutById).mockResolvedValueOnce(sampleWorkout)
    const user = userEvent.setup()

    render(
      <EditWorkoutPage
        workoutId={1}
        onBack={onBack}
        onStatusChange={onStatusChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Push Workout')).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', {
      name: 'workoutsAdmin.backToWorkouts',
    })
    await user.click(backButton)

    expect(onBack).toHaveBeenCalled()
  })
})
