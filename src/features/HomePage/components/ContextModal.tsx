import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppSheetSectionText,
  AppSheetSectionTitle,
} from '../../../components/AppSheet'

type ContextModelProps = {
  value: string
  onChange: (value: string) => void
}

const ContextModel = ({ value, onChange }: ContextModelProps) => {
  const MAX_CHARS = 1000
  const { t } = useTranslation()

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary)">
          <FileText size={20} />
        </div>

        <AppSheetSectionTitle>{t('context.title')}</AppSheetSectionTitle>
      </div>

      <AppSheetSectionText>{t('context.description')}</AppSheetSectionText>

      <div className="mt-3 rounded-2xl border border-(--brand-border-field) bg-(--brand-field-bg) p-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          maxLength={MAX_CHARS}
          placeholder={t('context.textAreaPlaceholder')}
          className="h-[132px] w-full resize-none border-none bg-transparent px-1 py-0.5 text-[length:var(--text-base)] leading-relaxed font-medium text-(--brand-ink) outline-none placeholder:text-(--brand-muted)"
        />

        <div className="mt-1 text-right text-[length:var(--text-xs)] font-semibold text-(--brand-muted)">
          {value.length}/{MAX_CHARS}
        </div>
      </div>
    </div>
  )
}

export default ContextModel
