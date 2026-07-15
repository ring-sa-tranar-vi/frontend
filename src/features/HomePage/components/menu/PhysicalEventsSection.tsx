import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSheetNotice } from '../../../../components/AppSheet'
import MenuSectionHeader from './MenuSectionHeader'

export default function PhysicalEventsSection({
  onFindEvents,
}: {
  onFindEvents?: () => void
}) {
  const { t } = useTranslation()
  const [showPlaceholderNotice, setShowPlaceholderNotice] = useState(false)

  function handleFindEvents() {
    if (onFindEvents) {
      onFindEvents()
      return
    }

    setShowPlaceholderNotice(true)
  }

  return (
    <section aria-labelledby="menu-events-title">
      <div id="menu-events-title">
        <MenuSectionHeader
          icon={<MapPin size={20} strokeWidth={2.2} />}
          title={t('menu.events.title')}
        />
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#eee8ff_0%,#ddd2ff_100%)] p-5">
        <div
          className="pointer-events-none absolute -top-10 -right-9 h-36 w-36 rounded-full border-[26px] border-white/25"
          aria-hidden="true"
        />
        <div className="relative">
          <span className="inline-flex rounded-full bg-white/80 px-3 py-1.5 text-[length:var(--text-xs)] font-extrabold text-(--brand-primary-deep)">
            {t('menu.events.eyebrow')}
          </span>
          <h4 className="mt-5 max-w-[275px] text-[1.55rem] leading-[1.08] font-extrabold text-(--brand-ink)">
            {t('menu.events.headline')}
          </h4>
          <p className="mt-2 max-w-[295px] text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
            {t('menu.events.description')}
          </p>
          <button
            type="button"
            onClick={handleFindEvents}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-(--brand-primary) px-4 py-4 text-[length:var(--text-base)] font-extrabold text-white shadow-[0_4px_16px_rgba(80,64,200,0.28)] transition hover:bg-(--brand-primary-strong) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.985]"
          >
            <Search size={19} strokeWidth={2.4} aria-hidden="true" />
            {t('menu.events.cta')}
          </button>
        </div>
      </div>

      {showPlaceholderNotice ? (
        <div className="mt-3">
          <AppSheetNotice>{t('menu.events.notConnected')}</AppSheetNotice>
        </div>
      ) : null}
    </section>
  )
}
