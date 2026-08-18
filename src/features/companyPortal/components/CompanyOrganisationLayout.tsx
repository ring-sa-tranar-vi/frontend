import type { CompanyOrganisationViewModel } from '../../../hooks/useCompanyOrganisationPage.ts'
import { AppSheetNotice } from '../../../components/AppSheet'
import CompanyOrganisationHeader from './CompanyOrganisationHeader'
import EventListCard from './EventListCard'
import OrganisationInfoCard from './OrganisationInfoCard'

type Props = {
  vm: CompanyOrganisationViewModel
  onBack: () => void
  onClose: () => void
  embedded?: boolean
}

export default function CompanyOrganisationLayout({
  vm,
  onBack,
  onClose,
  embedded = false,
}: Props) {
  return (
    <section
      className={
        embedded
          ? 'menu-type-scale w-full text-(--brand-ink)'
          : 'menu-type-scale app-sheet-scroll h-full min-h-0 w-full touch-pan-y overflow-y-auto overscroll-contain bg-(--brand-page) px-5 pt-3 pb-[max(1.25rem,var(--stage-safe-bottom))] text-(--brand-ink)'
      }
    >
      <div className="mx-auto w-full max-w-5xl">
        {!embedded ? (
          <>
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-(--brand-handle)" />
            <CompanyOrganisationHeader
              statusMessage={vm.statusMessage}
              onBack={onBack}
              onClose={onClose}
            />
          </>
        ) : vm.statusMessage ? (
          <div className="mb-3">
            <AppSheetNotice tone={vm.statusTone}>
              {vm.statusMessage}
            </AppSheetNotice>
          </div>
        ) : null}

        {vm.isError ? (
          <div className="rounded-2xl border border-(--brand-danger-border) bg-(--brand-danger-surface) p-5 text-center">
            <p className="font-extrabold text-(--brand-danger-ink)">
              Organisationen kunde inte laddas.
            </p>
            <p className="mt-1 text-sm text-(--brand-danger-ink-muted)">
              {vm.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void vm.refetchOrganisation()}
              className="mt-4 rounded-full bg-(--brand-primary) px-5 py-2.5 text-sm font-extrabold text-(--brand-on-primary)"
            >
              Försök igen
            </button>
          </div>
        ) : vm.isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 rounded-2xl bg-(--brand-surface-soft)" />
            <div className="h-40 rounded-2xl bg-(--brand-surface-soft)" />
          </div>
        ) : (
          <div className="space-y-4">
            <OrganisationInfoCard
              orgName={vm.orgName}
              setOrgName={vm.setOrgName}
              orgDescription={vm.orgDescription}
              setOrgDescription={vm.setOrgDescription}
              orgCity={vm.orgCity}
              setOrgCity={vm.setOrgCity}
              orgCharacterCount={vm.orgCharacterCount}
              followersCount={vm.followersCount}
              canSaveOrg={vm.canSaveOrg}
              saveOrganisation={vm.saveOrganisation}
              isSavingOrganisation={vm.isSavingOrganisation}
            />

            <EventListCard
              showCreateEvent={vm.showCreateEvent}
              setShowCreateEvent={vm.setShowCreateEvent}
              eventForm={vm.eventForm}
              setEventForm={vm.setEventForm}
              canCreateEvent={vm.canCreateEvent}
              createEvent={vm.createEvent}
              isSavingEvent={vm.isSavingEvent}
              events={vm.events}
              editingEventId={vm.editingEventId}
              editingEventForm={vm.editingEventForm}
              setEditingEventForm={vm.setEditingEventForm}
              canSaveEditedEvent={vm.canSaveEditedEvent}
              updateEvent={vm.updateEvent}
              isUpdatingEvent={vm.isUpdatingEvent}
              deletingEventId={vm.deletingEventId}
              deleteEventError={vm.deleteEventError}
              resetDeleteEvent={vm.resetDeleteEvent}
              stopEditingEvent={vm.stopEditingEvent}
              startEditingEvent={vm.startEditingEvent}
              deleteEvent={vm.deleteEvent}
            />
          </div>
        )}

        <footer className="mt-4 border-t border-(--brand-border)/60 pt-3">
          <p className="text-center text-[length:var(--text-sm)] leading-5 text-(--brand-muted)">
            Event som du skapar syns i appen under din organisation.
          </p>
        </footer>
      </div>
    </section>
  )
}
