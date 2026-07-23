import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSheetNotice } from '../../../../components/AppSheet'
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

function getActivityColorClass(kind: CalendarActivity['kind']): string {
  if (kind === 'workout') return 'bg-emerald-600'
  if (kind === 'event') return 'bg-(--brand-primary)'
  return 'bg-amber-700'
}

export default function MenuCalendarSection({
  enabled = false,
}: {
  enabled?: boolean
}) {
  const { t, i18n } = useTranslation()
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)

  const { activities, isLoading, isFetching, isError, hasData, refetch } =
    useCalendarEvents(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      enabled,
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
    const nextMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + offset,
      1,
    )
    const today = parseDateKey(todayKey)
    const nextSelectedDate =
      nextMonth.getFullYear() === today.getFullYear() &&
      nextMonth.getMonth() === today.getMonth()
        ? todayKey
        : toDateKey(nextMonth)

    setViewMonth(nextMonth)
    setSelectedDateKey(nextSelectedDate)
  }

  function selectDate(cell: CalendarCell) {
    setSelectedDateKey(cell.dateKey)

    if (!cell.isCurrentMonth) {
      setViewMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1))
    }
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
            {isFetching ? (
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
            const activityKinds = Array.from(
              new Set(dayActivities?.map((activity) => activity.kind) ?? []),
            )
            const isToday = cell.dateKey === todayKey
            const isSelected = selectedDateKey === cell.dateKey

            return (
              <button
                type="button"
                key={cell.dateKey}
                onClick={() => selectDate(cell)}
                aria-label={new Intl.DateTimeFormat(locale, {
                  dateStyle: 'full',
                }).format(cell.date)}
                aria-pressed={isSelected}
                className={`relative mx-auto flex h-10 w-full max-w-10 items-center justify-center rounded-xl text-[length:var(--text-xs)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-1 focus-visible:outline-none active:scale-95 ${
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

                {hasActivity ? (
                  <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                    {activityKinds.map((kind) => (
                      <span
                        key={kind}
                        className={`h-1 w-1 rounded-full transition-colors ${
                          isSelected ? 'bg-white' : getActivityColorClass(kind)
                        }`}
                      />
                    ))}
                  </span>
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
            <span className="h-2.5 w-2.5 rounded-full bg-(--brand-primary)" />
            {t('menu.calendar.event')}
          </span>
          <span className="flex items-center gap-2 text-[length:var(--text-xs)] font-bold text-(--brand-body-ink)">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
            {t('menu.calendar.callback')}
          </span>
        </div>

        {isLoading ? (
          <div
            className="flex min-h-24 items-center justify-center gap-2 py-4 text-[length:var(--text-sm)] font-bold text-(--brand-muted)"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{t('menu.calendar.loading')}</span>
          </div>
        ) : null}

        {isError ? (
          <div className="space-y-3 pt-4">
            <AppSheetNotice tone="danger">
              {t('menu.calendar.loadError')}
            </AppSheetNotice>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-11 w-full rounded-2xl border border-(--brand-border-field) bg-(--brand-btn-secondary-bg) px-4 py-3 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.985]"
            >
              {t('menu.calendar.retry')}
            </button>
          </div>
        ) : null}

        {!isLoading && (!isError || hasData) ? (
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
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${getActivityColorClass(
                          act.kind,
                        )}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[length:var(--text-sm)] font-bold text-(--brand-ink)">
                          {act.kind === 'callback'
                            ? t('menu.calendar.callback')
                            : act.title || t('menu.calendar.untitledActivity')}
                        </p>
                        {act.description ? (
                          <p className="mt-0.5 line-clamp-2 text-[length:var(--text-xs)] text-(--brand-body-ink)">
                            {act.description}
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
        ) : null}
      </div>
    </section>
  )
}
