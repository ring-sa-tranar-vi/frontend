import { SignOutButton, useAuth, useClerk, useUser } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  CircleHelp,
  Building2,
  Globe,
  Menu,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUpdateProfile } from '../../../hooks/useUpdateProfile'
import ContextModel from './ContextModal'
import IntensitySlider from './IntensitySlider'
import TrainerSelectionModal from './TrainerSelectionModal'

const SHEET_CLOSE_DURATION_MS = 350

import { useTranslation } from 'react-i18next'
import { getApiBaseUrl } from '../../../lib/apiBaseUrl'
import {
  AppSheet,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetCategoryClass,
  appSheetContentClass,
  appSheetFormFieldClass,
  appSheetInlineActionButtonClass,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../components/AppSheet'
import ConfirmModal from '../../../components/ConfirmModal'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import PrivacyPolicySheet from './PrivacyPolicySheet'
import SupportSheet from './SupportSheet'
import EventsOrganisationsSheet from './menu/EventsOrganisationsSheet'
import MenuPlaceholderSections from './menu/MenuPlaceholderSections'
import OrganisationApplicationSheet from './menu/OrganisationApplicationSheet'
import useCurrentUser from '../../../hooks/useCurrentUser'
import { fetchCompanyMe } from '../../../api/companyPortal'
import CompanyOrganisationPage from '../../companyPortal/CompanyOrganisationPage'

type ProfileSettings = {
  name?: string | null
  intensityLevel?: number | null
  context?: string | null
  trainerId?: number | null
  isAdmin?: boolean
  city?: string | null
  onboarding?: boolean | null
}

const INTENSITY_MIN = 0
const INTENSITY_MAX = 4
const DEFAULT_INTENSITY_LEVEL = 0

function normalizeIntensityLevel(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_INTENSITY_LEVEL
  }

  return Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, value))
}

function normalizeTrainerId(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  return value
}

function SettingsStatusSheet({
  open,
  setOpen,
  message,
  onRetry,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  message: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <AppSheet
        open={open}
        title={t('menu.title')}
        subtitle=""
        icon={<Menu size={20} strokeWidth={2.4} />}
        onClose={() => setOpen(false)}
        height="compact"
        motion="instant"
        footer={
          <section className="space-y-2.5 pb-1">
            {onRetry ? (
              <button className={appSheetPrimaryButtonClass} onClick={onRetry}>
                {t('menu.activity.retry')}
              </button>
            ) : null}
            <button
              className={appSheetSecondaryButtonClass}
              onClick={() => setOpen(false)}
            >
              {t('settings.close')}
            </button>
          </section>
        }
      >
        <AppSheetNotice>{message}</AppSheetNotice>
      </AppSheet>
    </>
  )
}

