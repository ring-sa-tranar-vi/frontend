import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  createCompanyEvent,
  deleteCompanyEvent,
  fetchCompanyEvents,
  fetchCompanyMe,
  fetchCompanyOrganisation,
  updateCompanyEvent,
  updateCompanyOrganisation,
  type CompanyEvent,
} from '../../api/companyPortal'
import { emptyEventForm, type EventForm } from './types'

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

  const meQuery = useQuery({
    queryKey: ['company-me'],
    queryFn: fetchCompanyMe,
  })

  const organisationQuery = useQuery({
    queryKey: ['company-organisation'],
    queryFn: fetchCompanyOrganisation,
  })

  const eventsQuery = useQuery({
    queryKey: ['company-events'],
    queryFn: fetchCompanyEvents,
  })

  const events = useMemo(() => {
    const list = eventsQuery.data ?? []
    return [...list].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    )
  }, [eventsQuery.data])

  useEffect(() => {
    const organisation = organisationQuery.data
    if (!organisation) return

    setOrgName(organisation.name)
    setOrgDescription(organisation.description ?? '')
    setOrgCity(organisation.orgCity ?? '')
  }, [organisationQuery.data])

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
      const organisationId = organisationQuery.data?.id
      if (!organisationId) {
        throw new Error('Organisation saknas.')
      }

      return updateCompanyOrganisation(organisationId, {
        name: orgName.trim(),
        description: orgDescription.trim(),
        orgCity: orgCity.trim(),
      })
    },
    onSuccess: async () => {
      setStatusMessage('Organisationen sparades.')
      await queryClient.invalidateQueries({
        queryKey: ['company-organisation'],
      })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const createEventMutation = useMutation({
    mutationFn: async () =>
      createCompanyEvent({
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        time: toLocalDateTime(eventForm.time),
        city: eventForm.city.trim(),
        venue: eventForm.venue.trim(),
      }),
    onSuccess: async () => {
      setEventForm(emptyEventForm)
      setStatusMessage('Event skapades.')
      await queryClient.invalidateQueries({ queryKey: ['company-events'] })
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

      return updateCompanyEvent(editingEventId, {
        name: editingEventForm.name.trim(),
        description: editingEventForm.description.trim(),
        time: toLocalDateTime(editingEventForm.time),
        city: editingEventForm.city.trim(),
        venue: editingEventForm.venue.trim(),
      })
    },
    onSuccess: async () => {
      setEditingEventId(null)
      setEditingEventForm(emptyEventForm)
      setStatusMessage('Event uppdaterades.')
      await queryClient.invalidateQueries({ queryKey: ['company-events'] })
    },
    onError: (error) => {
      setStatusMessage((error as Error).message)
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: deleteCompanyEvent,
    onSuccess: async () => {
      setStatusMessage('Event togs bort.')
      await queryClient.invalidateQueries({ queryKey: ['company-events'] })
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
    eventForm.venue.trim().length > 0

  const canSaveEditedEvent =
    editingEventForm.name.trim().length > 1 &&
    editingEventForm.time.trim().length > 0 &&
    editingEventForm.city.trim().length > 0 &&
    editingEventForm.venue.trim().length > 0

  const isLoading =
    organisationQuery.isLoading || eventsQuery.isLoading || meQuery.isLoading
  const isError =
    organisationQuery.isError || eventsQuery.isError || meQuery.isError

  const errorMessage =
    (organisationQuery.error as Error)?.message ||
    (eventsQuery.error as Error)?.message ||
    (meQuery.error as Error)?.message ||
    'Okänt fel.'

  function startEditingEvent(event: CompanyEvent) {
    setEditingEventId(event.id)
    setEditingEventForm({
      name: event.name,
      description: event.description ?? '',
      time: toInputDateTime(event.time),
      city: event.city,
      venue: event.venue,
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
