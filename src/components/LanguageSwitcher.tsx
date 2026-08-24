import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sv', label: 'Svenska' },
  { code: 'so', label: 'Somali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ur', label: 'Urdu' },
  { code: 'pl', label: 'Polski' },
  { code: 'ar', label: 'العربية' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'fi', label: 'Suomi' },
  { code: 'se', label: 'Davvisámegiella' },
  { code: 'fit', label: 'Meänkieli' },
  { code: 'zh', label: '中文' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'no', label: 'Norsk' },
  { code: 'da', label: 'Dansk' },
]

export default function LanguageSwitcher({
  value,
  onChange,
}: {
  value?: string
  onChange?: (lang: string) => void
}) {
  const { t, i18n } = useTranslation()

  const activeLang = value ?? i18n.language

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang)
    onChange?.(lang)
  }

  return (
    <div className="relative max-w-full">
      <select
        aria-label={t('settings.language')}
        value={activeLang}
        onChange={(e) => handleChange(e.target.value)}
        className="max-w-full cursor-pointer appearance-none rounded-xl border border-(--brand-btn-secondary-border) bg-(--brand-btn-secondary-bg) px-3 py-2 pe-8 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition focus:border-(--brand-border-strong) focus:ring-2 focus:ring-(--brand-selection) focus:outline-none"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2.5}
        className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-(--brand-btn-secondary-text)"
      />
    </div>
  )
}
