import type { FunctionResponse } from '@google/genai'
import type { RefObject } from 'react'
import type { CoachSessionStep } from '../ai-conversation'
import type {
  AITurnState,
  ProfileSuggestions,
} from '../ai-conversation/helpers'

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
  subtitleText?: string | null
  instructionsSubtitleText?: string | null
  workoutInstructions?: string | null
  workoutGuidance?: string | null

  level?: number | string | null
  type?: string | null

  instructionsAudio?: string | null
  workoutAudio?: string | null
  instructionsAudioUrl?: string | null
  workoutAudioUrl?: string | null

  instructionsImage?: string | null
  workoutImage?: string | null

  instructionsVideo?: string | null
  instructionsVideoStart?: number | null
  instructionsVideoStop?: number | null

  kneeFriendly?: boolean
  lowImpact?: boolean
  seated?: boolean
  beginnerFriendly?: boolean

  durationSeconds: number

  trainer?: Trainer | null

  userName?: string
  intensityLevel?: number
  context?: string

  currentStreak?: number
  completedWorkouts?: CompletedWorkout[]
  onboarding?: boolean
}

export type OnboardingStage = 'confirm_name' | 'intensity' | 'context' | 'done'

export interface ToolExecutionContext {
  stepRef: RefObject<CoachSessionStep>
  onboardingStageRef: RefObject<OnboardingStage>
  aiTurnStateRef: RefObject<AITurnState>
  finishSessionRef: RefObject<
    (summary?: string, suggestions?: ProfileSuggestions) => void
  >
  updateUserNameRef: RefObject<(userName: string) => Promise<void>>
  updateIntensityLevelRef: RefObject<(intensityLevel: number) => Promise<void>>
  updateUserContextRef: RefObject<(context: string) => Promise<void>>
  onboardingToTrainingRef: RefObject<() => Promise<void>>
  endOnboardingRef: RefObject<() => Promise<void>>
  addDebugEvent: (
    label: string,
    detail?: string | number | boolean | null,
  ) => void
  setSessionStep: (nextStep: CoachSessionStep) => void
  getAiPlaybackRemainingMs: () => number
}

export type ToolHandlerFn<TArgs = Record<string, any>> = (
  callId: string,
  args: TArgs,
  ctx: ToolExecutionContext,
) => Promise<FunctionResponse>
