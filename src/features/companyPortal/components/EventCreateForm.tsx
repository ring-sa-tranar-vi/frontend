import {
  appSheetCardClass,
  appSheetFormFieldClass,
  appSheetFormLabelClass,
  appSheetFormTextareaClass,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'
import type { Dispatch, SetStateAction } from 'react'
import type { EventForm } from '../types'

type Props = {
  eventForm: EventForm
  setEventForm: Dispatch<SetStateAction<EventForm>>
  canCreateEvent: boolean
  createEvent: () => void
  isSavingEvent: boolean
}

export default function EventCreateForm({
  eventForm,
  setEventForm,
  canCreateEvent,
  createEvent,
  isSavingEvent,
}: Props) {
  const now = new Date()
  const minimumDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16)

  return (
    <section className={`mt-3 ${appSheetCardClass}`}>
      <h3 className="text-[length:var(--text-lg)] font-extrabold text-(--brand-ink)">
        Nytt event
      </h3>
      <div className="mt-3 grid gap-3">
        <label className="block">
          <span className={appSheetFormLabelClass}>Namn</span>
          <input
            value={eventForm.name}
            onChange={(e) =>
              setEventForm((f) => ({ ...f, name: e.target.value }))
            }
            className={appSheetFormFieldClass}
          />
        </label>
        <label className="block">
          <span className={appSheetFormLabelClass}>Datum och tid</span>
          <input
            type="datetime-local"
            min={minimumDateTime}
            value={eventForm.time}
            onChange={(e) =>
              setEventForm((f) => ({ ...f, time: e.target.value }))
            }
            className={appSheetFormFieldClass}
          />
        </label>
        <label className="block">
          <span className={appSheetFormLabelClass}>Stad</span>
          <input
            value={eventForm.city}
            onChange={(e) =>
              setEventForm((f) => ({ ...f, city: e.target.value }))
            }
            className={appSheetFormFieldClass}
          />
        </label>
        <label className="block">
          <span className={appSheetFormLabelClass}>
            Plats{' '}
            <span className="font-semibold text-(--brand-muted)">
              (valfritt)
            </span>
          </span>
          <input
            value={eventForm.venue}
            onChange={(e) =>
              setEventForm((f) => ({ ...f, venue: e.target.value }))
            }
            className={appSheetFormFieldClass}
          />
        </label>
        <label className="block">
          <span className={appSheetFormLabelClass}>Typ av event</span>
          <select
            value={eventForm.eventType}
            onChange={(e) =>
              setEventForm((f) => ({
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
            <span className="font-semibold text-(--brand-muted)">
              (valfritt)
            </span>
          </span>
          <textarea
            rows={2}
            value={eventForm.description}
            onChange={(e) =>
              setEventForm((f) => ({ ...f, description: e.target.value }))
            }
            className={appSheetFormTextareaClass}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={createEvent}
        disabled={!canCreateEvent || isSavingEvent}
        className={`${appSheetPrimaryButtonClass} mt-3 min-h-11 px-4 py-2.5 text-[length:var(--text-sm)]`}
      >
        {isSavingEvent ? 'Skapar event…' : 'Skapa event'}
      </button>
    </section>
  )
}
