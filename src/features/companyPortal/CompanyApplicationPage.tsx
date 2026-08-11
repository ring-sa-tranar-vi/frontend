import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  MapPin,
  Send,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  createOrganizationApplication,
  fetchMyOrganizationApplication,
  OrganizationApplicationError,
} from '../../api/organizationApplications'

type Props = {
  onBack: () => void
  onClose: () => void
}

const emptyForm = {
  organizationName: '',
  city: '',
  description: '',
  motivation: '',
}

export default function CompanyApplicationPage({ onBack, onClose }: Props) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)

  async function requireToken() {
    const token = await getToken()
    if (!token) throw new Error('Du måste vara inloggad för att ansöka.')
    return token
  }

  const applicationQuery = useQuery({
    queryKey: ['my-organization-application'],
    queryFn: async () => fetchMyOrganizationApplication(await requireToken()),
    retry: (count, error) =>
      !(
        error instanceof OrganizationApplicationError && error.status === 404
      ) && count < 1,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      return createOrganizationApplication(
        {
          organizationName: form.organizationName.trim(),
          city: form.city.trim(),
          description: form.description.trim(),
          motivation: form.motivation.trim(),
        },
        await requireToken(),
      )
    },
    onSuccess: async () => {
      setSubmitted(true)
      await queryClient.invalidateQueries({
        queryKey: ['my-organization-application'],
      })
    },
  })

  const canSubmit =
    form.organizationName.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.motivation.trim().length > 0

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const existingApplication = applicationQuery.data
  const applicationNotFound =
    applicationQuery.error instanceof OrganizationApplicationError &&
    applicationQuery.error.status === 404
  const showStatus =
    submitted ||
    existingApplication?.status === 'PENDING' ||
    existingApplication?.status === 'APPROVED'
  const isApproved = existingApplication?.status === 'APPROVED'

  return (
    <section className="h-full w-full overflow-y-auto bg-[#f5f0ff] px-3 py-4 md:px-5 md:py-6">
      <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-[#e4dcff] bg-white p-4 shadow-[0_18px_55px_rgba(62,39,145,0.12)] md:p-7">
        <header className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Tillbaka"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1edff] text-[#5836d6]"
          >
            <ChevronLeft size={19} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs font-extrabold tracking-widest text-[#7258df] uppercase">
              Organisationspartner
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#100b2f] md:text-3xl">
              Ansök om att bli organisation
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1edff] text-[#5836d6]"
          >
            <X size={18} />
          </button>
        </header>

        {applicationQuery.isLoading ? (
          <div className="py-16 text-center text-sm text-[#6f6a93]">
            Kontrollerar ansökningsstatus...
          </div>
        ) : applicationQuery.isError && !applicationNotFound ? (
          <div className="py-12 text-center">
            <p className="font-bold text-red-700">
              Kunde inte hämta ansökningsstatus.
            </p>
            <p className="mt-2 text-sm text-[#6f6a93]">
              {(applicationQuery.error as Error).message}
            </p>
          </div>
        ) : showStatus ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-[#100b2f]">
              {isApproved ? 'Ansökan är godkänd' : 'Ansökan är skickad'}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6a93]">
              {isApproved
                ? 'Organisationen är skapad och kan nu hanteras av administratörer.'
                : 'En administratör granskar nu er ansökan. Organisationen skapas först när ansökan har godkänts.'}
            </p>
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-800">
              <p className="font-bold">Vad händer nu?</p>
              <p className="mt-1 leading-6">
                {isApproved
                  ? 'Admin kan nu hantera organisationen och skapa event under den.'
                  : 'Efter godkännande får ni tillgång till organisationsprofilen och kan skapa event som visas i appen.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 rounded-xl bg-[#5836d6] px-6 py-3 text-sm font-extrabold text-white"
            >
              Tillbaka till startsidan
            </button>
          </div>
        ) : (
          <>
            {existingApplication?.status === 'REJECTED' ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-bold">Den tidigare ansökan avslogs</p>
                <p className="mt-1 leading-6">
                  Uppdatera uppgifterna och skicka en ny ansökan om ni vill
                  ansöka igen.
                </p>
              </div>
            ) : null}
            <div className="mt-6 rounded-2xl border border-[#ddd3ff] bg-[#f7f4ff] p-4">
              <div className="flex gap-3">
                <ClipboardCheck
                  className="mt-0.5 shrink-0 text-[#5836d6]"
                  size={21}
                />
                <div>
                  <p className="font-bold text-[#2f2769]">
                    Det här är en ansökan
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#6f6696]">
                    Inget publiceras direkt. Admin granskar uppgifterna innan
                    organisationen skapas och ni får tillgång till
                    eventverktygen.
                  </p>
                </div>
              </div>
            </div>

            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                if (canSubmit) mutation.mutate()
              }}
            >
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-[#3d3860]">
                  <Building2 size={16} /> Organisationsnamn
                </span>
                <input
                  required
                  value={form.organizationName}
                  onChange={(event) =>
                    update('organizationName', event.target.value)
                  }
                  placeholder="Exempel: Hälsoklubben"
                  className="w-full rounded-xl border border-[#dcd2ff] px-4 py-3 text-[#100b2f] outline-none focus:border-[#7258df] focus:ring-2 focus:ring-[#7258df]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-[#3d3860]">
                  <MapPin size={16} /> Stad
                </span>
                <input
                  required
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  placeholder="Exempel: Stockholm"
                  className="w-full rounded-xl border border-[#dcd2ff] px-4 py-3 text-[#100b2f] outline-none focus:border-[#7258df] focus:ring-2 focus:ring-[#7258df]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#3d3860]">
                  Beskriv organisationen
                </span>
                <textarea
                  required
                  value={form.description}
                  onChange={(event) =>
                    update('description', event.target.value)
                  }
                  rows={4}
                  placeholder="Vad gör organisationen och vilka riktar ni er till?"
                  className="w-full resize-y rounded-xl border border-[#dcd2ff] px-4 py-3 text-[#100b2f] outline-none focus:border-[#7258df] focus:ring-2 focus:ring-[#7258df]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#3d3860]">
                  Varför vill ni bli partner?
                </span>
                <textarea
                  required
                  value={form.motivation}
                  onChange={(event) => update('motivation', event.target.value)}
                  rows={4}
                  placeholder="Berätta hur ni vill bidra och vilka event ni vill skapa."
                  className="w-full resize-y rounded-xl border border-[#dcd2ff] px-4 py-3 text-[#100b2f] outline-none focus:border-[#7258df] focus:ring-2 focus:ring-[#7258df]/15"
                />
              </label>

              {mutation.isError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {(mutation.error as Error).message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || mutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5836d6] px-5 py-3.5 text-base font-extrabold text-white shadow-lg shadow-[#5836d6]/20 hover:bg-[#4527b8] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send size={18} />
                {mutation.isPending
                  ? 'Skickar ansökan...'
                  : 'Skicka ansökan för granskning'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
