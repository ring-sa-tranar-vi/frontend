import { useAuth, useUser } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { createCurrentUser } from '../../lib/auth/clerkUser'

type ProfileResponse = {
  name: string
  intensityLevel: number
  context: string
  trainerId?: number | null
  isAdmin?: boolean
}

export function useCreateCurrentUserProfile() {
  const { isLoaded, isSignedIn, getToken, sessionClaims, userId } = useAuth()
  const { isLoaded: isUserLoaded, user } = useUser()
  const queryClient = useQueryClient()
  const lastSyncedUserIdRef = useRef<string | null>(null)
  const createUserMutation = useMutation({
    mutationFn: createCurrentUser,
    onSuccess: (profile: ProfileResponse | null) => {
      if (profile) {
        queryClient.setQueryData(['myProfile'], profile)
      }

      queryClient.invalidateQueries({
        queryKey: ['myProfile'],
        refetchType: 'active',
      })
    },
  })

  const clerkUserId = sessionClaims?.sub ?? userId ?? null

  useEffect(() => {
    if (!isLoaded || !isUserLoaded || !isSignedIn || !clerkUserId) {
      return
    }

    if (lastSyncedUserIdRef.current === clerkUserId) {
      return
    }

    lastSyncedUserIdRef.current = clerkUserId

    void (async () => {
      const token = await getToken()
      const claims = (sessionClaims ?? {}) as Record<string, unknown>
      const claimName = [
        'name',
        'full_name',
        'given_name',
        'preferred_username',
        'email',
      ]
        .map((key) => claims[key])
        .find(
          (value) => typeof value === 'string' && value.trim().length > 0,
        ) as string | undefined

      const displayName =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.username?.trim() ||
        user?.primaryEmailAddress?.emailAddress?.trim() ||
        claimName?.trim() ||
        ''

      if (!token) {
        return
      }

      await createUserMutation.mutateAsync({ token, displayName })
    })().catch(() => {
      lastSyncedUserIdRef.current = null
    })
  }, [
    clerkUserId,
    createUserMutation,
    getToken,
    isLoaded,
    isUserLoaded,
    isSignedIn,
    queryClient,
    sessionClaims,
    user,
  ])
}
