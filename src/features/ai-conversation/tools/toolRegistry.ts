import { type FunctionResponse } from '@google/genai'
import {
  readFeedbackSummary,
  readProfileSuggestions,
  sleep,
  waitForAIToFinishSpeaking,
  type AITurnState,
  type CoachSessionStep,
  type ProfileSuggestions,
} from '../helpers'
import type { OnboardingStage } from '../../session/types'
import type { RefObject } from 'react'

// ─────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────
const toolRegistry: Record<string, ToolHandlerFn> = {
  //──────────────────────
  // Start Workout Video
  //──────────────────────
  start_workout_video: async (id, _args, ctx) => {
    ctx.addDebugEvent('start_workout_video')
    ctx.startWorkoutVideoRef.current()
    return createSuccessResponse(id, 'start_workout_video')
  },

  //──────────────────────
  // Change Workout
  //──────────────────────

  change_workout: async (id, args, ctx) => {
    ctx.addDebugEvent('change_workout')
    ctx.changeWorkoutRef.current(
      args.workout_id as number,
      args.reasoning as string,
    )
    return createSuccessResponse(id, 'change_workout')
  },

  //──────────────────────
  // Get Workouts
  //──────────────────────
  get_workouts: async (id, _args, ctx) => {
    ctx.addDebugEvent('get_workouts')
    ctx.getWorkoutsRef.current()
    return createSuccessResponse(id, 'get_workouts')
  },

  //──────────────────────
  // Workout Completed
  //──────────────────────
  workout_completed: async (id, _args, ctx) => {
    ctx.addDebugEvent('workout_completed')
    ctx.finishedWorkoutRef.current()
    return createSuccessResponse(id, 'workout_completed')
  },

  //──────────────────────
  // End Guest Session
  //──────────────────────
  end_guest_session: async (id, _args, ctx) => {
    ctx.addDebugEvent('end_guest_session')
    ctx.finishSessionRef.current()
    return createSuccessResponse(id, 'end_guest_session')
  },

  //──────────────────────
  // Onboarding: User Name
  //──────────────────────
  confirm_user_name: async (id, args, ctx) => {
    ctx.onboardingStageRef.current = 'intensity'
    const name = String(args.name ?? '')
    ctx.addDebugEvent('onboarding-name', name)
    void ctx.updateUserNameRef.current(name)
    return createSuccessResponse(id, 'confirm_user_name')
  },

  //──────────────────────
  // Onboarding: Intensity Level
  //──────────────────────
  set_workout_intensity_level: async (id, args, ctx) => {
    ctx.onboardingStageRef.current = 'context'
    ctx.addDebugEvent('onboarding-intensity', String(args.level ?? 'undefined'))

    if (typeof args.level !== 'number') {
      return createErrorResponse(
        id,
        'set_workout_intensity_level',
        'Invalid intensity level',
      )
    }

    void ctx.updateIntensityLevelRef.current(Number(args.level))
    return createSuccessResponse(id, 'set_workout_intensity_level')
  },

  //──────────────────────
  // Onboarding: Context
  //──────────────────────
  set_workout_context: async (id, args, ctx) => {
    ctx.onboardingStageRef.current = 'done'
    ctx.addDebugEvent('onboarding-context', JSON.stringify(args))
    void ctx.updateUserContextRef.current(String(args.context ?? ''))
    return createSuccessResponse(id, 'set_workout_context')
  },

  //──────────────────────
  // Onboarding -> Training
  //──────────────────────
  onboarding_to_training: async (id, args, ctx) => {
    ctx.onboardingStageRef.current = 'done'
    ctx.addDebugEvent('onboarding-to-training', JSON.stringify(args))
    ctx.setSessionStep('waiting_instruction_approval')
    void ctx.onboardingToTrainingRef.current()
    return createSuccessResponse(id, 'onboarding_to_training')
  },

  //──────────────────────
  // Onboarding: Complete
  //──────────────────────
  end_onboarding: async (id, args, ctx) => {
    ctx.onboardingStageRef.current = 'done'
    ctx.addDebugEvent('onboarding-complete', JSON.stringify(args))
    void ctx.endOnboardingRef.current()
    return createSuccessResponse(id, 'end_onboarding')
  },

  //──────────────────────
  // Finish Session
  //──────────────────────
  finish_session: async (id, _args, ctx) => {
    await sleep(100)
    const finished = await waitForAIToFinishSpeaking(
      () => ctx.aiTurnStateRef.current,
      () => ctx.getAiPlaybackRemainingMs(),
      { timeoutMs: 10000 },
    )

    if (!finished) {
      ctx.addDebugEvent('wait-for-ai-timeout', 'Proceeding anyway...')
    }

    // Pass the raw function call object if needed by helpers
    const rawCall = { name: 'finish_session', id, args: _args }
    ctx.finishSessionRef.current(
      readFeedbackSummary(rawCall as any),
      readProfileSuggestions(rawCall as any),
    )

    return createSuccessResponse(id, 'finish_session')
  },
}

interface ToolExecutionContext {
  stepRef: RefObject<CoachSessionStep>
  setSessionStep: (nextStep: CoachSessionStep) => void

  onboardingStageRef: RefObject<OnboardingStage>
  aiTurnStateRef: RefObject<AITurnState>
  finishSessionRef: RefObject<
    (summary?: string, suggestions?: ProfileSuggestions) => void
  >
  getWorkoutsRef: RefObject<() => void>
  changeWorkoutRef: RefObject<(workoutId: number, reasoning: string) => void>
  finishedWorkoutRef: RefObject<() => void>
  startWorkoutVideoRef: RefObject<() => void>
  updateUserNameRef: RefObject<(userName: string) => Promise<void>>
  updateIntensityLevelRef: RefObject<(intensityLevel: number) => Promise<void>>
  updateUserContextRef: RefObject<(context: string) => Promise<void>>
  onboardingToTrainingRef: RefObject<() => Promise<void>>
  endOnboardingRef: RefObject<() => Promise<void>>
  addDebugEvent: (
    label: string,
    detail?: string | number | boolean | null,
  ) => void
  getAiPlaybackRemainingMs: () => number
}

export type ToolHandlerFn<TArgs = Record<string, any>> = (
  callId: string,
  args: TArgs,
  ctx: ToolExecutionContext,
) => Promise<FunctionResponse>

// ─────────────────────────────────────────────────────────────
// Master Dispatcher
// ─────────────────────────────────────────────────────────────
export async function dispatchToolCall(
  functionCall: any,
  ctx: ToolExecutionContext,
): Promise<FunctionResponse> {
  const name = functionCall.name ?? 'unknown_tool'
  const callId = functionCall.id ?? 'unknown_id'
  const args = (functionCall.args ?? {}) as Record<string, unknown>

  ctx.addDebugEvent('tool call', `${name}, step=${ctx.stepRef.current}`)

  // 1. Look up tool in local registry
  const handler = toolRegistry[name]
  if (handler) {
    return handler(callId, args, ctx)
  }

  // 2. Send back an error response if tool not found
  return createErrorResponse(
    callId,
    name,
    `Tool "${name}" not found in registry`,
  )
}
// Helpers to format standard success/error responses quickly
const createSuccessResponse = (
  id: string,
  name: string,
  output: Record<string, any> = { ok: true },
): FunctionResponse => ({
  id,
  name,
  response: { output },
})

const createErrorResponse = (
  id: string,
  name: string,
  error: string,
): FunctionResponse => ({
  id,
  name,
  response: { output: { ok: false, error } },
})
