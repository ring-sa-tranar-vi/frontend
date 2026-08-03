import { getJson } from '../../lib/api/fetcher'
import type { CoachCallSession, Trainer } from './types'

type BackendWorkoutResponse = {
  id: number
  name: string
  description?: string | null
  dashboardName?: string | null
  dashboardDescription?: string | null
  instructions?: string | null
  guidance?: string | null
  level?: number | string | null
  type?: string | null

  image?: string | null
  video?: string | null
}
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

type BackendProgressResponse = {
  currentStreak: number
  completedWorkouts: Array<{
    dateLabel: string
    workoutName: string
  }>
}

type BackendUserResponse = {
  id: number
  name: string
  intensityLevel: number
  context: string
  trainerId?: number | null
  onboarding?: boolean | null
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

export async function getTrainers(): Promise<BackendTrainerResponse[]> {
  return await getJson<BackendTrainerResponse[]>(`/api/trainers`)
}

export async function getTrainer(
  trainerId: string,
): Promise<BackendTrainerResponse> {
  return await getJson<BackendTrainerResponse>(`/api/trainers/${trainerId}`)
}

export async function getWorkouts(): Promise<BackendWorkoutResponse[]> {
  return await getJson<BackendWorkoutResponse[]>(`/api/workouts`)
}

export async function getCoachCallSession(
  workoutId: string | undefined,
  token?: string | null,
): Promise<CoachCallSession> {
  const workout = workoutId
    ? await getJson<BackendWorkoutResponse>(`/api/workouts/${workoutId}`)
    : null

  let user: BackendUserResponse | null = null
  let progress: BackendProgressResponse | null = null

  if (token) {
    try {
      user = await getJson<BackendUserResponse>(`/api/users/me/profile`, {
        token,
      })
    } catch (error) {
      console.warn('[session/api] Could not fetch user profile', error)
    }

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
    trainer = await getTrainer(String(resolvedTrainerId))
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
