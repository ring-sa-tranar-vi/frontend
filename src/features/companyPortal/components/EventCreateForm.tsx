import {
  appSheetFieldClass,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'
import type { Dispatch, SetStateAction } from 'react'
import type { EventForm } from '../types'

type Props = {
  isWideLayout: boolean
  eventForm: EventForm
  setEventForm: Dispatch<SetStateAction<EventForm>>
  canCreateEvent: boolean
  createEvent: () => void
  isSavingEvent: boolean
}

export default function EventCreateForm({
  isWideLayout,
  eventForm,
  setEventForm,
  canCreateEvent,
  createEvent,
  isSavingEvent,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl border border-[#e6dbff] bg-white p-3 shadow-[0_6px_18px_rgba(82,63,176,0.08)]">
      <div className={`grid gap-3 ${isWideLayout ? 'grid-cols-2' : ''}`}>
        <input
          placeholder="Namn"
          value={eventForm.name}
          onChange={(e) =>
            setEventForm((f) => ({ ...f, name: e.target.value }))
          }
          className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
        <input
          type="datetime-local"
          value={eventForm.time}
          onChange={(e) =>
            setEventForm((f) => ({ ...f, time: e.target.value }))
          }
          className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
        <input
          placeholder="Stad"
          value={eventForm.city}
          onChange={(e) =>
            setEventForm((f) => ({ ...f, city: e.target.value }))
          }
          className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
        <input
          placeholder="Plats"
          value={eventForm.venue}
          onChange={(e) =>
            setEventForm((f) => ({ ...f, venue: e.target.value }))
          }
          className={`${appSheetFieldClass} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
        <textarea
          placeholder="Beskrivning"
          rows={2}
          value={eventForm.description}
          onChange={(e) =>
            setEventForm((f) => ({ ...f, description: e.target.value }))
          }
          className={`${appSheetFieldClass} ${isWideLayout ? 'col-span-2' : ''} px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
      </div>

      <button
        type="button"
        onClick={createEvent}
        disabled={!canCreateEvent || isSavingEvent}
        className={`${appSheetPrimaryButtonClass} mt-3 min-h-11 px-4 py-2 text-sm disabled:opacity-45 md:w-auto`}
      >
        Spara event
      </button>
    </div>
  )
}
