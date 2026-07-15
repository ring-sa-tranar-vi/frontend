import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MenuSectionHeader from './MenuSectionHeader'
import type { CalendarActivity } from './types'

const WEEKDAY_START = new Date(Date.UTC(2026, 6, 13))

type CalendarCell = {
  date: Date
  dateKey: string
  day: number
  isCurrentMonth: boolean
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCalendarCells(viewMonth: Date): CalendarCell[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const mondayIndex = (first.getDay() + 6) % 7
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate()
  const cellCount = Math.ceil((mondayIndex + daysInMonth) / 7) * 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - mondayIndex)

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)

    return {
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === viewMonth.getMonth(),
    }
  })
}

function getWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(WEEKDAY_START)
    date.setUTCDate(WEEKDAY_START.getUTCDate() + index)
    return formatter
      .format(date)
      .replace('.', '')
      .slice(0, 3)
      .toLocaleUpperCase(locale)
  })
}

export default function MenuCalendarSection({
  initialMonth,
  initialSelectedDate,
  activities,
  nextActivityId,
}: {
  initialMonth: string
  initialSelectedDate: string
  activities: readonly CalendarActivity[]
  nextActivityId: string
}) {
  const { t, i18n } = useTranslation()
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseDateKey(initialMonth)
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState(initialSelectedDate)
  const locale = i18n.resolvedLanguage ?? i18n.language
  const cells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])
  const activitiesByDate = useMemo(
    () => new Map(activities.map((activity) => [activity.date, activity])),
    [activities],
  )
  const nextActivity = activities.find(
    (activity) => activity.id === nextActivityId,
  )
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth)
  const weekdayLabels = getWeekdayLabels(locale)
  const nextActivityDate = nextActivity
    ? parseDateKey(nextActivity.date)
    : undefined

  function changeMonth(offset: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    )
  }

  return (
    <section aria-labelledby="menu-calendar-title">
      <div id="menu-calendar-title">
        <MenuSectionHeader
          icon={<CalendarDays size={20} strokeWidth={2.2} />}
          title={t('menu.calendar.title')}
          description={t('menu.calendar.description')}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-(--brand-border-light) bg-white/55 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label={t('menu.calendar.previousMonth')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <h4 className="text-[length:var(--text-base)] font-extrabold text-(--brand-ink)">
            {monthLabel.charAt(0).toLocaleUpperCase(locale) +
              monthLabel.slice(1)}
          </h4>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label={t('menu.calendar.nextMonth')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
          >
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
          {weekdayLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="pb-1 text-[0.62rem] font-extrabold text-(--brand-muted)"
            >
              {label}
            </span>
          ))}

          {cells.map((cell) => {
            const activity = activitiesByDate.get(cell.dateKey)
            const isSelected = selectedDateKey === cell.dateKey
            const isWorkout = activity?.kind === 'workout'
            const isCallback = activity?.kind === 'callback'

            return (
              <button
                type="button"
                key={cell.dateKey}
                onClick={() => setSelectedDateKey(cell.dateKey)}
                aria-label={new Intl.DateTimeFormat(locale, {
                  dateStyle: 'full',
                }).format(cell.date)}
                aria-pressed={isSelected}
                className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-[length:var(--text-xs)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-1 focus-visible:outline-none active:scale-95 ${
                  isSelected
                    ? 'bg-(--brand-primary) text-white'
                    : isWorkout
                      ? 'bg-emerald-50 text-emerald-900'
                      : isCallback
                        ? 'border border-amber-300 bg-orange-50 text-amber-950'
                        : cell.isCurrentMonth
                          ? 'text-(--brand-ink) hover:bg-(--brand-soft)'
                          : 'text-(--brand-muted)/45'
                }`}
              >
                {cell.day}
                {activity && !isSelected ? (
                  <span
                    className={`absolute right-1.5 bottom-1 h-1 w-1 rounded-full ${
                      activity.kind === 'workout'
                        ? 'bg-emerald-600'
                        : 'bg-amber-700'
                    }`}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-(--brand-border-light) pb-4">
          <span className="flex items-center gap-2 text-[length:var(--text-xs)] font-bold text-(--brand-body-ink)">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            {t('menu.calendar.workout')}
          </span>
          <span className="flex items-center gap-2 text-[length:var(--text-xs)] font-bold text-(--brand-body-ink)">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
            {t('menu.calendar.callback')}
          </span>
        </div>

        {nextActivity && nextActivityDate ? (
          <div className="pt-4">
            <p className="text-[length:var(--text-xs)] font-extrabold text-(--brand-muted)">
              {t('menu.calendar.nextActivity')}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-(--brand-soft) text-(--brand-primary-deep)">
                <strong className="text-xl leading-none font-extrabold">
                  {nextActivityDate.getDate()}
                </strong>
                <span className="mt-1 text-[0.56rem] font-extrabold uppercase">
                  {new Intl.DateTimeFormat(locale, { month: 'short' })
                    .format(nextActivityDate)
                    .replace('.', '')}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-sm)] font-extrabold text-(--brand-ink)">
                  {t(nextActivity.title)}
                </p>
                <p className="mt-1 truncate text-[length:var(--text-xs)] font-semibold text-(--brand-body-ink)">
                  {nextActivity.time}
                  {nextActivity.trainerName
                    ? ` · ${t('menu.calendar.withTrainer', {
                        name: nextActivity.trainerName,
                      })}`
                    : ''}
                </p>
              </div>
              <ChevronRight
                size={18}
                strokeWidth={2.5}
                className="text-(--brand-primary)"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
