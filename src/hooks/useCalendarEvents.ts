import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getJson } from '../lib/api/fetcher'
import useCurrentUser from './useCurrentUser'
import type {
  CalendarActivity,
  CalendarActivityKind,
  CalendarEventDto,
} from '../features/HomePage/components/menu/types.ts'

const CALENDAR_KIND_BY_API_TYPE: Record<string, CalendarActivityKind> = {
  WORKOUT: 'workout',
  EVENT: 'event',
  CALL: 'callback',
}

function isValidDateKey(dateKey: string): boolean {
  const [year, month, day] = dateKey.split('-').map(Number)

  if (!year || !month || !day) return false

  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function getClockTime(timePart: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(timePart)
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = match[3] ? Number(match[3]) : 0

  if (hour > 23 || minute > 59 || second > 59) return null
  return `${match[1]}:${match[2]}`
}

function mapDtoToActivity(dto: CalendarEventDto): CalendarActivity | null {
  if (
    !dto ||
    typeof dto.id !== 'string' ||
    typeof dto.type !== 'string' ||
    typeof dto.title !== 'string' ||
    typeof dto.time !== 'string'
  ) {
    return null
  }

  const [datePart, timePart] = dto.time.split('T')
  const kind = CALENDAR_KIND_BY_API_TYPE[dto.type.toUpperCase()]
  const time = timePart ? getClockTime(timePart) : null

  if (!kind || !isValidDateKey(datePart) || !time) {
    return null
  }

  const description =
    typeof dto.description === 'string' && dto.description.trim()
      ? dto.description.trim()
      : undefined

  return {
    id: dto.id,
    date: datePart,
    kind,
    title: dto.title.trim(),
    time,
    description: kind === 'callback' ? undefined : description,
    completed: Boolean(dto.completed),
  }
}

export function useCalendarEvents(year: number, month: number, enabled = true) {
  const { getToken } = useAuth()
  const {
    userId,
    isSignedIn,
    isProfileLoading,
    isProfileError,
    refetchProfile,
  } = useCurrentUser()

  const query = useQuery<CalendarEventDto[]>({
    queryKey: ['calendar', userId, year, month],
    queryFn: async () => {
      if (!userId || !isSignedIn) return []
      const rawToken = await getToken()
      if (!rawToken) throw new Error('Missing Clerk token')

      const search = new URLSearchParams({
        userId,
        year: String(year),
        month: String(month),
      })
      const response = await getJson<unknown>(
        `/api/v1/calendar?${search.toString()}`,
        { token: rawToken },
      )

      if (!Array.isArray(response)) {
        throw new Error('Invalid calendar response')
      }

      return response as CalendarEventDto[]
    },
    enabled: enabled && Boolean(userId) && isSignedIn && !isProfileLoading,
    retry: 1,
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })

  const activities: CalendarActivity[] = useMemo(
    () =>
      (query.data ?? [])
        .map(mapDtoToActivity)
        .filter((activity): activity is CalendarActivity => activity !== null)
        .sort((first, second) => {
          const firstTime = `${first.date}T${first.time ?? ''}`
          const secondTime = `${second.date}T${second.time ?? ''}`
          return (
            firstTime.localeCompare(secondTime) ||
            first.id.localeCompare(second.id)
          )
        }),
    [query.data],
  )

  async function refetchCalendar() {
    if (isProfileError) {
      return refetchProfile()
    }

    return query.refetch()
  }

  return {
    ...query,
    activities,
    hasData: query.data !== undefined,
    isError: isProfileError || query.isError,
    isLoading: enabled && (query.isLoading || isProfileLoading),
    refetch: refetchCalendar,
  }
}
