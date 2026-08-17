import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventForm } from '../../features/companyPortal/types.ts'
import EventEditForm from '../../features/companyPortal/components/EventEditForm.tsx'

const createMockForm = (overrides?: Partial<EventForm>): EventForm => ({
  name: 'Sommarfest 2026',
  time: '2026-06-15T18:00',
  city: 'Stockholm',
  venue: 'Kungsträdgården',
  eventType: 'IN_PERSON',
  description: 'Årets största fest!',
  ...overrides,
})

function StatefulEventEditForm({
  initialForm = createMockForm(),
  onStateChange,
  ...propsOverrides
}: {
  initialForm?: EventForm
  onStateChange?: (state: EventForm) => void
  [key: string]: any
}) {
  const [form, setForm] = useState<EventForm>(initialForm)

  return (
    <EventEditForm
      canSave={true}
      isSaving={false}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      {...propsOverrides}
      form={form}
      setForm={(updater) => {
        setForm((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          onStateChange?.(next)
          return next
        })
      }}
    />
  )
}

describe('EventEditForm', () => {
  const defaultProps = {
    isWideLayout: false,
    form: createMockForm(),
    setForm: vi.fn(),
    canSave: true,
    onSave: vi.fn(),
    isSaving: false,
    onCancel: vi.fn(),
  }

  const renderForm = (propsOverrides = {}) => {
    const user = userEvent.setup()
    const props = { ...defaultProps, ...propsOverrides }
    const view = render(<EventEditForm {...props} />)

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
    it('renders all form fields populated with initial form data', () => {
      const form = createMockForm()
      renderForm({ form })

      const inputs = screen.getAllByRole('textbox')
      // inputs[0] = name, inputs[1] = city, inputs[2] = venue, inputs[3] = description (textarea)
      expect(inputs[0]).toHaveValue('Sommarfest 2026')
      expect(inputs[1]).toHaveValue('Stockholm')
      expect(inputs[2]).toHaveValue('Kungsträdgården')
      expect(inputs[3]).toHaveValue('Årets största fest!')

      const select = screen.getByRole('combobox', { name: 'Typ av event' })
      expect(select).toHaveValue('IN_PERSON')
    })

    it('renders save and cancel buttons', () => {
      renderForm()

      expect(screen.getByRole('button', { name: 'Spara' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Avbryt' })).toBeInTheDocument()
    })
  })

  describe('Form Field Interactions', () => {
    it('updates form state when editing "Namn"', async () => {
      const onStateChange = vi.fn()
      const user = userEvent.setup()

      render(
        <StatefulEventEditForm
          initialForm={createMockForm({ name: 'Old Name' })}
          onStateChange={onStateChange}
        />,
      )

      const inputs = screen.getAllByRole('textbox')
      await user.clear(inputs[0])
      await user.type(inputs[0], 'New Name')

      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      )
    })

    it('updates form state when selecting event type', async () => {
      const onStateChange = vi.fn()
      const user = userEvent.setup()

      render(
        <StatefulEventEditForm
          initialForm={createMockForm({ eventType: 'IN_PERSON' })}
          onStateChange={onStateChange}
        />,
      )

      const select = screen.getByRole('combobox', { name: 'Typ av event' })
      await user.selectOptions(select, 'ONLINE')

      expect(select).toHaveValue('ONLINE')
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ eventType: 'ONLINE' }),
      )
    })

    it('updates form state when editing description textarea', async () => {
      const onStateChange = vi.fn()
      const user = userEvent.setup()

      render(
        <StatefulEventEditForm
          initialForm={createMockForm({ description: '' })}
          onStateChange={onStateChange}
        />,
      )

      const textarea = screen.getAllByRole('textbox')[3]
      await user.type(textarea, 'Ny beskrivning')

      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ description: 'Ny beskrivning' }),
      )
    })
  })

  describe('Actions & Button States', () => {
    it('calls onSave when save button is clicked and enabled', async () => {
      const onSave = vi.fn()
      const { user } = renderForm({ canSave: true, isSaving: false, onSave })

      const saveButton = screen.getByRole('button', { name: 'Spara' })
      expect(saveButton).toBeEnabled()

      await user.click(saveButton)
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('disables save button when canSave is false', () => {
      renderForm({ canSave: false, isSaving: false })

      expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled()
    })

    it('disables save button when isSaving is true', () => {
      renderForm({ canSave: true, isSaving: true })

      expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn()
      const { user } = renderForm({ onCancel })

      const cancelButton = screen.getByRole('button', { name: 'Avbryt' })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Layout Variants', () => {
    it('applies grid column styles when isWideLayout is true', () => {
      const { container } = renderForm({ isWideLayout: true })

      const gridDiv = container.firstChild as HTMLElement
      expect(gridDiv).toHaveClass('grid-cols-2')

      const textarea = screen.getAllByRole('textbox')[3]
      expect(textarea).toHaveClass('col-span-2')
    })

    it('does not apply 2-column grid when isWideLayout is false', () => {
      const { container } = renderForm({ isWideLayout: false })

      const gridDiv = container.firstChild as HTMLElement
      expect(gridDiv).not.toHaveClass('grid-cols-2')
    })
  })
})
