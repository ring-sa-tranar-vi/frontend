import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { fetchTrainers, fetchTrainersWithToken } from '../api/trainers'

export const useTrainers = () => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) {
        return await fetchTrainers()
      }

      return await fetchTrainersWithToken(token)
    },
    staleTime: 1000 * 60 * 60,
  })
}
