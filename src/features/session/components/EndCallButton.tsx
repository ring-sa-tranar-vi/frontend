import { PhoneOff } from 'lucide-react'

export default function EndCallButton({
  onEnd,
  isEnding,
}: {
  onEnd: () => void
  isEnding: boolean
}) {
  return (
    <button
      type="button"
      onClick={onEnd}
      disabled={isEnding}
      className="mx-auto mt-auto flex w-full max-w-[var(--stage-control-max-width)] flex-col items-center gap-[clamp(0.35rem,1cqh,0.6rem)] pb-[clamp(0rem,0.8cqh,0.25rem)] transition active:scale-95 disabled:cursor-not-allowed"
    >
      <div
        className={[
          'flex h-[clamp(58px,8.8cqh,84px)] w-[clamp(58px,8.8cqh,84px)] items-center justify-center rounded-full text-white transition-colors duration-300 [&>svg]:h-[clamp(28px,3.9cqh,38px)] [&>svg]:w-[clamp(28px,3.9cqh,38px)]',
          isEnding
            ? 'bg-[#c8c4d0]'
            : 'bg-[#ef4444] shadow-[0_12px_26px_rgba(239,68,68,0.22)]',
        ].join(' ')}
      >
        <PhoneOff strokeWidth={1.75} />
      </div>

      <span className="text-[clamp(13px,1.6cqh,16px)] font-extrabold text-[#221447]">
        End call
      </span>
    </button>
  )
}
