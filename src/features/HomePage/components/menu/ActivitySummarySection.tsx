import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ActivitySummary } from './types'
import { callbackWeekdays } from './types'
import MenuSectionHeader from './MenuSectionHeader'

const WEEKDAY_DATE = new Date(Date.UTC(2026, 6, 13))

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
}: {
  summary: ActivitySummary
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const weekdayLabels = getWeekdayLabels(locale)
  const activeWeekdays = new Set(summary.activeWeekdays)
  const activeCount = summary.activeWeekdays.length
  const progress = Math.min(1, activeCount / callbackWeekdays.length)
  const circumference = 2 * Math.PI * 48

  return (
    <section aria-labelledby="menu-activity-title">
      <div id="menu-activity-title">
        <MenuSectionHeader
          icon={<Flame size={20} strokeWidth={2.2} />}
          title={t('menu.activity.title')}
          description={t('menu.activity.description')}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-(--brand-soft) p-5">
        <div className="flex items-center gap-5">
          <div
            className="relative h-[122px] w-[122px] shrink-0"
            role="img"
            aria-label={t('menu.activity.streakAriaLabel', {
              count: summary.currentStreak,
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
              <strong className="text-[2.45rem] leading-none font-extrabold text-(--brand-primary-deep)">
                {summary.currentStreak}
              </strong>
              <span className="mt-1 text-[length:var(--text-xs)] font-extrabold text-(--brand-body-ink)">
                {t('menu.activity.daysInRow')}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--text-lg)] leading-tight font-extrabold text-(--brand-title-ink)">
              {t('menu.activity.encouragement')}
            </p>
            <p className="mt-1 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
              {t('menu.activity.weekSummary', { count: activeCount })}
            </p>

            <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
              {callbackWeekdays.map((weekday, index) => {
                const isActive = activeWeekdays.has(weekday)

                return (
                  <span
                    key={weekday}
                    className={`flex aspect-square items-center justify-center rounded-[9px] text-[0.68rem] font-extrabold ${
                      isActive
                        ? 'bg-(--brand-primary) text-white'
                        : 'bg-white/75 text-(--brand-muted)'
                    }`}
                  >
                    {weekdayLabels[index]}
                  </span>
                )
              })}
            </div>

            <p className="mt-2 text-[length:var(--text-xs)] font-bold text-(--brand-muted)">
              {t('menu.activity.personalRecord', {
                count: summary.personalRecord,
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
