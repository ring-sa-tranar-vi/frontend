import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createCompanyEvent,
  createCompanyOrganisation,
  deleteCompanyEvent,
  deleteCompanyOrganisation,
  fetchCompanyOrganisations,
  updateCompanyOrganisation,
  type CompanyEvent,
  type CompanyOrganisation,
} from '../../api/companyOrganisations'
import ConfirmModal from '../../components/ConfirmModal'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useToast } from '../../hooks/useToast'

type Mode = 'view' | 'create' | 'edit'
type OrgForm = { name: string; description: string; orgCity: string }
type EventForm = { name: string; description: string; time: string }

const emptyOrgForm: OrgForm = { name: '', description: '', orgCity: '' }
const emptyEventForm: EventForm = { name: '', description: '', time: '' }

type Props = { searchTerm?: string }

function fromInputDateTime(value: string) {
  return new Date(value).toISOString()
}

function toInputDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

export default function CompanyOrganisationAdminPage({
  searchTerm = '',
}: Props) {
  const { getToken } = useAuth()
  const { userId: currentUserId } = useCurrentUser()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { toast, showToast } = useToast()

  const [mode, setMode] = useState<Mode>('view')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [orgForm, setOrgForm] = useState<OrgForm>(emptyOrgForm)

  const [showAddEvent, setShowAddEvent] = useState(false)
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editingEventForm, setEditingEventForm] =
    useState<EventForm>(emptyEventForm)

  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false)
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<
    number | null
  >(null)

  // ── Query ────────────────────────────────────────────────────────────────
  const {
    data: organisations = [],
    isLoading,
    isError,
    error,
  } = useQuery<CompanyOrganisation[]>({
    queryKey: ['admin-company-organisations'],
    queryFn: async () => {
      const token = await getToken()
      return fetchCompanyOrganisations(token)
    },
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filtered = useMemo(() => {
    const sorted = [...organisations].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    if (!normalizedSearch) return sorted
    return sorted.filter(
      (o) =>
        o.name.toLowerCase().includes(normalizedSearch) ||
        (o.description ?? '').toLowerCase().includes(normalizedSearch),
    )
  }, [organisations, normalizedSearch])

  const selectedOrg = useMemo(
    () => filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  const selectedEvents = useMemo(() => {
    const evs = selectedOrg?.events ?? []
    return [...evs].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    )
  }, [selectedOrg])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function selectOrg(id: number) {
    setSelectedId(id)
    setMode('view')
    setShowAddEvent(false)
    setEditingEventId(null)
  }

  function openCreate() {
    setOrgForm(emptyOrgForm)
    setMode('create')
  }

  function openEdit(org: CompanyOrganisation) {
    setOrgForm({
      name: org.name,
      description: org.description ?? '',
      orgCity: org.orgCity ?? '',
    })
    setMode('edit')
  }

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: ['admin-company-organisations'],
    })
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const organizerId = Number(currentUserId)
      const resolvedOrganizerId =
        Number.isInteger(organizerId) && organizerId > 0 ? organizerId : 1

      return createCompanyOrganisation(token, {
        name: orgForm.name.trim(),
        description: orgForm.description.trim(),
        orgCity: orgForm.orgCity.trim(),
        organizerId: resolvedOrganizerId,
      })
    },
    onSuccess: async (org) => {
      setOrgForm(emptyOrgForm)
      setSelectedId(org.id)
      setMode('view')
      await invalidate()
      showToast(t('admin.companyOrg.toastOrganisationCreated'), {
        type: 'success',
      })
    },
    onError: (err) => showToast((err as Error).message, { type: 'error' }),
  })

  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error('No organisation selected')
      const token = await getToken()
      const organizerId = Number(currentUserId)
      const resolvedOrganizerId =
        Number.isInteger(organizerId) && organizerId > 0 ? organizerId : 1

      return updateCompanyOrganisation(token, selectedOrg.id, {
        name: orgForm.name.trim(),
        description: orgForm.description.trim(),
        orgCity: orgForm.orgCity.trim(),
        organizerId: resolvedOrganizerId,
      })
    },
    onSuccess: async () => {
      setMode('view')
      await invalidate()
      showToast(t('admin.companyOrg.toastOrganisationUpdated'), {
        type: 'success',
      })
    },
    onError: (err) => showToast((err as Error).message, { type: 'error' }),
  })

  const deleteOrgMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error('No organisation selected')
      const token = await getToken()
      await deleteCompanyOrganisation(token, selectedOrg.id)
    },
    onSuccess: async () => {
      setSelectedId(null)
      setMode('view')
      setConfirmDeleteOrg(false)
      await invalidate()
      showToast(t('admin.companyOrg.toastOrganisationDeleted'), {
        type: 'success',
      })
    },
    onError: (err) => {
      setConfirmDeleteOrg(false)
      showToast((err as Error).message, { type: 'error' })
    },
  })

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error('No organisation selected')
      const token = await getToken()
      return createCompanyEvent(token, {
        organisationId: selectedOrg.id,
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        time: fromInputDateTime(eventForm.time),
      })
    },
    onSuccess: async () => {
      setEventForm(emptyEventForm)
      setShowAddEvent(false)
      await invalidate()
      showToast(t('admin.companyOrg.toastEventCreated'), { type: 'success' })
    },
    onError: (err) => showToast((err as Error).message, { type: 'error' }),
  })

  // Event edit = delete old + create new
  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrg || editingEventId == null)
        throw new Error('No event selected')
      const token = await getToken()
      await deleteCompanyEvent(token, editingEventId)
      return createCompanyEvent(token, {
        organisationId: selectedOrg.id,
        name: editingEventForm.name.trim(),
        description: editingEventForm.description.trim(),
        time: fromInputDateTime(editingEventForm.time),
      })
    },
    onSuccess: async () => {
      setEditingEventId(null)
      setEditingEventForm(emptyEventForm)
      await invalidate()
      showToast(t('admin.companyOrg.toastEventUpdated'), { type: 'success' })
    },
    onError: (err) => showToast((err as Error).message, { type: 'error' }),
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const token = await getToken()
      await deleteCompanyEvent(token, eventId)
    },
    onSuccess: async () => {
      setConfirmDeleteEventId(null)
      await invalidate()
      showToast(t('admin.companyOrg.toastEventDeleted'), { type: 'success' })
    },
    onError: (err) => {
      setConfirmDeleteEventId(null)
      showToast((err as Error).message, { type: 'error' })
    },
  })

  const canSaveOrg =
    orgForm.name.trim().length > 1 && orgForm.orgCity.trim().length > 0
  const canSaveEvent =
    eventForm.name.trim().length > 1 && eventForm.time.length > 0
  const canSaveEditEvent =
    editingEventForm.name.trim().length > 1 && editingEventForm.time.length > 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-5">
      {/* ── Left: list ─────────────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col gap-2">
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#5836d6] px-4 py-2.5 text-sm font-bold text-white"
        >
          <span className="text-lg leading-none">+</span>
          {t('admin.companyOrg.createOrganisation')}
        </button>

        {isLoading && (
          <p className="px-1 text-sm text-[#6f6a93]">
            {t('admin.companyOrg.loading')}
          </p>
        )}
        {isError && (
          <p className="px-1 text-sm text-red-700">
            {(error as Error).message}
          </p>
        )}

        <div className="space-y-1 overflow-y-auto">
          {filtered.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => selectOrg(org.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selectedOrg?.id === org.id && mode !== 'create'
                  ? 'border-[#5836d6] bg-[#f3efff]'
                  : 'border-[#ece7ff] bg-white hover:bg-[#faf8ff]'
              }`}
            >
              <p className="truncate text-sm font-bold text-[#100b2f]">
                {org.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#6f6a93]">
                {org.events?.length ?? 0} {t('admin.companyOrg.eventCount')}
              </p>
            </button>
          ))}
          {!isLoading && !filtered.length && (
            <p className="px-1 text-sm text-[#6f6a93]">
              {t('admin.companyOrg.noOrganisation')}
            </p>
          )}
        </div>
      </aside>

      {/* ── Right: form or detail ──────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {toast?.message ? (
          <div
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-100 text-red-800'
                : toast.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        {/* Create / Edit org form */}
        {(mode === 'create' || mode === 'edit') && (
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wide text-[#100b2f] uppercase">
              {mode === 'create'
                ? t('admin.companyOrg.createOrganisation')
                : t('admin.companyOrg.editOrganisation')}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                  {t('admin.companyOrg.organisationName')}
                </label>
                <input
                  value={orgForm.name}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                  {t('admin.companyOrg.organisationDescription')}
                </label>
                <textarea
                  rows={4}
                  value={orgForm.description}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                  {t('admin.companyOrg.organisationCity')}
                </label>
                <input
                  value={orgForm.orgCity}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, orgCity: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'create') {
                    createOrgMutation.mutate()
                  } else {
                    updateOrgMutation.mutate()
                  }
                }}
                disabled={
                  !canSaveOrg ||
                  createOrgMutation.isPending ||
                  updateOrgMutation.isPending
                }
                className="rounded-full bg-[#5836d6] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('admin.companyOrg.saveOrganisation')}
              </button>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="rounded-full border border-[#d8ccff] px-4 py-2 text-sm font-semibold text-[#5836d6]"
              >
                {t('admin.companyOrg.cancel')}
              </button>
            </div>
          </article>
        )}

        {/* No selection prompt */}
        {mode === 'view' && !selectedOrg && !isLoading && (
          <div className="rounded-2xl bg-white p-6 text-sm text-[#6f6a93] shadow-sm">
            {t('admin.companyOrg.selectOrganisationFirst')}
          </div>
        )}

        {/* Org detail */}
        {mode === 'view' && selectedOrg && (
          <>
            <article className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#100b2f]">
                    {selectedOrg.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#6f6a93]">
                    {selectedOrg.description ||
                      t('admin.companyOrg.noDescription')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#6f6a93]">
                    {t('admin.companyOrg.organisationCity')}:{' '}
                    {selectedOrg.orgCity || '-'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selectedOrg)}
                    className="rounded-full border border-[#d8ccff] bg-white px-3 py-1.5 text-xs font-bold text-[#5836d6]"
                  >
                    {t('admin.companyOrg.editOrganisation')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOrg(true)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
                  >
                    {t('admin.companyOrg.deleteOrganisation')}
                  </button>
                </div>
              </div>
            </article>

            {/* Events */}
            <article className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide text-[#100b2f] uppercase">
                  {t('admin.companyOrg.events')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEvent((v) => !v)
                    setEventForm(emptyEventForm)
                  }}
                  className="rounded-full bg-[#5836d6] px-3 py-1.5 text-xs font-bold text-white"
                >
                  + {t('admin.companyOrg.addEvent')}
                </button>
              </div>

              {/* Add event form */}
              {showAddEvent && (
                <div className="mt-4 rounded-xl border border-[#ddd5ff] bg-[#faf8ff] p-4">
                  <p className="mb-3 text-xs font-bold tracking-wide text-[#5836d6] uppercase">
                    {t('admin.companyOrg.newEvent')}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                        {t('admin.companyOrg.eventName')}
                      </label>
                      <input
                        value={eventForm.name}
                        onChange={(e) =>
                          setEventForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                        {t('admin.companyOrg.eventTime')}
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.time}
                        onChange={(e) =>
                          setEventForm((f) => ({ ...f, time: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                        {t('admin.companyOrg.eventDescription')}
                      </label>
                      <textarea
                        rows={2}
                        value={eventForm.description}
                        onChange={(e) =>
                          setEventForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => createEventMutation.mutate()}
                      disabled={!canSaveEvent || createEventMutation.isPending}
                      className="rounded-full bg-[#5836d6] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {t('admin.companyOrg.saveEvent')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="rounded-full border border-[#d8ccff] px-4 py-2 text-sm font-semibold text-[#5836d6]"
                    >
                      {t('admin.companyOrg.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Event list */}
              <div className="mt-4 space-y-2">
                {!selectedEvents.length && (
                  <p className="text-sm text-[#6f6a93]">
                    {t('admin.companyOrg.noEvents')}
                  </p>
                )}
                {selectedEvents.map((ev: CompanyEvent) => (
                  <div key={ev.id}>
                    {editingEventId === ev.id ? (
                      /* Inline edit form */
                      <div className="rounded-xl border border-[#5836d6] bg-[#f3efff] p-4">
                        <p className="mb-3 text-xs font-bold tracking-wide text-[#5836d6] uppercase">
                          {t('admin.companyOrg.editEvent')}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                              {t('admin.companyOrg.eventName')}
                            </label>
                            <input
                              value={editingEventForm.name}
                              onChange={(e) =>
                                setEditingEventForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                              {t('admin.companyOrg.eventTime')}
                            </label>
                            <input
                              type="datetime-local"
                              value={editingEventForm.time}
                              onChange={(e) =>
                                setEditingEventForm((f) => ({
                                  ...f,
                                  time: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
                              {t('admin.companyOrg.eventDescription')}
                            </label>
                            <textarea
                              rows={2}
                              value={editingEventForm.description}
                              onChange={(e) =>
                                setEditingEventForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[#ddd5ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#5836d6]"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateEventMutation.mutate()}
                            disabled={
                              !canSaveEditEvent || updateEventMutation.isPending
                            }
                            className="rounded-full bg-[#5836d6] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {t('admin.companyOrg.saveEvent')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="rounded-full border border-[#d8ccff] px-4 py-2 text-sm font-semibold text-[#5836d6]"
                          >
                            {t('admin.companyOrg.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Event row */
                      <div className="flex items-center justify-between rounded-xl border border-[#ece7ff] bg-[#faf8ff] px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-[#100b2f]">
                            {ev.name}
                          </p>
                          <p className="text-xs text-[#6f6a93]">
                            {new Date(ev.time).toLocaleString()} ·{' '}
                            {ev.description ||
                              t('admin.companyOrg.noDescription')}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(ev.id)
                              setEditingEventForm({
                                name: ev.name,
                                description: ev.description ?? '',
                                time: toInputDateTime(ev.time),
                              })
                            }}
                            className="rounded-full border border-[#d8ccff] bg-white px-3 py-1.5 text-xs font-bold text-[#5836d6]"
                          >
                            {t('admin.companyOrg.editEvent')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEventId(ev.id)}
                            className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700"
                          >
                            {t('admin.companyOrg.deleteEvent')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </>
        )}
      </div>

      {/* Confirm delete org */}
      <ConfirmModal
        open={confirmDeleteOrg}
        title={t('admin.companyOrg.deleteOrganisation')}
        body={t('admin.companyOrg.deleteOrganisationConfirm')}
        confirmLabel={t('admin.companyOrg.deleteOrganisation')}
        cancelLabel={t('admin.companyOrg.cancel')}
        onConfirm={() => deleteOrgMutation.mutate()}
        onCancel={() => setConfirmDeleteOrg(false)}
      />

      {/* Confirm delete event */}
      <ConfirmModal
        open={confirmDeleteEventId != null}
        title={t('admin.companyOrg.deleteEvent')}
        body={t('admin.companyOrg.deleteEventConfirm')}
        confirmLabel={t('admin.companyOrg.deleteEvent')}
        cancelLabel={t('admin.companyOrg.cancel')}
        onConfirm={() => {
          if (confirmDeleteEventId != null) {
            deleteEventMutation.mutate(confirmDeleteEventId)
          }
        }}
        onCancel={() => setConfirmDeleteEventId(null)}
      />
    </div>
  )
}
