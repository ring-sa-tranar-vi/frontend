import { Building2, UsersRound } from 'lucide-react'
import {
  appSheetCategoryClass,
  appSheetContentClass,
  appSheetFormFieldClass,
  appSheetFormLabelClass,
  appSheetFormTextareaClass,
  appSheetPrimaryButtonClass,
} from '../../../components/AppSheet'

type Props = {
  orgName: string
  setOrgName: (value: string) => void
  orgDescription: string
  setOrgDescription: (value: string) => void
  orgCity: string
  setOrgCity: (value: string) => void
  orgCharacterCount: number
  followersCount?: number
  canSaveOrg: boolean
  saveOrganisation: () => void
  isSavingOrganisation: boolean
}

export default function OrganisationInfoCard({
  orgName,
  setOrgName,
  orgDescription,
  setOrgDescription,
  orgCity,
  setOrgCity,
  orgCharacterCount,
  followersCount,
  canSaveOrg,
  saveOrganisation,
  isSavingOrganisation,
}: Props) {
  return (
    <section className={appSheetCategoryClass}>
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--menu-content-bg) text-(--brand-primary)">
          <Building2 size={18} strokeWidth={2.3} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-lg)] leading-tight font-extrabold tracking-tight [overflow-wrap:anywhere] text-(--brand-ink)">
            Organisationsinformation
          </h2>
          <p className="mt-0.5 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
            Det här ser andra i appen.
            {typeof followersCount === 'number' ? (
              <span className="ms-2 inline-flex items-center gap-1 whitespace-nowrap text-(--brand-primary)">
                <UsersRound size={13} aria-hidden="true" />
                {followersCount} följare
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className={`mt-3 space-y-3 ${appSheetContentClass}`}>
        <div>
          <label
            htmlFor="company-organisation-name"
            className={appSheetFormLabelClass}
          >
            Organisationsnamn
          </label>
          <input
            id="company-organisation-name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className={appSheetFormFieldClass}
          />
        </div>

        <div>
          <label
            htmlFor="company-organisation-city"
            className={appSheetFormLabelClass}
          >
            Stad
          </label>
          <input
            id="company-organisation-city"
            value={orgCity}
            onChange={(e) => setOrgCity(e.target.value)}
            className={appSheetFormFieldClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <label
              htmlFor="company-organisation-description"
              className="text-[length:var(--text-sm)] font-semibold text-(--brand-ink-soft)"
            >
              Beskrivning
            </label>
            <span className="text-[length:var(--text-xs)] font-semibold text-(--brand-muted) tabular-nums">
              {orgCharacterCount}/600
            </span>
          </div>
          <textarea
            id="company-organisation-description"
            rows={4}
            maxLength={600}
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value)}
            className={appSheetFormTextareaClass}
          />
        </div>

        <button
          type="button"
          onClick={saveOrganisation}
          disabled={!canSaveOrg || isSavingOrganisation}
          className={`${appSheetPrimaryButtonClass} min-h-11 px-4 py-2.5 text-[length:var(--text-sm)]`}
        >
          {isSavingOrganisation ? 'Sparar…' : 'Spara ändringar'}
        </button>
      </div>
    </section>
  )
}
