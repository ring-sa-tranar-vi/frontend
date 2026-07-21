import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  User,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MenuSectionHeader from './MenuSectionHeader'
import type { CalendarActivity } from './types'
import { useCalendarEvents } from '../../../../hooks/useCalendarEvents.ts'

const WEEKDAY_START = new Date(Date.UTC(2026, 6, 13))

type CalendarCell = {
  date: Date
  dateKey: string
  day: number
  isCurrentMonth: boolean
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date): string {
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

function getWeekdayLabels(locale: string): string[] {
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

type MenuCalendarSectionProps = {
  initialMonth?: string
  initialSelectedDate?: string
}

export default function MenuCalendarSection({
  initialMonth,
  initialSelectedDate,
}: MenuCalendarSectionProps = {}) {
  const { t, i18n } = useTranslation()
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (initialMonth) {
      const parsed = parseDateKey(initialMonth)
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    }
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    () => initialSelectedDate ?? todayKey,
  )

  const { activities, isLoading } = useCalendarEvents(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
  )

  const locale = i18n.resolvedLanguage ?? i18n.language
  const cells = useMemo(() => getCalendarCells(viewMonth), [viewMonth])

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>()
    for (const activity of activities) {
      const existing = map.get(activity.date) ?? []
      map.set(activity.date, [...existing, activity])
    }
    return map
  }, [activities])

  const selectedDayActivities = useMemo(() => {
    return activitiesByDate.get(selectedDateKey) ?? []
  }, [activitiesByDate, selectedDateKey])

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth)

  const weekdayLabels = getWeekdayLabels(locale)

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDateKey) return ''
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
    }).format(parseDateKey(selectedDateKey))
  }, [selectedDateKey, locale])

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
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label={t('menu.calendar.previousMonth')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <h4 className="text-[length:var(--text-base)] font-extrabold text-(--brand-ink)">
              {monthLabel.charAt(0).toLocaleUpperCase(locale) +
                monthLabel.slice(1)}
            </h4>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-(--brand-primary)" />
            ) : null}
          </div>

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
            const dayActivities = activitiesByDate.get(cell.dateKey)
            const hasActivity = dayActivities && dayActivities.length > 0
            const primaryActivity = dayActivities?.[0]
            const isToday = cell.dateKey === todayKey
            const isSelected = selectedDateKey === cell.dateKey
            const isWorkout = primaryActivity?.kind === 'workout'

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
                    : isToday
                      ? 'text-(--brand-primary) ring-2 ring-(--brand-primary)'
                      : cell.isCurrentMonth
                        ? 'text-(--brand-ink) hover:bg-(--brand-soft)'
                        : 'text-(--brand-muted)/45'
                }`}
              >
                <span>{cell.day}</span>

                {/* Centered activity dot */}
                {hasActivity ? (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-white'
                        : isWorkout
                          ? 'bg-emerald-600'
                          : 'bg-amber-700'
                    }`}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Legend */}
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

        <div className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[length:var(--text-xs)] font-extrabold text-(--brand-muted)">
              {selectedDateFormatted}
            </p>
            {selectedDayActivities.length > 0 ? (
              <span className="rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.65rem] font-extrabold text-(--brand-primary)">
                {selectedDayActivities.length}
              </span>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {selectedDayActivities.length > 0 ? (
              selectedDayActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between rounded-xl border border-(--brand-border-light) bg-white/70 p-3 shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        act.kind === 'workout'
                          ? 'bg-emerald-600'
                          : 'bg-amber-700'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[length:var(--text-sm)] font-bold text-(--brand-ink)">
                        {t(act.title)}
                      </p>
                      {act.trainerName ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[length:var(--text-xs)] text-(--brand-body-ink)">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{act.trainerName}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {act.time ? (
                    <div className="ml-2 flex shrink-0 items-center gap-1 text-[length:var(--text-xs)] font-extrabold text-(--brand-muted)">
                      <Clock size={12} />
                      <span>{act.time}</span>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-2 text-center text-[length:var(--text-xs)] font-medium text-(--brand-muted)">
                {t('menu.calendar.noEventsForDay', {
                  defaultValue: 'Inga aktiviteter denna dag',
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
