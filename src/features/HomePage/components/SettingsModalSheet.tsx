import { SignOutButton, useAuth } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import { CircleHelp, Globe, Settings, User } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMyProfile } from '../../../hooks/useMyProfile'
import { useUpdateProfile } from '../../../hooks/useUpdateProfile'
import ContextModel from './ContextModal'
import IntensitySlider from './IntensitySlider'
import TrainerSelectionModal from './TrainerSelectionModal'

const SHEET_CLOSE_DURATION_MS = 350

import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
  appSheetPrimaryButtonClass,
  appSheetSecondaryButtonClass,
} from '../../../components/AppSheet'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import SupportSheet from './SupportSheet'

type ProfileSettings = {
  name?: string | null
  intensityLevel?: number | null
  context?: string | null
  trainerId?: number | null
  isAdmin?: boolean
}

const INTENSITY_MIN = 1
const INTENSITY_MAX = 5
const DEFAULT_INTENSITY_LEVEL = 3
const DEFAULT_TRAINER_ID = 1

function normalizeIntensityLevel(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_INTENSITY_LEVEL
  }

  return Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, value))
}

function normalizeTrainerId(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_TRAINER_ID
  }

  return value
}

function SettingsStatusSheet({
  open,
  setOpen,
  message,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  message: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <AppSheet
        open={open}
        title={t('settings.title')}
        subtitle=""
        icon={<Settings size={20} strokeWidth={2.4} />}
        onClose={() => setOpen(false)}
        height="compact"
        footer={
          <section className="space-y-2.5 pb-1">
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

export default function SettingsModalSheet({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const { isLoaded, isSignedIn } = useAuth()
  const { data: user, isSuccess, isLoading, isError, error } = useMyProfile()
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

  if (isLoaded && !isSignedIn) {
    return (
      <SettingsStatusSheet
        open={open}
        setOpen={setOpen}
        message={t('settings.notLoggedIn')}
      />
    )
  }

  if (!isLoaded || isLoading) {
    return (
      <SettingsStatusSheet
        open={open}
        setOpen={setOpen}
        message={t('settings.loading')}
      />
    )
  }

  if (isError || !isSuccess || !user) {
    return (
      <SettingsStatusSheet
        open={open}
        setOpen={setOpen}
        message={
          error instanceof Error ? error.message : t('settings.fetchError')
        }
      />
    )
  }

  return <SettingsModalBody open={open} setOpen={setOpen} profile={user} />
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
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

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  const updateProfile = useUpdateProfile()

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

  // Auto-save trainer immediately when selection changes, using last-saved profile
  // values for other fields to avoid persisting incomplete form edits.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (selectedTrainerId == null) return
    updateProfile
      .mutateAsync({
        name: (profile.name ?? '').trim(),
        intensityLevel: normalizeIntensityLevel(profile.intensityLevel),
        context: profile.context ?? '',
        trainerId: selectedTrainerId,
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrainerId])

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

    try {
      await updateProfile.mutateAsync({
        name: fullName.trim(),
        intensityLevel: normalizeIntensityLevel(intensityLevel),
        context,
        trainerId: Number(selectedTrainerId),
      })

      setOpen(false)
    } catch (error) {
      console.error('[SettingsModalSheet] Save failed:', error)
      showFeedback(t('settings.saveError'))
    }
  }

  return (
    <>
      <AppSheet
        open={open}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        icon={<Settings size={20} strokeWidth={2.4} />}
        onClose={() => setOpen(false)}
        height="large"
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
                : t('settings.saveAndClose')}
            </button>
          </section>
        }
      >
        <div className="divide-y divide-(--brand-border)/60 pb-2">
          <section className="py-6">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary-deep)">
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
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('settings.fullNamePlaceholder')}
              className="mt-3 w-full rounded-2xl border border-(--brand-border-field) bg-(--brand-control) px-4 py-3.5 text-[length:var(--text-base)] font-semibold text-(--brand-ink) transition outline-none placeholder:text-(--brand-muted) focus:border-(--brand-border-strong)"
            />

            <p className="mt-2 text-[length:var(--text-xs)] leading-snug font-semibold text-(--brand-body-ink)">
              {fullName.trim()
                ? t('settings.fullNameFound')
                : t('settings.noFullNameFound')}
            </p>
          </section>

          <section className="py-6">
            <TrainerSelectionModal
              selectedTrainerId={selectedTrainerId}
              onTrainerSelect={onTrainerSelect}
            />
          </section>

          <section className="py-6">
            <IntensitySlider
              value={intensityLevel}
              onChange={setIntensityLevel}
            />
          </section>

          <section className="py-6">
            <ContextModel value={context} onChange={setContext} />
          </section>

          <section className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary-deep)">
                  <Globe size={20} />
                </div>
                <AppSheetSectionTitle>
                  {t('settings.language')}
                </AppSheetSectionTitle>
              </div>
              <LanguageSwitcher
                value={i18n.language}
                onChange={(lng: string) => i18n.changeLanguage(lng)}
              />
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary-deep)">
                  <CircleHelp size={20} />
                </div>
                <AppSheetSectionTitle>
                  {t('settings.getHelp')}
                </AppSheetSectionTitle>
              </div>
              <button
                className="rounded-full bg-(--brand-primary) px-4 py-2 text-[length:var(--text-sm)] font-extrabold text-white transition hover:opacity-95"
                onClick={() => setSupportOpen(true)}
              >
                {t('settings.getHelpButton')}
              </button>
            </div>
          </section>

          <section className="space-y-2 pt-6 pb-4">
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
              <button className={appSheetSecondaryButtonClass}>
                {t('auth.logout')}
              </button>
            </SignOutButton>
          </section>
        </div>
      </AppSheet>
      <SupportSheet open={supportOpen} setOpen={setSupportOpen} />
    </>
  )
}
