export type SessionPanel = 'none' | 'info' | 'exercise' | 'suite'

export type CompletedWorkout = {
  dateLabel: string
  workoutName: string
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
  id: number | string
  isAuthenticated: boolean

  // Backend använder "name" för workout-namnet
  name?: string

  // Behålls för äldre frontend-kod
  workoutName?: string

  // English dashboard display name (used when name/description is in another language)
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

  userName?: string
  intensityLevel?: number
  context?: string

  currentStreak?: number
  completedWorkouts?: CompletedWorkout[]
  onboarding?: boolean
}

export type OnboardingStage = 'confirm_name' | 'intensity' | 'context' | 'done'
