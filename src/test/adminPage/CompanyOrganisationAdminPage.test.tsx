import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CompanyOrganisationAdminPage from '../../features/adminPage/CompanyOrganisationAdminPage.tsx'

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

vi.mock('../../hooks/useCurrentUser', () => ({
  default: () => ({
    userId: '1',
  }),
}))

const mockShowToast = vi.fn()
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    toast: null,
    showToast: mockShowToast,
  }),
}))

const mockFetchCompanyOrganisations = vi.fn()
const mockCreateCompanyOrganisation = vi.fn()
const mockUpdateCompanyOrganisation = vi.fn()
const mockDeleteCompanyOrganisation = vi.fn()
const mockCreateCompanyEvent = vi.fn()
const mockDeleteCompanyEvent = vi.fn()

vi.mock('../../api/companyOrganisations', () => ({
  fetchCompanyOrganisations: (...args: any[]) =>
    mockFetchCompanyOrganisations(...args),
  createCompanyOrganisation: (...args: any[]) =>
    mockCreateCompanyOrganisation(...args),
  updateCompanyOrganisation: (...args: any[]) =>
    mockUpdateCompanyOrganisation(...args),
  deleteCompanyOrganisation: (...args: any[]) =>
    mockDeleteCompanyOrganisation(...args),
  createCompanyEvent: (...args: any[]) => mockCreateCompanyEvent(...args),
  deleteCompanyEvent: (...args: any[]) => mockDeleteCompanyEvent(...args),
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

describe('CompanyOrganisationAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially and then lists organisations', async () => {
    mockFetchCompanyOrganisations.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Alpha Corp',
        description: 'Tech company',
        orgCity: 'Stockholm',
        events: [],
      },
    ])

    renderWithQueryClient(<CompanyOrganisationAdminPage />)

    expect(screen.getByText('admin.companyOrg.loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Corp')[0]).toBeInTheDocument()
    })

    expect(
      screen.getByText('0 admin.companyOrg.eventCount'),
    ).toBeInTheDocument()
  })

  it('opens create organisation form when create button is clicked', async () => {
    mockFetchCompanyOrganisations.mockResolvedValueOnce([])
    const user = userEvent.setup()

    renderWithQueryClient(<CompanyOrganisationAdminPage />)

    await waitFor(() => {
      expect(
        screen.getByText('admin.companyOrg.createOrganisation'),
      ).toBeInTheDocument()
    })

    const createBtn = screen.getByRole('button', {
      name: /\+\s*admin\.companyOrg\.createOrganisation/i,
    })
    await user.click(createBtn)

    expect(
      screen.getByRole('heading', {
        name: 'admin.companyOrg.createOrganisation',
      }),
    ).toBeInTheDocument()
  })

  it('creates an organisation successfully', async () => {
    mockFetchCompanyOrganisations.mockResolvedValue([
      {
        id: 1,
        name: 'Alpha Corp',
        description: 'Tech company',
        orgCity: 'Stockholm',
        events: [],
      },
    ])
    mockCreateCompanyOrganisation.mockResolvedValueOnce({
      id: 2,
      name: 'Beta Corp',
      description: 'Another tech company',
      orgCity: 'Gothenburg',
      events: [],
    })

    const user = userEvent.setup()
    renderWithQueryClient(<CompanyOrganisationAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Corp')[0]).toBeInTheDocument()
    })

    const createBtn = screen.getByRole('button', {
      name: /\+\s*admin\.companyOrg\.createOrganisation/i,
    })
    await user.click(createBtn)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Beta Corp')
    await user.type(inputs[1], 'Another tech company')
    await user.type(inputs[2], 'Gothenburg')

    const saveOrgBtn = screen.getByRole('button', {
      name: 'admin.companyOrg.saveOrganisation',
    })
    await user.click(saveOrgBtn)

    await waitFor(() => {
      expect(mockCreateCompanyOrganisation).toHaveBeenCalledTimes(1)
    })

    expect(mockCreateCompanyOrganisation).toHaveBeenCalledWith(
      'mock-token',
      expect.objectContaining({
        name: 'Beta Corp',
        description: 'Another tech company',
        orgCity: 'Gothenburg',
        organizerId: 1,
      }),
    )

    expect(mockShowToast).toHaveBeenCalledWith(
      'admin.companyOrg.toastOrganisationCreated',
      { type: 'success' },
    )
  })

  it('selects an organisation and displays its details and events', async () => {
    mockFetchCompanyOrganisations.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Alpha Corp',
        description: 'Tech company',
        orgCity: 'Stockholm',
        events: [
          {
            id: 10,
            organisationId: 1,
            name: 'Meetup',
            description: 'Monthly sync',
            time: '2026-06-01T10:00:00.000Z',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    renderWithQueryClient(<CompanyOrganisationAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Corp')[0]).toBeInTheDocument()
    })

    const orgCard = screen.getAllByText('Alpha Corp')[0]
    await user.click(orgCard)

    expect(
      screen.getByText('admin.companyOrg.organisationCity: Stockholm'),
    ).toBeInTheDocument()
    expect(screen.getByText('Meetup')).toBeInTheDocument()
  })

  it('deletes an organisation after confirmation', async () => {
    mockFetchCompanyOrganisations.mockResolvedValue([
      {
        id: 1,
        name: 'Alpha Corp',
        description: 'Tech company',
        orgCity: 'Stockholm',
        events: [],
      },
    ])
    mockDeleteCompanyOrganisation.mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithQueryClient(<CompanyOrganisationAdminPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Corp')[0]).toBeInTheDocument()
    })

    await user.click(screen.getAllByText('Alpha Corp')[0])

    const deleteOrgBtn = screen.getByRole('button', {
      name: 'admin.companyOrg.deleteOrganisation',
    })
    await user.click(deleteOrgBtn)

    const confirmDeleteBtn = screen.getAllByRole('button', {
      name: 'admin.companyOrg.deleteOrganisation',
    })[1]
    await user.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(mockDeleteCompanyOrganisation).toHaveBeenCalledWith(
        'mock-token',
        1,
      )
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'admin.companyOrg.toastOrganisationDeleted',
      { type: 'success' },
    )
  })
})
