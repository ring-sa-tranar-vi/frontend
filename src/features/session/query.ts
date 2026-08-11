import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { getCoachCallSession, getTrainer } from './api'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { CurrentUserProfile, Workout } from './types'

export function coachCallSessionQueryOptions(
  user: CurrentUserProfile | null,
  workout: Workout | null,
  token?: string | null,
  userScope?: string | null,
) {
  return {
    queryKey: [
      'coach-call-session',
      workout?.id ?? 'no-workout',
      token ? (userScope ?? 'auth') : 'guest',
    ] as const,
    queryFn: () => getCoachCallSession(user, workout, token),
    retry: 1,
  }
}

export function useCoachCallSession(workout: Workout | null) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useCurrentUser()
  return useQuery({
    queryKey: [
      'coach-call-session',
      workout?.id ?? 'no-workout',
      isLoaded ? (isSignedIn ? (userId ?? 'auth') : 'guest') : 'auth-loading',
    ] as const,
    queryFn: async () => {
      const token = isLoaded && isSignedIn ? await getToken() : null
      return getCoachCallSession(user, workout, token)
    },
    enabled: isLoaded,
    retry: 1,
  })
}

export function trainerQueryOptions(trainerId: string, token?: string | null) {
  return {
    queryKey: ['trainer', trainerId, token ? 'auth' : 'guest'] as const,
    queryFn: () => getTrainer(trainerId, token),
    retry: 1,
  }
}

export function useTrainer(trainerId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: [
      'trainer',
      trainerId,
      isLoaded ? (isSignedIn ? 'auth' : 'guest') : 'auth-loading',
    ] as const,
    queryFn: async () => {
      const token = isSignedIn ? await getToken() : null
      return getTrainer(trainerId, token)
    },
    enabled: isLoaded && isSignedIn,
    retry: 1,
  })
}
