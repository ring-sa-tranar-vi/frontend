import { Settings } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetContentClass,
} from '../../../components/AppSheet'

type IntensitySliderProps = {
  value: number
  onChange: (value: number) => void
}

const INTENSITY_MIN = 0
const INTENSITY_MAX = 4

const IntensitySlider = ({ value, onChange }: IntensitySliderProps) => {
  const { t } = useTranslation()
  const steps = [
    t('intensitySlider.0'),
    t('intensitySlider.1'),
    t('intensitySlider.2'),
    t('intensitySlider.3'),
    t('intensitySlider.4'),
  ]
  const safeValue = Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, value))
  const progress =
    ((safeValue - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN)) * 100

  function handleStepKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    stepValue: number,
  ) {
    let nextValue: number | null = null

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextValue = Math.max(INTENSITY_MIN, stepValue - 1)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextValue = Math.min(INTENSITY_MAX, stepValue + 1)
    } else if (event.key === 'Home') {
      nextValue = INTENSITY_MIN
    } else if (event.key === 'End') {
      nextValue = INTENSITY_MAX
    }

    if (nextValue === null) return

    event.preventDefault()
    if (nextValue === stepValue) return

    onChange(nextValue)
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll('button')
    ;(buttons?.[nextValue] as HTMLButtonElement | undefined)?.focus()
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary-deep)">
          <Settings size={20} />
        </div>

        <AppSheetSectionTitle>
          {t('intensitySlider.title')}
        </AppSheetSectionTitle>
      </div>

      <AppSheetSectionText>
        {t('intensitySlider.description')}
      </AppSheetSectionText>

      <div className={`mt-4 ${appSheetContentClass}`}>
        <div className="grid grid-cols-5 gap-1 text-center text-[length:var(--text-xs)] leading-tight font-bold text-(--brand-body-ink)">
          {steps.map((label) => (
            <span
              key={label}
              className="flex min-h-9 items-end justify-center px-0.5 [overflow-wrap:anywhere]"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="relative mt-3">
          <div className="pointer-events-none absolute top-5 right-[10%] left-[10%] h-1 overflow-hidden rounded-full bg-(--brand-border)">
            <div
              className="h-full rounded-full bg-(--brand-primary) transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="relative z-30 grid grid-cols-5 items-center"
            role="radiogroup"
            aria-label={t('intensitySlider.title')}
          >
            {steps.map((label, stepValue) => {
              const isCurrentStep = stepValue === safeValue
              const isPastStep = stepValue < safeValue

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange(stepValue)}
                  onKeyDown={(event) => handleStepKeyDown(event, stepValue)}
                  className="flex h-11 w-11 items-center justify-center justify-self-center rounded-full"
                  aria-label={`${t('intensitySlider.choose')} ${label}`}
                  role="radio"
                  aria-checked={isCurrentStep}
                  tabIndex={isCurrentStep ? 0 : -1}
                >
                  <span
                    className={`block rounded-full transition-[width,height,border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none ${
                      isCurrentStep
                        ? 'h-9 w-9 border-4 border-(--brand-primary) bg-(--brand-primary) ring-2 ring-(--brand-selection) ring-offset-2 ring-offset-(--menu-content-bg)'
                        : isPastStep
                          ? 'h-7 w-7 border-[3px] border-(--brand-primary-deep) bg-(--menu-content-bg)'
                          : 'h-7 w-7 border-[3px] border-(--brand-border) bg-(--menu-content-bg)'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-center text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)">
            {steps[safeValue]}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IntensitySlider
