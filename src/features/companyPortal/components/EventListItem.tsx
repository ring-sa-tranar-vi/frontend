import {
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import type { CompanyEvent } from '../../../api/companyPortal'
import {
  formatDate,
  formatDayNumber,
  formatMonthShort,
  formatTime,
} from '../../../hooks/useCompanyOrganisationPage.ts'

type Props = {
  event: CompanyEvent
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export default function EventListItem({
  event,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const location =
    event.eventType === 'ONLINE'
      ? 'Online'
      : [event.venue, event.city].filter(Boolean).join(' · ')
  const description = event.description?.trim()
  const descriptionId = `company-event-description-${event.id}`

  return (
    <>
      <div className="menu-event-grid">
        <div className="menu-event-date">
          <span className="menu-event-date-day">
            {formatDayNumber(event.time)}
          </span>
          <span className="menu-event-date-month">
            {formatMonthShort(event.time)}
          </span>
        </div>

        <div className="menu-event-content">
          <h3 className="menu-card-title menu-event-title" title={event.name}>
            {event.name}
          </h3>

          {typeof event.attendeesCount === 'number' ? (
            <div className="menu-event-status-row">
              <span className="menu-card-badge inline-flex items-center gap-1.5 rounded-full bg-(--brand-soft) px-2 py-1 text-(--brand-primary-deep)">
                <UsersRound size={13} aria-hidden="true" />
                <span>
                  {event.attendeesCount}{' '}
                  {event.attendeesCount === 1 ? 'anmäld' : 'anmälda'}
                </span>
              </span>
            </div>
          ) : null}

          <div className="menu-card-meta menu-event-meta-stack text-(--brand-body-ink)">
            <p className="menu-event-meta-row">
              <span className="menu-event-meta-item whitespace-nowrap">
                <CalendarDays
                  size={14}
                  className="shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span>{formatDate(event.time)}</span>
              </span>
              <span className="menu-event-meta-item whitespace-nowrap">
                <Clock3
                  size={14}
                  className="shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span>{formatTime(event.time)}</span>
              </span>
            </p>
            <p className="menu-event-meta-item">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0 text-(--brand-primary)"
                aria-hidden="true"
              />
              <span className="break-words">{location}</span>
            </p>
          </div>
        </div>

        <div className="menu-event-actions">
          <button
            type="button"
            aria-label="Redigera event"
            onClick={onEdit}
            disabled={isDeleting}
            className="menu-event-icon-action bg-(--brand-soft) text-(--brand-primary) transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={isDeleting ? 'Tar bort event' : 'Ta bort event'}
            onClick={onDelete}
            disabled={isDeleting}
            className="menu-event-icon-action bg-(--brand-danger-surface) text-(--brand-danger) transition hover:bg-(--brand-danger-border) focus-visible:ring-2 focus-visible:ring-(--brand-danger-border) focus-visible:outline-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {description ? (
        <div className="menu-event-footer">
          <button
            type="button"
            onClick={() => setDescriptionOpen((current) => !current)}
            aria-expanded={descriptionOpen}
            aria-controls={descriptionId}
            className="menu-event-accordion transition hover:bg-(--brand-soft) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
          >
            <span>Om eventet</span>
            <ChevronDown
              size={19}
              className={`shrink-0 transition-transform duration-200 ${
                descriptionOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
          {descriptionOpen ? (
            <p id={descriptionId} className="menu-card-copy px-2 pt-1 pb-2">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