function ProfilePreferenceSections({
  fullName,
  setFullName,
  selectedTrainerId,
  setSelectedTrainerId,
  intensityLevel,
  setIntensityLevel,
  context,
  setContext,
  setSupportOpen,
  setPrivacyOpen,
}: {
  fullName: string
  setFullName: (value: string) => void
  selectedTrainerId: number | null
  setSelectedTrainerId: (value: number) => void
  intensityLevel: number
  setIntensityLevel: (value: number) => void
  context: string
  setContext: (value: string) => void
  setSupportOpen: (value: boolean) => void
  setPrivacyOpen: (value: boolean) => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-4 border-t border-(--brand-border)/60 pt-4 pb-3">
      <section className={appSheetCategoryClass}>
        <div className={appSheetContentClass}>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary-deep)">
              <User size={20} />
            </div>
            <label htmlFor="fullName">
              <AppSheetSectionTitle>
                {t('settings.fullName')}
              </AppSheetSectionTitle>
            </label>
          </div>

          <AppSheetSectionText>
            {t('settings.fullNameDescription')}
          </AppSheetSectionText>

          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="off"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t('settings.fullNamePlaceholder')}
            className={`${appSheetFormFieldClass} mt-3 transition placeholder:text-(--brand-muted)`}
          />

          <p className="mt-2 text-[length:var(--text-xs)] leading-snug font-semibold text-(--brand-body-ink)">
            {fullName.trim()
              ? t('settings.fullNameFound')
              : t('settings.noFullNameFound')}
          </p>
        </div>
      </section>

      <section className={appSheetCategoryClass}>
        <TrainerSelectionModal
          selectedTrainerId={selectedTrainerId}
          onTrainerSelect={setSelectedTrainerId}
        />
      </section>

      <section className={appSheetCategoryClass}>
        <IntensitySlider value={intensityLevel} onChange={setIntensityLevel} />
      </section>

      <section className={appSheetCategoryClass}>
        <ContextModel value={context} onChange={setContext} />
      </section>

      <section className={appSheetCategoryClass}>
        <div className={appSheetContentClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary-deep)">
                <Globe size={20} />
              </div>
              <AppSheetSectionTitle>
                {t('settings.language')}
              </AppSheetSectionTitle>
            </div>
            <LanguageSwitcher
              value={i18n.language}
              onChange={(language: string) => i18n.changeLanguage(language)}
            />
          </div>
        </div>
      </section>

      <section className={appSheetCategoryClass}>
        <div className={appSheetContentClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary-deep)">
                <CircleHelp size={20} />
              </div>
              <AppSheetSectionTitle>
                {t('settings.getHelp')}
              </AppSheetSectionTitle>
            </div>
            <button
              className={appSheetInlineActionButtonClass}
              onClick={() => setSupportOpen(true)}
            >
              {t('settings.getHelpButton')}
            </button>
          </div>
        </div>
      </section>

      <section className={appSheetCategoryClass}>
        <div className={appSheetContentClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary-deep)">
                <ShieldCheck size={20} />
              </div>
              <AppSheetSectionTitle>
                {t('settings.privacyPolicy')}
              </AppSheetSectionTitle>
            </div>
            <button
              type="button"
              className={appSheetInlineActionButtonClass}
              onClick={() => setPrivacyOpen(true)}
            >
              {t('settings.readPolicy')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function SettingsModalSheet({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const { isLoaded, isSignedIn } = useAuth()
  const {
    user,
    isProfileLoading: isLoading,
    isProfileError: isError,
    refetchProfile,
  } = useCurrentUser()
  const [isRendered, setIsRendered] = useState(open)

  useLayoutEffect(() => {
    if (open) {
      setIsRendered(true)
    } else {
      const tid = setTimeout(
        () => setIsRendered(false),
        SHEET_CLOSE_DURATION_MS,
      )
      return () => clearTimeout(tid)
    }
  }, [open])

  if (!isRendered) {
    return null
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  if (isLoading) {
    return (
      <SettingsStatusSheet
        open={open}
        setOpen={setOpen}
        message={t('settings.loading')}
      />
    )
  }

  if (isError || !user) {
    return (
      <SettingsStatusSheet
        open={open}
        setOpen={setOpen}
        message={t('settings.fetchError')}
        onRetry={() => void refetchProfile()}
      />
    )
  }

  return (
    <SettingsModalBody
      key="profile"
      open={open}
      setOpen={setOpen}
      profile={user}
    />
  )
}

function SettingsModalBody({
  open,
  setOpen,
  profile,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  profile: ProfileSettings
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const [fullName, setFullName] = useState(profile.name?.trim() ?? '')
  const [intensityLevel, setIntensityLevel] = useState(() =>
    normalizeIntensityLevel(profile.intensityLevel),
  )
  const [context, setContext] = useState(profile.context ?? '')
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(
    normalizeTrainerId(profile.trainerId),
  )
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null,
  )

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateProfile = useUpdateProfile()
  const companyQuery = useQuery({
    queryKey: ['company-me', user?.id],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing authentication token')
      return fetchCompanyMe(token)
    },
    enabled: open && isAuthLoaded && Boolean(isSignedIn),
    retry: false,
  })

  function onTrainerSelect(trainerId: number) {
    setSelectedTrainerId(trainerId)
  }

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const showFeedback = (message: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }

    setSaveFeedback(message)

    feedbackTimeoutRef.current = setTimeout(() => {
      setSaveFeedback(null)
    }, 3000)
  }

  const handleSave = async () => {
    setSaveFeedback(null)

    if (selectedTrainerId === null) {
      showFeedback(t('settings.selectTrainerFirst'))
      return
    }

    try {
      await updateProfile.mutateAsync({
        name: fullName.trim(),
        intensityLevel: normalizeIntensityLevel(intensityLevel),
        context,
        trainerId: selectedTrainerId,
        city: profile.city ?? null,
        onboarding: profile.onboarding ?? null,
      })

      setOpen(false)
    } catch (error) {
      console.error('[SettingsModalSheet] Save failed:', error)
      showFeedback(t('settings.saveError'))
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || isDeletingAccount) return

    setDeleteAccountError(null)
    setIsDeletingAccount(true)

    try {
      const token = await getToken()
      const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error(`Account deletion failed with ${response.status}`)
      }

      await user.delete()
      setOpen(false)
      await signOut({ redirectUrl: '/' })
    } catch (error) {
      console.error('[SettingsModalSheet] Account deletion failed:', error)
      setDeleteAccountError(t('settings.deleteAccountError'))
      setIsDeletingAccount(false)
    }
  }

  return (
    <>
      <AppSheet
        open={
          open && !eventsOpen && !companyOpen && !supportOpen && !privacyOpen
        }
        title={t('menu.title')}
        subtitle=""
        icon={<Menu size={20} strokeWidth={2.4} />}
        onClose={() => setOpen(false)}
        height="large"
        motion="instant"
        footer={
          <section className="space-y-2.5 pb-1">
            {saveFeedback ? (
              <AppSheetNotice tone="danger">{saveFeedback}</AppSheetNotice>
            ) : null}
            <button
              className={appSheetPrimaryButtonClass}
              disabled={updateProfile.isPending}
              onClick={handleSave}
            >
              {updateProfile.isPending
                ? t('settings.saving')
                : t('settings.save')}
            </button>
          </section>
        }
      >
        <div className="pb-2">
          <MenuPlaceholderSections
            dataEnabled={
              open &&
              !eventsOpen &&
              !companyOpen &&
              !supportOpen &&
              !privacyOpen
            }
            onFindEvents={() => setEventsOpen(true)}
          />

          <ProfilePreferenceSections
            fullName={fullName}
            setFullName={setFullName}
            selectedTrainerId={selectedTrainerId}
            setSelectedTrainerId={onTrainerSelect}
            intensityLevel={intensityLevel}
            setIntensityLevel={setIntensityLevel}
            context={context}
            setContext={setContext}
            setSupportOpen={setSupportOpen}
            setPrivacyOpen={setPrivacyOpen}
          />

          <section className="space-y-2 border-t border-(--brand-border)/60 pt-6 pb-4">
            {companyQuery.data?.canManageOrganisation ? (
              <button
                className={`${appSheetSecondaryButtonClass} flex items-center justify-center gap-2`}
                onClick={() => setCompanyOpen(true)}
              >
                <Building2 size={18} /> Organisations-sida
              </button>
            ) : null}
            {profile.isAdmin && (
              <button
                className={appSheetSecondaryButtonClass}
                onClick={() => {
                  setOpen(false)
                  void navigate({ to: '/admin/workouts' })
                }}
              >
                {t('admin.page')}
              </button>
            )}
            <SignOutButton>
              <button
                className={appSheetSecondaryButtonClass}
                onClick={() => setOpen(false)}
              >
                {t('auth.logout')}
              </button>
            </SignOutButton>
            <button
              type="button"
              className="w-full rounded-xl px-4 py-3 text-[length:var(--text-sm)] font-bold text-(--brand-danger) transition hover:bg-(--brand-danger-surface) focus-visible:ring-2 focus-visible:ring-(--brand-danger-border) focus-visible:outline-none"
              onClick={() => {
                setDeleteAccountError(null)
                setDeleteAccountOpen(true)
              }}
            >
              {t('settings.deleteAccount')}
            </button>
          </section>
        </div>
      </AppSheet>
      <PrivacyPolicySheet open={privacyOpen} setOpen={setPrivacyOpen} />
      <SupportSheet open={supportOpen} setOpen={setSupportOpen} />
      <EventsOrganisationsSheet
        open={open && eventsOpen && !applicationOpen}
        onBack={() => setEventsOpen(false)}
        onClose={() => {
          setEventsOpen(false)
          setOpen(false)
        }}
        onApply={() => setApplicationOpen(true)}
        userCity={profile.city}
      />
      <OrganisationApplicationSheet
        open={open && applicationOpen}
        onBack={() => setApplicationOpen(false)}
        onClose={() => {
          setApplicationOpen(false)
          setEventsOpen(false)
          setOpen(false)
        }}
      />
      <CompanyOrganisationPage
        asSheet
        open={open && companyOpen}
        onBack={() => setCompanyOpen(false)}
        onClose={() => {
          setCompanyOpen(false)
          setOpen(false)
        }}
      />
      <ConfirmModal
        open={open && deleteAccountOpen}
        title={t('settings.deleteAccountTitle')}
        body={t('settings.deleteAccountWarning')}
        confirmLabel={t('settings.confirmDeleteAccount')}
        cancelLabel={t('settings.cancel')}
        isConfirming={isDeletingAccount}
        confirmingLabel={t('settings.deletingAccount')}
        error={deleteAccountError}
        onCancel={() => {
          if (!isDeletingAccount) setDeleteAccountOpen(false)
        }}
        onConfirm={() => void handleDeleteAccount()}
      />
    </>
  )
}
