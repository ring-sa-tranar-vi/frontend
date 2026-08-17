import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { type RefetchOptions, useQuery } from '@tanstack/react-query'
import { getJson } from '../lib/api/fetcher'
import useCurrentUser from './useCurrentUser'
import { type Workout } from '../features/session/types'

export const DEBUG = import.meta.env.VITE_DEBUG === 'true'
export const DEBUG_WORKOUT_ID = import.meta.env.VITE_DEBUG_WORKOUT_ID ?? '1'
const DAILY_WORKOUT_LIMIT_ENABLED = true

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
    // ignore storage errors
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
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<
    string | undefined
  >()

  const [recommendedWorkoutReasoning, setRecommendedWorkoutReasoning] =
    useState<string | undefined>()
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

  const currentProfile = useMemo<WorkoutProfileSnapshot>(
    () => ({
      userId,
      level,
      context,
    }),
    [userId, level, context],
  )

  const {
    data: workouts = [] as Workout[],
    isLoading,
    isError,
    refetch,
  } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: async () => {
      if (DEBUG) console.debug('[useCurrentWorkout] fetching workouts')
      const rawToken = isSignedIn ? await getToken() : undefined
      const token: string | undefined = rawToken ?? undefined
      if (!token) {
        console.log(
          '[useCurrentWorkout] Missing required parameters for workouts',
          { token },
        )
        throw new Error('Cannot fetch workouts without token')
      }
      return await getJson<Workout[]>(`/api/workouts`, {
        token,
      })
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)

  const { data: completedTodayData } = useQuery<{ hasCompletedToday: boolean }>(
    {
      queryKey: ['has-completed-today', userId],
      queryFn: async () => {
        const rawToken = isSignedIn ? await getToken() : undefined
        const token: string | undefined = rawToken ?? undefined
        if (!token) {
          throw new Error('Cannot fetch completed today without token')
        }
        if (!userId) {
          throw new Error('Cannot fetch completed today without userId')
        }
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
        if (DEBUG) {
          console.debug('[useCurrentWorkout] fetching recommendation', {
            userId,
            level,
            context,
          })
        }
        if (!userId || level == null) {
          console.log(
            '[useCurrentWorkout] Missing required parameters for recommendation',
            { userId, level, context },
          )
          throw new Error(
            'Cannot fetch recommendation without userId and level',
          )
        }

        const rawToken = isSignedIn ? await getToken() : undefined
        const token: string | undefined = rawToken ?? undefined
        if (!token) {
          throw new Error('Cannot fetch recommendation without token')
        }
        return await getJson<RecommendedWorkoutResponse>(
          `/api/trainers/recommend-for/${userId}`,
          { token },
        )
      },
      enabled: shouldFetchRecommendation,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    })

  // Typed wrapper function that resets state and returns { id, reasoning }
  const refetchRecommendedWorkoutId = useCallback(
    async (
      options?: RefetchOptions,
    ): Promise<{ id: number; reasoning?: string }> => {
      // Clear manual selection and cached profile so new recommendations apply
      setSelectedWorkoutId(undefined)
      setStoredProfile(null)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(CURRENT_WORKOUT_PROFILE_KEY)
        window.localStorage.removeItem(CURRENT_WORKOUT_RECOMMENDATION_KEY)
      }

      const result = await refetchRecommendation(options)

      if (!result.data) {
        throw new Error('Failed to fetch recommended workout')
      }

      return {
        id: result.data.workoutId,
        reasoning: result.data.reasoning,
      }
    },
    [refetchRecommendation],
  )

  useEffect(() => {
    if (!recommendation || !userId || level == null) return

    const nextProfile: WorkoutProfileSnapshot = {
      userId,
      level,
      context,
    }

    setStoredProfile(nextProfile)
    setStoredRecommendation(recommendation)

    writeLocalStorageJson(CURRENT_WORKOUT_PROFILE_KEY, nextProfile)
    writeLocalStorageJson(CURRENT_WORKOUT_RECOMMENDATION_KEY, recommendation)

    if (DEBUG) {
      console.debug('[useCurrentWorkout] got recommendation', recommendation)
    }
  }, [recommendation, userId, level, context])

  useEffect(() => {
    if (DEBUG) {
      console.log(
        '[useCurrentWorkout] shouldFetchRecommendation',
        shouldFetchRecommendation,
      )
    }
  }, [shouldFetchRecommendation])

  const activeRecommendation = sameProfile(storedProfile, currentProfile)
    ? storedRecommendation
    : recommendation

  const recommendedWorkout = workouts.find(
    (workout) => workout.id === activeRecommendation?.workoutId,
  )
  const recommendedWorkoutId = recommendedWorkout?.id.toString()

  const activeWorkoutId = selectedWorkoutId ?? recommendedWorkoutId
  const currentWorkoutId = alreadyCompletedToday ? undefined : activeWorkoutId

  useEffect(() => {
    if (selectedWorkoutId !== undefined) return
    setRecommendedWorkoutReasoning(
      recommendedWorkout ? activeRecommendation?.reasoning : undefined,
    )
  }, [recommendedWorkout, activeRecommendation?.reasoning, selectedWorkoutId])

  useEffect(() => {
    if (!currentWorkoutId) {
      setCurrentWorkout(null)
      return
    }
    const workout = workouts.find(
      (workout) => workout.id.toString() === currentWorkoutId,
    )
    if (!workout) {
      setCurrentWorkout(null)
      return
    }
    setCurrentWorkout(workout)
  }, [currentWorkoutId, workouts])

  const updateCurrentWorkout = (
    workoutId: string | number | undefined,
    reasoning?: string,
  ) => {
    setSelectedWorkoutId(
      workoutId !== undefined ? String(workoutId) : undefined,
    )
    setRecommendedWorkoutReasoning(reasoning)
  }

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

  useEffect(() => {
    console.log('Selected workout id', selectedWorkoutId)
  }, [selectedWorkoutId])

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
