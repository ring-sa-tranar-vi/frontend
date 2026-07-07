import { useTranslation } from 'react-i18next'
import SessionAvatar from './SessionAvatar'
import type { CoachCallSession } from '../types'

export default function SessionHeader({
  session,
  trainerName,
  trainerImage,
  displayWorkoutName,
  isLoading,
  elapsedSeconds,
  showInstructionsVideo,
  isAiSpeaking,
  isEnding,
  isSpeakerMuted,
  isAvatarClicked,
  onAvatarClick,
  formatTime,
}: {
  session: CoachCallSession
  trainerName: string
  trainerImage: string | null
  displayWorkoutName: string
  isLoading: boolean
  elapsedSeconds: number
  showInstructionsVideo?: boolean
  isAiSpeaking?: boolean
  isEnding?: boolean
  isSpeakerMuted?: boolean
  isAvatarClicked: boolean
  onAvatarClick: () => void
  formatTime: (s: number) => string
}) {
  const { t } = useTranslation()

  return (
    <section
      className={[
        'flex shrink-0 flex-col items-center text-center transition-all duration-300',
        isAvatarClicked ? 'flex-1 justify-center' : '',
      ].join(' ')}
    >
      <div
        className={[
          'relative',
          isAvatarClicked
            ? 'mb-6 h-[min(52vw,320px)] w-[min(52vw,320px)]'
            : 'mb-[clamp(0.45rem,1.8cqh,1.25rem)] h-[clamp(106px,19.5cqh,184px)] w-[clamp(106px,19.5cqh,184px)]',
        ].join(' ')}
      >
        <SessionAvatar
          session={session}
          trainerName={trainerName}
          trainerImage={trainerImage}
          showInstructionsVideo={showInstructionsVideo}
          isAiSpeaking={isAiSpeaking}
          isEnding={isEnding}
          isSpeakerMuted={isSpeakerMuted}
          isActive={isAvatarClicked}
          onClick={onAvatarClick}
          variant={isAvatarClicked ? 'expanded' : 'default'}
        />
      </div>

      {isAvatarClicked ? (
        <>
          <h1 className="text-[clamp(28px,4cqh,40px)] leading-none font-extrabold text-[#100b2f]">
            {isLoading ? ' ' : trainerName || t('sessionCall.trainerMissing')}
          </h1>

          <p className="mt-3 max-w-[360px] text-[clamp(13px,1.8cqh,16px)] leading-snug font-bold text-[#6f6a93]">
            {isLoading
              ? ''
              : displayWorkoutName || t('sessionCall.workoutMissing')}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[clamp(25px,3.45cqh,34px)] leading-none font-extrabold text-[#100b2f]">
            {isLoading ? ' ' : trainerName || t('sessionCall.trainerMissing')}
          </h1>
          {/*
          <p className="mt-[clamp(0.3rem,0.9cqh,0.7rem)] max-w-[320px] text-[clamp(11px,1.4cqh,14px)] font-bold leading-snug text-[#6f6a93]">
            {isLoading ? "" : displayWorkoutName || t("sessionCall.workoutMissing")}
          </p>
          */}
          <p className="mt-[clamp(0.55rem,1.4cqh,1rem)] text-[clamp(14px,1.8cqh,18px)] font-bold tracking-[0.22em] text-[#8a83aa] tabular-nums">
            {formatTime(elapsedSeconds)}
          </p>
        </>
      )}
    </section>
  )
}
