import { useQuery } from '@tanstack/react-query'
import type { Trainer } from '../features/session/types'
import { getJson } from '../lib/api/fetcher'
import { useAuth } from '@clerk/react'

export const useCurrentTrainer = (trainerId: string) => {
  const { getToken, isSignedIn } = useAuth()
  const {
    data: trainer,
    isLoading: isTrainerLoading,
    isError: isTrainerError,
    refetch: refetchTrainer,
  } = useQuery<Trainer | null>({
    queryKey: ['trainer', trainerId == null ? 'null' : String(trainerId)],
    queryFn: async () => {
      if (!trainerId || !isSignedIn) return null
      const rawToken = await getToken()
      const token: string | undefined = rawToken ?? undefined
      return await getJson<Trainer>(`/api/trainers/${trainerId}`, { token })
    },
    enabled: !!trainerId && isSignedIn,
    staleTime: 1000 * 60 * 60,
  })
  const voice = (trainer?.voice as string | undefined) ?? 'Kore'
  const coachPrompt = trainer?.prompt ?? null
  return {
    trainer,
    voice,
    coachPrompt,
    isSignedIn,
    isTrainerLoading,
    isTrainerError,
    refetchTrainer,
  }
}
