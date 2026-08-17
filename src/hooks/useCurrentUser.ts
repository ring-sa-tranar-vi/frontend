import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getJson } from '../lib/api/fetcher'
import { useUpdateProfile } from './useUpdateProfile'
import type { BackendProgressResponse } from '../features/session/api'
import type { CurrentUserProfile } from '../features/session/types'

export default function useCurrentUser() {
  const { userId: clerkId, isSignedIn, getToken } = useAuth()
  const qc = useQueryClient()
  const updateProfileMutation = useUpdateProfile()

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery<CurrentUserProfile | null>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      if (!isSignedIn) return null
      const rawToken = await getToken()
      const token: string | undefined = rawToken ?? undefined
      return await getJson<CurrentUserProfile>(`/api/users/me/profile`, {
        token,
      })
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const { data: progress } = useQuery<BackendProgressResponse | null>({
    queryKey: ['myProgress'],
    queryFn: async () => {
      if (!isSignedIn) return null
      const rawToken = await getToken()
      const token: string | undefined = rawToken ?? undefined
      return await getJson<BackendProgressResponse>(`/api/users/me/progress`, {
        token,
      })
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const trainerId = profile?.trainerId ?? null
  const userId = profile?.id ? String(profile.id) : null
  const level = profile?.intensityLevel ?? null
  const context = profile?.context ?? null

  const currentStreak = progress?.currentStreak ?? null
  const completedWorkouts = progress?.completedWorkouts ?? null

  const updateProfile = useCallback(
    async (data: Partial<CurrentUserProfile>) => {
      const payload = {
        name: data.name ?? profile?.name ?? '',
        intensityLevel:
          data.intensityLevel ?? profile?.intensityLevel ?? /* default */ 3,
        context: data.context ?? profile?.context ?? '',
        trainerId:
          data.trainerId !== undefined
            ? data.trainerId
            : (profile?.trainerId ?? null),
        city: data.city !== undefined ? data.city : (profile?.city ?? null),
        onboarding: data.onboarding ? true : false,
      }

      await updateProfileMutation.mutateAsync(payload)
      await qc.invalidateQueries({ queryKey: ['myProfile'] })

      if (typeof payload.trainerId === 'number') {
        await qc.invalidateQueries({
          queryKey: ['trainer', String(payload.trainerId)],
        })
      }
    },
    [profile, qc, updateProfileMutation],
  )

  return useMemo(
    () => ({
      clerkId,
      isSignedIn,
      isProfileLoading,
      isProfileError,
      user: profile ?? null,
      userId,
      trainerId,
      level,
      context,
      refetchProfile,
      updateProfile,
      currentStreak,
      completedWorkouts,
    }),
    [
      clerkId,
      isSignedIn,
      isProfileLoading,
      isProfileError,
      profile,
      userId,
      trainerId,
      level,
      context,
      refetchProfile,
      updateProfile,
    ],
  )
}
