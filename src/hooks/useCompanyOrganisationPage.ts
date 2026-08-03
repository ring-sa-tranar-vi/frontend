import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  createCompanyEvent,
  deleteCompanyEvent,
  fetchMyOrganisations,
  fetchOrganisationEvents,
  updateCompanyEvent,
  updateCompanyOrganisation,
  type CompanyEvent,
} from '../api/companyPortal.ts'
import {
  emptyEventForm,
  type EventForm,
} from '../features/companyPortal/types.ts'

const emptyOrganisations: never[] = []

function toLocalDateTime(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function toInputDateTime(value: string) {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

export function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function formatDayNumber(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('sv-SE', { day: '2-digit' })
}

export function formatMonthShort(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '---'
  return d.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase()
}

export function useCompanyOrganisationPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const [isWideLayout, setIsWideLayout] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [orgCity, setOrgCity] = useState('')

  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editingEventForm, setEditingEventForm] =
    useState<EventForm>(emptyEventForm)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<
    number | null
  >(null)

  async function getRequiredToken() {
    const token = await getToken()
    if (!token)
      throw new Error(
        'Du behöver vara inloggad för att hantera organisationer.',
      )
    return token
  }

  const organisationsQuery = useQuery({
    queryKey: ['my-organisations'],
    queryFn: async () => fetchMyOrganisations(await getRequiredToken()),
    enabled: isLoaded && Boolean(isSignedIn),
  })

  const organisations = organisationsQuery.data ?? emptyOrganisations
  const activeOrganisationId =
    selectedOrganisationId ?? organisations[0]?.id ?? null
  const activeOrganisation =
    organisations.find(
      (organisation) => organisation.id === activeOrganisationId,
    ) ?? null

  useEffect(() => {
    if (!selectedOrganisationId && organisations[0]) {
      setSelectedOrganisationId(organisations[0].id)
    }
  }, [organisations, selectedOrganisationId])

  const eventsQuery = useQuery({
    queryKey: ['organisation-events', activeOrganisationId],
    queryFn: async () =>
      fetchOrganisationEvents(await getRequiredToken(), activeOrganisationId!),
    enabled: isLoaded && Boolean(isSignedIn) && activeOrganisationId != null,
  })

  const events = useMemo(() => {
    const list = eventsQuery.data ?? []
    return [...list].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    )
  }, [eventsQuery.data])

  useEffect(() => {
    const organisation = activeOrganisation
    if (!organisation) return

    setOrgName(organisation.name)
    setOrgDescription(organisation.description ?? '')
    setOrgCity(organisation.orgCity ?? '')
  }, [activeOrganisation])

  useLayoutEffect(() => {
    const el = layoutRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const syncLayout = () => {
      setIsWideLayout(el.clientWidth >= 860)
    }

    syncLayout()
    const observer = new ResizeObserver(syncLayout)
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  const orgMutation = useMutation({
    mutationFn: async () => {
      const organisationId = activeOrganisationId
      if (!organisationId) {
        throw new Error('Organisation saknas.')
      }

      return updateCompanyOrganisation(
        await getRequiredToken(),
        organisationId,
        {
          name: orgName.trim(),
          description: orgDescription.trim(),
          orgCity: orgCity.trim(),
        },
      )
    },
    onSuccess: async () => {
      setStatusMessage('Organisationen sparades.')
      await queryClient.invalidateQueries({
        queryKey: ['my-organisations'],
      })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const createEventMutation = useMutation({
    mutationFn: async () =>
      createCompanyEvent(await getRequiredToken(), activeOrganisationId!, {
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        time: toLocalDateTime(eventForm.time),
        city: eventForm.city.trim(),
        venue: eventForm.venue.trim(),
        eventType: eventForm.eventType as 'IN_PERSON' | 'ONLINE',
      }),
    onSuccess: async () => {
      setEventForm(emptyEventForm)
      setStatusMessage('Event skapades.')
      await queryClient.invalidateQueries({ queryKey: ['organisation-events'] })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (editingEventId == null) {
        throw new Error('Välj ett event att redigera.')
      }

      return updateCompanyEvent(await getRequiredToken(), editingEventId, {
        name: editingEventForm.name.trim(),
        description: editingEventForm.description.trim(),
        time: toLocalDateTime(editingEventForm.time),
        city: editingEventForm.city.trim(),
        venue: editingEventForm.venue.trim(),
        eventType: editingEventForm.eventType as 'IN_PERSON' | 'ONLINE',
      })
    },
    onSuccess: async () => {
      setEditingEventId(null)
      setEditingEventForm(emptyEventForm)
      setStatusMessage('Event uppdaterades.')
      await queryClient.invalidateQueries({ queryKey: ['organisation-events'] })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) =>
      deleteCompanyEvent(await getRequiredToken(), eventId),
    onSuccess: async () => {
      setStatusMessage('Event togs bort.')
      await queryClient.invalidateQueries({ queryKey: ['organisation-events'] })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const canSaveOrg = orgName.trim().length > 1 && orgCity.trim().length > 0
  const canCreateEvent =
    eventForm.name.trim().length > 1 &&
    eventForm.time.trim().length > 0 &&
    eventForm.city.trim().length > 0 &&
    eventForm.venue.trim().length > 0 &&
    eventForm.eventType !== ''

  const canSaveEditedEvent =
    editingEventForm.name.trim().length > 1 &&
    editingEventForm.time.trim().length > 0 &&
    editingEventForm.city.trim().length > 0 &&
    editingEventForm.venue.trim().length > 0 &&
    editingEventForm.eventType !== ''

  const isLoading = organisationsQuery.isLoading || eventsQuery.isLoading
  const isError = organisationsQuery.isError || eventsQuery.isError

  const errorMessage =
    (organisationsQuery.error as Error)?.message ||
    (eventsQuery.error as Error)?.message ||
    'Okänt fel.'

  function startEditingEvent(event: CompanyEvent) {
    setEditingEventId(event.id)
    setEditingEventForm({
      name: event.name,
      description: event.description ?? '',
      time: toInputDateTime(event.time),
      city: event.city,
      venue: event.venue,
      eventType: event.eventType,
    })
  }

  function stopEditingEvent() {
    setEditingEventId(null)
    setEditingEventForm(emptyEventForm)
  }

  return {
    layoutRef,
    isWideLayout,
    statusMessage,
    organisations,
    selectedOrganisationId: activeOrganisationId,
    setSelectedOrganisationId,
    orgName,
    setOrgName,
    orgDescription,
    setOrgDescription,
    orgCity,
    setOrgCity,
    eventForm,
    setEventForm,
    editingEventId,
    editingEventForm,
    setEditingEventForm,
    showCreateEvent,
    setShowCreateEvent,
    events,
    canSaveOrg,
    canCreateEvent,
    canSaveEditedEvent,
    orgWords: wordCount(orgDescription),
    saveOrganisation: () => orgMutation.mutate(),
    createEvent: () => createEventMutation.mutate(),
    updateEvent: () => updateEventMutation.mutate(),
    deleteEvent: (id: number) => deleteEventMutation.mutate(id),
    startEditingEvent,
    stopEditingEvent,
    isSavingOrganisation: orgMutation.isPending,
    isSavingEvent: createEventMutation.isPending,
    isUpdatingEvent: updateEventMutation.isPending,
    isLoading,
    isError,
    errorMessage,
  }
}

export type CompanyOrganisationViewModel = ReturnType<
  typeof useCompanyOrganisationPage
>
