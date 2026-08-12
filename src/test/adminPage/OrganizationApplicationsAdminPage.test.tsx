import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../../api/organizationApplications'
import OrganizationApplicationsAdminPage from '../../features/adminPage/OrganizationApplicationsAdminPage.tsx'

// --- Mocks ---

const mockT = (key: string, params?: Record<string, unknown>) => {
  if (params?.id !== undefined) return `${key}:${params.id}`
  if (params?.date !== undefined) return `${key}:${params.date}`
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
let mockToast: { message: string } | null = null

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
    showToast: mockShowToast,
  }),
}))

vi.mock('../../api/organizationApplications', () => ({
  fetchOrganizationApplications: vi.fn(),
  approveOrganizationApplication: vi.fn(),
  rejectOrganizationApplication: vi.fn(),
  updateApplicationPaymentStatus: vi.fn(),
}))

// --- Mock Data ---

const mockApplications: api.OrganizationApplication[] = [
  {
    id: 1,
    orgName: 'Alpha Org',
    city: 'Stockholm',
    description: 'Alpha description text',
    motivation: 'Alpha motivation text',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: '2026-01-01T10:00:00Z',
    reviewedAt: null,
    userId: 101,
  },
  {
    id: 2,
    orgName: 'Beta Org',
    city: 'Gothenburg',
    description: 'Beta description text',
    motivation: 'Beta motivation text',
    status: 'APPROVED',
    paymentStatus: 'PAID',
    createdAt: '2026-01-02T10:00:00Z',
    reviewedAt: '2026-01-02T12:00:00Z',
    userId: 102,
  },
  {
    id: 3,
    orgName: 'Gamma Org',
    city: 'Malmo',
    description: 'Gamma description text',
    motivation: 'Gamma motivation text',
    status: 'REJECTED',
    paymentStatus: 'NOT_REQUIRED',
    createdAt: '2026-01-03T10:00:00Z',
    reviewedAt: '2026-01-03T12:00:00Z',
    userId: 103,
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

describe('OrganizationApplicationsAdminPage', () => {
  const defaultProps = {
    searchTerm: '',
    onOpenOrganisations: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockToast = null
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders loading state and fetches applications successfully', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    expect(
      screen.getByText('admin.orgApplications.loading'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    expect(api.fetchOrganizationApplications).toHaveBeenCalledWith('mock-token')
  })

  it('displays error message when query fails', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockRejectedValue(
      new Error('Failed to load applications'),
    )

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load applications'),
      ).toBeInTheDocument()
    })
  })

  it('filters applications by status tabs and show all button', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
      expect(screen.queryByText('Beta Org')).not.toBeInTheDocument()
    })

    // Click APPROVED status filter tab
    const approvedTab = screen.getByRole('button', {
      name: /admin\.orgapplications\.status\.approved/i,
    })
    await user.click(approvedTab)

    expect(screen.queryByText('Alpha Org')).not.toBeInTheDocument()
    expect(screen.getAllByText('Beta Org').length).toBeGreaterThan(0)

    // Click Show All button
    const showAllButton = screen.getByRole('button', {
      name: 'admin.orgApplications.showAll',
    })
    await user.click(showAllButton)

    expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Beta Org').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gamma Org').length).toBeGreaterThan(0)
  })

  it('filters applications using search term prop', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    const user = userEvent.setup()

    renderWithClient(
      <OrganizationApplicationsAdminPage
        {...defaultProps}
        searchTerm="Stockholm"
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    // Show all to test search filtering across all statuses
    await user.click(
      screen.getByRole('button', { name: 'admin.orgApplications.showAll' }),
    )

    expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    expect(screen.queryByText('Beta Org')).not.toBeInTheDocument()
  })

  it('filters applications using local search input', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    // Click Show All to reveal all applications for searching
    await user.click(
      screen.getByRole('button', { name: 'admin.orgApplications.showAll' }),
    )

    const searchInput = screen.getByPlaceholderText(
      'admin.orgApplications.search',
    )
    await user.type(searchInput, 'Gothenburg')

    expect(screen.queryByText('Alpha Org')).not.toBeInTheDocument()
    expect(screen.getAllByText('Beta Org').length).toBeGreaterThan(0)
  })

  it('shows empty state when no applications match filters', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue([])

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('admin.orgApplications.empty'),
      ).toBeInTheDocument()
    })
  })

  it('selects an application and displays detailed view', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Alpha description text')).toBeInTheDocument()
    expect(screen.getByText('Alpha motivation text')).toBeInTheDocument()

    // Show all and select Beta Org from sidebar
    await user.click(
      screen.getByRole('button', { name: 'admin.orgApplications.showAll' }),
    )

    const betaCard = screen.getAllByText('Beta Org')[0]
    await user.click(betaCard)

    expect(screen.getByText('Beta description text')).toBeInTheDocument()
    expect(screen.getByText('Beta motivation text')).toBeInTheDocument()
  })

  it('approves a pending organization application', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    vi.mocked(api.approveOrganizationApplication).mockResolvedValue({
      ...mockApplications[0],
      status: 'APPROVED',
    })
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    const approveBtn = screen.getByRole('button', {
      name: /admin\.orgapplications\.approve/i,
    })
    await user.click(approveBtn)

    await waitFor(() => {
      expect(api.approveOrganizationApplication).toHaveBeenCalledWith(
        1,
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'admin.orgApplications.approvedToast',
      { type: 'success' },
    )
  })

  it('rejects a pending organization application', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    vi.mocked(api.rejectOrganizationApplication).mockResolvedValue({
      ...mockApplications[0],
      status: 'REJECTED',
    })
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    const rejectBtn = screen.getByRole('button', {
      name: /admin\.orgapplications\.reject/i,
    })
    await user.click(rejectBtn)

    await waitFor(() => {
      expect(api.rejectOrganizationApplication).toHaveBeenCalledWith(
        1,
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'admin.orgApplications.rejectedToast',
      { type: 'success' },
    )
  })

  it('updates application payment status from dropdown', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    vi.mocked(api.updateApplicationPaymentStatus).mockResolvedValue({
      ...mockApplications[0],
      paymentStatus: 'PAID',
    })
    const user = userEvent.setup()

    renderWithClient(<OrganizationApplicationsAdminPage {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'PAID')

    await waitFor(() => {
      expect(api.updateApplicationPaymentStatus).toHaveBeenCalledWith(
        1,
        'PAID',
        'mock-token',
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'admin.orgApplications.paymentToast',
      { type: 'success' },
    )
  })

  it('triggers onOpenOrganisations callback when top button or approved action button is clicked', async () => {
    vi.mocked(api.fetchOrganizationApplications).mockResolvedValue(
      mockApplications,
    )
    const onOpenOrganisations = vi.fn()
    const user = userEvent.setup()

    renderWithClient(
      <OrganizationApplicationsAdminPage
        {...defaultProps}
        onOpenOrganisations={onOpenOrganisations}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Org').length).toBeGreaterThan(0)
    })

    // Click header button
    const manageBtn = screen.getByRole('button', {
      name: /admin\.orgapplications\.manageorganisations/i,
    })
    await user.click(manageBtn)
    expect(onOpenOrganisations).toHaveBeenCalledTimes(1)

    // Switch to APPROVED filter and click action button
    const approvedTab = screen.getByRole('button', {
      name: /admin\.orgapplications\.status\.approved/i,
    })
    await user.click(approvedTab)

    const createEventsBtn = screen.getByRole('button', {
      name: /admin\.orgapplications\.createevents/i,
    })
    await user.click(createEventsBtn)
    expect(onOpenOrganisations).toHaveBeenCalledTimes(2)
  })
})
