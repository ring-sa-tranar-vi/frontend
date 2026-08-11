import {
  appSheetFieldClass,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../components/AppSheet'
import type { Dispatch, SetStateAction } from 'react'
import type { EventForm } from '../types'

type Props = {
  isWideLayout: boolean
  form: EventForm
  setForm: Dispatch<SetStateAction<EventForm>>
  canSave: boolean
  onSave: () => void
  isSaving: boolean
  onCancel: () => void
}

export default function EventEditForm({
  isWideLayout,
  form,
  setForm,
  canSave,
  onSave,
  isSaving,
  onCancel,
}: Props) {
  return (
    <div className={`grid gap-2 ${isWideLayout ? 'grid-cols-2' : ''}`}>
      <input
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      />
      <input
        type="datetime-local"
        value={form.time}
        onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
        className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      />
      <input
        value={form.city}
        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
        className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      />
      <input
        value={form.venue}
        onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
        className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      />
      <select
        aria-label="Typ av event"
        value={form.eventType}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            eventType: e.target.value as EventForm['eventType'],
          }))
        }
        className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      >
        <option value="">Välj typ av event</option>
        <option value="IN_PERSON">På plats</option>
        <option value="ONLINE">Online</option>
      </select>
      <textarea
        rows={2}
        value={form.description}
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
        className={`${appSheetFieldClass} ${isWideLayout ? 'col-span-2' : ''} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
      />

      <div className={`${isWideLayout ? 'col-span-2' : ''} flex gap-2`}>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSaving}
          className={`${appSheetPrimaryButtonClass} min-h-10 px-4 py-2 text-sm disabled:opacity-45 md:w-auto`}
        >
          Spara
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${appSheetSecondaryButtonClass} min-h-10 px-4 py-2 text-sm md:w-auto`}
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}
