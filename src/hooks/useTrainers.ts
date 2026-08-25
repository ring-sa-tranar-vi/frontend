import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { fetchTrainersWithToken } from '../api/trainers'

export const useTrainers = () => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      return await fetchTrainersWithToken(token)
    },
    staleTime: 1000 * 60 * 60,
  })
}
