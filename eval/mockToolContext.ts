import { dispatchToolCall } from '../src/features/ai-conversation/tools/toolRegistry'
import type { WorkoutCatalogItem } from './types'

// ToolExecutionContext isn't exported by toolRegistry.ts — derive it structurally
// from dispatchToolCall's own parameter type instead of hand-duplicating the field list.
export type ToolExecutionContext = Parameters<typeof dispatchToolCall>[1]

export interface MockCtxOptions {
  workoutsCatalog: WorkoutCatalogItem[]
  currentWorkoutLevel?: string | number | null
  onSideEffect: (label: string, detail?: string) => void
}

export interface MockToolContext {
  ctx: ToolExecutionContext
  /** Mirrors production's get_workouts side-channel: returns and clears a queued
   * follow-up chat message the orchestrator must send after the tool-response round-trip. */
  consumePendingFollowUp: () => string | null
}

export function createMockToolExecutionContext(
  opts: MockCtxOptions,
): MockToolContext {
  let pendingFollowUp: string | null = null

  const stub =
    (label: string) =>
    (...args: unknown[]) => {
      const detail = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .filter(Boolean)
        .join(' ')
      opts.onSideEffect(label, detail || undefined)
    }

  const ctx: ToolExecutionContext = {
    stepRef: { current: 'idle' },
    setSessionStep: (nextStep) => {
      ctx.stepRef.current = nextStep
      opts.onSideEffect('setSessionStep', nextStep)
    },
    onboardingStageRef: { current: 'confirm_name' },
    aiTurnStateRef: { current: { started: false, complete: false } },
    finishSessionRef: { current: stub('finishSession') },
    getWorkoutsRef: {
      current: () => {
        const filtered = opts.workoutsCatalog.filter(
          (w) => w.level !== opts.currentWorkoutLevel,
        )
        pendingFollowUp = `These are your available workouts: ${filtered
          .map((w) => `${w.id}: Name: ${w.name}, Level: ${w.level}`)
          .join(', ')}`
        opts.onSideEffect('get_workouts', pendingFollowUp)
      },
    },
    changeWorkoutRef: { current: stub('changeWorkout') },
    finishedWorkoutRef: { current: stub('workoutCompleted') },
    startWorkoutVideoRef: { current: stub('startWorkoutVideo') },
    updateUserNameRef: {
      current: async (userName: string) => stub('updateUserName')(userName),
    },
    updateIntensityLevelRef: {
      current: async (level: number) => stub('updateIntensityLevel')(level),
    },
    updateUserContextRef: {
      current: async (context: string) => stub('updateUserContext')(context),
    },
    onboardingToTrainingRef: {
      current: async () => stub('onboardingToTraining')(),
    },
    endOnboardingRef: { current: async () => stub('endOnboarding')() },
    addDebugEvent: (label, detail) =>
      opts.onSideEffect(label, detail == null ? undefined : String(detail)),
    getAiPlaybackRemainingMs: () => 0,
  }

  return {
    ctx,
    consumePendingFollowUp: () => {
      const value = pendingFollowUp
      pendingFollowUp = null
      return value
    },
  }
}
