import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetNotice,
  appSheetCategoryClass,
  appSheetContentClass,
} from '../../../../components/AppSheet'
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
  if (kind === 'workout') return 'bg-(--brand-success)'
  if (kind === 'event') return 'bg-(--brand-primary)'
  return 'bg-(--brand-warning)'
}

function isUpcomingActivity(activity: CalendarActivity): boolean {
  if (!activity.time) return false

  const startsAt = new Date(`${activity.date}T${activity.time}:00`)
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > Date.now()
}

export default function MenuCalendarSection({
  enabled = false,
  cancelableEventIds,
  cancellingActivityId,
  cancelledActivityId,
  cancellationError = false,
  onCancelEvent,
  onCancelCallback,
  onDismissCancellationError,
}: {
  enabled?: boolean
  cancelableEventIds?: ReadonlySet<string>
  cancellingActivityId?: string
  cancelledActivityId?: string
  cancellationError?: boolean
  onCancelEvent?: (activity: CalendarActivity) => void
  onCancelCallback?: (activity: CalendarActivity) => void
  onDismissCancellationError?: () => void
}) {
  const { t, i18n } = useTranslation()
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)
  const [cancellationTarget, setCancellationTarget] =
    useState<CalendarActivity | null>(null)

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

  useEffect(() => {
    if (cancellationTarget && cancelledActivityId === cancellationTarget.id) {
      setCancellationTarget(null)
    }
  }, [cancelledActivityId, cancellationTarget])

  function beginCancellation(activity: CalendarActivity) {
    onDismissCancellationError?.()
    setCancellationTarget(activity)
  }

  function closeCancellation() {
    onDismissCancellationError?.()
    setCancellationTarget(null)
  }

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
    <section
      aria-labelledby="menu-calendar-title"
      className={appSheetCategoryClass}
    >
      <div id="menu-calendar-title">
        <MenuSectionHeader
          icon={<CalendarDays size={20} strokeWidth={2.2} />}
          title={t('menu.calendar.title')}
          description={t('menu.calendar.description')}
        />
      </div>

      <div className={`mt-4 ${appSheetContentClass}`}>
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label={t('menu.calendar.previousMonth')}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
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
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
          >
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
          {weekdayLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="pb-1 text-[length:var(--text-xs)] font-extrabold text-(--brand-muted)"
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
                className={`relative mx-auto flex h-11 w-full max-w-11 items-center justify-center rounded-xl text-[length:var(--text-xs)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-1 focus-visible:outline-none active:scale-95 ${
                  isSelected
                    ? 'bg-(--brand-primary) text-(--brand-on-primary)'
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
                          isSelected
                            ? 'bg-(--brand-on-primary)'
                            : getActivityColorClass(kind)
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
            <span className="h-2.5 w-2.5 rounded-full bg-(--brand-success)" />
            {t('menu.calendar.workout')}
          </span>
          <span className="flex items-center gap-2 text-[length:var(--text-xs)] font-bold text-(--brand-body-ink)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--brand-primary)" />
            {t('menu.calendar.event')}
          </span>
          <span className="flex items-center gap-2 text-[length:var(--text-xs)] font-bold text-(--brand-body-ink)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--brand-warning)" />
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
              <p className="menu-card-meta font-extrabold">
                {selectedDateFormatted}
              </p>
              {selectedDayActivities.length > 0 ? (
                <span className="menu-card-badge rounded-full bg-(--brand-soft) px-2 py-1 text-(--brand-primary)">
                  {selectedDayActivities.length}
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-3">
              {selectedDayActivities.length > 0 ? (
                selectedDayActivities.map((act) => {
                  const canCancelEvent =
                    act.kind === 'event' &&
                    cancelableEventIds?.has(act.id) &&
                    isUpcomingActivity(act)
                  const canCancelCallback =
                    act.kind === 'callback' &&
                    Boolean(onCancelCallback) &&
                    isUpcomingActivity(act)
                  const canCancelActivity = canCancelEvent || canCancelCallback

                  return (
                    <div
                      key={act.id}
                      className="menu-item-card flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getActivityColorClass(
                            act.kind,
                          )}`}
                        />
                        <div className="min-w-0">
                          <p className="menu-card-title line-clamp-2">
                            {act.kind === 'callback'
                              ? t('menu.calendar.callback')
                              : act.title ||
                                t('menu.calendar.untitledActivity')}
                          </p>
                          {act.description ? (
                            <p className="menu-card-copy mt-1 line-clamp-2">
                              {act.description}
                            </p>
                          ) : null}
                          {act.time ? (
                            <div className="menu-card-meta mt-2 flex items-center gap-1.5 font-extrabold">
                              <Clock size={14} aria-hidden="true" />
                              <span>{act.time}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {canCancelActivity ? (
                        <button
                          type="button"
                          onClick={() => beginCancellation(act)}
                          aria-label={t(
                            act.kind === 'callback'
                              ? 'menu.calendar.cancelCallback'
                              : 'menu.calendar.cancelEvent',
                          )}
                          className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-(--brand-danger) transition hover:bg-(--brand-danger-surface) focus-visible:ring-2 focus-visible:ring-(--brand-danger-border) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                        >
                          <X size={19} strokeWidth={2.6} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <p className="menu-card-meta py-2 text-center">
                  {t('menu.calendar.noEventsForDay', {
                    defaultValue: 'Inga aktiviteter denna dag',
                  })}
                </p>
              )}
            </div>

            {cancellationTarget ? (
              <section
                aria-labelledby="cancel-calendar-event-title"
                className="mt-3 rounded-2xl border border-(--brand-danger-border) bg-(--brand-danger-surface) p-4"
              >
                <h5
                  id="cancel-calendar-event-title"
                  className="text-[length:var(--text-sm)] font-extrabold text-(--brand-danger-ink)"
                >
                  {t(
                    cancellationTarget.kind === 'callback'
                      ? 'menu.calendar.cancelCallbackTitle'
                      : 'menu.calendar.cancelEventTitle',
                  )}
                </h5>
                <p className="mt-1 text-[length:var(--text-xs)] leading-relaxed font-semibold text-(--brand-danger-ink)">
                  {t(
                    cancellationTarget.kind === 'callback'
                      ? 'menu.calendar.cancelCallbackText'
                      : 'menu.calendar.cancelEventText',
                    {
                      name:
                        cancellationTarget.title ||
                        t('menu.calendar.untitledActivity'),
                    },
                  )}
                </p>

                {cancellationError ? (
                  <p
                    className="mt-3 text-[length:var(--text-xs)] font-bold text-(--brand-danger-ink-muted)"
                    role="status"
                  >
                    {t(
                      cancellationTarget.kind === 'callback'
                        ? 'menu.calendar.cancelCallbackError'
                        : 'menu.calendar.cancelEventError',
                    )}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={closeCancellation}
                    className="rounded-xl border border-(--brand-danger-border) bg-(--menu-control-bg) px-3 py-2.5 text-[length:var(--text-xs)] font-extrabold text-(--brand-danger-ink) transition hover:bg-(--brand-danger-surface) focus-visible:ring-2 focus-visible:ring-(--brand-danger-border) focus-visible:outline-none"
                  >
                    {t('menu.calendar.keepEvent')}
                  </button>
                  <button
                    type="button"
                    disabled={cancellingActivityId === cancellationTarget.id}
                    onClick={() => {
                      if (cancellationTarget.kind === 'callback') {
                        onCancelCallback?.(cancellationTarget)
                        return
                      }

                      onCancelEvent?.(cancellationTarget)
                    }}
                    className="rounded-xl bg-(--brand-danger) px-3 py-2.5 text-[length:var(--text-xs)] font-extrabold text-(--brand-on-danger) transition hover:bg-(--brand-danger-hover) focus-visible:ring-2 focus-visible:ring-(--brand-danger-border) focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {cancellingActivityId === cancellationTarget.id
                      ? t(
                          cancellationTarget.kind === 'callback'
                            ? 'menu.calendar.cancelingCallback'
                            : 'menu.calendar.cancelingEvent',
                        )
                      : t(
                          cancellationTarget.kind === 'callback'
                            ? 'menu.calendar.confirmCancelCallback'
                            : 'menu.calendar.confirmCancelEvent',
                        )}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
