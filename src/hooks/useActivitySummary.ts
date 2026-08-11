import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import type {
  ActivitySummary,
  CallbackWeekday,
} from '../features/HomePage/components/menu/types'
import { callbackWeekdays } from '../features/HomePage/components/menu/types'
import { getJson } from '../lib/api/fetcher'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type ProgressResponse = {
  currentStreak: number
  personalBestStreak?: number
  completedDates?: string[]
  completedWorkouts: Array<{
    dateLabel: string
    workoutName: string
  }>
}

export const activityProgressQueryKey = (userId?: string | null) =>
  ['my-progress', userId] as const

function toDayNumber(dateKey: string) {
  const match = ISO_DATE_PATTERN.exec(dateKey)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return Math.floor(timestamp / DAY_IN_MILLISECONDS)
}

function getStockholmDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = new Map(parts.map((part) => [part.type, part.value]))

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}

function getWeekday(dayNumber: number): CallbackWeekday {
  const weekdayIndex =
    (new Date(dayNumber * DAY_IN_MILLISECONDS).getUTCDay() + 6) % 7
  return callbackWeekdays[weekdayIndex]
}

export function buildActivitySummary(
  completedDates: unknown,
  todayKey = getStockholmDateKey(),
): ActivitySummary {
  const today = toDayNumber(todayKey)

  if (today === null || !Array.isArray(completedDates)) {
    return {
      currentStreak: 0,
      personalRecord: 0,
      activeWeekdays: [],
      hasCompletedWorkouts: false,
      hasDetailedHistory: true,
    }
  }

  const days = Array.from(
    new Set(
      completedDates
        .filter((value): value is string => typeof value === 'string')
        .map(toDayNumber)
        .filter((value): value is number => value !== null && value <= today),
    ),
  ).sort((first, second) => first - second)
  const completedDaySet = new Set(days)

  let personalRecord = 0
  let consecutiveDays = 0
  let previousDay: number | null = null

  for (const day of days) {
    consecutiveDays =
      previousDay !== null && day === previousDay + 1 ? consecutiveDays + 1 : 1
    personalRecord = Math.max(personalRecord, consecutiveDays)
    previousDay = day
  }

  const streakEnd = completedDaySet.has(today)
    ? today
    : completedDaySet.has(today - 1)
      ? today - 1
      : null
  let currentStreak = 0

  if (streakEnd !== null) {
    let day = streakEnd

    while (completedDaySet.has(day)) {
      currentStreak += 1
      day -= 1
    }
  }

  const currentWeekdayIndex =
    (new Date(today * DAY_IN_MILLISECONDS).getUTCDay() + 6) % 7
  const monday = today - currentWeekdayIndex
  const activeWeekdaySet = new Set(
    days.filter((day) => day >= monday).map(getWeekday),
  )
  const activeWeekdays = callbackWeekdays.filter((weekday) =>
    activeWeekdaySet.has(weekday),
  )

  return {
    currentStreak,
    personalRecord,
    activeWeekdays,
    hasCompletedWorkouts: days.length > 0,
    hasDetailedHistory: true,
  }
}

function buildCurrentProgressSummary(
  response: ProgressResponse,
): ActivitySummary {
  const currentStreak = Number.isFinite(response.currentStreak)
    ? Math.max(0, Math.floor(response.currentStreak))
    : 0
  const hasCompletedWorkouts =
    currentStreak > 0 || response.completedWorkouts.length > 0

  return {
    currentStreak,
    personalRecord: 0,
    activeWeekdays: [],
    hasCompletedWorkouts,
    hasDetailedHistory: !hasCompletedWorkouts,
  }
}

export function useActivitySummary(enabled: boolean) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: activityProgressQueryKey(userId),
    queryFn: async () => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      const response = await getJson<ProgressResponse>(
        '/api/users/me/progress',
        { token },
      )

      if (
        !response ||
        typeof response.currentStreak !== 'number' ||
        !Array.isArray(response.completedWorkouts)
      ) {
        throw new Error('Backend returned invalid progress data')
      }

      return response
    },
    select: (response) =>
      Array.isArray(response.completedDates)
        ? buildActivitySummary(response.completedDates)
        : buildCurrentProgressSummary(response),
    enabled: enabled && isLoaded && Boolean(isSignedIn) && Boolean(userId),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
