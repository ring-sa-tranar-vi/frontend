import { ArrowLeft, Clock3, MapPin, Search, UsersRound } from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSheet, AppSheetNotice } from '../../../../components/AppSheet'
import {
  type EventDto,
  type OrganisationDto,
  useEventsAndOrganisations,
} from '../../../../hooks/useEventsAndOrganisations'

type DirectoryTab = 'events' | 'organisations'
type EventFilter = 'all' | 'nearby' | 'week'

const organisationAvatarClasses = [
  'bg-[#eee9ff] text-[#5b3fd6]',
  'bg-[#e5f5f1] text-[#397c6e]',
  'bg-[#fff0e8] text-[#a85d37]',
]

function toEventDate(event: EventDto) {
  const date = new Date(event.time)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUpcoming(event: EventDto, now = new Date()) {
  const date = toEventDate(event)
  return date ? date >= now : false
}

function isThisWeek(date: Date, now = new Date()) {
  const start = new Date(now)
  const dayFromMonday = (start.getDay() + 6) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - dayFromMonday)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return date >= start && date < end
}

function normalizeSearchText(value?: string | null) {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase()

  return initials || 'R'
}

function LoadingCards() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-(--brand-border-light) bg-white/55"
        />
      ))}
    </div>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-(--brand-border-field) bg-white/45 px-5 py-10 text-center text-[length:var(--text-sm)] font-bold text-(--brand-muted)">
      {children}
    </div>
  )
}

function RetryState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-3">
      <AppSheetNotice tone="danger">{message}</AppSheetNotice>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 w-full rounded-2xl border border-(--brand-border-field) bg-(--brand-btn-secondary-bg) px-4 py-3 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.985]"
      >
        {retryLabel}
      </button>
    </div>
  )
}

