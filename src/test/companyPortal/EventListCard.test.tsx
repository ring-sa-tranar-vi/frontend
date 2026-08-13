import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CompanyEvent } from '../../api/companyPortal.ts'
import type { EventForm } from '../../features/companyPortal/types.ts'
import EventListCard from '../../features/companyPortal/components/EventListCard.tsx'

vi.mock('../../features/companyPortal/components/EventCreateForm', () => ({
  default: ({ createEvent }: { createEvent: () => void }) => (
    <div data-testid="mock-event-create-form">
      <button onClick={createEvent}>Mock Submit Create</button>
    </div>
  ),
}))

vi.mock('../../features/companyPortal/components/EventEditForm', () => ({
  default: ({
    onSave,
    onCancel,
  }: {
    onSave: () => void
    onCancel: () => void
  }) => (
    <div data-testid="mock-event-edit-form">
      <button onClick={onSave}>Mock Save Edit</button>
      <button onClick={onCancel}>Mock Cancel Edit</button>
    </div>
  ),
}))

vi.mock('../../features/companyPortal/components/EventListItem', () => ({
  default: ({
    event,
    onEdit,
    onDelete,
  }: {
    event: CompanyEvent
    onEdit: () => void
    onDelete: () => void
  }) => (
    <div data-testid={`mock-event-item-${event.id}`}>
      <span>{event.name}</span>
      <button onClick={onEdit}>Mock Edit {event.id}</button>
      <button onClick={onDelete}>Mock Delete {event.id}</button>
    </div>
  ),
}))

const mockEventForm: EventForm = {
  name: '',
  time: '',
  city: '',
  venue: '',
  eventType: 'IN_PERSON',
  description: '',
}

const mockEvents: CompanyEvent[] = [
  {
    id: 1,
    name: 'Sommarfest',
    date: '2026-06-15',
    city: 'Stockholm',
    venue: 'Parken',
    type: 'IN_PERSON',
    description: 'Fest',
  } as unknown as CompanyEvent,
  {
    id: 2,
    name: 'Webinar',
    date: '2026-07-01',
    city: 'Online',
    venue: 'Zoom',
    type: 'ONLINE',
    description: 'Webinar',
  } as unknown as CompanyEvent,
]

describe('EventListCard', () => {
  const defaultProps = {
    isWideLayout: false,
    showCreateEvent: false,
    setShowCreateEvent: vi.fn(),
    eventForm: mockEventForm,
    setEventForm: vi.fn(),
    canCreateEvent: true,
    createEvent: vi.fn(),
    isSavingEvent: false,
    events: [],
    editingEventId: null,
    editingEventForm: mockEventForm,
    setEditingEventForm: vi.fn(),
    canSaveEditedEvent: true,
    updateEvent: vi.fn(),
    isUpdatingEvent: false,
    stopEditingEvent: vi.fn(),
    startEditingEvent: vi.fn(),
    deleteEvent: vi.fn(),
  }

  const renderCard = (propsOverrides = {}) => {
    const user = userEvent.setup()
    const props = { ...defaultProps, ...propsOverrides }

    const view = render(<EventListCard {...props} />)

    return {
      user,
      props,
      ...view,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders heading and add event button', () => {
      renderCard()

      expect(
        screen.getByRole('heading', { name: 'Kommande event', level: 2 }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '+ Lägg till event' }),
      ).toBeInTheDocument()
    })

    it('renders empty message when events list is empty', () => {
      renderCard({ events: [] })

      expect(screen.getByText('Inga event ännu.')).toBeInTheDocument()
    })

    it('does not render empty message when events are present', () => {
      renderCard({ events: mockEvents })

      expect(screen.queryByText('Inga event ännu.')).not.toBeInTheDocument()
      expect(screen.getByTestId('mock-event-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('mock-event-item-2')).toBeInTheDocument()
    })
  })

  describe('Create Event Form Visibility', () => {
    it('does not render EventCreateForm when showCreateEvent is false', () => {
      renderCard({ showCreateEvent: false })

      expect(
        screen.queryByTestId('mock-event-create-form'),
      ).not.toBeInTheDocument()
    })

    it('renders EventCreateForm when showCreateEvent is true', () => {
      renderCard({ showCreateEvent: true })

      expect(screen.getByTestId('mock-event-create-form')).toBeInTheDocument()
    })

    it('invokes setShowCreateEvent with a functional updater when clicking toggle button', async () => {
      const setShowCreateEvent = vi.fn()
      const { user } = renderCard({
        setShowCreateEvent,
        showCreateEvent: false,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Lägg till event' }),
      )

      expect(setShowCreateEvent).toHaveBeenCalledTimes(1)
      const updater = setShowCreateEvent.mock.calls[0][0]
      expect(updater(false)).toBe(true)
      expect(updater(true)).toBe(false)
    })
  })

  describe('Event Item Rendering Modes', () => {
    it('renders EventListItem for all events when editingEventId is null', () => {
      renderCard({ events: mockEvents, editingEventId: null })

      expect(screen.getByTestId('mock-event-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('mock-event-item-2')).toBeInTheDocument()
      expect(
        screen.queryByTestId('mock-event-edit-form'),
      ).not.toBeInTheDocument()
    })

    it('renders EventEditForm for the matching event when editingEventId is set', () => {
      renderCard({ events: mockEvents, editingEventId: 1 })

      // Event 1 is being edited -> shows Edit Form instead of item
      expect(screen.getByTestId('mock-event-edit-form')).toBeInTheDocument()
      expect(screen.queryByTestId('mock-event-item-1')).not.toBeInTheDocument()

      // Event 2 is NOT being edited -> remains standard list item
      expect(screen.getByTestId('mock-event-item-2')).toBeInTheDocument()
    })
  })

  describe('Event Actions', () => {
    it('triggers startEditingEvent with event data when clicking edit button', async () => {
      const startEditingEvent = vi.fn()
      const { user } = renderCard({ events: mockEvents, startEditingEvent })

      await user.click(screen.getByRole('button', { name: 'Mock Edit 1' }))

      expect(startEditingEvent).toHaveBeenCalledTimes(1)
      expect(startEditingEvent).toHaveBeenCalledWith(mockEvents[0])
    })

    it('triggers deleteEvent with event ID when clicking delete button', async () => {
      const deleteEvent = vi.fn()
      const { user } = renderCard({ events: mockEvents, deleteEvent })

      await user.click(screen.getByRole('button', { name: 'Mock Delete 2' }))

      expect(deleteEvent).toHaveBeenCalledTimes(1)
      expect(deleteEvent).toHaveBeenCalledWith(2)
    })
  })

  describe('Layout Variants', () => {
    it('applies grid column styling to main container when isWideLayout is true', () => {
      const { container } = renderCard({ isWideLayout: true })

      const article = container.querySelector('article')
      expect(article).toHaveClass('col-span-7')
    })

    it('does not apply column span class when isWideLayout is false', () => {
      const { container } = renderCard({ isWideLayout: false })

      const article = container.querySelector('article')
      expect(article).not.toHaveClass('col-span-7')
    })
  })
})
