import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CompanyOrganisationLayout from '../../features/companyPortal/components/CompanyOrganisationLayout'

vi.mock(
  '../../features/companyPortal/components/CompanyOrganisationHeader',
  () => ({
    default: ({
      statusMessage,
      onBack,
      onClose,
    }: {
      statusMessage: string | null
      onBack: () => void
      onClose: () => void
    }) => (
      <header data-testid="mock-header">
        <span>{statusMessage}</span>
        <button onClick={onBack}>Mock Back</button>
        <button onClick={onClose}>Mock Close</button>
      </header>
    ),
  }),
)

vi.mock('../../features/companyPortal/components/OrganisationInfoCard', () => ({
  default: () => <div data-testid="mock-organisation-info-card" />,
}))

vi.mock('../../features/companyPortal/components/EventListCard', () => ({
  default: () => <div data-testid="mock-event-list-card" />,
}))

const createMockViewModel = (overrides = {}) => ({
  isWideLayout: false,
  layoutRef: { current: null },
  statusMessage: 'Ansökan godkänd',
  selectedOrganisationId: 1,
  setSelectedOrganisationId: vi.fn(),
  organisations: [{ id: 1, name: 'Hälsoklubben' }],
  orgName: 'Hälsoklubben',
  setOrgName: vi.fn(),
  orgDescription: 'En beskrivning',
  setOrgDescription: vi.fn(),
  orgCity: 'Stockholm',
  setOrgCity: vi.fn(),
  orgWords: ['Träning', 'Hälsa'],
  canSaveOrg: true,
  saveOrganisation: vi.fn(),
  isSavingOrganisation: false,
  showCreateEvent: false,
  setShowCreateEvent: vi.fn(),
  eventForm: { title: '', date: '' },
  setEventForm: vi.fn(),
  canCreateEvent: false,
  createEvent: vi.fn(),
  isSavingEvent: false,
  events: [],
  editingEventId: null,
  editingEventForm: { title: '', date: '' },
  setEditingEventForm: vi.fn(),
  canSaveEditedEvent: false,
  updateEvent: vi.fn(),
  isUpdatingEvent: false,
  stopEditingEvent: vi.fn(),
  startEditingEvent: vi.fn(),
  deleteEvent: vi.fn(),
  ...overrides,
})

describe('CompanyOrganisationLayout', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onClose: vi.fn(),
  }

  const renderLayout = (propsOverrides = {}, vmOverrides = {}) => {
    const user = userEvent.setup()
    const mockVm = createMockViewModel(vmOverrides)
    const props = { ...defaultProps, ...propsOverrides }

    const view = render(
      <CompanyOrganisationLayout {...props} vm={mockVm as any} />,
    )

    return {
      user,
      props,
      vm: mockVm,
      ...view,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all main sections and subcomponents', () => {
      renderLayout()

      expect(screen.getByTestId('mock-header')).toBeInTheDocument()
      expect(screen.getByText('Ansökan godkänd')).toBeInTheDocument()
      expect(
        screen.getByTestId('mock-organisation-info-card'),
      ).toBeInTheDocument()
      expect(screen.getByTestId('mock-event-list-card')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Event som du skapar syns i appen under din organisation.',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('Organisation Selector', () => {
    it('does not render dropdown when user has only 1 organisation', () => {
      renderLayout({}, { organisations: [{ id: 1, name: 'Hälsoklubben' }] })

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('renders dropdown and triggers callback on change when user has multiple organisations', async () => {
      const setSelectedOrganisationId = vi.fn()
      const { user } = renderLayout(
        {},
        {
          selectedOrganisationId: 1,
          setSelectedOrganisationId,
          organisations: [
            { id: 1, name: 'Hälsoklubben' },
            { id: 2, name: 'Träningscentret' },
          ],
        },
      )

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Hälsoklubben' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Träningscentret' }),
      ).toBeInTheDocument()

      await user.selectOptions(select, '2')

      expect(setSelectedOrganisationId).toHaveBeenCalledWith(2)
    })
  })

  describe('Layout Variants', () => {
    it('applies wide layout styles when isWideLayout is true', () => {
      const { container } = renderLayout({}, { isWideLayout: true })

      const shell = container.querySelector('section > div')
      expect(shell).toHaveClass('max-w-6xl')
    })

    it('applies narrow layout styles when isWideLayout is false', () => {
      const { container } = renderLayout({}, { isWideLayout: false })

      const shell = container.querySelector('section > div')
      expect(shell).toHaveClass('mx-auto w-full')
      expect(shell).not.toHaveClass('max-w-6xl')
    })
  })

  describe('Header Callbacks', () => {
    it('forwards onBack and onClose callbacks to Header component', async () => {
      const onBack = vi.fn()
      const onClose = vi.fn()
      const { user } = renderLayout({ onBack, onClose })

      await user.click(screen.getByRole('button', { name: 'Mock Back' }))
      expect(onBack).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button', { name: 'Mock Close' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
