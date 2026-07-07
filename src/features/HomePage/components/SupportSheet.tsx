import { useState } from 'react'
import { useUser } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'

export default function SupportSheet({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const submitIssue = () => {
    try {
      const subject = encodeURIComponent(t('support.emailSubject'))
      const body = encodeURIComponent(
        `${t('support.emailIntro')}\n\n${message}\n\n${t('support.userEmail')} : ${userEmail}`,
      )
      window.location.href = `mailto:support@ringsatranarvi.se?subject=${subject}&body=${body}`
      setFeedback(t('support.sentSuccess'))
      setMessage('')
    } catch (err) {
      console.error('Support submit failed', err)
      setFeedback(t('support.sentError'))
    }
  }

  return (
    <AppSheet
      open={open}
      title={t('support.title')}
      subtitle={t('support.subtitle')}
      onClose={() => setOpen(false)}
      height="large"
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
      <div className="divide-y divide-(--brand-border)/60 pb-2">
        <section className="pt-1 pb-3">
          <AppSheetSectionTitle>{t('support.faqTitle')}</AppSheetSectionTitle>
        </section>

        {([0, 1, 2, 3, 4] as const).map((i) => (
          <section key={i} className="py-4">
            <h4 className="text-[length:var(--text-base)] font-extrabold text-(--brand-title-ink)">
              {t(`support.help${i}Title`)}
            </h4>
            <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
              {t(`support.help${i}Text`)}
            </p>
          </section>
        ))}

        <section className="py-5">
          <AppSheetSectionTitle>{t('support.formTitle')}</AppSheetSectionTitle>
          <AppSheetSectionText>
            {t('support.formDescription')}
          </AppSheetSectionText>

          <div className="mt-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support.placeholder') || ''}
              className="resize-vertical min-h-[120px] w-full rounded-2xl border border-(--brand-border-field) bg-(--brand-field-bg) px-4 py-3 text-[length:var(--text-base)] text-(--brand-ink) transition outline-none placeholder:text-(--brand-muted) focus:border-(--brand-border-strong)"
            />
          </div>

          {feedback ? (
            <div className="mt-3">
              <AppSheetNotice
                tone={feedback.includes('✓') ? 'success' : 'danger'}
              >
                {feedback}
              </AppSheetNotice>
            </div>
          ) : null}
        </section>
      </div>
    </AppSheet>
  )
}
