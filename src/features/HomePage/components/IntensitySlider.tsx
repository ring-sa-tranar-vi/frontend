import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetSectionText,
  AppSheetSectionTitle,
} from '../../../components/AppSheet'

type IntensitySliderProps = {
  value: number
  onChange: (value: number) => void
}

const INTENSITY_MIN = 1
const INTENSITY_MAX = 5

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

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary-deep)">
          <Settings size={20} />
        </div>

        <AppSheetSectionTitle>
          {t('intensitySlider.title')}
        </AppSheetSectionTitle>
      </div>

      <AppSheetSectionText>
        {t('intensitySlider.description')}
      </AppSheetSectionText>

      <div className="mt-5 px-1">
        <div className="relative">
          <div className="pointer-events-none absolute top-4 right-2 left-2 h-1 rounded-full bg-(--brand-border)" />

          <div
            className="pointer-events-none absolute top-4 left-2 h-1 rounded-full bg-(--brand-primary) transition-all duration-150"
            style={{ width: `calc(${progress}% - 4px)` }}
          />

          <input
            type="range"
            min={INTENSITY_MIN}
            max={INTENSITY_MAX}
            value={safeValue}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="absolute inset-x-0 top-0 z-20 h-10 w-full cursor-pointer opacity-0"
            aria-label={t('intensitySlider.title')}
          />

          <div className="relative z-30 flex items-center justify-between">
            {steps.map((label, index) =>
              (() => {
                const stepValue = index + INTENSITY_MIN

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onChange(stepValue)}
                    className="-mx-2 px-2"
                    aria-label={`${t('intensitySlider.choose')} ${label}`}
                  >
                    <span
                      className={`block rounded-full transition-all duration-150 ${
                        stepValue === safeValue
                          ? 'h-9 w-9 border-4 border-(--brand-primary) bg-(--brand-primary)'
                          : 'h-7 w-7 border-[3px] border-(--brand-border-strong)/60 bg-(--brand-card-bg)'
                      }`}
                    />
                  </button>
                )
              })(),
            )}
          </div>

          <p className="mt-4 text-center text-[length:var(--text-lg)] font-extrabold text-(--brand-title-ink)">
            {steps[safeValue - INTENSITY_MIN]}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IntensitySlider
