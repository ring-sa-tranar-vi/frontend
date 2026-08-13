import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../../api/organizationApplications'
import CompanyApplicationPage from '../../features/companyPortal/CompanyApplicationPage.tsx'

// --- Mocks ---

const mockGetToken = vi.fn().mockResolvedValue('mock-token')

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

class MockOrganizationApplicationError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'OrganizationApplicationError'
    this.status = status
  }
}

vi.mock('../../api/organizationApplications', () => ({
  fetchMyOrganizationApplication: vi.fn(),
  createOrganizationApplication: vi.fn(),
  OrganizationApplicationError: class extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'OrganizationApplicationError'
      this.status = status
    }
  },
}))

// --- Helpers ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
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

describe('CompanyApplicationPage', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders loading state when checking application status', async () => {
    vi.mocked(api.fetchMyOrganizationApplication).mockImplementation(
      () => new Promise(() => {}), // never resolves
    )

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    expect(
      screen.getByText('Kontrollerar ansökningsstatus...'),
    ).toBeInTheDocument()
  })

  it('displays error message when status fetch fails with a non-404 error', async () => {
    vi.mocked(api.fetchMyOrganizationApplication).mockRejectedValue(
      new Error('Kunde inte nå servern'),
    )

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText(/Kunde inte hämta ansökningsstatus/i),
      ).toBeInTheDocument()
      expect(screen.getByText('Kunde inte nå servern')).toBeInTheDocument()
    })
  })

  it('displays PENDING status screen when existing application is pending', async () => {
    vi.mocked(api.fetchMyOrganizationApplication).mockResolvedValue({
      id: 1,
      orgName: 'Hälsoklubben',
      city: 'Stockholm',
      description: 'En hälsoklubb',
      motivation: 'Vill skapa event',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: '2026-01-01T10:00:00Z',
      reviewedAt: null,
      userId: 101,
    })

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Ansökan är skickad')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'En administratör granskar nu er ansökan. Organisationen skapas först när ansökan har godkänts.',
      ),
    ).toBeInTheDocument()
  })

  it('displays APPROVED status screen when existing application is approved', async () => {
    vi.mocked(api.fetchMyOrganizationApplication).mockResolvedValue({
      id: 1,
      orgName: 'Hälsoklubben',
      city: 'Stockholm',
      description: 'En hälsoklubb',
      motivation: 'Vill skapa event',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      createdAt: '2026-01-01T10:00:00Z',
      reviewedAt: '2026-01-02T10:00:00Z',
      userId: 101,
    })

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Ansökan är godkänd')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'Organisationen är skapad och kan nu hanteras av administratörer.',
      ),
    ).toBeInTheDocument()
  })

  it('shows rejection alert and form when existing application was REJECTED', async () => {
    vi.mocked(api.fetchMyOrganizationApplication).mockResolvedValue({
      id: 1,
      orgName: 'Hälsoklubben',
      city: 'Stockholm',
      description: 'En hälsoklubb',
      motivation: 'Vill skapa event',
      status: 'REJECTED',
      paymentStatus: 'NOT_REQUIRED',
      createdAt: '2026-01-01T10:00:00Z',
      reviewedAt: '2026-01-02T10:00:00Z',
      userId: 101,
    })

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('Den tidigare ansökan avslogs'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', { name: /Skicka ansökan för granskning/i }),
    ).toBeInTheDocument()
  })

  it('submits a new application successfully when 404 is returned initially', async () => {
    const error404 = new api.OrganizationApplicationError(
      'Not found',
      404,
    ) as MockOrganizationApplicationError
    error404.status = 404

    vi.mocked(api.fetchMyOrganizationApplication).mockRejectedValue(error404)
    vi.mocked(api.createOrganizationApplication).mockResolvedValue({
      id: 2,
      orgName: 'Träningskompaniet',
      city: 'Göteborg',
      description: 'Beskrivning',
      motivation: 'Motivering',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: '2026-01-01T10:00:00Z',
      reviewedAt: null,
      userId: 102,
    } as unknown as void)

    const user = userEvent.setup()

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Exempel: Hälsoklubben'),
      ).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', {
      name: /Skicka ansökan för granskning/i,
    })
    expect(submitBtn).toBeDisabled()

    // Fill form
    await user.type(
      screen.getByPlaceholderText('Exempel: Hälsoklubben'),
      'Träningskompaniet',
    )
    await user.type(
      screen.getByPlaceholderText('Exempel: Stockholm'),
      'Göteborg',
    )
    await user.type(
      screen.getByPlaceholderText(
        'Vad gör organisationen och vilka riktar ni er till?',
      ),
      'Beskrivning',
    )
    await user.type(
      screen.getByPlaceholderText(
        'Berätta hur ni vill bidra och vilka event ni vill skapa.',
      ),
      'Motivering',
    )

    expect(submitBtn).toBeEnabled()
    await user.click(submitBtn)

    await waitFor(() => {
      expect(api.createOrganizationApplication).toHaveBeenCalledWith(
        {
          organizationName: 'Träningskompaniet',
          city: 'Göteborg',
          description: 'Beskrivning',
          motivation: 'Motivering',
        },
        'mock-token',
      )
    })

    expect(screen.getByText('Ansökan är skickad')).toBeInTheDocument()
  })

  it('displays mutation error when submission fails', async () => {
    const error404 = new api.OrganizationApplicationError(
      'Not found',
      404,
    ) as MockOrganizationApplicationError
    error404.status = 404

    vi.mocked(api.fetchMyOrganizationApplication).mockRejectedValue(error404)
    vi.mocked(api.createOrganizationApplication).mockRejectedValue(
      new Error('Kunde inte skicka ansökan'),
    )

    const user = userEvent.setup()

    renderWithClient(<CompanyApplicationPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Exempel: Hälsoklubben'),
      ).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Exempel: Hälsoklubben'), 'Org')
    await user.type(screen.getByPlaceholderText('Exempel: Stockholm'), 'Stad')
    await user.type(
      screen.getByPlaceholderText(
        'Vad gör organisationen och vilka riktar ni er till?',
      ),
      'Desc',
    )
    await user.type(
      screen.getByPlaceholderText(
        'Berätta hur ni vill bidra och vilka event ni vill skapa.',
      ),
      'Motiv',
    )

    await user.click(
      screen.getByRole('button', { name: /Skicka ansökan för granskning/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('Kunde inte skicka ansökan')).toBeInTheDocument()
    })
  })

  it('triggers onBack and onClose callbacks', async () => {
    const error404 = new api.OrganizationApplicationError(
      'Not found',
      404,
    ) as MockOrganizationApplicationError
    error404.status = 404

    vi.mocked(api.fetchMyOrganizationApplication).mockRejectedValue(error404)

    const onBack = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithClient(
      <CompanyApplicationPage onBack={onBack} onClose={onClose} />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Tillbaka' }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Tillbaka' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Stäng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
