import { useEffect, useRef, useState } from 'react'
import useCurrentUser from '../../hooks/useCurrentUser'
import useCurrentWorkout from '../../hooks/useCurrentWorkout'
import { useCoachSession } from '../ai-conversation'
import { SessionCall } from './components/SessionCall'
import type { CoachCallSession, SessionPanel, Trainer, Workout } from './types'

const LOADING_SESSION: CoachCallSession = {
  workoutId: '',
  isAuthenticated: false,
}

export function SessionPage({
  workouts,
  trainer,
  updateCurrentWorkout,
  alreadyCompletedToday = false,
  onEnd,
}: {
  workoutId: string | undefined
  workouts: Workout[] | undefined
  trainer: Trainer | undefined
  updateCurrentWorkout: (workoutId: number, reasoning?: string) => void
  alreadyCompletedToday?: boolean
  onEnd: () => void
}) {
  const {
    currentWorkout: workout,
    isLoading: isCurrentWorkoutLoading,
    isError: isCurrentWorkoutError,
  } = useCurrentWorkout()
  const { user, isProfileLoading, isProfileError } = useCurrentUser()

  const isLoading = isProfileLoading || isCurrentWorkoutLoading

  useEffect(() => {
    console.log('SessionPage state', {
      user,
      workout,
    })
  }, [user, workout])
  const isError = isProfileError || isCurrentWorkoutError
  const session: CoachCallSession = {
    workoutId: workout?.id ?? '',
    isAuthenticated: user?.id ? true : false,
    workoutName: workout?.name,
    dashboardName: workout?.dashboardName,
    description: workout?.description,
    dashboardDescription: workout?.dashboardDescription,
    instructions: workout?.instructions,
    guidance: workout?.guidance,
    level: workout?.level,
    type: workout?.type,
    image: workout?.image,
    video: workout?.video,
    userName: user?.name,
    intensityLevel: user?.intensityLevel,
    context: user?.context,
    currentStreak: user?.currentStreak,
    completedWorkouts: user?.completedWorkouts,
    onboarding: user?.onboarding,
    trainer: trainer,
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fbf8ff] px-8 text-center text-base font-semibold text-[#221447]"></div>
    )
  }

  if (isLoading || !session) {
    return (
      <SessionCall
        session={LOADING_SESSION}
        elapsedSeconds={0}
        activePanel="none"
        isLoading={true}
        isMicrophoneMuted={false}
        isSpeakerMuted={false}
        onToggleMicrophoneMuted={() => {}}
        onToggleSpeakerMuted={() => {}}
        onSpeaker={() => {}}
        onTrainingSuite={() => {}}
        onInfo={() => {}}
        onClosePanel={() => {}}
        onEnd={onEnd}
        caption={null}
        captionsEnabled={false}
        onToggleCaptions={() => {}}
      />
    )
  }

  return (
    <ReadySessionPage
      session={session}
      workouts={workouts}
      alreadyCompletedToday={alreadyCompletedToday}
      updateCurrentWorkout={updateCurrentWorkout}
      onEnd={onEnd}
    />
  )
}

function ReadySessionPage({
  session,
  workouts,
  updateCurrentWorkout,
  alreadyCompletedToday = false,
  onEnd,
}: {
  session: CoachCallSession
  updateCurrentWorkout: (workoutId: number, reasoning?: string) => void
  workouts: Workout[] | undefined
  alreadyCompletedToday?: boolean
  onEnd: () => void
}) {
  const [activePanel, setActivePanel] = useState<SessionPanel>('none')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isEnding, setIsEnding] = useState(false)
  const callAnsweredAtRef = useRef<number | null>(null)
  const { currentWorkout, refetchRecommendedWorkoutId } = useCurrentWorkout()
  const {
    step,
    debugEvents,
    hangUp,
    getCurrentRms,
    showInstructionsVideo,
    currentTurn,
    isMicrophoneMuted,
    isSpeakerMuted,
    toggleMicrophoneMuted,
    toggleSpeakerMuted,
    caption,
    captionDraft,
    captionsEnabled,
    toggleCaptions,
    captionHistory,
  } = useCoachSession({
    session: session,
    workouts: workouts,
    trainerId: session.trainer?.id ? String(session.trainer.id) : undefined,
    currentWorkout: currentWorkout,
    autoStart: true,
    alreadyCompletedToday: alreadyCompletedToday,
    updateCurrentWorkout: updateCurrentWorkout,
    refetchRecommendedWorkoutId,
  })

  const isAiSpeaking =
    currentTurn === 'gemini' ||
    step === 'playing_instructions' ||
    step === 'playing_workout'
  const isUserTurn = currentTurn === 'user'
  const isCallAnswered = step !== 'idle' && step !== 'live_intro'

  useEffect(() => {
    if (!isCallAnswered || callAnsweredAtRef.current !== null) return
    callAnsweredAtRef.current = Date.now()
  }, [isCallAnswered])

  useEffect(() => {
    const callAnsweredAt = callAnsweredAtRef.current
    if (callAnsweredAt === null) return
    if (step === 'completed' || step === 'idle' || step === 'error') return

    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - callAnsweredAt) / 1000))
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [step])

  useEffect(() => {
    if (step !== 'completed') return
    const timer = setTimeout(onEnd, 3000)
    return () => clearTimeout(timer)
  }, [step, onEnd])

  function handleEnd() {
    setIsEnding(true)
    hangUp()
    setTimeout(onEnd, 3000)
  }

  function togglePanel(panel: Exclude<SessionPanel, 'none'>) {
    setActivePanel((current) => (current === panel ? 'none' : panel))
  }

  return (
    <SessionCall
      session={session}
      workoutName={session.workoutName}
      elapsedSeconds={elapsedSeconds}
      activePanel={activePanel}
      debugEvents={debugEvents}
      getCurrentRms={getCurrentRms}
      showInstructionsVideo={showInstructionsVideo}
      isAiSpeaking={isAiSpeaking}
      isUserTurn={isUserTurn}
      isEnding={isEnding}
      isMicrophoneMuted={isMicrophoneMuted}
      isSpeakerMuted={isSpeakerMuted}
      onToggleMicrophoneMuted={toggleMicrophoneMuted}
      onToggleSpeakerMuted={toggleSpeakerMuted}
      caption={caption}
      captionDraft={captionDraft}
      captionsEnabled={captionsEnabled}
      onToggleCaptions={toggleCaptions}
      captionHistory={captionHistory}
      onSpeaker={() => togglePanel('exercise')}
      onTrainingSuite={() => togglePanel('suite')}
      onInfo={() => togglePanel('info')}
      onClosePanel={() => setActivePanel('none')}
      onEnd={handleEnd}
    />
  )
}
