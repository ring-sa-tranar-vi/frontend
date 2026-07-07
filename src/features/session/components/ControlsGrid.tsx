import {
  CalendarDays,
  MessageSquareText,
  Mic,
  MicOff,
  Settings,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ControlButton from './ControlButton'

export default function ControlsGrid({
  isMicrophoneMuted,
  isSpeakerMuted,
  isEnding,
  isUserTurn,
  onToggleMicrophoneMuted,
  onToggleSpeakerMuted,
  onSpeaker,
  onTrainingSuite,
  onInfo,
  onSettingsOpen,
}: {
  isMicrophoneMuted: boolean
  isSpeakerMuted: boolean
  isEnding: boolean
  isUserTurn: boolean
  onToggleMicrophoneMuted: () => void
  onToggleSpeakerMuted: () => void
  onSpeaker: () => void
  onTrainingSuite: () => void
  onInfo: () => void
  onSettingsOpen: () => void
}) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto mt-[clamp(0.85rem,3.3cqh,2.6rem)] grid w-full max-w-[var(--stage-control-max-width)] shrink-0 grid-cols-3 justify-items-center gap-x-[clamp(0.75rem,3.5cqw,1.35rem)] gap-y-[clamp(0.7rem,2.7cqh,2.05rem)]">
      <ControlButton
        label={
          isMicrophoneMuted
            ? t('sessionCall.soundOff')
            : t('sessionCall.soundOn')
        }
        active={!isMicrophoneMuted}
        pulsing={isUserTurn && !isEnding}
        disabled={isEnding}
        onClick={onToggleMicrophoneMuted}
      >
        <span className="flex h-[36px] w-[36px] items-center justify-center">
          {isMicrophoneMuted ? (
            <MicOff size={36} strokeWidth={1.5} />
          ) : (
            <Mic size={36} strokeWidth={1.5} />
          )}
        </span>
      </ControlButton>

      <ControlButton
        label={t('sessionCall.controlbuttonLabelSettings')}
        disabled={isEnding}
        onClick={onSettingsOpen}
      >
        <Settings size={36} strokeWidth={1.5} />
      </ControlButton>

      <ControlButton
        label={
          isSpeakerMuted ? t('sessionCall.soundOff') : t('sessionCall.soundOn')
        }
        active={!isSpeakerMuted}
        disabled={isEnding}
        onClick={onToggleSpeakerMuted}
      >
        {isSpeakerMuted ? (
          <VolumeX size={36} strokeWidth={1.5} />
        ) : (
          <Volume2 size={36} strokeWidth={1.5} />
        )}
      </ControlButton>

      <ControlButton
        label={t('sessionCall.controlbuttonLabelStreak')}
        disabled={isEnding}
        onClick={onTrainingSuite}
      >
        <CalendarDays size={36} strokeWidth={1.5} />
      </ControlButton>

      <ControlButton
        label={t('sessionCall.controlbuttonLabelMyInfo')}
        disabled={isEnding}
        onClick={onInfo}
      >
        <UserRound size={36} strokeWidth={1.5} />
      </ControlButton>

      <ControlButton
        label={t('sessionCall.controlbuttonLabelInstructions')}
        disabled={isEnding}
        onClick={onSpeaker}
      >
        <MessageSquareText size={36} strokeWidth={1.5} />
      </ControlButton>
    </section>
  )
}
