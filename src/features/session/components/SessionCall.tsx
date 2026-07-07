import { useEffect, useRef, useState } from 'react'
import { Captions } from 'lucide-react'
import SettingsModalSheet from '../../HomePage/components/SettingsModalSheet'
import type { CoachCallSession, SessionPanel } from '../types'
import type { CoachSessionDebugEvent } from '../../ai-conversation'
import ControlsGrid from './ControlsGrid'
import DevDebugPanel from './DevDebugPanel'
import EndCallButton from './EndCallButton'
import SessionHeader from './SessionHeader'
import { SessionInfoPanel } from './SessionInfoPanel'

type SessionCallProps = {
  session: CoachCallSession
  workoutName?: string
  elapsedSeconds: number
  activePanel: SessionPanel
  debugEvents?: CoachSessionDebugEvent[]
  getCurrentRms?: () => number
  showInstructionsVideo?: boolean
  isAiSpeaking?: boolean
  isUserTurn?: boolean
  isLoading?: boolean
  isEnding?: boolean
  isMicrophoneMuted?: boolean
  isSpeakerMuted?: boolean
  onToggleMicrophoneMuted: () => void
  onToggleSpeakerMuted: () => void
  onSpeaker: () => void
  onTrainingSuite: () => void
  onInfo: () => void
  onClosePanel: () => void
  onEnd: () => void
  caption?: string | null
  captionDraft?: string
  playbackSubtitle?: string
  captionsEnabled?: boolean
  onToggleCaptions?: () => void
  captionHistory?: string[]
}

