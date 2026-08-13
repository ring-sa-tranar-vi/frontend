import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EventCreateForm from '../../features/companyPortal/components/EventCreateForm.tsx'
import type { EventForm } from '../../features/companyPortal/types.ts'

const createMockEventForm = (overrides?: Partial<EventForm>): EventForm => ({
  name: 'Sommarfest',
  time: '2026-06-15T18:00',
  city: 'Stockholm',
  venue: 'Kungsträdgården',
  eventType: 'IN_PERSON',
  description: 'Årets roligaste fest!',
  ...overrides,
})

describe('EventCreateForm', () => {
  const defaultProps = {
    isWideLayout: false,
    eventForm: createMockEventForm(),
    setEventForm: vi.fn(),
    canCreateEvent: true,
    createEvent: vi.fn(),
    isSavingEvent: false,
  }

  const setup = (propsOverrides = {}) => {
    const user = userEvent.setup()
    const props = { ...defaultProps, ...propsOverrides }
    const view = render(<EventCreateForm {...props} />)

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
    it('renders all form fields with initial eventForm values', () => {
      setup()

      expect(screen.getByPlaceholderText('Namn')).toHaveValue('Sommarfest')
      expect(screen.getByPlaceholderText('Stad')).toHaveValue('Stockholm')
      expect(screen.getByPlaceholderText('Plats')).toHaveValue(
        'Kungsträdgården',
      )
      expect(screen.getByPlaceholderText('Beskrivning')).toHaveValue(
        'Årets roligaste fest!',
      )

      const select = screen.getByRole('combobox', { name: 'Typ av event' })
      expect(select).toHaveValue('IN_PERSON')
      expect(
        screen.getByRole('option', { name: 'På plats' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Online' })).toBeInTheDocument()
    })
  })

  describe('Form Field Interactions', () => {
    it('calls setEventForm updater with correct value on name change', () => {
      let capturedState: EventForm | null = null
      const initialForm = createMockEventForm({ name: '' })

      const setEventForm = vi.fn((updater) => {
        capturedState =
          typeof updater === 'function' ? updater(initialForm) : updater
      })

      setup({ eventForm: initialForm, setEventForm })

      const input = screen.getByPlaceholderText('Namn')
      fireEvent.change(input, { target: { value: 'Sommarfest' } })

      expect(setEventForm).toHaveBeenCalledTimes(1)
      expect(capturedState).toEqual({ ...initialForm, name: 'Sommarfest' })
    })
  })

  describe('Submit Button', () => {
    it('triggers createEvent when clicked and enabled', async () => {
      const createEvent = vi.fn()
      const { user } = setup({
        canCreateEvent: true,
        isSavingEvent: false,
        createEvent,
      })

      const button = screen.getByRole('button', { name: 'Spara event' })
      expect(button).toBeEnabled()

      await user.click(button)
      expect(createEvent).toHaveBeenCalledTimes(1)
    })

    it('disables the button when canCreateEvent is false', () => {
      setup({ canCreateEvent: false, isSavingEvent: false })

      const button = screen.getByRole('button', { name: 'Spara event' })
      expect(button).toBeDisabled()
    })

    it('disables the button when isSavingEvent is true', () => {
      setup({ canCreateEvent: true, isSavingEvent: true })

      const button = screen.getByRole('button', { name: 'Spara event' })
      expect(button).toBeDisabled()
    })
  })

  describe('Layout Variants', () => {
    it('applies grid column styling when isWideLayout is true', () => {
      const { container } = setup({ isWideLayout: true })

      const gridDiv = container.querySelector('.grid')
      expect(gridDiv).toHaveClass('grid-cols-2')

      const textarea = screen.getByPlaceholderText('Beskrivning')
      expect(textarea).toHaveClass('col-span-2')
    })

    it('does not apply 2-column grid when isWideLayout is false', () => {
      const { container } = setup({ isWideLayout: false })

      const gridDiv = container.querySelector('.grid')
      expect(gridDiv).not.toHaveClass('grid-cols-2')

      const textarea = screen.getByPlaceholderText('Beskrivning')
      expect(textarea).not.toHaveClass('col-span-2')
    })
  })
})
