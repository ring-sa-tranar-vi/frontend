import { ChevronLeft, X } from 'lucide-react'

type Props = {
  statusMessage: string | null
  onBack: () => void
  onClose: () => void
}

export default function CompanyOrganisationHeader({
  statusMessage,
  onBack,
  onClose,
}: Props) {
  return (
    <header className="mb-5 border-b border-(--brand-border)/60 pb-4">
      <div className="relative flex min-h-10 items-start justify-center">
        <button
          type="button"
          aria-label="Tillbaka"
          onClick={onBack}
          className="absolute top-0 left-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="w-full max-w-[270px] px-10 text-center">
          <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-(--brand-title-ink)">
            Din organisation
          </h1>
          <p className="mt-1 text-[length:var(--text-sm)] leading-5 text-(--brand-muted)">
            Hantera din organisationsprofil och event
          </p>
        </div>

        <button
          type="button"
          aria-label="Stäng"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none active:scale-95"
        >
          <X size={17} />
        </button>
      </div>

      {statusMessage ? (
        <div className="mt-3 rounded-xl bg-(--brand-soft) px-3 py-2 text-center text-[length:var(--text-sm)] font-bold text-(--brand-primary)">
          {statusMessage}
        </div>
      ) : null}
    </header>
  )
}
