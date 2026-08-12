import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../../api/trainers'
import TrainerAdminPage from '../../features/adminPage/TrainerAdminPage.tsx'

// --- Mocks ---

const mockT = (key: string, params?: Record<string, unknown>) => {
  if (params?.id !== undefined) return `${key}:${params.id}`
  if (params?.count !== undefined) return `${key}:${params.count}`
  return key
}

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
let mockToast: { message: string; type: string } | null = null

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
    showToast: mockShowToast,
  }),
}))

vi.mock('../../components/ConfirmModal', () => ({
  default: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: () => void
    onCancel: () => void
  }) => (
    <div data-testid="confirm-modal">
      <button onClick={onConfirm}>Confirm Delete Action</button>
      <button onClick={onCancel}>Cancel Delete Action</button>
    </div>
  ),
}))

vi.mock('../../api/trainers', () => ({
  fetchTrainersWithToken: vi.fn(),
  fetchTrainerByIdWithToken: vi.fn(),
  createTrainerWithToken: vi.fn(),
  updateTrainerWithToken: vi.fn(),
  deleteTrainerWithToken: vi.fn(),
}))

// --- Mock Data ---

const mockTrainers = [
  {
    id: 1,
    name: 'Alpha Trainer',
    prompt: 'Alpha system prompt',
    voice: 'Alpha Voice',
    intro: 'Alpha intro audio',
    language: 'EN',
    imageSelect: 'https://example.com/alpha.png',
    imageCall: 'https://example.com/alpha-call.png',
    imageStart: 'https://example.com/alpha-start.png',
    ambience: 'Alpha ambience',
  },
  {
    id: 2,
    name: 'Beta Trainer',
    prompt: 'Beta system prompt',
    voice: 'Beta Voice',
    intro: 'Beta intro audio',
    language: 'ES',
    imageSelect: '',
    imageCall: '',
    imageStart: '',
    ambience: '',
  },
]

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
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  }
}

