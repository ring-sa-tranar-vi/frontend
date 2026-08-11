import { getJson } from '../../lib/api/fetcher'
import type {
  CoachCallSession,
  CurrentUserProfile,
  Trainer,
  Workout,
} from './types'

export type BackendTrainerResponse = {
  id: number
  name: string
  prompt: string
  voice: string
  intro: string
  language: string
  imageSelect: string | null
  imageCall: string | null
  imageStart: string | null
  ambience: string | null
}

export type BackendProgressResponse = {
  currentStreak: number
  completedWorkouts: Array<{
    dateLabel: string
    workoutName: string
  }>
}

const DEFAULT_TRAINER_ID = 1

function toTrainerSummary(
  trainer: BackendTrainerResponse | ({ id: number } & Partial<Trainer>) | null,
): Trainer | null {
  if (!trainer) {
    return null
  }

  if (!trainer.name?.trim()) {
    return null
  }

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
    ambience: trainer.ambience ?? null,
  }
}

export async function getTrainers(
  token?: string | null,
): Promise<BackendTrainerResponse[]> {
  return await getJson<BackendTrainerResponse[]>(`/api/trainers`, {
    token: token ?? undefined,
  })
}

export async function getTrainer(
  trainerId: string,
  token?: string | null,
): Promise<BackendTrainerResponse> {
  return await getJson<BackendTrainerResponse>(`/api/trainers/${trainerId}`, {
    token: token ?? undefined,
  })
}

export async function getCoachCallSession(
  user: CurrentUserProfile | null,
  workout: Workout | null,
  token?: string | null,
): Promise<CoachCallSession> {
  let progress: BackendProgressResponse | null = null

  if (token) {
    try {
      progress = await getJson<BackendProgressResponse>(
        `/api/users/me/progress`,
        { token },
      )
    } catch (error) {
      console.warn('[session/api] Could not fetch user progress', error)
    }
  }

  const resolvedTrainerId = user?.trainerId ?? DEFAULT_TRAINER_ID

  let trainer: BackendTrainerResponse | null = null

  try {
    trainer = await getTrainer(String(resolvedTrainerId), token)
  } catch (error) {
    console.warn('[session/api] Could not fetch trainer details', error)
  }

  const resolvedTrainer =
    toTrainerSummary(trainer) ??
    (resolvedTrainerId === DEFAULT_TRAINER_ID
      ? {
          id: DEFAULT_TRAINER_ID,
          name: 'Eva',
          prompt: null,
          voice: null,
          intro: null,
          language: null,
          imageSelect: null,
          imageCall: null,
          imageStart: null,
        }
      : null)

  return {
    id: workout?.id ?? 0,
    isAuthenticated: Boolean(token && user),

    name: workout ? workout.dashboardName || workout.name : undefined,
    workoutName: workout ? workout.dashboardName || workout.name : undefined,
    dashboardName: workout?.dashboardName,
    description: workout
      ? workout.dashboardDescription || workout.description
      : undefined,
    dashboardDescription: workout?.dashboardDescription,
    instructions: workout
      ? (workout.instructions ??
        workout.dashboardDescription ??
        workout.description)
      : undefined,
    guidance: workout?.guidance,

    level: workout?.level,
    type: workout?.type,

    image: workout?.image,
    video: workout?.video,

    trainer: resolvedTrainer,

    userName: user?.name,
    intensityLevel: user?.intensityLevel,
    context: user?.context,

    currentStreak: progress?.currentStreak,
    completedWorkouts: progress?.completedWorkouts,
    onboarding: user?.onboarding ?? undefined,
  }
}
