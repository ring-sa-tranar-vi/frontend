import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CalendarPlus,
  Check,
  Clock3,
  MapPin,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  approveOrganizationApplication,
  fetchOrganizationApplications,
  rejectOrganizationApplication,
  updateApplicationPaymentStatus,
  type ApplicationStatus,
  type OrganizationApplication,
  type PaymentStatus,
} from '../../api/organizationApplications'
import { useToast } from '../../hooks/useToast'

type Props = {
  searchTerm?: string
  onOpenOrganisations: () => void
}

type Filter = 'ALL' | ApplicationStatus

const statusStyle: Record<ApplicationStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
}

function formatDate(value: string | null) {
  if (!value) return '–'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function OrganizationApplicationsAdminPage({
  searchTerm = '',
  onOpenOrganisations,
}: Props) {
  const { getToken } = useAuth()
  const { t } = useTranslation()
  const { toast, showToast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [localSearch, setLocalSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const query = useQuery<OrganizationApplication[]>({
    queryKey: ['admin-organization-applications'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error(t('admin.orgApplications.missingToken'))
      return fetchOrganizationApplications(token)
    },
  })

  const applications = useMemo(() => query.data ?? [], [query.data])
  const search = `${searchTerm} ${localSearch}`.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      applications
        .filter(
          (application) => filter === 'ALL' || application.status === filter,
        )
        .filter(
          (application) =>
            !search ||
            application.orgName.toLowerCase().includes(search) ||
            application.city.toLowerCase().includes(search) ||
            application.description.toLowerCase().includes(search),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [applications, filter, search],
  )

  const selected =
    filtered.find((application) => application.id === selectedId) ??
    filtered[0] ??
    null

  async function token() {
    const value = await getToken()
    if (!value) throw new Error(t('admin.orgApplications.missingToken'))
    return value
  }

  const approveMutation = useMutation({
    mutationFn: async (id: number) =>
      approveOrganizationApplication(id, await token()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin-organization-applications'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin-company-organisations'],
      })
      showToast(t('admin.orgApplications.approvedToast'), { type: 'success' })
    },
    onError: (error) => showToast((error as Error).message, { type: 'error' }),
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: number) =>
      rejectOrganizationApplication(id, await token()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin-organization-applications'],
      })
      showToast(t('admin.orgApplications.rejectedToast'), { type: 'success' })
    },
    onError: (error) => showToast((error as Error).message, { type: 'error' }),
  })

  const paymentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: PaymentStatus }) =>
      updateApplicationPaymentStatus(id, status, await token()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin-organization-applications'],
      })
      showToast(t('admin.orgApplications.paymentToast'), { type: 'success' })
    },
    onError: (error) => showToast((error as Error).message, { type: 'error' }),
  })

  const counts = {
    PENDING: applications.filter((item) => item.status === 'PENDING').length,
    APPROVED: applications.filter((item) => item.status === 'APPROVED').length,
    REJECTED: applications.filter((item) => item.status === 'REJECTED').length,
  }

  const statusLabel = (status: ApplicationStatus) =>
    t(`admin.orgApplications.status.${status.toLowerCase()}`)

  return (
    <section className="space-y-5">
      {toast ? (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-[#100b2f] px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {toast.message}
        </div>
      ) : null}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#7258df] uppercase">
            {t('admin.orgApplications.eyebrow')}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-[#100b2f]">
            {t('admin.orgApplications.title')}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#6f6a93]">
            {t('admin.orgApplications.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOrganisations}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dcd2ff] bg-white px-4 py-2.5 text-sm font-bold text-[#5836d6] hover:bg-[#f7f4ff]"
        >
          <CalendarPlus size={16} />
          {t('admin.orgApplications.manageOrganisations')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === status
                ? statusStyle[status]
                : 'border-[#ece5ff] bg-white text-[#6f6a93] hover:border-[#cfc2ff]'
            }`}
          >
            <span className="text-xs font-bold uppercase">
              {statusLabel(status)}
            </span>
            <span className="mt-1 block text-3xl font-extrabold">
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-[#ece5ff] bg-white p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9b96b8]"
            size={16}
          />
          <input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder={t('admin.orgApplications.search')}
            className="w-full rounded-xl border border-[#ece5ff] bg-[#faf8ff] py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#7258df]"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
            filter === 'ALL'
              ? 'bg-[#5836d6] text-white'
              : 'bg-[#f3efff] text-[#5836d6]'
          }`}
        >
          {t('admin.orgApplications.showAll')}
        </button>
      </div>

      {query.isLoading ? (
        <div className="rounded-2xl border border-[#ece5ff] bg-white p-10 text-center text-sm text-[#6f6a93]">
          {t('admin.orgApplications.loading')}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {(query.error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dcd2ff] bg-white p-10 text-center">
          <Building2 className="mx-auto text-[#8f7bea]" size={30} />
          <p className="mt-3 font-bold text-[#100b2f]">
            {t('admin.orgApplications.empty')}
          </p>
        </div>
      ) : (
        <div className="grid min-h-[470px] gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(420px,1.4fr)]">
          <div className="space-y-2">
            {filtered.map((application) => (
              <button
                key={application.id}
                type="button"
                onClick={() => setSelectedId(application.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected?.id === application.id
                    ? 'border-[#8068e8] bg-[#f6f2ff] shadow-sm'
                    : 'border-[#ece5ff] bg-white hover:border-[#d5caff]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-[#100b2f]">
                      {application.orgName}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#6f6a93]">
                      <MapPin size={12} /> {application.city}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[application.status]}`}
                  >
                    {statusLabel(application.status)}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[11px] text-[#9b96b8]">
                  <Clock3 size={12} /> {formatDate(application.createdAt)}
                </p>
              </button>
            ))}
          </div>

          {selected ? (
            <article className="h-fit rounded-2xl border border-[#e4dcff] bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#8b80b3] uppercase">
                    {t('admin.orgApplications.applicationNumber', {
                      id: selected.id,
                    })}
                  </p>
                  <h3 className="mt-1 text-2xl font-extrabold text-[#100b2f]">
                    {selected.orgName}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#6f6a93]">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {selected.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserRound size={14} />{' '}
                      {t('admin.orgApplications.userId', {
                        id: selected.userId,
                      })}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyle[selected.status]}`}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#faf8ff] p-4">
                  <p className="text-xs font-bold text-[#8b80b3] uppercase">
                    {t('admin.orgApplications.about')}
                  </p>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#3d3860]">
                    {selected.description}
                  </p>
                </div>
                <div className="rounded-xl bg-[#faf8ff] p-4">
                  <p className="text-xs font-bold text-[#8b80b3] uppercase">
                    {t('admin.orgApplications.motivation')}
                  </p>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#3d3860]">
                    {selected.motivation}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 rounded-xl border border-[#ece5ff] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-[#8b80b3] uppercase">
                    {t('admin.orgApplications.payment')}
                  </p>
                  <p className="mt-1 text-sm text-[#6f6a93]">
                    {t('admin.orgApplications.reviewed', {
                      date: formatDate(selected.reviewedAt),
                    })}
                  </p>
                </div>
                <select
                  value={selected.paymentStatus}
                  disabled={paymentMutation.isPending}
                  onChange={(event) =>
                    paymentMutation.mutate({
                      id: selected.id,
                      status: event.target.value as PaymentStatus,
                    })
                  }
                  className="rounded-xl border border-[#dcd2ff] bg-white px-3 py-2 text-sm font-semibold text-[#3d3860]"
                >
                  {(['PENDING', 'PAID', 'NOT_REQUIRED', 'FAILED'] as const).map(
                    (status) => (
                      <option key={status} value={status}>
                        {t(
                          `admin.orgApplications.paymentStatus.${status.toLowerCase()}`,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selected.status === 'PENDING' ? (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => approveMutation.mutate(selected.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={17} /> {t('admin.orgApplications.approve')}
                  </button>
                  <button
                    type="button"
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => rejectMutation.mutate(selected.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <X size={17} /> {t('admin.orgApplications.reject')}
                  </button>
                </div>
              ) : selected.status === 'APPROVED' ? (
                <button
                  type="button"
                  onClick={onOpenOrganisations}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5836d6] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#4527b8]"
                >
                  <CalendarPlus size={17} />{' '}
                  {t('admin.orgApplications.createEvents')}
                </button>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </section>
  )
}
