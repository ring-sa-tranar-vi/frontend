import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetCategoryClass,
  appSheetContentClass,
  appSheetSecondaryButtonClass,
} from '../../../components/AppSheet'

const POLICY_SECTIONS = ['data', 'use', 'sharing', 'rights'] as const

export default function PrivacyPolicySheet({
  open,
  onBack,
  onClose,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <AppSheet
      open={open}
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      icon={<ArrowLeft size={20} strokeWidth={2.4} />}
      onBack={onBack}
      backLabel={t('menu.events.directory.back')}
      onClose={onClose}
      height="large"
      motion="instant"
      footer={
        <button
          type="button"
          className={appSheetSecondaryButtonClass}
          onClick={onBack}
        >
          {t('settings.close')}
        </button>
      }
    >
      <div className={appSheetCategoryClass}>
        <AppSheetNotice>{t('privacy.draftNotice')}</AppSheetNotice>

        <div className={`mt-3 ${appSheetContentClass}`}>
          <div className="divide-y divide-(--brand-border)/60">
            {POLICY_SECTIONS.map((section) => (
              <section key={section} className="py-4 first:pt-0 last:pb-0">
                <AppSheetSectionTitle>
                  {t(`privacy.${section}Title`)}
                </AppSheetSectionTitle>
                <AppSheetSectionText>
                  {t(`privacy.${section}Text`)}
                </AppSheetSectionText>
              </section>
            ))}
          </div>

          <section className="mt-4 rounded-xl border border-(--menu-control-border) bg-(--menu-control-bg) p-4">
            <p className="text-[length:var(--text-xs)] font-extrabold tracking-wide text-(--brand-primary-deep) uppercase">
              {t('privacy.contactTitle')}
            </p>
            <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
              {t('privacy.contactText')}
            </p>
          </section>
        </div>
      </div>
    </AppSheet>
  )
}
