import type { ToastType } from '../../hooks/useToast.ts'

export type WorkoutForm = {
  name: string
  description: string
  dashboardName: string
  dashboardDescription: string
  instructions: string
  guidance: string
  level: number
  type: string
  image: string
  video: string
}

export type WorkoutResponse = {
  id: number
  name?: string
  description?: string
  dashboardName?: string | null
  dashboardDescription?: string | null
  instructions?: string | null
  guidance?: string | null
  level?: number
  type?: string
  image?: string | null
  video?: string | null
  enabled?: boolean
}

export type FeedbackRow = {
  workoutId: number
  workoutName: string
  feedbackCount: number
  avgRating: number
  dislikeRate: number
  tooHardRate: number
  status: 'GOOD' | 'NEEDS_REVIEW' | 'BAD'
}

export type Workout = {
  id: number
  name: string
  type?: string
  level?: number
  enabled?: boolean
}

export type StatusFn = (
  message: string,
  options?: { type?: ToastType; duration?: number },
) => void

export type Trainer = {
  id: number
  name: string
  prompt: string
  voice: string
  intro: string
  language: string
  imageSelect?: string | null
  imageCall?: string | null
  imageStart?: string | null
  ambience?: string | null
}

export type TrainerForm = {
  name: string
  prompt: string
  voice: string
  intro: string
  language: string
  imageSelect: string
  imageCall: string
  imageStart: string
  ambience: string
}
