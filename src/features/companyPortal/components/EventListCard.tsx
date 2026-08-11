import type { CompanyEvent } from '../../../api/companyPortal'
import { appSheetCardClass } from '../../../components/AppSheet'
import type { Dispatch, SetStateAction } from 'react'
import type { EventForm } from '../types'
import EventCreateForm from './EventCreateForm'
import EventEditForm from './EventEditForm'
import EventListItem from './EventListItem'

type Props = {
  isWideLayout: boolean
  showCreateEvent: boolean
  setShowCreateEvent: (value: boolean | ((current: boolean) => boolean)) => void
  eventForm: EventForm
  setEventForm: Dispatch<SetStateAction<EventForm>>
  canCreateEvent: boolean
  createEvent: () => void
  isSavingEvent: boolean
  events: CompanyEvent[]
  editingEventId: number | null
  editingEventForm: EventForm
  setEditingEventForm: Dispatch<SetStateAction<EventForm>>
  canSaveEditedEvent: boolean
  updateEvent: () => void
  isUpdatingEvent: boolean
  stopEditingEvent: () => void
  startEditingEvent: (event: CompanyEvent) => void
  deleteEvent: (id: number) => void
}

export default function EventListCard({
  isWideLayout,
  showCreateEvent,
  setShowCreateEvent,
  eventForm,
  setEventForm,
  canCreateEvent,
  createEvent,
  isSavingEvent,
  events,
  editingEventId,
  editingEventForm,
  setEditingEventForm,
  canSaveEditedEvent,
  updateEvent,
  isUpdatingEvent,
  stopEditingEvent,
  startEditingEvent,
  deleteEvent,
}: Props) {
  return (
    <article
      className={`${appSheetCardClass} p-2.5 md:rounded-2xl md:border-[#ebe4ff] md:bg-[#fcfbff] md:p-5 ${isWideLayout ? 'col-span-7' : ''}`}
    >
      <div
        className={`flex items-start justify-between gap-2 ${
          isWideLayout ? 'flex-row items-center' : 'flex-col'
        }`}
      >
        <h2 className="text-[1.75rem] leading-tight font-extrabold text-[#100b2f] md:text-3xl">
          Kommande event
        </h2>
        <button
          type="button"
          onClick={() => setShowCreateEvent((v) => !v)}
          className={`shrink-0 text-[13px] leading-tight font-bold whitespace-normal text-[#5b3fe6] ${
            isWideLayout ? '' : 'self-start'
          }`}
        >
          + Lägg till event
        </button>
      </div>

      {showCreateEvent ? (
        <EventCreateForm
          isWideLayout={isWideLayout}
          eventForm={eventForm}
          setEventForm={setEventForm}
          canCreateEvent={canCreateEvent}
          createEvent={createEvent}
          isSavingEvent={isSavingEvent}
        />
      ) : null}

      <div className="mt-3 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-[#6f6a93]">Inga event ännu.</p>
        ) : null}

        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-[#e6dbff] bg-white p-3 shadow-[0_4px_12px_rgba(82,63,176,0.06)] md:p-4"
          >
            {editingEventId === event.id ? (
              <EventEditForm
                isWideLayout={isWideLayout}
                form={editingEventForm}
                setForm={setEditingEventForm}
                canSave={canSaveEditedEvent}
                onSave={updateEvent}
                isSaving={isUpdatingEvent}
                onCancel={stopEditingEvent}
              />
            ) : (
              <EventListItem
                event={event}
                onEdit={() => startEditingEvent(event)}
                onDelete={() => deleteEvent(event.id)}
              />
            )}
          </div>
        ))}
      </div>
    </article>
  )
}
