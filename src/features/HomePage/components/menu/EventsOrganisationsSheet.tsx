import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
  UsersRound,
} from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSheet,
  AppSheetNotice,
  appSheetCategoryClass,
  appSheetCardClass,
} from '../../../../components/AppSheet'
import {
  fetchMyOrganizationApplication,
  type ApplicationStatus,
  OrganizationApplicationError,
} from '../../../../api/organizationApplications'
import {
  type EventDto,
  type OrganisationDto,
  useEventsAndOrganisations,
} from '../../../../hooks/useEventsAndOrganisations'

type DirectoryTab = 'events' | 'organisations'
type EventFilter = 'all' | 'nearby' | 'week'

const organisationAvatarClasses = [
  'bg-(--menu-choice-bg) text-(--brand-primary-deep)',
  'bg-(--brand-surface-soft) text-(--brand-primary-deep)',
  'bg-(--menu-control-bg) text-(--brand-primary-deep)',
]

const applicationStatusClasses: Record<
  ApplicationStatus,
  { card: string; icon: string; action: string }
> = {
  PENDING: {
    card: '!border-amber-200 !bg-amber-50',
    icon: 'bg-amber-100 text-amber-700',
    action: 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200',
  },
  APPROVED: {
    card: '!border-emerald-200 !bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-700',
    action:
      'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  },
  REJECTED: {
    card: '!border-red-200 !bg-red-50',
    icon: 'bg-red-100 text-red-700',
    action: 'border-red-300 bg-red-100 text-red-800 hover:bg-red-200',
  },
}

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
          className="h-32 animate-pulse rounded-2xl border border-(--brand-border-light) bg-(--menu-content-bg)"
        />
      ))}
    </div>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-(--menu-control-border) bg-(--menu-content-bg) px-5 py-10 text-center text-[length:var(--text-sm)] font-bold text-(--brand-muted)">
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
  const [descriptionOpen, setDescriptionOpen] = useState(false)
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
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const location =
    event.eventType === 'ONLINE'
      ? t('menu.events.directory.online')
      : [event.venue, event.city].filter(Boolean).join(' · ')
  const buttonLabel = isPending
    ? t('menu.events.directory.saving')
    : isAttending
      ? t('menu.events.directory.unregister')
      : t('menu.events.directory.register')

  const description = event.description?.trim()
  const descriptionId = `event-description-${event.id}`

  return (
    <div className={`${appSheetCardClass} menu-event-card`}>
      <div className="menu-event-grid">
        <time dateTime={event.time} className="menu-event-date">
          <span className="menu-event-date-day">{day}</span>
          <span className="menu-event-date-month">{month}</span>
        </time>

        <div className="menu-event-content">
          <h3 className="menu-card-title menu-event-title" title={event.name}>
            {event.name}
          </h3>

          {typeof event.attendeesCount === 'number' ? (
            <div className="menu-event-status-row">
              <span className="menu-card-badge inline-flex items-center gap-1.5 rounded-full bg-(--brand-soft) px-2 py-1 text-(--brand-primary-deep)">
                <UsersRound size={13} aria-hidden="true" />
                {t('menu.events.directory.attendeeCount', {
                  count: event.attendeesCount,
                })}
              </span>
            </div>
          ) : null}

          <div className="menu-card-meta menu-event-meta-stack text-(--brand-body-ink)">
            <p className="menu-event-meta-row">
              <span className="menu-event-meta-item whitespace-nowrap">
                <CalendarDays
                  size={14}
                  className="shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span>{dateLabel}</span>
              </span>
              <span className="menu-event-meta-item whitespace-nowrap">
                <Clock3
                  size={14}
                  className="shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span>{time}</span>
              </span>
            </p>
            {location ? (
              <p className="menu-event-meta-item">
                <MapPin
                  size={14}
                  className="mt-0.5 shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span className="break-words">{location}</span>
              </p>
            ) : null}
            {organisationName ? (
              <p className="menu-event-meta-item">
                <Building2
                  size={14}
                  className="mt-0.5 shrink-0 text-(--brand-primary)"
                  aria-hidden="true"
                />
                <span className="break-words">{organisationName}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="menu-event-actions menu-event-primary-action">
          <button
            type="button"
            onClick={onToggle}
            disabled={!membershipReady || isPending}
            aria-busy={isPending}
            aria-live="polite"
            aria-label={
              isPending
                ? buttonLabel
                : isAttending
                  ? t('menu.events.directory.cancelRegistrationFor', {
                      name: event.name,
                    })
                  : t('menu.events.directory.registerFor', { name: event.name })
            }
            className={`inline-flex min-h-11 min-w-[5.75rem] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
              isAttending
                ? 'border border-(--brand-border-field) bg-(--brand-soft) text-(--brand-primary-deep)'
                : 'bg-(--brand-primary) text-(--brand-on-primary) hover:bg-(--brand-primary-strong)'
            }`}
          >
            {isAttending ? (
              <Check size={15} strokeWidth={2.8} aria-hidden="true" />
            ) : null}
            {buttonLabel}
          </button>
        </div>
      </div>

      {description ? (
        <div className="menu-event-footer">
          <button
            type="button"
            onClick={() => setDescriptionOpen((current) => !current)}
            aria-expanded={descriptionOpen}
            aria-controls={descriptionId}
            className="menu-event-accordion transition hover:bg-(--brand-soft) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
          >
            <span>
              {descriptionOpen
                ? t('menu.events.directory.hideDescription')
                : t('menu.events.directory.showDescription')}
            </span>
            <ChevronDown
              size={19}
              className={`shrink-0 transition-transform duration-200 ${
                descriptionOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
          {descriptionOpen ? (
            <p id={descriptionId} className="menu-card-copy px-2 pt-1 pb-2">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function OrganisationCard({
  organisation,
  isFollowing,
  membershipReady,
  isPending,
  onToggle,
  events,
  attendingIds,
  eventMembershipReady,
  isEventPending,
  onToggleEvent,
  locale,
}: {
  organisation: OrganisationDto
  isFollowing: boolean
  membershipReady: boolean
  isPending: boolean
  onToggle: () => void
  events: EventDto[]
  attendingIds: Set<number>
  eventMembershipReady: boolean
  isEventPending: (event: EventDto) => boolean
  onToggleEvent: (event: EventDto) => void
  locale: string
}) {
  const { t } = useTranslation()
  const [eventsOpen, setEventsOpen] = useState(false)
  const avatarClass =
    organisationAvatarClasses[
      Math.abs(organisation.id) % organisationAvatarClasses.length
    ]
  const buttonLabel = isPending
    ? t('menu.events.directory.saving')
    : isFollowing
      ? t('menu.events.directory.unfollow')
      : t('menu.events.directory.follow')
  const description = organisation.description?.trim()
  const eventsId = `organisation-events-${organisation.id}`

  return (
    <article className={`${appSheetCardClass} menu-organisation-card`}>
      <div className="menu-organisation-header flex items-start gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[length:var(--text-base)] font-extrabold ${avatarClass}`}
          aria-hidden="true"
        >
          {getInitials(organisation.name)}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="menu-card-title line-clamp-2 min-h-10"
            title={organisation.name}
          >
            {organisation.name}
          </h3>
        </div>

        <div className="menu-organisation-actions shrink-0">
          <button
            type="button"
            onClick={onToggle}
            disabled={!membershipReady || isPending}
            aria-busy={isPending}
            aria-live="polite"
            aria-label={
              isPending
                ? buttonLabel
                : isFollowing
                  ? t('menu.events.directory.unfollowOrganisation', {
                      name: organisation.name,
                    })
                  : t('menu.events.directory.followOrganisation', {
                      name: organisation.name,
                    })
            }
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
              isFollowing
                ? 'border border-(--brand-border-field) bg-(--brand-soft) text-(--brand-primary-deep)'
                : 'bg-(--brand-primary) text-(--brand-on-primary) hover:bg-(--brand-primary-strong)'
            }`}
          >
            {isFollowing ? (
              <Check size={15} strokeWidth={2.8} aria-hidden="true" />
            ) : null}
            {buttonLabel}
          </button>
        </div>
      </div>

      {description ? (
        <p className="menu-card-copy mt-3">{description}</p>
      ) : null}

      {organisation.orgCity ||
      typeof organisation.followersCount === 'number' ? (
        <div className="menu-card-meta mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {organisation.orgCity ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />
              {organisation.orgCity}
            </span>
          ) : null}
          {typeof organisation.followersCount === 'number' ? (
            <span className="inline-flex items-center gap-1.5">
              <UsersRound size={14} className="shrink-0" aria-hidden="true" />
              {t('menu.events.directory.followerCount', {
                count: organisation.followersCount,
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="menu-event-footer">
        <button
          type="button"
          onClick={() => setEventsOpen((current) => !current)}
          aria-expanded={eventsOpen}
          aria-controls={eventsId}
          className="menu-event-accordion transition hover:bg-(--brand-soft) focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none"
        >
          <span>{t('menu.events.directory.organisationEvents')}</span>
          <ChevronDown
            size={19}
            className={`shrink-0 transition-transform duration-200 ${
              eventsOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {eventsOpen ? (
          <div id={eventsId} className="space-y-3 pt-3">
            {events.length > 0 ? (
              events.map((event) => {
                const isAttending = attendingIds.has(event.id)

                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isAttending={isAttending}
                    membershipReady={eventMembershipReady}
                    isPending={isEventPending(event)}
                    locale={locale}
                    onToggle={() => onToggleEvent(event)}
                  />
                )
              })
            ) : (
              <p className="rounded-xl bg-(--brand-soft) px-4 py-3 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
                {t('menu.events.directory.noOrganisationEvents')}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default function EventsOrganisationsSheet({
  open,
  onBack,
  onClose,
  onApply,
  canManageOrganisation,
  userCity,
}: {
  open: boolean
  onBack: () => void
  onClose: () => void
  onApply: () => void
  canManageOrganisation: boolean
  userCity?: string | null
}) {
  const { t, i18n } = useTranslation()
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
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

  const myApplicationQuery = useQuery({
    queryKey: ['organisation-application', 'me', userId],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')

      try {
        return await fetchMyOrganizationApplication(token)
      } catch (error) {
        if (
          error instanceof OrganizationApplicationError &&
          error.status === 404
        ) {
          return null
        }
        throw error
      }
    },
    enabled: open && isLoaded && Boolean(isSignedIn) && Boolean(userId),
    retry: false,
  })

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'sv'
  const existingApplication = myApplicationQuery.data
  const isApplicationUnavailable = myApplicationQuery.isError
  const applicationStatusClass = existingApplication
    ? applicationStatusClasses[existingApplication.status]
    : null
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
  const upcomingEventsByOrganisationId = useMemo(() => {
    const byOrganisationId = new Map<number, EventDto[]>()

    for (const event of eventsQuery.data ?? []) {
      if (!event.organisationId || !isUpcoming(event)) continue

      const events = byOrganisationId.get(event.organisationId) ?? []
      events.push(event)
      byOrganisationId.set(event.organisationId, events)
    }

    for (const events of byOrganisationId.values()) {
      events.sort(
        (first, second) =>
          toEventDate(first)!.getTime() - toEventDate(second)!.getTime(),
      )
    }

    return byOrganisationId
  }, [eventsQuery.data])
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
      motion="instant"
    >
      <div className={appSheetCategoryClass}>
        <div
          role="tablist"
          aria-label={t('menu.events.directory.tabsLabel')}
          className="relative grid grid-cols-2 overflow-hidden rounded-2xl border border-(--brand-border-field) bg-(--brand-soft) p-1"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl border border-(--brand-primary) bg-(--menu-content-bg) transition-transform duration-200 ease-out motion-reduce:transition-none ${
              activeTab === 'organisations' ? 'translate-x-full' : ''
            }`}
          />
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
                className={`relative z-10 min-h-11 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-[length:var(--text-sm)] font-extrabold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:outline-none active:scale-[0.985] ${
                  isActive
                    ? 'text-(--brand-primary-deep)'
                    : 'text-(--brand-ink-soft) hover:text-(--brand-primary-deep)'
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
            className="min-h-12 w-full rounded-2xl border border-(--menu-control-border) bg-(--menu-field-bg) py-3 pr-4 pl-11 text-[length:var(--text-sm)] font-semibold text-(--brand-ink) placeholder:text-(--brand-muted) focus-visible:border-(--brand-border-strong) focus-visible:ring-2 focus-visible:ring-(--brand-selection) focus-visible:outline-none"
          />
        </label>

        {attendanceMutation.isError ? (
          <div className="mt-4">
            <AppSheetNotice tone="danger">
              {t('menu.events.directory.attendanceUpdateError')}
            </AppSheetNotice>
          </div>
        ) : null}
        {activeTab === 'organisations' && followingMutation.isError ? (
          <div className="mt-4">
            <AppSheetNotice tone="danger">
              {t('menu.events.directory.followingUpdateError')}
            </AppSheetNotice>
          </div>
        ) : null}
        {attendingQuery.isError ? (
          <div className="mt-4">
            <RetryState
              message={t('menu.events.directory.attendanceLoadError')}
              retryLabel={t('menu.events.directory.retry')}
              onRetry={() => void attendingQuery.refetch()}
            />
          </div>
        ) : null}
        {activeTab === 'organisations' && followingQuery.isError ? (
          <div className="mt-4">
            <RetryState
              message={t('menu.events.directory.followingLoadError')}
              retryLabel={t('menu.events.directory.retry')}
              onRetry={() => void followingQuery.refetch()}
            />
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
                        ? 'border-(--brand-primary) bg-(--brand-primary) text-(--brand-on-primary)'
                        : 'border-(--menu-control-border) bg-(--menu-control-bg) text-(--brand-body-ink) hover:bg-(--brand-soft)'
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
            <div className="menu-card-copy rounded-xl bg-(--brand-soft) px-4 py-3">
              {t('menu.events.directory.organisationsIntro')}
            </div>

            <div
              hidden={canManageOrganisation}
              className={`mt-4 ${appSheetCardClass} ${applicationStatusClass?.card ?? ''}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${applicationStatusClass?.icon ?? 'bg-(--brand-soft) text-(--brand-primary-deep)'}`}
                >
                  <Building2 size={21} strokeWidth={2.3} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="menu-card-title text-(--brand-title-ink)">
                    {isApplicationUnavailable
                      ? t('menu.events.application.statusError')
                      : existingApplication
                        ? t(
                            `menu.events.application.statusTitle.${existingApplication.status.toLowerCase()}`,
                          )
                        : t('menu.events.application.cardTitle')}
                  </h2>
                  <p className="menu-card-copy mt-1">
                    {isApplicationUnavailable
                      ? t('menu.events.application.cardText')
                      : existingApplication
                        ? t(
                            `menu.events.application.statusText.${existingApplication.status.toLowerCase()}`,
                          )
                        : t('menu.events.application.cardText')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isApplicationUnavailable) {
                    void myApplicationQuery.refetch()
                    return
                  }
                  onApply()
                }}
                disabled={myApplicationQuery.isLoading}
                className={`mt-4 min-h-11 w-full rounded-xl border px-4 py-3 text-[length:var(--text-sm)] font-extrabold transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.985] disabled:cursor-wait disabled:opacity-70 ${
                  applicationStatusClass?.action ??
                  'border-transparent bg-(--brand-primary) text-(--brand-on-primary) hover:bg-(--brand-primary-strong)'
                }`}
              >
                {myApplicationQuery.isLoading
                  ? t('menu.events.application.checkingStatus')
                  : isApplicationUnavailable
                    ? t('menu.events.directory.retry')
                    : existingApplication
                      ? t(
                          `menu.events.application.status.${existingApplication.status.toLowerCase()}`,
                        )
                      : t('menu.events.application.cardAction')}
              </button>
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
                      events={
                        upcomingEventsByOrganisationId.get(organisation.id) ??
                        []
                      }
                      attendingIds={attendingIds}
                      eventMembershipReady={
                        attendingQuery.isSuccess &&
                        !attendanceMutation.isPending
                      }
                      isEventPending={(event) =>
                        attendanceMutation.isPending &&
                        attendanceMutation.variables?.event.id === event.id
                      }
                      onToggleEvent={(event) =>
                        attendanceMutation.mutate({
                          event,
                          isAttending: attendingIds.has(event.id),
                        })
                      }
                      locale={locale}
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
