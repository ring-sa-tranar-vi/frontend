import { useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { getJson } from '../lib/api/fetcher'
import type { BackendWorkoutResponse } from '../features/ai-conversation/tools/workout/workoutTypes'
import useCurrentUser from './useCurrentUser'

export const DEBUG = import.meta.env.VITE_DEBUG === 'true'
export const DEBUG_WORKOUT_ID = import.meta.env.VITE_DEBUG_WORKOUT_ID ?? '1'
const DAILY_WORKOUT_LIMIT_ENABLED = true

type RecommendedWorkoutResponse = {
  workoutId: number
  reasoning: string
}

export default function useCurrentWorkout() {
  const { getToken, isSignedIn } = useAuth()
  const { trainerId, level, userId } = useCurrentUser()

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

  const filteredWorkouts = useMemo(() => {
    if (!trainerId || level == null) return []
    const desiredLevel = Number(level)

    const byTrainer = (workouts ?? []).filter(
      (w: BackendWorkoutResponse) => w.trainer?.id === trainerId,
    )

    const exact = byTrainer.filter((w) => Number(w.level) === desiredLevel)
    if (exact.length > 0) return exact

    if (byTrainer.length === 0) return []

    const levels = Array.from(
      new Set(
        byTrainer.map((w) => Number(w.level)).filter((n) => Number.isFinite(n)),
      ),
    ).sort((a, b) => a - b)

    const lower = levels.filter((l) => l < desiredLevel)
    if (lower.length > 0) {
      const chosen = lower[lower.length - 1]
      return byTrainer.filter((w) => Number(w.level) === chosen)
    }

    const higher = levels.filter((l) => l > desiredLevel)
    if (higher.length > 0) {
      const chosen = higher[0]
      return byTrainer.filter((w) => Number(w.level) === chosen)
    }

    return []
  }, [workouts, trainerId, level])

  const { data: completedTodayData } = useQuery<{ hasCompletedToday: boolean }>(
    {
      queryKey: ['has-completed-today', userId],
      queryFn: async () => {
        const rawToken = isSignedIn ? await getToken() : undefined
        const token: string | undefined = rawToken ?? undefined
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
    queryKey: ['recommended-workout', trainerId, userId, level],
    queryFn: async () => {
      if (DEBUG) {
        console.debug('[useCurrentWorkout] fetching recommendation', {
          trainerId,
          userId,
          level,
        })
      }

      const rawToken = isSignedIn ? await getToken() : undefined
      const token: string | undefined = rawToken ?? undefined
      return await getJson<RecommendedWorkoutResponse>(
        `/api/trainers/${trainerId}/recommend-for/${userId}`,
        { token },
      )
    },
    enabled:
      isSignedIn &&
      !!trainerId &&
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
  const recommendedWorkout = filteredWorkouts.find(
    (workout) => workout.id === recommendation?.workoutId,
  )
  const recommendedWorkoutId = recommendedWorkout?.id.toString()
  const trainerFallbackId = filteredWorkouts[0]?.id?.toString()
  const currentWorkout = alreadyCompletedToday
    ? undefined
    : (recommendedWorkoutId ?? trainerFallbackId)
  const recommendedWorkoutReasoning = recommendedWorkout
    ? recommendation?.reasoning
    : undefined

  if (DEBUG) {
    console.debug('[useCurrentWorkout] state', {
      trainerId,
      userId,
      currentWorkout,
      recommendedWorkoutReasoning,
      workouts,
      filteredWorkouts,
    })
  }

  return {
    currentWorkout,
    workouts,
    filteredWorkouts,
    isLoading,
    isError,
    refetch,
    recommendedWorkoutReasoning,
    alreadyCompletedToday,
  }
}
