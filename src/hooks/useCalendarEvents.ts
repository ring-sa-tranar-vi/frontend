import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getJson } from '../lib/api/fetcher'
import useCurrentUser from './useCurrentUser'
import type {
  CalendarActivity,
  CalendarActivityKind,
} from '../features/HomePage/components/menu/types.ts'

export type CalendarEventDto = {
  id: string
  type: string
  title: string
  description?: string
  time: string
  completed: boolean
}

function mapDtoToActivity(dto: CalendarEventDto): CalendarActivity {
  const [datePart, timePart] = dto.time.split('T')
  const timeFormatted = timePart ? timePart.slice(0, 5) : undefined

  const rawKind = dto.type.toLowerCase()
  const kind: CalendarActivityKind =
    rawKind === 'callback' ? 'callback' : 'workout'

  return {
    id: dto.id,
    date: datePart,
    kind,
    title: dto.title,
    time: timeFormatted,
    trainerName: dto.description,
  }
}

export function useCalendarEvents(year: number, month: number) {
  const { getToken, isSignedIn } = useAuth()
  const { userId, isProfileLoading } = useCurrentUser()

  const query = useQuery<CalendarEventDto[]>({
    queryKey: ['calendar', userId, year, month],
    queryFn: async () => {
      if (!userId || !isSignedIn) return []
      const rawToken = await getToken()
      const token: string | undefined = rawToken ?? undefined

      return await getJson<CalendarEventDto[]>(
        `/api/v1/calendar?userId=${userId}&year=${year}&month=${month}`,
        { token },
      )
    },
    enabled: Boolean(userId) && isSignedIn && !isProfileLoading,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const activities = useMemo(() => {
    return (query.data ?? []).map(mapDtoToActivity)
  }, [query.data])

  const nextActivityId = useMemo(() => {
    const now = new Date()
    const upcoming = activities
      .filter((activity) => {
        const activityDate = new Date(
          `${activity.date}T${activity.time ?? '00:00:00'}`,
        )
        return activityDate >= now
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time ?? '00:00:00'}`)
        const dateB = new Date(`${b.date}T${b.time ?? '00:00:00'}`)
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
