import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import fetchAdminPage from '../api/admins'

export function useAdminPage(enabled: boolean) {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['admin-page'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('No token')

      return fetchAdminPage(token)
    },
    enabled: !!isSignedIn && enabled,
  })
}
