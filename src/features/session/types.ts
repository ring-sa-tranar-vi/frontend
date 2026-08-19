export type SessionPanel = 'none' | 'info' | 'exercise' | 'suite'

export type CompletedWorkout = {
  dateLabel: string
  workoutName: string
}

export type Workout = {
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

export type CurrentUserProfile = {
  id: number
  trainerId: number | null
  intensityLevel: number | null
  name?: string | null
  context?: string | null
  isAdmin?: boolean
  city?: string | null
  onboarding?: boolean
  currentStreak?: number | null
  completedWorkouts?: CompletedWorkout[] | null
}

export type Trainer = {
  id: number
  name: string
  prompt?: string | null
  voice?: string | null
  intro?: string | null
  language?: string | null
  imageSelect?: string | null
  imageCall?: string | null
  imageStart?: string | null
  ambience?: string | null
}

export type CoachCallSession = {
  workoutId: number | string
  isAuthenticated: boolean
  workoutName?: string
  dashboardName?: string | null
  description?: string | null
  dashboardDescription?: string | null
  instructions?: string | null
  guidance?: string | null
  level?: number | string | null
  type?: string | null
  image?: string | null
  video?: string | null
  trainer?: Trainer | null
  userName?: string | null
  intensityLevel?: number | null
  context?: string | null
  currentStreak?: number | null
  completedWorkouts?: CompletedWorkout[] | null
  onboarding?: boolean | null
}

export type OnboardingStage = 'confirm_name' | 'intensity' | 'context' | 'done'