const SHOW_DEV_DEBUG = false

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))

  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0')

  const seconds = (safeSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

function getTrainerName(session: CoachCallSession) {
  return session.trainer?.name?.trim() || ''
}

function getTrainerImage(session: CoachCallSession) {
  return (
    session.trainer?.imageCall ??
    session.trainer?.imageStart ??
    session.trainer?.imageSelect ??
    null
  )
}

function getWorkoutName(session: CoachCallSession, workoutName?: string) {
  return session.name ?? session.workoutName ?? workoutName ?? ''
}

export function SessionCall(props: SessionCallProps) {
  const {
    session,
    workoutName,
    elapsedSeconds,
    activePanel,
    debugEvents = [],
    getCurrentRms,
    showInstructionsVideo = false,
    isAiSpeaking = false,
    isUserTurn = false,
    isLoading = false,
    isEnding = false,
    isMicrophoneMuted = false,
    isSpeakerMuted = false,
    onToggleMicrophoneMuted,
    onToggleSpeakerMuted,
    onSpeaker,
    onTrainingSuite,
    onInfo,
    onClosePanel,
    onEnd,
  } = props

  const {
    captionDraft = '',
    playbackSubtitle = '',
    captionsEnabled = false,
    onToggleCaptions,
  } = props
  const captionHistory = props.captionHistory ?? []

  const [captionsOverlayOpen, setCaptionsOverlayOpen] = useState(false)
  const captionsScrollRef = useRef<HTMLDivElement | null>(null)
  const transcriptBlocks = [...captionHistory].slice(-100)

  useEffect(() => {
    if (!captionsEnabled || !captionsOverlayOpen) return
    requestAnimationFrame(() => {
      captionsScrollRef.current?.scrollTo({
        top: captionsScrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [
    captionsEnabled,
    captionsOverlayOpen,
    transcriptBlocks.length,
    captionDraft,
  ])

  function handleToggleCaptions() {
    onToggleCaptions?.()
    setCaptionsOverlayOpen((current) => {
      const next = !current
      return next
    })
  }

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isAvatarClicked, setIsAvatarClicked] = useState(false)

  const trainerName = getTrainerName(session)
  const trainerImage = getTrainerImage(session)
  const displayWorkoutName = getWorkoutName(session, workoutName)

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#fbf8ff] text-[#221447]">
      <DevDebugPanel
        show={SHOW_DEV_DEBUG && import.meta.env.DEV}
        debugEvents={debugEvents}
        getCurrentRms={getCurrentRms}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f5efff_0%,#fffaff_46%,#f1ebfb_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(232,224,249,0.74))]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col px-[var(--stage-inline-pad)] pt-[var(--stage-safe-top)] pb-[var(--stage-safe-bottom)]">
        <SessionHeader
          session={session}
          trainerName={trainerName}
          trainerImage={trainerImage}
          displayWorkoutName={displayWorkoutName}
          isLoading={isLoading}
          elapsedSeconds={elapsedSeconds}
          showInstructionsVideo={showInstructionsVideo}
          isAiSpeaking={isAiSpeaking}
          isEnding={isEnding}
          isSpeakerMuted={isSpeakerMuted}
          isAvatarClicked={isAvatarClicked}
          onAvatarClick={() => setIsAvatarClicked((prev) => !prev)}
          formatTime={formatTime}
        />

        <button
          type="button"
          onClick={handleToggleCaptions}
          aria-pressed={captionsEnabled}
          aria-label={captionsEnabled ? 'Hide captions' : 'Show captions'}
          className={`absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold tracking-[0.2em] uppercase shadow-sm backdrop-blur-md transition ${
            captionsEnabled
              ? 'border-[#5b3fd6] bg-[#5b3fd6] text-white'
              : 'border-white/60 bg-white/90 text-[#221447]'
          }`}
        >
          <Captions size={16} strokeWidth={2.5} />
          CC
        </button>

        {!isAvatarClicked ? (
          <ControlsGrid
            isMicrophoneMuted={isMicrophoneMuted}
            isSpeakerMuted={isSpeakerMuted}
            isEnding={isEnding}
            isUserTurn={isUserTurn}
            onToggleMicrophoneMuted={onToggleMicrophoneMuted}
            onToggleSpeakerMuted={onToggleSpeakerMuted}
            onSpeaker={onSpeaker}
            onTrainingSuite={onTrainingSuite}
            onInfo={onInfo}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        ) : null}

        <EndCallButton onEnd={onEnd} isEnding={isEnding} />

        {/* Transcript / Caption bar */}
        {captionsEnabled && captionsOverlayOpen ? (
          <div className="absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[720px] px-3 pb-3">
            <div className="rounded-3xl border border-white/40 bg-[#120f22]/95 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-extrabold tracking-wide">
                    Captions
                  </p>
                  <p className="text-xs text-white/70">
                    Live transcript for the trainer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionsOverlayOpen(false)
                    onToggleCaptions?.()
                  }}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90 transition hover:bg-white/15"
                >
                  Close
                </button>
              </div>

              <div
                ref={captionsScrollRef}
                className="max-h-[55vh] overflow-y-auto px-4 py-4 text-base leading-7"
              >
                {playbackSubtitle ? (
                  <div className="mb-4 rounded-3xl border border-white/15 bg-[#5b3fd6]/20 px-4 py-4 text-lg leading-8 font-semibold text-white">
                    {playbackSubtitle}
                  </div>
                ) : null}

                {transcriptBlocks.length === 0 &&
                !captionDraft &&
                !playbackSubtitle ? (
                  <div className="text-white/60">Waiting for captions...</div>
                ) : (
                  <div className="space-y-4 break-words whitespace-pre-wrap">
                    {transcriptBlocks.map((block, i) => (
                      <p
                        key={`${i}-${block}`}
                        className="rounded-2xl bg-white/5 px-4 py-3"
                      >
                        {block}
                      </p>
                    ))}
                    {captionDraft ? (
                      <p className="rounded-2xl bg-[#5b3fd6]/15 px-4 py-3 text-white/90">
                        {captionDraft}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="h-px w-px" aria-hidden="true" />
            </div>
          </div>
        ) : null}
      </div>

      {activePanel !== 'none' ? (
        <SessionInfoPanel
          session={session}
          panel={activePanel}
          onClose={onClosePanel}
        />
      ) : null}

      <SettingsModalSheet open={settingsOpen} setOpen={setSettingsOpen} />
    </main>
  )
}