function EventCard({
  event,
  organisationName,
  isAttending,
  membershipReady,
  isPending,
  locale,
  onToggle,
}: {
  event: EventDto
  organisationName?: string
  isAttending: boolean
  membershipReady: boolean
  isPending: boolean
  locale: string
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const date = toEventDate(event)

  if (!date) return null

  const day = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(date)
    .replace('.', '')
    .toLocaleUpperCase(locale)
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  const location = [event.venue, event.city].filter(Boolean).join(' · ')
  const buttonLabel = isPending
    ? t('menu.events.directory.saving')
    : isAttending
      ? t('menu.events.directory.registered')
      : t('menu.events.directory.register')

  return (
    <article className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-(--brand-border-light) bg-white/70 p-4 shadow-[0_1px_2px_rgba(30,20,80,0.04)] max-[350px]:grid-cols-[3rem_minmax(0,1fr)]">
      <time
        dateTime={event.time}
        className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-(--brand-soft) text-center max-[350px]:h-14 max-[350px]:w-12"
      >
        <span className="text-xl leading-none font-extrabold text-(--brand-primary-deep)">
          {day}
        </span>
        <span className="mt-1 text-[0.62rem] leading-none font-extrabold tracking-wide text-(--brand-primary-deep)">
          {month}
        </span>
      </time>

      <div className="min-w-0">
        <h3 className="text-[length:var(--text-base)] leading-tight font-extrabold text-(--brand-ink)">
          {event.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold text-(--brand-body-ink)">
          <Clock3 size={13} className="shrink-0" aria-hidden="true" />
          <span>{time}</span>
        </p>
        {location ? (
          <p className="mt-1 flex min-w-0 items-start gap-1.5 text-[length:var(--text-xs)] font-semibold text-(--brand-body-ink)">
            <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{location}</span>
          </p>
        ) : null}
        {organisationName ? (
          <p className="mt-1 flex min-w-0 items-start gap-1.5 text-[length:var(--text-xs)] font-semibold text-(--brand-muted)">
            <UsersRound
              size={13}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{organisationName}</span>
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={!membershipReady || isPending}
        aria-label={
          isAttending
            ? t('menu.events.directory.cancelRegistrationFor', {
                name: event.name,
              })
            : t('menu.events.directory.registerFor', { name: event.name })
        }
        className={`min-h-11 min-w-[5.75rem] rounded-xl px-4 py-2.5 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 max-[350px]:col-start-2 max-[350px]:justify-self-end ${
          isAttending
            ? 'border border-(--brand-border-field) bg-(--brand-soft) text-(--brand-primary-deep)'
            : 'bg-(--brand-primary) text-white shadow-[0_3px_10px_rgba(80,64,200,0.24)] hover:bg-(--brand-primary-strong)'
        }`}
      >
        {buttonLabel}
      </button>
    </article>
  )
}

function OrganisationCard({
  organisation,
  isFollowing,
  membershipReady,
  isPending,
  onToggle,
}: {
  organisation: OrganisationDto
  isFollowing: boolean
  membershipReady: boolean
  isPending: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const upcomingEvents = (organisation.events ?? []).filter((event) =>
    isUpcoming(event),
  ).length
  const avatarClass =
    organisationAvatarClasses[
      Math.abs(organisation.id) % organisationAvatarClasses.length
    ]
  const buttonLabel = isPending
    ? t('menu.events.directory.saving')
    : isFollowing
      ? t('menu.events.directory.following')
      : t('menu.events.directory.follow')

  return (
    <article className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-(--brand-border-light) bg-white/70 p-4 shadow-[0_1px_2px_rgba(30,20,80,0.04)] max-[350px]:grid-cols-[3rem_minmax(0,1fr)]">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[length:var(--text-base)] font-extrabold ${avatarClass}`}
        aria-hidden="true"
      >
        {getInitials(organisation.name)}
      </div>

      <div className="min-w-0">
        <h3 className="text-[length:var(--text-base)] leading-tight font-extrabold text-(--brand-ink)">
          {organisation.name}
        </h3>
        {organisation.description ? (
          <p className="mt-1 line-clamp-2 text-[length:var(--text-xs)] leading-snug font-semibold text-(--brand-body-ink)">
            {organisation.description}
          </p>
        ) : null}
        {organisation.orgCity ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold text-(--brand-muted)">
            <MapPin size={13} className="shrink-0" aria-hidden="true" />
            <span>{organisation.orgCity}</span>
          </p>
        ) : null}
        <span className="mt-2 inline-flex rounded-full bg-(--brand-soft) px-2.5 py-1 text-[0.65rem] font-extrabold text-(--brand-primary-deep)">
          {t('menu.events.directory.upcomingCount', {
            count: upcomingEvents,
          })}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={!membershipReady || isPending}
        aria-label={
          isFollowing
            ? t('menu.events.directory.unfollowOrganisation', {
                name: organisation.name,
              })
            : t('menu.events.directory.followOrganisation', {
                name: organisation.name,
              })
        }
        className={`min-h-11 min-w-[4.75rem] rounded-xl px-4 py-2.5 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 max-[350px]:col-start-2 max-[350px]:justify-self-end ${
          isFollowing
            ? 'border border-(--brand-border-field) bg-(--brand-soft) text-(--brand-primary-deep)'
            : 'bg-(--brand-primary) text-white shadow-[0_3px_10px_rgba(80,64,200,0.20)] hover:bg-(--brand-primary-strong)'
        }`}
      >
        {buttonLabel}
      </button>
    </article>
  )
}

export default function EventsOrganisationsSheet({
  open,
  onBack,
  onClose,
  userCity,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
  userCity?: string | null
}) {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<DirectoryTab>('events')
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<EventFilter>('all')
  const {
    eventsQuery,
    organisationsQuery,
    attendingQuery,
    followingQuery,
    attendanceMutation,
    followingMutation,
  } = useEventsAndOrganisations(open)

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'sv'
  const normalizedSearch = normalizeSearchText(search)
  const normalizedUserCity = normalizeSearchText(userCity)
  const organisations = useMemo(
    () => organisationsQuery.data ?? [],
    [organisationsQuery.data],
  )
  const organisationById = useMemo(
    () =>
      new Map(
        organisations.map((organisation) => [organisation.id, organisation]),
      ),
    [organisations],
  )
  const attendingIds = useMemo(
    () => new Set((attendingQuery.data ?? []).map((event) => event.id)),
    [attendingQuery.data],
  )
  const followingIds = useMemo(
    () =>
      new Set(
        (followingQuery.data ?? []).map((organisation) => organisation.id),
      ),
    [followingQuery.data],
  )

  const upcomingEvents = useMemo(() => {
    const now = new Date()

    return (eventsQuery.data ?? [])
      .filter(
        (event) =>
          isUpcoming(event, now) &&
          event.eventType === 'IN_PERSON' &&
          (eventFilter !== 'nearby' ||
            normalizeSearchText(event.city) === normalizedUserCity) &&
          (eventFilter !== 'week' ||
            Boolean(
              toEventDate(event) && isThisWeek(toEventDate(event)!, now),
            )),
      )
      .filter((event) => {
        if (!normalizedSearch) return true

        const organisationName = event.organisationId
          ? organisationById.get(event.organisationId)?.name
          : ''
        return [
          event.name,
          event.description,
          event.city,
          event.venue,
          organisationName,
        ].some((value) => normalizeSearchText(value).includes(normalizedSearch))
      })
      .sort(
        (first, second) =>
          toEventDate(first)!.getTime() - toEventDate(second)!.getTime(),
      )
  }, [
    eventFilter,
    eventsQuery.data,
    normalizedSearch,
    normalizedUserCity,
    organisationById,
  ])

  const filteredOrganisations = useMemo(
    () =>
      organisations
        .filter((organisation) =>
          normalizedSearch
            ? [
                organisation.name,
                organisation.description,
                organisation.orgCity,
              ].some((value) =>
                normalizeSearchText(value).includes(normalizedSearch),
              )
            : true,
        )
        .sort((first, second) => first.name.localeCompare(second.name, locale)),
    [locale, normalizedSearch, organisations],
  )

  const membershipError =
    activeTab === 'events'
      ? attendingQuery.isError || attendanceMutation.isError
      : followingQuery.isError || followingMutation.isError

  function switchTab(tab: DirectoryTab) {
    setActiveTab(tab)
    setSearch('')
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    tab: DirectoryTab,
  ) {
    let nextTab: DirectoryTab | null = null

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      nextTab = tab === 'events' ? 'organisations' : 'events'
    } else if (event.key === 'Home') {
      nextTab = 'events'
    } else if (event.key === 'End') {
      nextTab = 'organisations'
    }

    if (!nextTab) return

    event.preventDefault()
    switchTab(nextTab)
    requestAnimationFrame(() =>
      document.getElementById(`${nextTab}-tab`)?.focus(),
    )
  }

  return (
    <AppSheet
      open={open}
      title={t('menu.events.directory.title')}
      subtitle={t('menu.events.directory.subtitle')}
      icon={<ArrowLeft size={20} strokeWidth={2.4} />}
      onBack={onBack}
      backLabel={t('menu.events.directory.back')}
      onClose={onClose}
      height="large"
      fillHeight
    >
      <div className="pb-3">
        <div
          role="tablist"
          aria-label={t('menu.events.directory.tabsLabel')}
          className="grid grid-cols-2 rounded-2xl border border-(--brand-border-field) bg-(--brand-soft) p-1"
        >
          {(['events', 'organisations'] as const).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab}-panel`}
                id={`${tab}-tab`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => switchTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
                className={`min-h-11 rounded-xl px-3 py-2.5 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none active:scale-[0.985] ${
                  isActive
                    ? 'bg-(--brand-primary) text-white shadow-[0_2px_8px_rgba(80,64,200,0.24)]'
                    : 'text-(--brand-body-ink) hover:bg-white/50'
                }`}
              >
                {t(`menu.events.directory.tabs.${tab}`)}
              </button>
            )
          })}
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">
            {activeTab === 'events'
              ? t('menu.events.directory.searchEvents')
              : t('menu.events.directory.searchOrganisations')}
          </span>
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-(--brand-muted)"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === 'events'
                ? t('menu.events.directory.searchEvents')
                : t('menu.events.directory.searchOrganisations')
            }
            className="min-h-12 w-full rounded-2xl border border-(--brand-border-field) bg-white/65 py-3 pr-4 pl-11 text-[length:var(--text-sm)] font-semibold text-(--brand-ink) placeholder:text-(--brand-muted) focus-visible:border-(--brand-border-strong) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </label>

        {membershipError ? (
          <div className="mt-3 space-y-2">
            <AppSheetNotice tone="danger">
              {t('menu.events.directory.membershipError')}
            </AppSheetNotice>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'events') {
                  attendanceMutation.reset()
                  void attendingQuery.refetch()
                } else {
                  followingMutation.reset()
                  void followingQuery.refetch()
                }
              }}
              className="min-h-10 w-full rounded-xl text-[length:var(--text-sm)] font-extrabold text-(--brand-primary-deep) transition hover:bg-(--brand-soft) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none active:scale-[0.985]"
            >
              {t('menu.events.directory.retry')}
            </button>
          </div>
        ) : null}

        {activeTab === 'events' ? (
          <section
            id="events-panel"
            role="tabpanel"
            aria-labelledby="events-tab"
            className="mt-4"
          >
            <div
              className="flex flex-wrap gap-2"
              aria-label={t('menu.events.directory.filtersLabel')}
            >
              {(
                [
                  ['all', true],
                  ['nearby', Boolean(normalizedUserCity)],
                  ['week', true],
                ] as const
              ).map(([filter, visible]) =>
                visible ? (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={eventFilter === filter}
                    onClick={() => setEventFilter(filter)}
                    className={`min-h-11 rounded-full border px-3.5 py-2 text-[length:var(--text-xs)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-1 focus-visible:outline-none active:scale-[0.97] ${
                      eventFilter === filter
                        ? 'border-(--brand-primary) bg-(--brand-primary) text-white'
                        : 'border-(--brand-border-field) bg-white/60 text-(--brand-body-ink) hover:bg-(--brand-soft)'
                    }`}
                  >
                    {t(`menu.events.directory.filters.${filter}`)}
                  </button>
                ) : null,
              )}
            </div>

            <div className="mt-5 mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[length:var(--text-xl)] leading-tight font-extrabold text-(--brand-ink)">
                  {t('menu.events.directory.upcomingEvents')}
                </h2>
                {eventFilter === 'nearby' && userCity ? (
                  <p className="mt-1 text-[length:var(--text-xs)] font-semibold text-(--brand-muted)">
                    {userCity}
                  </p>
                ) : null}
              </div>
              {!eventsQuery.isLoading && !eventsQuery.isError ? (
                <span className="shrink-0 text-[length:var(--text-xs)] font-extrabold text-(--brand-primary-deep)">
                  {t('menu.events.directory.resultCount', {
                    count: upcomingEvents.length,
                  })}
                </span>
              ) : null}
            </div>

            {eventsQuery.isLoading ? <LoadingCards /> : null}
            {eventsQuery.isError ? (
              <RetryState
                message={t('menu.events.directory.eventsError')}
                retryLabel={t('menu.events.directory.retry')}
                onRetry={() => void eventsQuery.refetch()}
              />
            ) : null}
            {eventsQuery.isSuccess && upcomingEvents.length === 0 ? (
              <EmptyState>
                {normalizedSearch || eventFilter !== 'all'
                  ? t('menu.events.directory.noMatchingEvents')
                  : t('menu.events.directory.noUpcomingEvents')}
              </EmptyState>
            ) : null}
            {eventsQuery.isSuccess && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const isAttending = attendingIds.has(event.id)
                  const isPending =
                    attendanceMutation.isPending &&
                    attendanceMutation.variables?.event.id === event.id

                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      organisationName={
                        event.organisationId
                          ? organisationById.get(event.organisationId)?.name
                          : undefined
                      }
                      isAttending={isAttending}
                      membershipReady={
                        attendingQuery.isSuccess &&
                        !attendanceMutation.isPending
                      }
                      isPending={isPending}
                      locale={locale}
                      onToggle={() =>
                        attendanceMutation.mutate({ event, isAttending })
                      }
                    />
                  )
                })}
              </div>
            ) : null}
          </section>
        ) : (
          <section
            id="organisations-panel"
            role="tabpanel"
            aria-labelledby="organisations-tab"
            className="mt-4"
          >
            <div className="rounded-2xl bg-(--brand-soft) px-4 py-3 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-body-ink)">
              {t('menu.events.directory.organisationsIntro')}
            </div>

            <div className="mt-5 mb-3 flex items-end justify-between gap-3">
              <h2 className="text-[length:var(--text-xl)] leading-tight font-extrabold text-(--brand-ink)">
                {t('menu.events.directory.allOrganisations')}
              </h2>
              {!organisationsQuery.isLoading && !organisationsQuery.isError ? (
                <span className="shrink-0 text-[length:var(--text-xs)] font-extrabold text-(--brand-primary-deep)">
                  {t('menu.events.directory.partnerCount', {
                    count: filteredOrganisations.length,
                  })}
                </span>
              ) : null}
            </div>

            {organisationsQuery.isLoading ? <LoadingCards /> : null}
            {organisationsQuery.isError ? (
              <RetryState
                message={t('menu.events.directory.organisationsError')}
                retryLabel={t('menu.events.directory.retry')}
                onRetry={() => void organisationsQuery.refetch()}
              />
            ) : null}
            {organisationsQuery.isSuccess &&
            filteredOrganisations.length === 0 ? (
              <EmptyState>
                {normalizedSearch
                  ? t('menu.events.directory.noMatchingOrganisations')
                  : t('menu.events.directory.noOrganisations')}
              </EmptyState>
            ) : null}
            {organisationsQuery.isSuccess &&
            filteredOrganisations.length > 0 ? (
              <div className="space-y-3">
                {filteredOrganisations.map((organisation) => {
                  const isFollowing = followingIds.has(organisation.id)
                  const isPending =
                    followingMutation.isPending &&
                    followingMutation.variables?.organisation.id ===
                      organisation.id

                  return (
                    <OrganisationCard
                      key={organisation.id}
                      organisation={organisation}
                      isFollowing={isFollowing}
                      membershipReady={
                        followingQuery.isSuccess && !followingMutation.isPending
                      }
                      isPending={isPending}
                      onToggle={() =>
                        followingMutation.mutate({
                          organisation,
                          isFollowing,
                        })
                      }
                    />
                  )
                })}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </AppSheet>
  )
}
