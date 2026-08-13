import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CompanyEvent } from '../../api/companyPortal.ts'
import EventListItem from '../../features/companyPortal/components/EventListItem.tsx'

vi.mock('../../hooks/useCompanyOrganisationPage.ts', () => ({
  formatDate: vi.fn((time: string) => `Formatted-Date-${time}`),
  formatDayNumber: vi.fn(() => '15'),
  formatMonthShort: vi.fn(() => 'JUN'),
  formatTime: vi.fn((time: string) => `Formatted-Time-${time}`),
}))

const mockEvent: CompanyEvent = {
  id: 1,
  name: 'Sommarfest 2026',
  time: '2026-06-15T18:00:00Z',
  city: 'Stockholm',
  venue: 'Kungsträdgården',
  type: 'IN_PERSON',
  description: 'Fest för hela företaget',
  attendeesCount: 42,
} as unknown as CompanyEvent

describe('EventListItem', () => {
  const defaultProps = {
    event: mockEvent,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  const renderComponent = (propsOverrides = {}) => {
    const user = userEvent.setup()
    const props = { ...defaultProps, ...propsOverrides }

    const view = render(<EventListItem {...props} />)

    return {
      user,
      props,
      ...view,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering & Formatting', () => {
    it('renders event day number and short month badge', () => {
      renderComponent()

      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText(/jun/i)).toBeInTheDocument()
    })

    it('renders event name, date, time, venue, and city', () => {
      renderComponent()

      expect(screen.getByText('Sommarfest 2026')).toBeInTheDocument()
      expect(
        screen.getByText('Formatted-Date-2026-06-15T18:00:00Z'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Formatted-Time-2026-06-15T18:00:00Z'),
      ).toBeInTheDocument()
      expect(screen.getByText('Kungsträdgården, Stockholm')).toBeInTheDocument()
    })
  })

  describe('Attendees Badge Visibility', () => {
    it('renders attendees count badge when attendeesCount is a number', () => {
      renderComponent({
        event: { ...mockEvent, attendeesCount: 42 },
      })

      expect(screen.getByText('42 anmälda')).toBeInTheDocument()
    })

    it('renders zero attendees when attendeesCount is 0', () => {
      renderComponent({
        event: { ...mockEvent, attendeesCount: 0 },
      })

      expect(screen.getByText('0 anmälda')).toBeInTheDocument()
    })

    it('does not render attendees badge when attendeesCount is undefined', () => {
      renderComponent({
        event: { ...mockEvent, attendeesCount: undefined },
      })

      expect(screen.queryByText(/anmälda/i)).not.toBeInTheDocument()
    })
  })

  describe('User Actions', () => {
    it('invokes onEdit when clicking edit button', async () => {
      const onEdit = vi.fn()
      const { user } = renderComponent({ onEdit })

      const editButton = screen.getByRole('button', { name: 'Redigera event' })
      await user.click(editButton)

      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it('invokes onDelete when clicking delete button', async () => {
      const onDelete = vi.fn()
      const { user } = renderComponent({ onDelete })

      const deleteButton = screen.getByRole('button', { name: 'Ta bort event' })
      await user.click(deleteButton)

      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })
})
