import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminUsers } from '../api/admins'

export function useAdminPage(enabled: boolean) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) {
        throw new Error('Missing auth token')
      }
      return fetchAdminUsers(token)
    },
    enabled,
  })
}
