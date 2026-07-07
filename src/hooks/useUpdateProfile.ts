import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiBaseUrl } from '../lib/apiBaseUrl'
import { setStoredTrainerId } from '../features/HomePage/trainerPreference'
import type { CoachCallSession, Trainer } from '../features/session/types'

const API_URL = getApiBaseUrl()

type ProfileData = {
  name: string
  intensityLevel: number
  context: string
  trainerId?: number | null
}

type ProfileResponse = ProfileData
type CachedProfile = ProfileResponse & {
  id?: number
  isAdmin?: boolean
}

type TrainerResponse = {
  id: number
  name: string
  prompt?: string | null
  voice?: string | null
  intro?: string | null
  language?: string | null
  imageSelect?: string | null
  imageCall?: string | null
  imageStart?: string | null
}

type CachedTrainerListItem = {
  id: number
  name: string
  prompt?: string | null
  voice?: string | null
  intro?: string | null
  language?: string | null
  imageSelect?: string | null
  imageCall?: string | null
  imageStart?: string | null
}

function toTrainerSummary(trainer: CachedTrainerListItem): Trainer {
  return {
    id: trainer.id,
    name: trainer.name,
    prompt: trainer.prompt ?? null,
    voice: trainer.voice ?? null,
    intro: trainer.intro ?? null,
    language: trainer.language ?? null,
    imageSelect: trainer.imageSelect ?? null,
    imageCall: trainer.imageCall ?? null,
    imageStart: trainer.imageStart ?? null,
  }
}

async function fetchTrainerSummary(trainerId: number): Promise<Trainer | null> {
  const response = await fetch(`${API_URL}/api/trainers/${trainerId}`)

  if (!response.ok) {
    return null
  }

  const trainer = (await response.json()) as TrainerResponse

  if (!trainer.name?.trim()) {
    return null
  }

  return toTrainerSummary(trainer)
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useMutation({
    mutationFn: async (data: ProfileData): Promise<ProfileResponse> => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not signed in')
      }

      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      const res = await fetch(`${API_URL}/api/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error(
          '[useUpdateProfile] Update failed:',
          res.status,
          errorText,
        )
        throw new Error(`Update failed: ${res.status}`)
      }

      return res.json()
    },
    onSuccess: async (profile) => {
      if (typeof profile.trainerId === 'number') {
        setStoredTrainerId(profile.trainerId)
      }

      const cachedTrainers = queryClient.getQueryData<CachedTrainerListItem[]>([
        'trainers',
      ])

      const cachedTrainer =
        typeof profile.trainerId === 'number'
          ? cachedTrainers?.find((trainer) => trainer.id === profile.trainerId)
          : undefined

      const trainer = cachedTrainer ? toTrainerSummary(cachedTrainer) : null

      if (trainer) {
        queryClient.setQueryData(['trainer', String(trainer.id)], trainer)
      }

      queryClient.setQueryData<CachedProfile | undefined>(
        ['myProfile'],
        (current) => ({
          ...current,
          ...profile,
        }),
      )

      queryClient.setQueriesData<CoachCallSession>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'coach-call-session' &&
            query.queryKey[2] === 'auth',
        },
        (current) => {
          if (!current) {
            return current
          }

          return {
            ...current,
            userName: profile.name,
            intensityLevel: profile.intensityLevel,
            context: profile.context,
            trainer:
              trainer ??
              (typeof profile.trainerId === 'number'
                ? {
                    id: profile.trainerId,
                    name:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.name
                        : 'Tränare',
                    prompt:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.prompt
                        : null,
                    voice:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.voice
                        : null,
                    intro:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.intro
                        : null,
                    language:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.language
                        : null,
                    imageSelect:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.imageSelect
                        : null,
                    imageCall:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.imageCall
                        : null,
                    imageStart:
                      current.trainer?.id === profile.trainerId
                        ? current.trainer.imageStart
                        : null,
                  }
                : current.trainer),
          }
        },
      )

      if (!trainer && typeof profile.trainerId === 'number') {
        const fetchedTrainer = await fetchTrainerSummary(profile.trainerId)

        if (!fetchedTrainer) {
          return
        }

        queryClient.setQueryData(
          ['trainer', String(fetchedTrainer.id)],
          fetchedTrainer,
        )
        queryClient.setQueriesData<CoachCallSession>(
          {
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === 'coach-call-session' &&
              query.queryKey[2] === 'auth',
          },
          (current) => {
            if (!current || current.trainer?.id !== fetchedTrainer.id) {
              return current
            }

            return {
              ...current,
              trainer: fetchedTrainer,
            }
          },
        )
      }

      void queryClient.invalidateQueries({
        queryKey: ['coach-call-session'],
      })
    },
    onError: (error) => {
      console.error('[useUpdateProfile]', error)
    },
  })
}
