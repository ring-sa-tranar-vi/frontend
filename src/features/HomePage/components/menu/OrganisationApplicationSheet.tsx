import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Clock3,
  CreditCard,
  FileCheck2,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  appSheetCategoryClass,
  appSheetFormFieldClass,
  appSheetFormLabelClass,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../../components/AppSheet'
import {
  createOrganizationApplication,
  type ApplicationStatus,
  fetchMyOrganizationApplication,
  OrganizationApplicationError,
} from '../../../../api/organizationApplications'

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

const DESCRIPTION_MAX_LENGTH = 600
const MOTIVATION_MAX_LENGTH = 600

const fieldClass = `${appSheetFormFieldClass} transition placeholder:text-(--brand-muted)`
const applicationTextareaClass =
  'w-full resize-none border-none bg-transparent px-1 py-0.5 text-[length:var(--text-base)] leading-relaxed font-medium text-(--brand-ink) outline-none placeholder:text-(--brand-muted)'

const applicationStatusTone: Record<
  ApplicationStatus,
  { card: string; icon: string; badge: string }
> = {
  PENDING: {
    card: '!border-amber-200 !bg-amber-50',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'border-amber-200 bg-white/80 text-amber-700',
  },
  APPROVED: {
    card: '!border-emerald-200 !bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-700',
    badge: 'border-emerald-200 bg-white/80 text-emerald-700',
  },
  REJECTED: {
    card: '!border-red-200 !bg-red-50',
    icon: 'bg-red-100 text-red-700',
    badge: 'border-red-200 bg-white/80 text-red-700',
  },
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(date)
}

