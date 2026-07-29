import { Camera, Users } from 'lucide-react'
import {
  appSheetCardClass,
  appSheetFieldClass,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'

type Props = {
  isWideLayout: boolean
  orgName: string
  setOrgName: (value: string) => void
  orgDescription: string
  setOrgDescription: (value: string) => void
  orgCity: string
  setOrgCity: (value: string) => void
  orgWords: number
  canSaveOrg: boolean
  saveOrganisation: () => void
  isSavingOrganisation: boolean
}

export default function OrganisationInfoCard({
  isWideLayout,
  orgName,
  setOrgName,
  orgDescription,
  setOrgDescription,
  orgCity,
  setOrgCity,
  orgWords,
  canSaveOrg,
  saveOrganisation,
  isSavingOrganisation,
}: Props) {
  return (
    <article
      className={`${appSheetCardClass} p-2.5 md:rounded-2xl md:border-[#ebe4ff] md:bg-[#fcfbff] md:p-5 ${isWideLayout ? 'col-span-5' : ''}`}
    >
      <h2 className="text-[1.28rem] leading-tight font-extrabold tracking-tight text-[#100b2f] md:text-3xl">
        Organisationsinformation
      </h2>

      <div className="mt-3 flex items-start gap-3">
        <div
          className={`relative shrink-0 rounded-2xl bg-gradient-to-br from-[#8f83ef] to-[#7a6ce8] ${isWideLayout ? 'h-36 w-28' : 'h-28 w-20'}`}
        >
          <div className="flex h-full items-center justify-center text-white/70">
            <Users size={24} />
          </div>
          <button
            type="button"
            aria-label="Byt bild"
            className="absolute right-1 bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#5836d6] text-white shadow"
          >
            <Camera size={13} />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
              Organisationsnamn
            </label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className={`${appSheetFieldClass} w-full px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
            />
            <p className="mt-1 text-xs text-[#7d77a4]">
              Detta namn visas för andra i appen.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
              Stad
            </label>
            <input
              value={orgCity}
              onChange={(e) => setOrgCity(e.target.value)}
              className={`${appSheetFieldClass} w-full px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-[#6f6a93]">
          Sammanfattning (max 100 ord)
        </label>
        <textarea
          rows={6}
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          className={`${appSheetFieldClass} w-full px-3 py-2 text-sm outline-none focus:border-[#5836d6] md:bg-white`}
        />
        <p
          className={`mt-1 text-right text-sm ${orgWords > 100 ? 'text-red-700' : 'text-[#6f6a93]'}`}
        >
          {orgWords}/100 ord
        </p>
        <button
          type="button"
          onClick={saveOrganisation}
          disabled={!canSaveOrg || isSavingOrganisation}
          className={`${appSheetPrimaryButtonClass} mt-2 min-h-10 px-5 py-2 text-sm disabled:opacity-45 md:w-auto`}
        >
          Spara organisation
        </button>
      </div>
    </article>
  )
}
