import {
  appSheetFormFieldClass,
  appSheetFormLabelClass,
  appSheetFormTextareaClass,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../components/AppSheet'
import type { Dispatch, SetStateAction } from 'react'
import type { EventForm } from '../types'

type Props = {
  form: EventForm
  setForm: Dispatch<SetStateAction<EventForm>>
  canSave: boolean
  onSave: () => void
  isSaving: boolean
  onCancel: () => void
}

export default function EventEditForm({
  form,
  setForm,
  canSave,
  onSave,
  isSaving,
  onCancel,
}: Props) {
  return (
    <div className="grid gap-3">
      <label className="block">
        <span className={appSheetFormLabelClass}>Namn</span>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={appSheetFormFieldClass}
        />
      </label>
      <label className="block">
        <span className={appSheetFormLabelClass}>Datum och tid</span>
        <input
          type="datetime-local"
          value={form.time}
          onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
          className={appSheetFormFieldClass}
        />
      </label>
      <label className="block">
        <span className={appSheetFormLabelClass}>Stad</span>
        <input
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className={appSheetFormFieldClass}
        />
      </label>
      <label className="block">
        <span className={appSheetFormLabelClass}>
          Plats{' '}
          <span className="font-semibold text-(--brand-muted)">(valfritt)</span>
        </span>
        <input
          value={form.venue}
          onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
          className={appSheetFormFieldClass}
        />
      </label>
      <label className="block">
        <span className={appSheetFormLabelClass}>Typ av event</span>
        <select
          value={form.eventType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              eventType: e.target.value as EventForm['eventType'],
            }))
          }
          className={appSheetFormFieldClass}
        >
          <option value="">Välj typ av event</option>
          <option value="IN_PERSON">På plats</option>
          <option value="ONLINE">Online</option>
        </select>
      </label>
      <label className="block">
        <span className={appSheetFormLabelClass}>
          Beskrivning{' '}
          <span className="font-semibold text-(--brand-muted)">(valfritt)</span>
        </span>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          className={appSheetFormTextareaClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSaving}
          className={`${appSheetPrimaryButtonClass} min-h-11 px-3 py-2.5 text-[length:var(--text-sm)]`}
        >
          {isSaving ? 'Sparar…' : 'Spara ändringar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${appSheetSecondaryButtonClass} min-h-11 px-3 py-2.5 text-[length:var(--text-sm)]`}
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}
