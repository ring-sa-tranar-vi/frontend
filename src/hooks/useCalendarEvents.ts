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
import { getApiBaseUrl } from '../lib/apiBaseUrl.ts'

const API_URL = getApiBaseUrl()

function mapDtoToActivity(dto: CalendarEventDto): CalendarActivity {
  const [datePart, timePart] = dto.time ? dto.time.split('T') : ['', '']
  const formattedTime = timePart ? timePart.slice(0, 5) : undefined

  const rawKind = dto.type ? dto.type.toLowerCase() : ''
  const kind: CalendarActivityKind =
    rawKind === 'callback' ? 'callback' : 'workout'

  return {
    id: String(dto.id),
    date: datePart,
    kind,
    title: dto.title,
    time: formattedTime,
    trainerName: dto.description || undefined,
  }
}

export function useCalendarEvents(year: number, month: number) {
  const { getToken } = useAuth()
  const { userId, isSignedIn, isProfileLoading } = useCurrentUser()

  const query = useQuery<CalendarEventDto[]>({
    queryKey: ['calendar', userId, year, month],
    queryFn: async () => {
      if (!userId || !isSignedIn) return []
      const rawToken = await getToken()
      const token = rawToken ?? undefined

      return await getJson<CalendarEventDto[]>(
        `${API_URL}/api/v1/calendar?userId=${userId}&year=${year}&month=${month}`,
        { token },
      )
    },
    enabled: Boolean(userId) && isSignedIn && !isProfileLoading,
    staleTime: 1000 * 60 * 5,
  })

  const activities: CalendarActivity[] = useMemo(
    () => (query.data ?? []).map(mapDtoToActivity),
    [query.data],
  )

  const nextActivityId = useMemo(() => {
    const now = new Date()
    const upcoming = activities
      .filter((activity) => {
        const fullDate = activity.time
          ? new Date(`${activity.date}T${activity.time}:00`)
          : new Date(activity.date)
        return fullDate >= now
      })
      .sort((a, b) => {
        const dateA = a.time
          ? new Date(`${a.date}T${a.time}:00`)
          : new Date(a.date)
        const dateB = b.time
          ? new Date(`${b.date}T${b.time}:00`)
          : new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

    return upcoming[0]?.id
  }, [activities])

  return {
    ...query,
    activities,
    nextActivityId,
    isLoading: query.isLoading || isProfileLoading,
  }
}
