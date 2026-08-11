import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getJson } from '../lib/api/fetcher'
import { useUpdateProfile } from './useUpdateProfile'

type CurrentUserProfile = {
  id: number
  trainerId: number | null
  intensityLevel: number | null
  name?: string | null
  context?: string | null
  isAdmin?: boolean
  city?: string | null
  onboarding?: boolean
}

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

  const trainerId = profile?.trainerId ?? null
  const userId = profile?.id ? String(profile.id) : null
  const level = profile?.intensityLevel ?? null
  const context = profile?.context ?? null

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
