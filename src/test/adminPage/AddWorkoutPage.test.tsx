import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddWorkoutPage from '../../features/adminPage/AddWorkoutPage.tsx'

// --- Mocks ---

// Mock react-i18next to return the key itself for straightforward assertions
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock Clerk auth
const mockGetToken = vi.fn().mockResolvedValue('mock-clerk-token')
vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

// Mock API calls
const mockFetchTrainersWithToken = vi.fn()
vi.mock('../../api/trainers', () => ({
  fetchTrainersWithToken: (...args: any[]) =>
    mockFetchTrainersWithToken(...args),
}))

// Mock custom hook for workout mutation
const mockMutateAsync = vi.fn()
vi.mock('../../hooks/useCreateWorkoutHook', () => ({
  useCreateWorkout: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('AddWorkoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchTrainersWithToken.mockResolvedValue([
      { id: 1, name: 'Coach Alex' },
      { id: 2, name: 'Coach Sam' },
    ])
  })

  it('renders the page title and loads trainers on mount', async () => {
    render(<AddWorkoutPage />)

    // Check title renders
    expect(
      screen.getByText('workoutsAdmin.addWorkoutPageTitle'),
    ).toBeInTheDocument()

    // Wait for trainers to load into the select dropdown
    await waitFor(() => {
      expect(mockFetchTrainersWithToken).toHaveBeenCalledWith(
        'mock-clerk-token',
      )
    })

    expect(
      screen.getByRole('option', { name: 'Coach Alex' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Coach Sam' }),
    ).toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<AddWorkoutPage />)

    // Wait for trainers to load so fields can be filled out later if needed
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Coach Alex' }),
      ).toBeInTheDocument()
    })

    // Click submit without entering data
    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    // Verify required field error messages show up
    expect(
      screen.getByText('workoutsAdmin.validation.nameRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.descriptionRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.typeRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.trainerRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.instructionsAudioRequired'),
    ).toBeInTheDocument()
  })

  it('validates URL fields properly', async () => {
    const user = userEvent.setup()
    render(<AddWorkoutPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Coach Alex' }),
      ).toBeInTheDocument()
    })

    // Target the specific instructionsAudio input by its name label/role
    const audioInput = screen.getByRole('textbox', {
      name: /workoutsAdmin\.instructionsAudio/i,
    })
    await user.type(audioInput, 'not-a-valid-url')

    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    expect(
      screen.getByText('workoutsAdmin.validation.instructionsAudioUrl'),
    ).toBeInTheDocument()
  })

  it('submits successfully when all required fields and valid URLs are provided', async () => {
    const user = userEvent.setup()
    const mockOnStatusChange = vi.fn()

    render(<AddWorkoutPage onStatusChange={mockOnStatusChange} />)

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Coach Alex' }),
      ).toBeInTheDocument()
    })

    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.namePlaceholder'),
      'Morning HIIT',
    )
    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.typePlaceholder'),
      'Cardio',
    )
    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.descriptionPlaceholder'),
      'A high energy workout.',
    )

    const trainerSelect = screen.getByRole('combobox')
    await user.selectOptions(trainerSelect, '1')

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i })
    await user.clear(durationInput)
    await user.type(durationInput, '300')

    // Fill out each URL input individually by name to avoid ambiguity
    await user.type(
      screen.getByRole('textbox', {
        name: /workoutsAdmin\.instructionsAudio/i,
      }),
      'https://example.com/instructions-audio.mp3',
    )
    await user.type(
      screen.getByRole('textbox', { name: /workoutsAdmin\.workoutAudio/i }),
      'https://example.com/workout-audio.mp3',
    )
    await user.type(
      screen.getByRole('textbox', {
        name: /workoutsAdmin\.instructionsImage/i,
      }),
      'https://example.com/instructions-img.jpg',
    )
    await user.type(
      screen.getByRole('textbox', { name: /workoutsAdmin\.workoutImage/i }),
      'https://example.com/workout-img.jpg',
    )

    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Morning HIIT',
        type: 'Cardio',
        description: 'A high energy workout.',
        durationSeconds: 300,
        trainer: { id: 1 },
        instructionsAudio: 'https://example.com/instructions-audio.mp3',
      }),
    )

    expect(mockOnStatusChange).toHaveBeenCalledWith(
      'workoutsAdmin.toastSaved',
      { type: 'success' },
    )
  })

  it('handles back button interactions correctly', async () => {
    const user = userEvent.setup()
    const mockOnBack = vi.fn()
    const mockOnStatusChange = vi.fn()

    render(
      <AddWorkoutPage
        onBack={mockOnBack}
        onStatusChange={mockOnStatusChange}
      />,
    )

    const backButton = screen.getByRole('button', {
      name: 'workoutsAdmin.back',
    })
    await user.click(backButton)

    expect(mockOnStatusChange).toHaveBeenCalledWith('workoutsAdmin.canceling', {
      type: 'info',
    })
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })
})
