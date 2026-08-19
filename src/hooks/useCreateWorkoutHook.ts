import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkoutWithToken } from '../api/workouts'

export function useCreateWorkout(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: unknown) => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      return createWorkoutWithToken(data, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}
