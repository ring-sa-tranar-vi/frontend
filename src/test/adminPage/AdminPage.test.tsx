import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import AdminPage from '../../features/adminPage/AdminPage.tsx'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.percent !== undefined) return `${key}:${options.percent}`
      if (options?.count !== undefined) return `${key}:${options.count}`
      return key
    },
  }),
}))

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockGetToken = vi.fn().mockResolvedValue('mock-token')
vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    isLoaded: true,
    getToken: mockGetToken,
  }),
  useUser: () => ({
    user: {
      firstName: 'Admin',
      fullName: 'Admin User',
      imageUrl: '',
    },
  }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('../../hooks/useCurrentUser', () => ({
  default: () => ({
    isProfileLoading: false,
    profile: { isAdmin: true },
  }),
}))

vi.mock('../../hooks/useAdminPage', () => ({
  useAdminPage: () => ({
    isLoading: false,
    error: null,
  }),
}))

const mockFetchAdminUsers = vi.fn()
vi.mock('../../api/admins', () => ({
  fetchAdminUsers: (...args: any[]) => mockFetchAdminUsers(...args),
}))

const mockFetchWorkouts = vi.fn()
vi.mock('../../api/workouts', () => ({
  fetchWorkouts: (...args: any[]) => mockFetchWorkouts(...args),
}))

const mockFetchFeedbackSummary = vi.fn()
vi.mock('../../api/feedbacks', () => ({
  fetchWorkoutFeedbackSummaryWithToken: (...args: any[]) =>
    mockFetchFeedbackSummary(...args),
}))

vi.mock('../../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}))

describe('AdminPage Layout & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAdminUsers.mockResolvedValue([
      { id: '1', active: true, enabled: true },
      { id: '2', active: false, enabled: true },
    ])
    mockFetchWorkouts.mockResolvedValue([])
    mockFetchFeedbackSummary.mockResolvedValue([])
  })

  it('renders the sidebar navigation items and dashboard view by default', async () => {
    renderWithProviders(<AdminPage />)

    expect(screen.getByText('admin.brand')).toBeInTheDocument()
    expect(screen.getByText('admin.console')).toBeInTheDocument()
    expect(screen.getByText('admin.nav.dashboard')).toBeInTheDocument()
    expect(screen.getByText('admin.nav.workouts')).toBeInTheDocument()
    expect(screen.getByText('admin.nav.trainers')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockFetchAdminUsers).toHaveBeenCalled()
    })
  })

  it('switches views when sidebar navigation buttons are clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminPage />)

    const workoutsNavBtn = screen.getByText('admin.nav.workouts')
    await user.click(workoutsNavBtn)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/workouts' })
  })

  it('navigates to home when the back button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminPage />)

    const backButton = screen.getByRole('button', {
      name: 'admin.backToHomeAriaLabel',
    })
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
