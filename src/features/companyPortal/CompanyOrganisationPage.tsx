import { useAuth } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Building2, ChevronLeft, RefreshCw, X } from 'lucide-react'
import { AppSheet, AppSheetNotice } from '../../components/AppSheet'
import CompanyOrganisationLayout from './components/CompanyOrganisationLayout'
import { useCompanyOrganisationPage } from '../../hooks/useCompanyOrganisationPage'

type Props = {
  open?: boolean
  onBack?: () => void
  onClose?: () => void
  asSheet?: boolean
}

export default function CompanyOrganisationPage({
  open = true,
  onBack,
  onClose,
  asSheet = false,
}: Props = {}) {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const vm = useCompanyOrganisationPage(!asSheet || open)

  const handleBack =
    onBack ??
    (() => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back()
        return
      }
      navigate({ to: '/' })
    })

  const handleClose =
    onClose ??
    (() => {
      navigate({ to: '/', replace: true })
    })

  if (asSheet) {
    let content

    if (!isLoaded) {
      content = <AppSheetNotice>Laddar organisationssidan…</AppSheetNotice>
    } else if (!isSignedIn) {
      content = (
        <AppSheetNotice>
          Du måste vara inloggad för att hantera en organisation.
        </AppSheetNotice>
      )
    } else if (vm.isLoadingCompany) {
      content = (
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-48 rounded-2xl bg-(--brand-surface-soft)" />
          <div className="h-36 rounded-2xl bg-(--brand-surface-soft)" />
        </div>
      )
    } else if (vm.isCompanyError) {
      content = (
        <div className="space-y-3">
          <AppSheetNotice tone="danger">
            Vi kunde inte kontrollera din organisationsåtkomst just nu.
          </AppSheetNotice>
          <button
            type="button"
            onClick={() => void vm.refetchCompany()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--brand-primary) px-4 py-3 text-[length:var(--text-sm)] font-extrabold text-(--brand-on-primary)"
          >
            <RefreshCw size={16} /> Försök igen
          </button>
        </div>
      )
    } else if (
      vm.company?.canManageOrganisation &&
      vm.company.organisationId != null
    ) {
      content = (
        <CompanyOrganisationLayout
          vm={vm}
          onBack={handleBack}
          onClose={handleClose}
          embedded
        />
      )
    } else {
      content = (
        <div className="rounded-2xl border border-(--menu-category-border) bg-(--menu-category-bg) px-5 py-10 text-center">
          <Building2 className="mx-auto text-(--brand-primary)" size={30} />
          <h3 className="mt-4 text-[length:var(--text-xl)] font-extrabold text-(--brand-title-ink)">
            Ingen organisation att hantera
          </h3>
          <p className="mt-2 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
            Organisationssidan visas för personer som ansvarar för en
            organisation.
          </p>
        </div>
      )
    }

    return (
      <AppSheet
        open={open}
        title="Din organisation"
        subtitle="Hantera organisationsprofil och event"
        icon={<ArrowLeft size={20} strokeWidth={2.4} />}
        onBack={handleBack}
        backLabel="Tillbaka till menyn"
        onClose={handleClose}
        height="large"
        fillHeight
        motion="instant"
      >
        {content}
      </AppSheet>
    )
  }

  if (!isLoaded) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-[#6f6a93]">Laddar företagssidan...</p>
      </section>
    )
  }

  if (!isSignedIn) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-[#6f6a93]">
          Du måste vara inloggad för att hantera en organisation.
        </p>
      </section>
    )
  }

  if (vm.isLoadingCompany) {
    return (
      <section className="h-full min-h-0 overflow-y-auto bg-(--brand-page) px-5 py-6 text-(--brand-ink)">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-4 w-12 rounded-full bg-(--brand-border)" />
          <div className="h-9 w-56 rounded-xl bg-(--brand-border)" />
          <div className="h-48 rounded-2xl bg-(--brand-surface-soft)" />
        </div>
      </section>
    )
  }

  if (vm.isCompanyError) {
    return (
      <section className="h-full min-h-0 overflow-y-auto bg-(--brand-page) px-5 py-6 text-(--brand-ink)">
        <div className="mx-auto max-w-xl pt-16 text-center">
          <Building2 className="mx-auto text-(--brand-primary)" size={34} />
          <h1 className="mt-4 text-2xl font-extrabold">Din organisation</h1>
          <p className="mt-2 text-sm leading-6 text-(--brand-muted)">
            Vi kunde inte kontrollera din organisationsåtkomst just nu.
          </p>
          <button
            type="button"
            onClick={() => void vm.refetchCompany()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-(--brand-primary) px-5 py-3 text-sm font-extrabold text-(--brand-on-primary)"
          >
            <RefreshCw size={16} /> Försök igen
          </button>
        </div>
      </section>
    )
  }

  if (vm.company?.canManageOrganisation && vm.company.organisationId != null) {
    return (
      <CompanyOrganisationLayout
        vm={vm}
        onBack={handleBack}
        onClose={handleClose}
      />
    )
  }

  return (
    <section className="app-sheet-scroll h-full min-h-0 overflow-y-auto bg-(--brand-page) px-5 pt-3 pb-[max(1.25rem,var(--stage-safe-bottom))] text-(--brand-ink)">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-(--brand-handle)" />
        <header className="relative border-b border-(--brand-border)/60 pb-5">
          <button
            type="button"
            aria-label="Tillbaka"
            onClick={handleBack}
            className="absolute start-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="mx-auto max-w-sm px-12 text-center">
            <h1 className="text-[1.85rem] leading-tight font-extrabold tracking-tight text-(--brand-ink)">
              Din organisation
            </h1>
            <p className="mt-1 text-sm leading-6 text-(--brand-muted)">
              Hantera din organisationsprofil och event
            </p>
          </div>
          <button
            type="button"
            aria-label="Stäng"
            onClick={handleClose}
            className="absolute end-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
          >
            <X size={19} />
          </button>
        </header>

        <div className="mx-auto max-w-xl py-16 text-center">
          <Building2 className="mx-auto text-(--brand-primary)" size={34} />
          <h2 className="mt-4 text-xl font-extrabold">
            Ingen organisation att hantera
          </h2>
          <p className="mt-2 text-sm leading-6 text-(--brand-muted)">
            Den här sidan öppnas för personer som är ansvariga för en
            organisation.
          </p>
        </div>
      </div>
    </section>
  )
}
