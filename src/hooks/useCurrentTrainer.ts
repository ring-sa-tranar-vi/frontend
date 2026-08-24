import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Trainer } from '../features/session/types'
import { getJson } from '../lib/api/fetcher'

export const useCurrentTrainer = (trainerId: string) => {
  const {
    data: trainer,
    isLoading: isTrainerLoading,
    isError: isTrainerError,
    refetch: refetchTrainer,
  } = useQuery<Trainer | null>({
    queryKey: ['trainer', trainerId == null ? 'null' : String(trainerId)],
    queryFn: async () => {
      if (!trainerId) return null

      return await getJson<Trainer>(`/api/trainers/${trainerId}`)
    },
    enabled: !!trainerId,
    staleTime: 1000 * 60 * 60,
  })
  const voice = (trainer?.voice as string | undefined) ?? 'Kore'
  const coachPrompt = trainer?.prompt ?? null

  useEffect(() => {
    console.log('[useCurrentTrainer] state', {
      trainer,
      voice,
      coachPrompt,
      isTrainerLoading,
      isTrainerError,
    })
  }, [trainer, voice, coachPrompt, isTrainerLoading, isTrainerError])

  return {
    trainer,
    voice,
    coachPrompt,
    isTrainerLoading,
    isTrainerError,
    refetchTrainer,
  }
}
