import type { ReactNode } from 'react'

export default function ControlButton({
  label,
  children,
  onClick,
  active = false,
  disabled = false,
  pulsing = false,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  pulsing?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="group flex min-w-0 flex-col items-center gap-[clamp(0.35rem,0.95cqh,0.65rem)] text-center disabled:opacity-60"
    >
      <div className="relative">
        {pulsing && <div className="call-pulse-ring" />}
        <div
          className={[
            'flex h-[clamp(56px,8.5cqh,80px)] w-[clamp(56px,8.5cqh,80px)] items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(91,63,214,0.06)] transition group-active:scale-95 [&>svg]:h-[clamp(24px,3.45cqh,32px)] [&>svg]:w-[clamp(24px,3.45cqh,32px)]',
            active
              ? 'bg-[#5b3fd6] text-white shadow-[0_10px_24px_rgba(91,63,214,0.22)]'
              : 'bg-[#ece7f8] text-[#5b3fd6]',
          ].join(' ')}
        >
          {children}
        </div>
      </div>

      <span
        className={[
          'max-w-[6.6rem] text-[clamp(11px,1.5cqh,15px)] leading-tight font-extrabold',
          active ? 'text-[#100b2f]' : 'text-[#221447]',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}
