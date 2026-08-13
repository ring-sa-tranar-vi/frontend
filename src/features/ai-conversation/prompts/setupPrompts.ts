import type { CalendarActivity } from '../../HomePage/components/menu/types'
import type { CoachCallSession } from '../../session/types'
import { ALREADY_COMPLETED_INSTRUCTION } from './alreadyFinishedPrompt'
import { GUEST_SESSION_INSTRUCTION } from './guestPrompts'
import { ONBOARDING_SYSTEM_INSTRUCTION } from './onboardingPrompts'
import { SESSION_INSTRUCTION } from './standardPrompts'

export function buildUserContext(
  session: CoachCallSession,
  calendarEvents?: CalendarActivity[] | null,
): string {
  const parts: string[] = ['# USER INFORMATION']

  if (session.userName) {
    parts.push(`- USER NAME: ${session.userName}.`)
  }
  if (session.currentStreak && session.currentStreak > 0) {
    parts.push(`- CURRENT STREAK: ${session.currentStreak} day(s) in a row.`)
  }
  const last = session.completedWorkouts?.[0]
  if (last) {
    parts.push(`- LAST WORKOUT: ${last.workoutName} (${last.dateLabel}).`)
  }
  if (session.intensityLevel) {
    parts.push(`- INTENSITY LEVEL: ${session.intensityLevel}.`)
  }
  if (session.context?.trim()) {
    parts.push(`- CONTEXT: ${session.context.trim()}`)
  }

  const activities = calendarEvents?.filter((e) => !e.completed).map((e) => e)

  if (activities && activities.length > 0) {
    parts.push(`- UPCOMING ACTIVITIES: ${activities.join(', ')}.`)
  } else {
    parts.push('- NO UPCOMING ACTIVITIES.')
  }

  return parts.join('\n')
}

export function buildWorkoutContext(session: CoachCallSession): string {
  const parts: string[] = ["# TODAY'S WORKOUT"]
  const workoutName = session.workoutName ?? session.name

  if (workoutName) {
    parts.push(`- WORKOUT NAME: "${workoutName}".`)
  }
  if (session.instructions?.trim()) {
    parts.push(`## INSTRUCTIONS: ${session.instructions.trim()}`)
  }
  if (session.guidance?.trim()) {
    parts.push(`## GUIDANCE: ${session.guidance.trim()}`)
  }

  return parts.join('\n')
}

export const LANGUAGE_ADAPTATION_INSTRUCTION = `
# LANGUAGE ADAPTATION
- If the user asks you to switch languages, speak the new language with an accent from your original language.
- Translate exercise names into the language you are speaking so that non-English words do not appear in an English conversation.
`.trim()

export const PERSONA_STABILITY_INSTRUCTION = `
# PERSONA STABILITY
This applies to all trainers:
- Maintain the exact same trainer persona, language, dialect, vocal style, energy, and tone throughout the entire conversation, including instructions, feedback, interruptions, and sign-offs.
- If the trainer prompt specifies nervous, calm, intense, elegant, warm, or anything else, ensure it is consistently reflected at all times.
- Use the user context for what you say, but never break character or change persona.
`.trim()

export const COACH_PROMPTS = {
  INSTRUCTIONS_DONE: `
    # STATUS UPDATE
    - The instructions have just finished playing. Await the user's response regarding whether they are ready to start the workout.`,
  WORKOUT_DONE: (workoutName: string, progressSummary = '') =>
    `# WORKOUT COMPLETED
  - The workout "${workoutName}" is complete and saved.${
    progressSummary ? ` ${progressSummary}` : ''
  }
    - Await the user's response on how it felt.`,

  NO_TOKEN_ERROR: 'Could not start the coach session.',
  NO_WORKOUT_ERROR: 'Could not retrieve the workout.',
  NO_MIC_ERROR: 'Could not start the microphone.',
  NO_INSTRUCTIONS_AUDIO:
    'Instruction audio is missing for the selected workout.',
  NO_WORKOUT_AUDIO: 'Workout audio is missing.',
} as const

// ============================================================================
// CONTEXT BUILDERS
// ============================================================================

export function buildGuestContext(session: CoachCallSession): string {
  const workoutName = session.workoutName ?? session.name

  const parts = [
    '# USER INFORMATION',
    workoutName && `- TODAY'S WORKOUT: "${workoutName}".`,
    session.instructions?.trim() &&
      `- ## INSTRUCTIONS:\n${session.instructions.trim()}`,
    session.guidance?.trim() && `- ## GUIDANCE:\n${session.guidance.trim()}`,
  ].filter(Boolean)

  return parts.join('\n')
}

function buildTrainerIdentity(
  trainerName?: string | null,
  trainerPrompt?: string | null,
): string {
  const nameLine = trainerName?.trim()
    ? `Your name is ${trainerName.trim()}.\n`
    : ''
  const customPrompt = trainerPrompt?.trim()
    ? `${nameLine}${trainerPrompt.trim()}\n\n`
    : nameLine

  return [
    '# TRAINER IDENTITY AND STYLE',
    'Apply this throughout the conversation:',
    customPrompt ? `- ${customPrompt}` : null,
    PERSONA_STABILITY_INSTRUCTION,
    LANGUAGE_ADAPTATION_INSTRUCTION,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildSessionInstruction(
  session: CoachCallSession,
  trainerPrompt?: string | null,
  trainerName?: string | null,
  alreadyCompletedToday?: boolean,
  isSignedIn?: boolean,
  calendarEvents?: CalendarActivity[] | null,
): string {
  const trainerNameLine = trainerName?.trim()
    ? `Your name is ${trainerName.trim()}.\n`
    : ''

  const workoutContext = buildWorkoutContext(session)

  // Guest Flow
  if (!isSignedIn) {
    const guestContext = buildGuestContext(session)
    const trainerIdentity = `# TRAINER IDENTITY\n${trainerNameLine}${trainerPrompt?.trim() ?? ''}`

    return [
      trainerIdentity,
      LANGUAGE_ADAPTATION_INSTRUCTION,
      GUEST_SESSION_INSTRUCTION,
      guestContext,
      workoutContext,
    ].join('\n\n')
  }

  // Authenticated User Flow
  const userContext = buildUserContext(session, calendarEvents)
  const trainerIdentity = buildTrainerIdentity(trainerName, trainerPrompt)

  let baseInstruction = SESSION_INSTRUCTION
  if (alreadyCompletedToday) {
    baseInstruction = ALREADY_COMPLETED_INSTRUCTION
  } else if (session.onboarding) {
    baseInstruction = ONBOARDING_SYSTEM_INSTRUCTION
  }

  return [trainerIdentity, baseInstruction, userContext, workoutContext].join(
    '\n\n',
  )
}
