import { Clock3 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetNotice,
  appSheetCategoryClass,
  appSheetContentClass,
  appSheetFormFieldClass,
  appSheetPrimaryButtonClass,
} from '../../../../components/AppSheet'
import MenuSectionHeader from './MenuSectionHeader'
import {
  callbackWeekdays,
  type CallbackRepeat,
  type CallbackRequest,
  type CallbackWeekday,
} from './types'

const WEEKDAY_DATE = new Date(Date.UTC(2026, 6, 13))
const callbackMinuteValues = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, '0'),
)

function getWeekdayLabels(locale: string) {
  const shortFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const longFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone: 'UTC',
  })

  return callbackWeekdays.map((id, index) => {
    const date = new Date(WEEKDAY_DATE)
    date.setUTCDate(WEEKDAY_DATE.getUTCDate() + index)
    return {
      id,
      short: shortFormatter.format(date).toLocaleUpperCase(locale),
      long: longFormatter.format(date),
    }
  })
}

export default function CallbackSchedulerSection({
  initialRequest,
  onConfirm,
}: {
  initialRequest?: CallbackRequest
  onConfirm?: (request: CallbackRequest) => void | Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const [weekday, setWeekday] = useState<CallbackWeekday | null>(
    initialRequest?.weekday ?? null,
  )
  const [time, setTime] = useState(initialRequest?.time ?? '')
  const [repeat, setRepeat] = useState<CallbackRepeat | null>(
    initialRequest?.repeat ?? null,
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'danger'>(
    'success',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const locale = i18n.resolvedLanguage ?? i18n.language
  const weekdayLabels = getWeekdayLabels(locale)
  const [hour = '', minute = ''] = time.split(':')
  const hasCompleteTime = hour !== '' && minute !== ''

  function updateTime(nextHour: string, nextMinute: string) {
    setTime(`${nextHour}:${nextMinute}`)
    setFeedback(null)
  }

  async function handleConfirm() {
    if (!weekday || !hasCompleteTime || !repeat) return

    const request: CallbackRequest = { weekday, time, repeat }

    if (!onConfirm) {
      setFeedbackTone('danger')
      setFeedback(t('menu.callback.notConnected'))
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      await onConfirm(request)
      setFeedbackTone('success')
      setFeedback(t('menu.callback.confirmed'))
    } catch (error) {
      console.error('[CallbackSchedulerSection] Confirm failed:', error)
      setFeedbackTone('danger')
      setFeedback(t('menu.callback.confirmError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="menu-callback-title"
      className={appSheetCategoryClass}
    >
      <div id="menu-callback-title">
        <MenuSectionHeader
          icon={<Clock3 size={20} strokeWidth={2.2} />}
          title={t('menu.callback.title')}
          description={t('menu.callback.description')}
        />
      </div>

      <div className={`mt-4 ${appSheetContentClass}`}>
        <fieldset>
          <legend className="sr-only">{t('menu.callback.chooseDay')}</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {weekdayLabels.map((day) => {
              const isSelected = weekday === day.id

              return (
                <button
                  type="button"
                  key={day.id}
                  onClick={() => {
                    setWeekday(day.id)
                    setFeedback(null)
                  }}
                  aria-label={day.long}
                  aria-pressed={isSelected}
                  className={`flex aspect-square min-w-0 items-center justify-center rounded-xl border text-[length:var(--text-xs)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-1 focus-visible:outline-none active:scale-95 ${
                    isSelected
                      ? 'border-(--brand-primary) bg-(--brand-primary) text-(--brand-on-primary)'
                      : 'border-(--menu-control-border) bg-(--menu-control-bg) text-(--brand-body-ink)'
                  }`}
                >
                  {day.short}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[length:var(--text-xs)] font-bold text-(--brand-muted)">
            <span>{weekdayLabels[0].long}</span>
            <span>{weekdayLabels[6].long}</span>
          </div>
        </fieldset>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <label htmlFor="callback-hour">
            <span className="mb-2 block text-center text-[length:var(--text-sm)] font-extrabold text-(--brand-ink)">
              {t('menu.callback.hour')}
            </span>
            <select
              id="callback-hour"
              name="callbackHour"
              value={hour}
              onChange={(event) => updateTime(event.target.value, minute)}
              className="h-12 w-full rounded-xl border border-(--menu-control-border) bg-(--menu-field-bg) px-4 text-center text-xl font-extrabold text-(--brand-ink) focus-visible:border-(--brand-border-strong) focus-visible:ring-2 focus-visible:ring-(--brand-selection) focus-visible:outline-none"
            >
              <option value="" disabled>
                --
              </option>
              {Array.from({ length: 24 }, (_, index) =>
                String(index).padStart(2, '0'),
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <span className="pb-2 text-xl font-extrabold text-(--brand-primary-deep)">
            :
          </span>
          <label htmlFor="callback-minute">
            <span className="mb-2 block text-center text-[length:var(--text-sm)] font-extrabold text-(--brand-ink)">
              {t('menu.callback.minute')}
            </span>
            <select
              id="callback-minute"
              name="callbackMinute"
              value={minute}
              onChange={(event) => updateTime(hour, event.target.value)}
              className="h-12 w-full rounded-xl border border-(--menu-control-border) bg-(--menu-field-bg) px-4 text-center text-xl font-extrabold text-(--brand-ink) focus-visible:border-(--brand-border-strong) focus-visible:ring-2 focus-visible:ring-(--brand-selection) focus-visible:outline-none"
            >
              <option value="" disabled>
                --
              </option>
              {callbackMinuteValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-6 block" htmlFor="callback-repeat">
          <span className="mb-2 block text-[length:var(--text-sm)] font-extrabold text-(--brand-ink)">
            {t('menu.callback.repeat')}
          </span>
          <select
            id="callback-repeat"
            name="callbackRepeat"
            aria-label={t('menu.callback.repeat')}
            value={repeat ?? ''}
            onChange={(event) => {
              setRepeat(event.target.value as CallbackRepeat)
              setFeedback(null)
            }}
            className={appSheetFormFieldClass}
          >
            <option value="" disabled>
              --
            </option>
            <option value="never">{t('menu.callback.repeatNever')}</option>
            <option value="weekly">{t('menu.callback.repeatWeekly')}</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isSubmitting || !weekday || !hasCompleteTime || !repeat}
          className={`${appSheetPrimaryButtonClass} mt-5 focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none`}
        >
          {isSubmitting
            ? t('menu.callback.confirming')
            : t('menu.callback.confirm')}
        </button>

        {feedback ? (
          <div className="mt-3">
            <AppSheetNotice tone={feedbackTone}>{feedback}</AppSheetNotice>
          </div>
        ) : null}
      </div>
    </section>
  )
}
