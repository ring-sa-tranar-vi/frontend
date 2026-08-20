import { useAuth } from '@clerk/react'
import { type RefetchOptions, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type Workout } from '../features/session/types'
import { getJson } from '../lib/api/fetcher'
import useCurrentUser from './useCurrentUser'

export const DEBUG = import.meta.env.VITE_DEBUG === 'true'
export const DEBUG_WORKOUT_ID = import.meta.env.VITE_DEBUG_WORKOUT_ID ?? '1'
const DAILY_WORKOUT_LIMIT_ENABLED = true
const DEFAULT_GUEST_WORKOUT_ID = '35'

const CURRENT_WORKOUT_PROFILE_KEY = 'ringv2.currentWorkout.profile'
const CURRENT_WORKOUT_RECOMMENDATION_KEY =
  'ringv2.currentWorkout.recommendation'

type RecommendedWorkoutResponse = {
  workoutId: number
  reasoning: string
}

type WorkoutProfileSnapshot = {
  userId: string | null
  level: number | null
  context: string | null
}

function readLocalStorageJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLocalStorageJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.warn(`Failed to write to localStorage for key: ${key}`)
  }
}

function sameProfile(
  a: WorkoutProfileSnapshot | null,
  b: WorkoutProfileSnapshot,
) {
  if (!a) return false
  return a.userId === b.userId && a.level === b.level && a.context === b.context
}

export default function useCurrentWorkout() {
  const { getToken, isSignedIn } = useAuth()
  const { level, userId, context } = useCurrentUser()

  const [storedProfile, setStoredProfile] =
    useState<WorkoutProfileSnapshot | null>(() =>
      readLocalStorageJson<WorkoutProfileSnapshot>(CURRENT_WORKOUT_PROFILE_KEY),
    )
  const [storedRecommendation, setStoredRecommendation] =
    useState<RecommendedWorkoutResponse | null>(() =>
      readLocalStorageJson<RecommendedWorkoutResponse>(
        CURRENT_WORKOUT_RECOMMENDATION_KEY,
      ),
    )
  const [customReasoning, setCustomReasoning] = useState<string | undefined>()

  const currentProfile = useMemo<WorkoutProfileSnapshot>(
    () => ({ userId, level, context }),
    [userId, level, context],
  )
  const {
    data: workouts = [],
    isLoading,
    isError,
  } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: async () => await getJson<Workout[]>(`/api/workouts`),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const { data: completedTodayData } = useQuery<{ hasCompletedToday: boolean }>(
    {
      queryKey: ['has-completed-today', userId],
      queryFn: async () => {
        const token = (await getToken()) ?? undefined
        if (!token || !userId) throw new Error('Missing parameters')
        return await getJson<{ hasCompletedToday: boolean }>(
          `/api/activity-logs/users/${userId}/has-completed-today`,
          { token },
        )
      },
      enabled: isSignedIn && !!userId,
      staleTime: 1000 * 60,
      retry: 1,
    },
  )

  const alreadyCompletedToday = DAILY_WORKOUT_LIMIT_ENABLED
    ? (completedTodayData?.hasCompletedToday ?? false)
    : false

  const shouldFetchRecommendation =
    isSignedIn &&
    !!userId &&
    level != null &&
    (!DAILY_WORKOUT_LIMIT_ENABLED || !alreadyCompletedToday) &&
    !sameProfile(storedProfile, currentProfile)

  const { data: recommendation, refetch: refetchRecommendation } =
    useQuery<RecommendedWorkoutResponse>({
      queryKey: ['recommended-workout', userId, level, context],
      queryFn: async () => {
        const token = (await getToken()) ?? undefined
        if (!token || !userId || level == null)
          throw new Error('Missing parameters')
        return await getJson<RecommendedWorkoutResponse>(
          `/api/trainers/recommend-for/${userId}`,
          { token },
        )
      },
      enabled: shouldFetchRecommendation,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    })

  useEffect(() => {
    if (!recommendation || !userId || level == null) return

    const nextProfile = { userId, level, context }
    setStoredProfile(nextProfile)
    setStoredRecommendation(recommendation)

    writeLocalStorageJson(CURRENT_WORKOUT_PROFILE_KEY, nextProfile)
    writeLocalStorageJson(CURRENT_WORKOUT_RECOMMENDATION_KEY, recommendation)
  }, [recommendation, userId, level, context])

  const activeRecommendation = sameProfile(storedProfile, currentProfile)
    ? storedRecommendation
    : recommendation

  const activeWorkoutId = workouts
    .find((w) => w.id === activeRecommendation?.workoutId)
    ?.id.toString()

  const currentWorkoutId = alreadyCompletedToday
    ? undefined
    : isSignedIn
      ? activeWorkoutId
      : DEFAULT_GUEST_WORKOUT_ID

  const currentWorkout = useMemo(() => {
    if (!currentWorkoutId) return null
    return workouts.find((w) => w.id.toString() === currentWorkoutId) ?? null
  }, [currentWorkoutId, workouts])

  const recommendedWorkoutReasoning =
    customReasoning ?? activeRecommendation?.reasoning

  const updateCurrentWorkout = (
    workoutId: string | number | undefined,
    reasoning?: string,
  ) => {
    if (!workoutId) {
      console.warn('updateCurrentWorkout called with undefined workoutId')
      return
    }
    if (reasoning) {
      setCustomReasoning(reasoning)
    }
  }

  // Typed wrapper function that resets state and returns { id, reasoning }
  const refetchRecommendedWorkoutId = useCallback(
    async (
      options?: RefetchOptions,
    ): Promise<{ id: number; reasoning?: string }> => {
      setStoredProfile(null)
      setCustomReasoning(undefined)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(CURRENT_WORKOUT_PROFILE_KEY)
        window.localStorage.removeItem(CURRENT_WORKOUT_RECOMMENDATION_KEY)
      }

      const result = await refetchRecommendation(options)
      if (!result.data) throw new Error('Failed to fetch recommended workout')

      return {
        id: result.data.workoutId,
        reasoning: result.data.reasoning,
      }
    },
    [refetchRecommendation],
  )

  useEffect(() => {
    if (DEBUG) {
      console.log(
        '[useCurrentWorkout] shouldFetchRecommendation',
        shouldFetchRecommendation,
      )
    }
  }, [shouldFetchRecommendation])

  useEffect(() => {
    if (DEBUG) {
      console.debug('[useCurrentWorkout] state', {
        userId,
        currentWorkoutId,
        currentWorkout,
        recommendedWorkoutReasoning,
        workouts,
      })
    }
  }, [userId, currentWorkoutId, recommendedWorkoutReasoning, workouts])

  return {
    currentWorkoutId,
    currentWorkout,
    updateCurrentWorkout,
    workouts,
    isLoading,
    isError,
    refetchRecommendedWorkoutId,
    recommendedWorkoutReasoning,
    alreadyCompletedToday,
  }
}