describe('TrainerAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast = null
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders loading state and fetches trainers successfully', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)

    renderWithClient(<TrainerAdminPage />)

    expect(screen.getByText('trainerAdmin.loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Trainer').length).toBeGreaterThan(0)
    })

    expect(api.fetchTrainersWithToken).toHaveBeenCalledWith('mock-token')
  })

  it('displays error message when query fails', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockRejectedValue(
      new Error('Failed to load trainers'),
    )

    renderWithClient(<TrainerAdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load trainers')).toBeInTheDocument()
    })
  })

  it('filters trainers using searchTerm prop', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)

    renderWithClient(<TrainerAdminPage searchTerm="Beta" />)

    await waitFor(() => {
      expect(screen.getAllByText('Beta Trainer').length).toBeGreaterThan(0)
      expect(screen.queryByText('Alpha Trainer')).not.toBeInTheDocument()
    })
  })

  it('validates required fields when creating a trainer', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)
    const user = userEvent.setup()

    renderWithClient(<TrainerAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Trainer').length).toBeGreaterThan(0)
    })

    await user.click(
      screen.getByRole('button', { name: 'trainerAdmin.addTrainer' }),
    )

    const submitBtn = screen.getByRole('button', {
      name: 'trainerAdmin.save',
    })
    await user.click(submitBtn)

    expect(
      screen.getByText('trainerAdmin.validation.nameRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('trainerAdmin.validation.promptRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('trainerAdmin.validation.voiceRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('trainerAdmin.validation.introRequired'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('trainerAdmin.validation.languageRequired'),
    ).toBeInTheDocument()
    expect(api.createTrainerWithToken).not.toHaveBeenCalled()
  })

  it('creates a new trainer successfully', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)
    vi.mocked(api.createTrainerWithToken).mockResolvedValue({
      id: 3,
      name: 'Gamma Trainer',
      prompt: 'Gamma prompt',
      voice: 'Gamma voice',
      intro: 'Gamma intro',
      language: 'FR',
      imageSelect: null,
      imageCall: null,
      imageStart: null,
      ambience: null,
    })
    const user = userEvent.setup()

    renderWithClient(<TrainerAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Trainer').length).toBeGreaterThan(0)
    })

    await user.click(
      screen.getByRole('button', { name: 'trainerAdmin.addTrainer' }),
    )

    // Fill out form
    await user.type(
      screen.getByPlaceholderText('trainerAdmin.namePlaceholder'),
      'Gamma Trainer',
    )
    await user.type(
      screen.getByPlaceholderText('trainerAdmin.languagePlaceholder'),
      'FR',
    )
    await user.type(
      screen.getByPlaceholderText('trainerAdmin.voicePlaceholder'),
      'Gamma voice',
    )
    await user.type(
      screen.getByPlaceholderText('trainerAdmin.introPlaceholder'),
      'Gamma intro',
    )
    await user.type(
      screen.getByPlaceholderText('trainerAdmin.promptPlaceholder'),
      'Gamma prompt',
    )

    const submitBtn = screen.getByRole('button', {
      name: 'trainerAdmin.save',
    })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(api.createTrainerWithToken).toHaveBeenCalledWith(
        {
          name: 'Gamma Trainer',
          prompt: 'Gamma prompt',
          voice: 'Gamma voice',
          intro: 'Gamma intro',
          language: 'FR',
          imageSelect: null,
          imageCall: null,
          imageStart: null,
          ambience: null,
        },
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith('trainerAdmin.toastCreated', {
      type: 'success',
    })
  })

  it('edits an existing trainer successfully', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)
    vi.mocked(api.fetchTrainerByIdWithToken).mockResolvedValue(mockTrainers[0])
    vi.mocked(api.updateTrainerWithToken).mockResolvedValue({
      ...mockTrainers[0],
      name: 'Updated Alpha Trainer',
    })
    const user = userEvent.setup()

    renderWithClient(<TrainerAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Trainer').length).toBeGreaterThan(0)
    })

    // Click edit button in detail view
    const editBtn = screen.getByRole('button', {
      name: 'trainerAdmin.edit',
    })
    await user.click(editBtn)

    await waitFor(() => {
      expect(api.fetchTrainerByIdWithToken).toHaveBeenCalledWith(
        1,
        'mock-token',
      )
    })

    // Modify name input
    const nameInput = screen.getByPlaceholderText(
      'trainerAdmin.namePlaceholder',
    )
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Alpha Trainer')

    const saveBtn = screen.getByRole('button', {
      name: 'trainerAdmin.save',
    })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(api.updateTrainerWithToken).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Updated Alpha Trainer' }),
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith('trainerAdmin.toastUpdated', {
      type: 'success',
    })
  })

  it('deletes a trainer via confirm modal', async () => {
    vi.mocked(api.fetchTrainersWithToken).mockResolvedValue(mockTrainers)
    vi.mocked(api.fetchTrainerByIdWithToken).mockResolvedValue(mockTrainers[0])
    vi.mocked(api.deleteTrainerWithToken).mockResolvedValue(true)
    const user = userEvent.setup()

    renderWithClient(<TrainerAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Trainer').length).toBeGreaterThan(0)
    })

    // Enter edit mode
    await user.click(screen.getByRole('button', { name: 'trainerAdmin.edit' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'trainerAdmin.delete' }),
      ).toBeInTheDocument()
    })

    // Click delete to trigger confirm modal
    await user.click(
      screen.getByRole('button', { name: 'trainerAdmin.delete' }),
    )

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()

    // Confirm deletion
    await user.click(screen.getByText('Confirm Delete Action'))

    await waitFor(() => {
      expect(api.deleteTrainerWithToken).toHaveBeenCalledWith(1, 'mock-token')
    })

    expect(mockShowToast).toHaveBeenCalledWith('trainerAdmin.toastDeleted', {
      type: 'success',
    })
  })
})
