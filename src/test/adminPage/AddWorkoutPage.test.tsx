import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddWorkoutPage from '../../features/adminPage/AddWorkoutPage.tsx'

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
}))

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
  })

  it('renders the page title correctly', () => {
    render(<AddWorkoutPage />)

    expect(
      screen.getByText('workoutsAdmin.addWorkoutPageTitle'),
    ).toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<AddWorkoutPage />)

    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    expect(
      screen.getByText('workoutsAdmin.validation.nameRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.descriptionRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('workoutsAdmin.validation.typeRequired'),
    ).toBeInTheDocument()
  })

  it('validates URL fields properly', async () => {
    const user = userEvent.setup()
    render(<AddWorkoutPage />)

    const imageInput = screen.getByPlaceholderText(
      'workoutsAdmin.urlPlaceholder',
    )
    await user.type(imageInput, 'not-a-valid-url')

    const submitButton = screen.getByRole('button', {
      name: 'workoutsAdmin.save',
    })
    await user.click(submitButton)

    expect(
      screen.getByText('workoutsAdmin.validation.workoutImageUrl'),
    ).toBeInTheDocument()
  })

  it('submits successfully when required fields and valid URLs are provided', async () => {
    const user = userEvent.setup()
    const mockOnStatusChange = vi.fn()

    render(<AddWorkoutPage onStatusChange={mockOnStatusChange} />)

    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.namePlaceholder'),
      'Full Body Strength',
    )
    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.typePlaceholder'),
      'Strength',
    )
    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.descriptionPlaceholder'),
      'A comprehensive routine focusing on compound movements.',
    )
    await user.type(
      screen.getByPlaceholderText('workoutsAdmin.urlPlaceholder'),
      'https://example.com/image.jpg',
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
        name: 'Full Body Strength',
        type: 'Strength',
        description: 'A comprehensive routine focusing on compound movements.',
        level: 2,
        image: 'https://example.com/image.jpg',
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
