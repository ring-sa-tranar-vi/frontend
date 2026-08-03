import {
  CalendarDays,
  Clock3,
  EllipsisVertical,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react'
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
}

export default function EventListItem({ event, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#f1ecff] text-[#312a70]">
        <span className="text-[2rem] leading-none font-extrabold">
          {formatDayNumber(event.time)}
        </span>
        <span className="mt-1 text-xs font-extrabold uppercase">
          {formatMonthShort(event.time)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xl leading-tight font-extrabold break-words text-[#100b2f]">
          {event.name}
        </p>

        <div className="mt-1 space-y-0.5 text-sm text-[#5f5a82]">
          <p className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-[#7b72aa]" />
            <span>{formatDate(event.time)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock3 size={14} className="text-[#7b72aa]" />
            <span>{formatTime(event.time)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin size={14} className="text-[#7b72aa]" />
            <span>
              {event.venue}, {event.city}
            </span>
          </p>
        </div>

        {typeof event.attendeesCount === 'number' ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f0ecff] px-3 py-1 text-xs font-semibold text-[#5b3fe6]">
            <Users size={13} />
            <span>{event.attendeesCount} anmälda</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Redigera event"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3efff] text-[#5b3fe6]"
        >
          <EllipsisVertical size={16} />
        </button>
        <button
          type="button"
          aria-label="Ta bort event"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
