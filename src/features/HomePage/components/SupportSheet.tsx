import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useUser } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetCategoryClass,
  appSheetContentClass,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'

export default function SupportSheet({
  open,
  onBack,
  onClose,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'danger'>(
    'success',
  )

  const submitIssue = () => {
    try {
      const subject = encodeURIComponent(t('support.emailSubject'))
      const body = encodeURIComponent(
        `${t('support.emailIntro')}\n\n${message}\n\n${t('support.userEmail')} : ${userEmail}`,
      )
      window.location.href = `mailto:support@ringsatranarvi.se?subject=${subject}&body=${body}`
      setFeedbackTone('success')
      setFeedback(t('support.sentSuccess'))
      setMessage('')
    } catch (err) {
      console.error('Support submit failed', err)
      setFeedbackTone('danger')
      setFeedback(t('support.sentError'))
    }
  }

  return (
    <AppSheet
      open={open}
      title={t('support.title')}
      subtitle={t('support.subtitle')}
      icon={<ArrowLeft size={20} strokeWidth={2.4} />}
      onBack={onBack}
      backLabel={t('menu.events.directory.back')}
      onClose={onClose}
      height="large"
      motion="instant"
      footer={
        <section className="pb-1">
          <button
            className={appSheetPrimaryButtonClass}
            onClick={submitIssue}
            disabled={!message.trim()}
          >
            {t('support.submit')}
          </button>
        </section>
      }
    >
      <div className={`${appSheetCategoryClass} space-y-3`}>
        <section className={appSheetContentClass}>
          <AppSheetSectionTitle>{t('support.faqTitle')}</AppSheetSectionTitle>

          <div className="mt-3 divide-y divide-(--brand-border)/60">
            {([0, 1, 2, 3, 4] as const).map((i) => (
              <section key={i} className="py-4 first:pt-0 last:pb-0">
                <h4 className="text-[length:var(--text-base)] font-extrabold text-(--brand-title-ink)">
                  {t(`support.help${i}Title`)}
                </h4>
                <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
                  {t(`support.help${i}Text`)}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section className={appSheetContentClass}>
          <AppSheetSectionTitle>{t('support.formTitle')}</AppSheetSectionTitle>
          <AppSheetSectionText>
            {t('support.formDescription')}
          </AppSheetSectionText>

          <div className="mt-3">
            <label htmlFor="support-message" className="sr-only">
              {t('support.formTitle')}
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support.placeholder') || ''}
              className="resize-vertical min-h-[120px] w-full rounded-2xl border border-(--menu-control-border) bg-(--menu-field-bg) px-4 py-3 text-[length:var(--text-base)] text-(--brand-ink) transition outline-none placeholder:text-(--brand-muted) focus:border-(--brand-border-strong)"
            />
          </div>

          {feedback ? (
            <div className="mt-3">
              <AppSheetNotice tone={feedbackTone}>{feedback}</AppSheetNotice>
            </div>
          ) : null}
        </section>
      </div>
    </AppSheet>
  )
}