export default function OrganisationApplicationSheet({
  open,
  onBack,
  onClose,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<OrganisationApplication>(emptyApplication)
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false)

  const myApplicationQuery = useQuery({
    queryKey: ['organisation-application', 'me', userId],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchMyOrganizationApplication(token)
    },
    enabled: open && isLoaded && Boolean(isSignedIn) && Boolean(userId),
    retry: false,
  })

  const applicationMutation = useMutation({
    mutationFn: async (application: OrganisationApplication) => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      await createOrganizationApplication(application, token)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['organisation-application', 'me', userId],
      })
    },
  })

  const isComplete = Object.values(form).every((value) => value.trim())
  const hasNoPreviousApplication =
    myApplicationQuery.error instanceof OrganizationApplicationError &&
    myApplicationQuery.error.status === 404
  const existingApplication = myApplicationQuery.data
  const showingApplicationStatus =
    !showNewApplicationForm && existingApplication != null
  const isCheckingApplication =
    open &&
    !showNewApplicationForm &&
    myApplicationQuery.isLoading &&
    !applicationMutation.isSuccess
  const statusTone = existingApplication
    ? applicationStatusTone[existingApplication.status]
    : null

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
    setShowNewApplicationForm(false)
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
      motion="instant"
      footer={
        applicationMutation.isSuccess || showingApplicationStatus ? (
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
            disabled={
              !isComplete ||
              applicationMutation.isPending ||
              isCheckingApplication ||
              (myApplicationQuery.isError && !hasNoPreviousApplication)
            }
          >
            {applicationMutation.isPending
              ? t('menu.events.application.submitting')
              : t('menu.events.application.submit')}
          </button>
        )
      }
    >
      {isCheckingApplication ? (
        <div
          className={`${appSheetCategoryClass} flex min-h-52 flex-col items-center justify-center px-5 text-center`}
        >
          <Clock3
            size={30}
            className="text-(--brand-primary-deep)"
            aria-hidden="true"
          />
          <p className="mt-4 text-[length:var(--text-sm)] font-bold text-(--brand-body-ink)">
            {t('menu.events.application.checkingStatus')}
          </p>
        </div>
      ) : applicationMutation.isSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className={`${appSheetCategoryClass} flex min-h-52 flex-col items-center justify-center !border-amber-200 !bg-amber-50 px-5 text-center`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Building2 size={28} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-[length:var(--text-lg)] font-extrabold text-(--brand-title-ink)">
            {t('menu.events.application.successTitle')}
          </h3>
          <p className="mt-1.5 max-w-sm text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
            {t('menu.events.application.successText')}
          </p>
        </div>
      ) : showingApplicationStatus ? (
        <div
          role="status"
          aria-live="polite"
          className={`${appSheetCategoryClass} ${statusTone?.card ?? ''}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${statusTone?.icon ?? ''}`}
            >
              <FileCheck2 size={22} strokeWidth={2.3} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-[length:var(--text-xl)] font-extrabold text-(--brand-title-ink)">
                {t(
                  `menu.events.application.statusTitle.${existingApplication.status.toLowerCase()}`,
                )}
              </h3>
              <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
                {t(
                  `menu.events.application.statusText.${existingApplication.status.toLowerCase()}`,
                )}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-3 text-[length:var(--text-sm)]">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-(--brand-muted)">
                {t('menu.events.application.statusLabel')}
              </dt>
              <dd
                className={`rounded-full border px-2.5 py-1 font-extrabold ${statusTone?.badge ?? ''}`}
              >
                {t(
                  `menu.events.application.status.${existingApplication.status.toLowerCase()}`,
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-(--brand-muted)">
                {t('menu.events.application.submitted')}
              </dt>
              <dd className="font-extrabold text-(--brand-title-ink)">
                {formatDate(existingApplication.createdAt, i18n.language)}
              </dd>
            </div>
            {existingApplication.reviewedAt ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="font-bold text-(--brand-muted)">
                  {t('menu.events.application.reviewed')}
                </dt>
                <dd className="font-extrabold text-(--brand-title-ink)">
                  {formatDate(existingApplication.reviewedAt, i18n.language)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-1.5 font-bold text-(--brand-muted)">
                <CreditCard size={15} aria-hidden="true" />
                {t('menu.events.application.payment')}
              </dt>
              <dd className="text-right font-extrabold text-(--brand-title-ink)">
                {t(
                  `menu.events.application.paymentStatus.${existingApplication.paymentStatus.toLowerCase()}`,
                )}
              </dd>
            </div>
          </dl>

          {existingApplication.status === 'REJECTED' ? (
            <button
              type="button"
              onClick={() => setShowNewApplicationForm(true)}
              className="mt-5 w-full rounded-2xl border border-(--brand-btn-secondary-border) bg-(--brand-btn-secondary-bg) px-4 py-3.5 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover)"
            >
              {t('menu.events.application.submitNew')}
            </button>
          ) : null}
        </div>
      ) : (
        <form
          id="organisation-application-form"
          className={appSheetCategoryClass}
          onSubmit={submitApplication}
        >
          {applicationMutation.isError ||
          (myApplicationQuery.isError && !hasNoPreviousApplication) ? (
            <div className="mb-3 space-y-2">
              {applicationMutation.isError ? (
                <AppSheetNotice tone="danger">
                  {t('menu.events.application.error')}
                </AppSheetNotice>
              ) : null}
              {myApplicationQuery.isError && !hasNoPreviousApplication ? (
                <AppSheetNotice tone="danger">
                  {t('menu.events.application.statusError')}
                </AppSheetNotice>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--menu-content-bg) text-(--brand-primary)">
              <Building2 size={18} strokeWidth={2.3} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[length:var(--text-lg)] leading-tight font-extrabold tracking-tight text-(--brand-ink)">
                {t('menu.events.application.subtitle')}
              </h2>
              <p className="mt-0.5 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
                {t('menu.events.application.cardText')}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="organisation-application-name"
                className={appSheetFormLabelClass}
              >
                {t('menu.events.application.name')}
                <span aria-hidden="true"> *</span>
              </label>
              <input
                id="organisation-application-name"
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
            </div>

            <div>
              <label
                htmlFor="organisation-application-description"
                className={appSheetFormLabelClass}
              >
                {t('menu.events.application.description')}
                <span aria-hidden="true"> *</span>
              </label>
              <div className="menu-field-shell rounded-2xl border border-(--menu-control-border) p-3 focus-within:border-(--brand-border-strong) focus-within:ring-2 focus-within:ring-(--brand-selection)">
                <textarea
                  id="organisation-application-description"
                  required
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  className={applicationTextareaClass}
                  placeholder={t(
                    'menu.events.application.descriptionPlaceholder',
                  )}
                />
                <span
                  aria-live="polite"
                  className="mt-1 block text-right text-[length:var(--text-xs)] font-semibold text-(--brand-muted) tabular-nums"
                >
                  {form.description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="organisation-application-city"
                className={appSheetFormLabelClass}
              >
                {t('menu.events.application.city')}
                <span aria-hidden="true"> *</span>
              </label>
              <input
                id="organisation-application-city"
                required
                maxLength={100}
                autoComplete="address-level2"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                className={fieldClass}
                placeholder={t('menu.events.application.cityPlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="organisation-application-motivation"
                className={appSheetFormLabelClass}
              >
                {t('menu.events.application.motivation')}
                <span aria-hidden="true"> *</span>
              </label>
              <div className="menu-field-shell rounded-2xl border border-(--menu-control-border) p-3 focus-within:border-(--brand-border-strong) focus-within:ring-2 focus-within:ring-(--brand-selection)">
                <textarea
                  id="organisation-application-motivation"
                  required
                  maxLength={MOTIVATION_MAX_LENGTH}
                  rows={4}
                  value={form.motivation}
                  onChange={(event) =>
                    updateField('motivation', event.target.value)
                  }
                  className={applicationTextareaClass}
                  placeholder={t(
                    'menu.events.application.motivationPlaceholder',
                  )}
                />
                <span
                  aria-live="polite"
                  className="mt-1 block text-right text-[length:var(--text-xs)] font-semibold text-(--brand-muted) tabular-nums"
                >
                  {form.motivation.length}/{MOTIVATION_MAX_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </form>
      )}
    </AppSheet>
  )
}
