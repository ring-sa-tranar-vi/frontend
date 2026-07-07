import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogIn, Phone, Settings } from 'lucide-react'
import { SessionPage } from '../session/SessionPage'
import { primeSessionAudio } from '../ai-conversation/audio/sessionAudio'
import {
  startRingback,
  stopGymAmbience,
} from '../ai-conversation/audio/ringback'
import { coachCallSessionQueryOptions } from '../session/query'
import { SignInButton, useAuth } from '@clerk/react'
import SettingsModalSheet from './components/SettingsModalSheet'
import { useMyProfile } from '../../hooks/useMyProfile'
import useCurrentWorkout from '../../hooks/useCurrentWorkout'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_TRAINER_ID,
  getStoredTrainerId,
  setStoredTrainerId,
} from './trainerPreference'

const assets = {
  background: '/start-page/background.webp',
  logo: '/start-page/logo.png',
}

const DEFAULT_GUEST_WORKOUT_ID = '17'

const homepageTrainers: Record<number, { name: string; image: string }> = {
  1: {
    name: 'Eva',
    image: '/start-page/eva-start.webp',
  },
  2: {
    name: 'Lunken',
    image: '/start-page/lunken-start.webp',
  },
  3: {
    name: 'Jerry',
    image: '/start-page/jerry-start.webp',
  },
  4: {
    name: 'Elizabeth',
    image: '/start-page/elizabeth-start.webp',
  },
  6: {
    name: 'Ayesha',
    image: '/start-page/ayesha-start.webp',
  },
  7: {
    name: 'Arjun',
    image: '/start-page/arjun-start.webp',
  },
  8: {
    name: 'Axmed',
    image: '/start-page/axmed-start.webp',
  },
}

function getHomepageTrainer(trainerId?: number | null) {
  if (typeof trainerId === 'number' && homepageTrainers[trainerId]) {
    return homepageTrainers[trainerId]
  }

  return homepageTrainers[DEFAULT_TRAINER_ID]
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | undefined>(
    undefined,
  )
  const [activeAlreadyCompleted, setActiveAlreadyCompleted] = useState(false)
  const [cachedTrainerId, setCachedTrainerId] = useState<number | null>(() =>
    getStoredTrainerId(),
  )
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const { data: profile } = useMyProfile()
  const { currentWorkout, alreadyCompletedToday } = useCurrentWorkout()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    stopGymAmbience()
  }, [])

  useEffect(() => {
    if (isLoaded && !isSignedIn && i18n.language !== 'sv') {
      void i18n.changeLanguage('sv')
    }
  }, [i18n, isLoaded, isSignedIn])

  useEffect(() => {
    if (typeof profile?.trainerId !== 'number') {
      return
    }
    // Avoid synchronous cascading renders by only updating state when it differs
    if (profile.trainerId === cachedTrainerId) return

    queueMicrotask(() => {
      setCachedTrainerId(profile.trainerId)
      setStoredTrainerId(profile.trainerId)
    })
  }, [profile?.trainerId, cachedTrainerId])

  const activeTrainerId = !isLoaded
    ? (cachedTrainerId ?? DEFAULT_TRAINER_ID)
    : isSignedIn
      ? (profile?.trainerId ?? cachedTrainerId ?? DEFAULT_TRAINER_ID)
      : DEFAULT_TRAINER_ID
  const selectedWorkoutId = isSignedIn
    ? currentWorkout
    : DEFAULT_GUEST_WORKOUT_ID

  const activeTrainer = getHomepageTrainer(activeTrainerId)

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    void (async () => {
      if (!selectedWorkoutId) return
      const token = isSignedIn ? await getToken() : null

      // Keep AI conversation aligned with the workout selected from user level/trainer.
      await queryClient.prefetchQuery(
        coachCallSessionQueryOptions(selectedWorkoutId, token, userId),
      )
    })()
  }, [getToken, isLoaded, isSignedIn, queryClient, selectedWorkoutId, userId])

  async function primeMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      console.warn('[HomePage] Microphone permission prime failed', error)
    }
  }

  function handleEndSession() {
    setIsSessionActive(false)
    setActiveWorkoutId(undefined)
    setActiveAlreadyCompleted(false)
  }

  async function handleStartCall() {
    console.log(
      '[HomePage] Trying to start session with workout ID:',
      selectedWorkoutId,
    )
    if (!selectedWorkoutId && !alreadyCompletedToday) {
      return
    }
    startRingback()
    void primeSessionAudio()
    void primeMicrophonePermission()
    setActiveAlreadyCompleted(alreadyCompletedToday)
    setActiveWorkoutId(selectedWorkoutId)
    setIsSessionActive(true)
  }

  if (isSessionActive) {
    return (
      <SessionPage
        workoutId={activeWorkoutId}
        alreadyCompletedToday={activeAlreadyCompleted}
        onEnd={handleEndSession}
      />
    )
  }

  return (
    <div className="home-stage relative h-full w-full overflow-hidden bg-(--brand-page-start) text-(--brand-ink)">
      {/* Background inside phone stage */}
      <img
        src={assets.background}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-95"
      />

      <div className="absolute inset-0 z-[1]" />

      {/* Logo - locked position */}
      <div className="home-stage-logo pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2">
        <img
          src={assets.logo}
          alt={t('home.logoAlt')}
          className="h-auto w-full object-contain"
        />
      </div>

      {/* Trainer - locked relation to logo */}
      <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
        <div className="home-stage-trainer-glow absolute left-1/2 -translate-x-1/2 rounded-full bg-white/20 blur-[44px]" />

        <img
          src={activeTrainer.image}
          alt={activeTrainer.name}
          className="home-stage-trainer-image absolute left-1/2 -translate-x-1/2 object-contain"
        />
      </div>

      {/* Footer – unified plate with buttons */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[15]">
        <div className="home-footer-plate pointer-events-auto rounded-t-3xl px-[var(--stage-inline-pad)] pt-5 pb-[max(1.25rem,var(--stage-safe-bottom))]">
          <div className="flex flex-col items-center gap-[var(--home-footer-gap)]">
            <button
              type="button"
              onClick={() => {
                void handleStartCall()
              }}
              className="flex min-h-[var(--home-cta-min-height)] w-full items-center justify-center gap-3 rounded-full bg-(--brand-primary) px-6 py-4 text-lg font-extrabold text-white shadow-[0_4px_20px_rgba(80,64,200,0.30)] transition hover:bg-(--brand-primary-strong) active:scale-[0.98]"
            >
              <Phone size={22} strokeWidth={2.5} />
              {t('home.callTrainer')}
            </button>

            {isLoaded ? (
              isSignedIn ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-(--brand-muted) transition hover:text-(--brand-primary) active:scale-[0.98]"
                >
                  <Settings size={16} strokeWidth={2.2} />
                  {t('home.settings')}
                </button>
              ) : (
                <SignInButton>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-(--brand-muted) transition hover:text-(--brand-primary) active:scale-[0.98]"
                  >
                    <LogIn size={16} strokeWidth={2.2} />
                    {t('auth.login')}
                  </button>
                </SignInButton>
              )
            ) : null}
          </div>
        </div>
      </footer>

      {isLoaded && isSignedIn ? (
        <SettingsModalSheet open={open} setOpen={setOpen} />
      ) : null}
    </div>
  )
}
