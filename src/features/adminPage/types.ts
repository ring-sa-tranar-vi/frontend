import type { ToastType } from '../../hooks/useToast.ts'

export type TrainerOption = {
  id: number
  name: string
}

export type WorkoutForm = {
  name: string
  description: string
  dashboardName: string
  dashboardDescription: string
  subtitleText: string
  instructionsSubtitleText: string
  level: number
  type: string
  durationSeconds: number
  instructionsAudio: string
  workoutAudio: string
  instructionsImage: string
  workoutImage: string
  instructionsVideo: string
  instructionsVideoStart: string
  instructionsVideoStop: string
  kneeFriendly: boolean
  lowImpact: boolean
  seated: boolean
  beginnerFriendly: boolean
  trainerId: string
}

export type WorkoutResponse = {
  id: number
  name?: string
  description?: string
  dashboardName?: string | null
  dashboardDescription?: string | null
  subtitleText?: string | null
  instructionsSubtitleText?: string | null
  level?: number
  type?: string
  durationSeconds?: number
  instructionsAudio?: string
  workoutAudio?: string
  instructionsImage?: string
  workoutImage?: string
  instructionsVideo?: string | null
  instructionsVideoStart?: number | null
  instructionsVideoStop?: number | null
  kneeFriendly?: boolean
  lowImpact?: boolean
  seated?: boolean
  beginnerFriendly?: boolean
  trainer?: {
    id?: number
  } | null
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
  durationSeconds?: number
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
