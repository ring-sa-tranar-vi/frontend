import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CompanyOrganisationPage from '../../features/companyPortal/CompanyOrganisationPage.tsx'

// --- Mocks ---

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseAuth = vi.fn()

vi.mock('@clerk/react', () => ({
  useAuth: () => mockUseAuth(),
}))

// --- Helper ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  })

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

// --- Tests ---

describe('CompanyOrganisationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when Clerk auth is not loaded yet', () => {
    mockUseAuth.mockReturnValue({ isLoaded: false, isSignedIn: false })

    renderWithClient(<CompanyOrganisationPage />)

    expect(screen.getByText('Laddar företagssidan...')).toBeInTheDocument()
  })

  it('renders auth warning when user is not signed in', () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false })

    renderWithClient(<CompanyOrganisationPage />)

    expect(
      screen.getByText(
        'Du måste vara inloggad för att ansöka om en organisation.',
      ),
    ).toBeInTheDocument()
  })

  it('renders CompanyApplicationPage when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

    renderWithClient(<CompanyOrganisationPage />)

    expect(
      screen.getByRole('heading', { name: 'Ansök om att bli organisation' }),
    ).toBeInTheDocument()
  })

  it('navigates home with replace option when close button is clicked', async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })
    const user = userEvent.setup()

    renderWithClient(<CompanyOrganisationPage />)

    await user.click(screen.getByRole('button', { name: 'Stäng' }))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/', replace: true })
  })

  it('calls window.history.back() when back button is clicked and history length > 1', async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

    const historySpy = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => {})

    Object.defineProperty(window.history, 'length', {
      value: 2,
      configurable: true,
      writable: true,
    })

    const user = userEvent.setup()

    renderWithClient(<CompanyOrganisationPage />)

    await user.click(screen.getByRole('button', { name: 'Tillbaka' }))

    expect(historySpy).toHaveBeenCalledTimes(1)
    expect(mockNavigate).not.toHaveBeenCalled()

    historySpy.mockRestore()
  })

  it('navigates to home when back button is clicked and history length is 1 or less', async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

    const historySpy = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => {})

    Object.defineProperty(window.history, 'length', {
      value: 1,
      configurable: true,
      writable: true,
    })

    const user = userEvent.setup()

    renderWithClient(<CompanyOrganisationPage />)

    await user.click(screen.getByRole('button', { name: 'Tillbaka' }))

    expect(historySpy).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })

    historySpy.mockRestore()
  })
})
