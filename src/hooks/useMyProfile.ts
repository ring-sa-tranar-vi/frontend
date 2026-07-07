import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import fetchMyProfile from '../api/users'

export function useMyProfile() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not signed in')
      }

      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      return fetchMyProfile(token)
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
