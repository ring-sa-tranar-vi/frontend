import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCoachSession } from '../ai-conversation'
import { SessionCall } from './components/SessionCall'
import { useCoachCallSession } from './query'
import type { CoachCallSession, SessionPanel } from './types'

const LOADING_SESSION: CoachCallSession = {
  id: '',
  isAuthenticated: false,
  durationSeconds: 0,
}

export function SessionPage({
  workoutId,
  alreadyCompletedToday = false,
  onEnd,
}: {
  workoutId: string | undefined
  alreadyCompletedToday?: boolean
  onEnd: () => void
}) {
  const {
    data: session,
    isLoading,
    isError,
    error,
  } = useCoachCallSession(workoutId)
  const { t } = useTranslation()

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fbf8ff] px-8 text-center text-base font-semibold text-[#221447]">
        {error instanceof Error ? error.message : t('sessionPage.genericError')}
      </div>
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
      alreadyCompletedToday={alreadyCompletedToday}
      onEnd={onEnd}
    />
  )
}

function ReadySessionPage({
  session,
  alreadyCompletedToday = false,
  onEnd,
}: {
  session: CoachCallSession
  alreadyCompletedToday?: boolean
  onEnd: () => void
}) {
  const [activePanel, setActivePanel] = useState<SessionPanel>('none')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isEnding, setIsEnding] = useState(false)
  const callAnsweredAtRef = useRef<number | null>(null)

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
    playbackSubtitle,
    captionsEnabled,
    toggleCaptions,
    captionHistory,
  } = useCoachSession({
    session,
    trainerId: session.trainer?.id ? String(session.trainer.id) : undefined,
    autoStart: true,
    alreadyCompletedToday,
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
      workoutName={session.name ?? session.workoutName}
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
      playbackSubtitle={playbackSubtitle}
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
