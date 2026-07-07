import { useEffect, useRef } from 'react'
import { UserRound } from 'lucide-react'
import type { CoachCallSession } from '../types'
import { useTranslation } from 'react-i18next'

type Props = {
  session: CoachCallSession
  trainerName?: string
  trainerImage?: string | null
  showInstructionsVideo?: boolean
  isAiSpeaking?: boolean
  isEnding?: boolean
  isSpeakerMuted?: boolean
  isActive?: boolean
  onClick?: () => void
  variant?: 'default' | 'expanded'
}

export default function SessionAvatar({
  session,
  trainerName,
  trainerImage,
  showInstructionsVideo = false,
  isAiSpeaking = false,
  isEnding = false,
  isSpeakerMuted = false,
  isActive = false,
  onClick,
  variant = 'default',
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = isSpeakerMuted
    if (showInstructionsVideo) {
      video.currentTime = 0
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isSpeakerMuted, showInstructionsVideo])

  const name = trainerName ?? session.trainer?.name ?? ''
  const image =
    trainerImage ??
    session.trainer?.imageCall ??
    session.trainer?.imageStart ??
    session.trainer?.imageSelect ??
    null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="relative h-full w-full rounded-full"
    >
      <div
        className={[
          'relative overflow-hidden rounded-full bg-[#eee8fb] shadow-[inset_0_0_0_1px_rgba(91,63,214,0.04)]',
          variant === 'expanded'
            ? 'h-full w-full'
            : 'h-[clamp(106px,19.5cqh,184px)] w-[clamp(106px,19.5cqh,184px)]',
          isActive ? 'ring-4 ring-[#5b3fd6]' : '',
        ].join(' ')}
      >
        {isAiSpeaking && !isEnding && <div className="call-pulse-ring" />}
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#eee8fb] shadow-[inset_0_0_0_1px_rgba(91,63,214,0.04)]">
          {image ? (
            <img
              src={image}
              alt={name}
              className="absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-1000"
              style={{
                opacity:
                  showInstructionsVideo && session.instructionsVideo ? 0 : 1,
              }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full bg-[#e8e1f8] text-[#5b3fd6] transition-opacity duration-1000"
              style={{
                opacity:
                  showInstructionsVideo && session.instructionsVideo ? 0 : 1,
              }}
            >
              <UserRound size={56} strokeWidth={1.8} />
            </div>
          )}

          {session.instructionsVideo && (
            <video
              ref={videoRef}
              src={session.instructionsVideo}
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-1000"
              style={{ opacity: showInstructionsVideo ? 1 : 0 }}
            />
          )}

          {isEnding && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#100b2f]/50">
              <span className="text-[clamp(11px,1.5cqh,14px)] font-bold text-white">
                {t('sessionCall.disconnecting')}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
