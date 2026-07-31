import type { CompanyOrganisationViewModel } from '../../../hooks/useCompanyOrganisationPage.ts'
import CompanyOrganisationHeader from './CompanyOrganisationHeader'
import EventListCard from './EventListCard'
import OrganisationInfoCard from './OrganisationInfoCard'

type Props = {
  vm: CompanyOrganisationViewModel
  onBack: () => void
  onClose: () => void
}

export default function CompanyOrganisationLayout({
  vm,
  onBack,
  onClose,
}: Props) {
  const shellClass = vm.isWideLayout
    ? 'mx-auto w-full max-w-6xl rounded-[2rem] border border-[#e8e0ff] bg-(--brand-surface-raised) p-6 shadow-[0_10px_40px_rgba(80,57,180,0.08)] backdrop-blur-sm'
    : 'mx-auto w-full'

  return (
    <section className="h-full w-full overflow-x-hidden overflow-y-auto px-0 pt-1 pb-[max(0.75rem,var(--stage-safe-bottom))] md:px-5 md:py-5">
      <div ref={vm.layoutRef} className={shellClass}>
        <div className="mx-auto mb-1.5 h-1.5 w-14 rounded-full bg-[#d7d0ea]" />

        <CompanyOrganisationHeader
          statusMessage={vm.statusMessage}
          onBack={onBack}
          onClose={onClose}
        />

        <div
          className={`grid gap-2.5 ${vm.isWideLayout ? 'grid-cols-12 items-start' : ''}`}
        >
          <OrganisationInfoCard
            isWideLayout={vm.isWideLayout}
            orgName={vm.orgName}
            setOrgName={vm.setOrgName}
            orgDescription={vm.orgDescription}
            setOrgDescription={vm.setOrgDescription}
            orgCity={vm.orgCity}
            setOrgCity={vm.setOrgCity}
            orgWords={vm.orgWords}
            canSaveOrg={vm.canSaveOrg}
            saveOrganisation={vm.saveOrganisation}
            isSavingOrganisation={vm.isSavingOrganisation}
          />

          <EventListCard
            isWideLayout={vm.isWideLayout}
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
            stopEditingEvent={vm.stopEditingEvent}
            startEditingEvent={vm.startEditingEvent}
            deleteEvent={vm.deleteEvent}
          />
        </div>

        <footer className="mt-2 rounded-2xl border border-[#ebe4ff] bg-[#fcfbff] px-3 py-2">
          <p className="text-center text-xs font-medium text-[#7f78a4]">
            Event som du skapar syns i appen under din organisation.
          </p>
        </footer>
      </div>
    </section>
  )
}
