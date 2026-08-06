import { useAuth } from '@clerk/react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Building2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../../components/AppSheet'
import { getApiBaseUrl } from '../../../../lib/apiBaseUrl'

type OrganisationApplication = {
  organizationName: string
  description: string
  city: string
  motivation: string
}

const emptyApplication: OrganisationApplication = {
  organizationName: '',
  description: '',
  city: '',
  motivation: '',
}

const fieldClass =
  'mt-2 w-full rounded-2xl border border-(--menu-control-border) bg-(--menu-control-bg) px-4 py-3.5 text-[length:var(--text-base)] font-semibold text-(--brand-ink) transition placeholder:text-(--brand-muted) focus-visible:border-(--brand-border-strong) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none'

export default function OrganisationApplicationSheet({
  open,
  onBack,
  onClose,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [form, setForm] = useState<OrganisationApplication>(emptyApplication)

  const applicationMutation = useMutation({
    mutationFn: async (application: OrganisationApplication) => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/organization-applications`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(application),
        },
      )

      if (!response.ok) {
        const message = await response.text().catch(() => '')
        throw new Error(message || `Request failed (${response.status})`)
      }
    },
  })

  const isComplete = Object.values(form).every((value) => value.trim())

  function updateField(field: keyof OrganisationApplication, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isComplete || applicationMutation.isPending) return

    applicationMutation.mutate({
      organizationName: form.organizationName.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      motivation: form.motivation.trim(),
    })
  }

  function returnToOrganisations() {
    applicationMutation.reset()
    setForm(emptyApplication)
    onBack()
  }

  return (
    <AppSheet
      open={open}
      title={t('menu.events.application.title')}
      subtitle={t('menu.events.application.subtitle')}
      icon={<ArrowLeft size={22} strokeWidth={2.6} />}
      onBack={returnToOrganisations}
      backLabel={t('menu.events.application.back')}
      onClose={onClose}
      height="large"
      fillHeight
      footer={
        applicationMutation.isSuccess ? (
          <button
            type="button"
            className={appSheetSecondaryButtonClass}
            onClick={returnToOrganisations}
          >
            {t('menu.events.application.backToOrganisations')}
          </button>
        ) : (
          <button
            type="submit"
            form="organisation-application-form"
            className={appSheetPrimaryButtonClass}
            disabled={!isComplete || applicationMutation.isPending}
          >
            {applicationMutation.isPending
              ? t('menu.events.application.submitting')
              : t('menu.events.application.submit')}
          </button>
        )
      }
    >
      {applicationMutation.isSuccess ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-(--menu-category-border) bg-(--menu-category-bg) px-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-(--brand-soft) text-(--brand-primary-deep)">
            <Building2 size={30} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-[length:var(--text-xl)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.successTitle')}
          </h3>
          <p className="mt-2 max-w-sm text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
            {t('menu.events.application.successText')}
          </p>
        </div>
      ) : (
        <form
          id="organisation-application-form"
          className="space-y-5 rounded-2xl border border-(--menu-category-border) bg-(--menu-category-bg) p-4"
          onSubmit={submitApplication}
        >
          {applicationMutation.isError ? (
            <AppSheetNotice tone="danger">
              {t('menu.events.application.error')}
            </AppSheetNotice>
          ) : null}

          <label className="block text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.name')}
            <span aria-hidden="true"> *</span>
            <input
              required
              maxLength={100}
              autoComplete="organization"
              value={form.organizationName}
              onChange={(event) =>
                updateField('organizationName', event.target.value)
              }
              className={fieldClass}
              placeholder={t('menu.events.application.namePlaceholder')}
            />
          </label>

          <label className="block text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.description')}
            <span aria-hidden="true"> *</span>
            <textarea
              required
              maxLength={300}
              rows={4}
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              className={`${fieldClass} resize-none`}
              placeholder={t('menu.events.application.descriptionPlaceholder')}
            />
          </label>

          <label className="block text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.city')}
            <span aria-hidden="true"> *</span>
            <input
              required
              maxLength={100}
              autoComplete="address-level2"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              className={fieldClass}
              placeholder={t('menu.events.application.cityPlaceholder')}
            />
          </label>

          <label className="block text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.motivation')}
            <span aria-hidden="true"> *</span>
            <textarea
              required
              maxLength={600}
              rows={5}
              value={form.motivation}
              onChange={(event) =>
                updateField('motivation', event.target.value)
              }
              className={`${fieldClass} resize-none`}
              placeholder={t('menu.events.application.motivationPlaceholder')}
            />
          </label>
        </form>
      )}
    </AppSheet>
  )
}
