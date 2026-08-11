import type { CompanyEvent } from '../../../api/companyPortal'
import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  appSheetCardClass,
  appSheetCategoryClass,
} from '../../../components/AppSheet'
import ConfirmModal from '../../../components/ConfirmModal'
import type { EventForm } from '../types'
import EventCreateForm from './EventCreateForm'
import EventEditForm from './EventEditForm'
import EventListItem from './EventListItem'

type Props = {
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
  deletingEventId: number | null
  stopEditingEvent: () => void
  startEditingEvent: (event: CompanyEvent) => void
  deleteEvent: (id: number) => Promise<void>
}

export default function EventListCard({
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
  deletingEventId,
  stopEditingEvent,
  startEditingEvent,
  deleteEvent,
}: Props) {
  const [eventPendingDeletion, setEventPendingDeletion] =
    useState<CompanyEvent | null>(null)

  return (
    <section className={appSheetCategoryClass}>
      <div className="px-1">
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-lg)] leading-tight font-extrabold tracking-tight text-(--brand-ink)">
            Kommande event
          </h2>
          <p className="mt-0.5 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
            Skapa, ändra eller ta bort organisationens event.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateEvent((v) => !v)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-(--brand-border) bg-(--menu-content-bg) px-4 py-2.5 text-[length:var(--text-sm)] font-extrabold text-(--brand-primary) transition hover:bg-(--brand-soft) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
        >
          {showCreateEvent ? <X size={17} /> : <Plus size={17} />}
          {showCreateEvent ? 'Stäng formuläret' : 'Lägg till event'}
        </button>
      </div>

      {showCreateEvent ? (
        <EventCreateForm
          eventForm={eventForm}
          setEventForm={setEventForm}
          canCreateEvent={canCreateEvent}
          createEvent={createEvent}
          isSavingEvent={isSavingEvent}
        />
      ) : null}

      <div className="mt-3 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--brand-border) bg-(--brand-surface-soft) px-5 py-8 text-center">
            <p className="font-extrabold text-(--brand-ink)">Inga event ännu</p>
            <p className="mt-1 text-sm leading-6 text-(--brand-muted)">
              Lägg till ett event när ni har en aktivitet att bjuda in till.
            </p>
          </div>
        ) : null}

        {events.map((event) => (
          <div
            key={event.id}
            className={`${appSheetCardClass} menu-event-card menu-event-owner`}
          >
            {editingEventId === event.id ? (
              <EventEditForm
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
                onDelete={() => setEventPendingDeletion(event)}
                isDeleting={deletingEventId === event.id}
              />
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={eventPendingDeletion !== null}
        title="Ta bort event?"
        body={
          eventPendingDeletion
            ? `”${eventPendingDeletion.name}” tas bort permanent. Det går inte att ångra.`
            : undefined
        }
        confirmLabel="Ja, ta bort eventet"
        cancelLabel="Avbryt"
        isConfirming={
          eventPendingDeletion !== null &&
          deletingEventId === eventPendingDeletion.id
        }
        confirmingLabel="Tar bort eventet..."
        onConfirm={() => {
          if (!eventPendingDeletion) return

          void deleteEvent(eventPendingDeletion.id)
            .then(() => setEventPendingDeletion(null))
            .catch(() => undefined)
        }}
        onCancel={() => {
          if (deletingEventId === null) setEventPendingDeletion(null)
        }}
      />
    </section>
  )
}
