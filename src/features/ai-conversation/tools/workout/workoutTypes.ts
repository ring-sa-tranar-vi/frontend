import type { Trainer } from '../../../session/types'

export type BackendWorkoutResponse = {
  id: number
  name: string
  description?: string | null
  instructions?: string | null

  level?: number | string | null
  type?: string | null

  instructionsAudio?: string | null
  workoutAudio?: string | null
  instructionsImage?: string | null
  workoutImage?: string | null

  durationMinutes?: number | null
  durationSeconds?: number | null

  kneeFriendly?: boolean
  lowImpact?: boolean
  seated?: boolean
  beginnerFriendly?: boolean

  trainer?: Trainer | null
}
