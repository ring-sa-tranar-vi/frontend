import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetNotice,
  appSheetCategoryClass,
  appSheetContentClass,
} from '../../../../components/AppSheet'
import type { ActivitySummary } from './types'
import { callbackWeekdays } from './types'
import MenuSectionHeader from './MenuSectionHeader'

const WEEKDAY_DATE = new Date(Date.UTC(2026, 6, 13))
const EMPTY_ACTIVITY_SUMMARY: ActivitySummary = {
  currentStreak: 0,
  personalRecord: 0,
  activeWeekdays: [],
  hasCompletedWorkouts: false,
  hasDetailedHistory: true,
}

function getWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  })

  return callbackWeekdays.map((_, index) => {
    const date = new Date(WEEKDAY_DATE)
    date.setUTCDate(WEEKDAY_DATE.getUTCDate() + index)
    return formatter.format(date).toLocaleUpperCase(locale)
  })
}

export default function ActivitySummarySection({
  summary,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  summary?: ActivitySummary
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const weekdayLabels = getWeekdayLabels(locale)
  const resolvedSummary = summary ?? EMPTY_ACTIVITY_SUMMARY
  const activeWeekdays = new Set(resolvedSummary.activeWeekdays)
  const activeCount = resolvedSummary.activeWeekdays.length
  const progress = resolvedSummary.hasDetailedHistory
    ? Math.min(1, activeCount / callbackWeekdays.length)
    : 0
  const circumference = 2 * Math.PI * 48

  return (
    <section
      aria-labelledby="menu-activity-title"
      className={appSheetCategoryClass}
    >
      <div id="menu-activity-title">
        <MenuSectionHeader
          icon={<Flame size={20} strokeWidth={2.2} />}
          title={t('menu.activity.title')}
          description={t('menu.activity.description')}
        />
      </div>

      {isLoading ? (
        <div
          className={`mt-4 ${appSheetContentClass}`}
          role="status"
          aria-label={t('menu.activity.loading')}
        >
          <div className="flex items-center gap-4" aria-hidden="true">
            <div className="h-[104px] w-[104px] shrink-0 animate-pulse rounded-full bg-(--menu-skeleton-bg)" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-(--menu-skeleton-bg)" />
              <div className="h-4 w-full animate-pulse rounded-full bg-(--menu-skeleton-bg)" />
              <div className="h-9 w-full animate-pulse rounded-xl bg-(--menu-skeleton-bg)" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-(--menu-skeleton-bg)" />
            </div>
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4 space-y-3">
          <AppSheetNotice tone="danger">
            {t('menu.activity.loadError')}
          </AppSheetNotice>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 w-full rounded-2xl border border-(--brand-border-field) bg-(--brand-btn-secondary-bg) px-4 py-3 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.985]"
            >
              {t('menu.activity.retry')}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className={`mt-4 ${appSheetContentClass}`}>
          <div className="flex items-center gap-4">
            <div
              className="relative h-[104px] w-[104px] shrink-0"
              role="img"
              aria-label={t('menu.activity.streakAriaLabel', {
                count: resolvedSummary.currentStreak,
              })}
            >
              <svg
                viewBox="0 0 112 112"
                className="h-full w-full -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="var(--brand-border)"
                  strokeWidth="8"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="var(--brand-primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center">
                <strong className="text-[length:var(--text-2xl)] leading-none font-extrabold text-(--brand-primary-deep)">
                  {resolvedSummary.currentStreak}
                </strong>
                <span className="mt-1 text-[length:var(--text-xs)] font-extrabold text-(--brand-body-ink)">
                  {t('menu.activity.daysInRow', {
                    count: resolvedSummary.currentStreak,
                  })}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--text-lg)] leading-tight font-extrabold text-(--brand-title-ink)">
                {t(
                  activeCount > 0
                    ? 'menu.activity.encouragement'
                    : 'menu.activity.encouragementEmpty',
                )}
              </p>
              {resolvedSummary.hasDetailedHistory ? (
                <>
                  <p className="mt-1 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
                    {t('menu.activity.weekSummary', { count: activeCount })}
                  </p>

                  <div
                    className="mt-3 grid grid-cols-7 gap-1.5"
                    aria-hidden="true"
                  >
                    {callbackWeekdays.map((weekday, index) => {
                      const isActive = activeWeekdays.has(weekday)

                      return (
                        <span
                          key={weekday}
                          className={`flex aspect-square items-center justify-center rounded-lg text-[length:var(--text-xs)] font-extrabold ${
                            isActive
                              ? 'bg-(--brand-primary) text-(--brand-on-primary)'
                              : 'bg-(--menu-control-bg) text-(--brand-muted)'
                          }`}
                        >
                          {weekdayLabels[index]}
                        </span>
                      )
                    })}
                  </div>

                  <p className="mt-2 text-[length:var(--text-xs)] font-bold text-(--brand-muted)">
                    {t('menu.activity.personalRecord', {
                      count: resolvedSummary.personalRecord,
                    })}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
