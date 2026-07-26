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
    <header className="mb-2 rounded-2xl border border-[#ebe4ff] bg-[#fcfbff] p-3 md:mb-4 md:p-5">
      <div className="relative flex min-h-[98px] items-start justify-center">
        <button
          type="button"
          aria-label="Tillbaka"
          onClick={onBack}
          className="absolute top-0 left-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2edff] text-[#5f49d6]"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="w-full max-w-[270px] px-9 text-center sm:max-w-[320px] sm:px-12">
          <h1 className="text-[1.85rem] leading-tight font-extrabold text-[#100b2f] md:text-4xl">
            Din organisation
          </h1>
          <p className="mt-1 text-sm leading-5 text-[#6f6a93] md:leading-6">
            Hantera din organisationsprofil och event
          </p>
        </div>

        <button
          type="button"
          aria-label="Stäng"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2edff] text-[#5f49d6]"
        >
          <X size={17} />
        </button>
      </div>

      {statusMessage ? (
        <div className="mt-3 rounded-xl bg-[#f3efff] px-3 py-2 text-center text-xs font-semibold text-[#3b2f7f] md:text-sm md:font-medium">
          {statusMessage}
        </div>
      ) : null}
    </header>
  )
}
