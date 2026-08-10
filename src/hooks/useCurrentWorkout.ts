import { useEffect } from 'react'
import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { getJson } from '../lib/api/fetcher'
import useCurrentUser from './useCurrentUser'
import { type BackendWorkoutResponse } from '../features/session/api'

export const DEBUG = import.meta.env.VITE_DEBUG === 'true'
export const DEBUG_WORKOUT_ID = import.meta.env.VITE_DEBUG_WORKOUT_ID ?? '1'
const DAILY_WORKOUT_LIMIT_ENABLED = true

type RecommendedWorkoutResponse = {
  workoutId: number
  reasoning: string
}

export default function useCurrentWorkout() {
  const { getToken, isSignedIn } = useAuth()
  const { level, userId } = useCurrentUser()

  const {
    data: workouts = [] as BackendWorkoutResponse[],
    isLoading,
    isError,
    refetch,
  } = useQuery<BackendWorkoutResponse[]>({
    queryKey: ['workouts'],
    queryFn: async () => {
      if (DEBUG) console.debug('[useCurrentWorkout] fetching workouts')
      const rawToken = isSignedIn ? await getToken() : undefined
      const token: string | undefined = rawToken ?? undefined
      return await getJson<BackendWorkoutResponse[]>(`/api/workouts`, {
        token,
      })
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

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

  const { data: recommendation } = useQuery<RecommendedWorkoutResponse>({
    queryKey: ['recommended-workout', userId, level],
    queryFn: async () => {
      if (DEBUG) {
        console.debug('[useCurrentWorkout] fetching recommendation', {
          userId,
          level,
        })
      }
      if (!userId || level == null) {
        console.log(
          '[useCurrentWorkout] Missing required parameters for recommendation',
          {
            userId,
            level,
          },
        )
        throw new Error('Cannot fetch recommendation without userId and level')
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
    enabled:
      isSignedIn &&
      !!userId &&
      level != null &&
      (!DAILY_WORKOUT_LIMIT_ENABLED || !alreadyCompletedToday),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  useEffect(() => {
    if (DEBUG && recommendation) {
      console.debug('[useCurrentWorkout] got recommendation', recommendation)
    }
  }, [recommendation])

  // Only accept recommendations inside the stable trainer + intensity bucket.
  // When already completed today: no workout at all (session uses getAlreadyCompletedSession).
  // Otherwise: AI recommendation, then trainer's first workout, then nothing.
  const recommendedWorkout = workouts.find(
    (workout) => workout.id === recommendation?.workoutId,
  )
  const recommendedWorkoutId = recommendedWorkout?.id.toString()
  const currentWorkout = alreadyCompletedToday
    ? undefined
    : recommendedWorkoutId
  const recommendedWorkoutReasoning = recommendedWorkout
    ? recommendation?.reasoning
    : undefined

  useEffect(() => {
    if (DEBUG) {
      console.debug('[useCurrentWorkout] state', {
        userId,
        currentWorkout,
        recommendedWorkoutReasoning,
        workouts,
      })
    }
  }, [userId, currentWorkout, recommendedWorkoutReasoning, workouts])

  return {
    currentWorkout,
    workouts,
    isLoading,
    isError,
    refetch,
    recommendedWorkoutReasoning,
    alreadyCompletedToday,
  }
}
