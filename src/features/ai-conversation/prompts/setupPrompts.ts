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
  const parts: string[] = []
  if (session.userName) {
    parts.push(`Användarens namn är ${session.userName}.`)
  }
  if (session.currentStreak && session.currentStreak > 0) {
    parts.push(`Nuvarande streak: ${session.currentStreak} dag(ar) i rad.`)
  }
  const last = session.completedWorkouts?.[0]
  if (last) {
    parts.push(`Senaste pass: ${last.workoutName} (${last.dateLabel}).`)
  }
  if (session.context?.trim()) {
    parts.push(`Bakgrund: ${session.context.trim()}`)
  }
  const workoutName = session.workoutName ?? session.name
  if (workoutName) {
    parts.push(`Dagens pass heter "${workoutName}".`)
  }
  if (session.instructions?.trim()) {
    parts.push(`Passets INSTRUKTIONER: ${session.instructions.trim()}`)
  }
  if (session.guidance?.trim()) {
    parts.push(`Passets GUIDNING: ${session.guidance.trim()}`)
  }
  const activities = calendarEvents?.filter((e) => !e.completed).map((e) => e)

  if (activities && activities.length > 0) {
    parts.push(
      `Användaren har följande kommande aktiviteter: ${activities.join(', ')}.`,
    )
  } else {
    parts.push('Användaren har inga kommande aktiviteter.')
  }
  return parts.join(' ')
}

export const PERSONA_STABILITY_INSTRUCTION =
  'Detta gäller alla trainers: behåll exakt samma trainer-personlighet, språk, dialekt, röststil, energi och tonläge genom hela samtalet, inklusive instruktioner, feedback, avbrott och avslut. Om trainerprompten säger nervös, lugn, hetsig, elegant, varm eller något annat ska det märkas konsekvent hela tiden. Använd användarkontexten för vad du säger, men byt aldrig persona.'

export const COACH_PROMPTS = {
  INSTRUCTIONS_DONE:
    'Instruktionerna har precis spelats klart. Invänta användarens svar på om de är redo att starta passet.',

  WORKOUT_DONE: (workoutName: string, progressSummary = '') =>
    `Passet "${workoutName}" är klart och sparat.${progressSummary ? ` ${progressSummary}` : ''} Invänta användarens svar på hur det kändes.`,

  NO_TOKEN_ERROR: 'Kunde inte starta coach-samtalet.',
  NO_WORKOUT_ERROR: 'Kunde inte hämta workout.',
  NO_MIC_ERROR: 'Kunde inte starta mikrofonen.',
  NO_INSTRUCTIONS_AUDIO: 'Instruktionsljud saknas för vald workout.',
  NO_WORKOUT_AUDIO: 'Workout-ljud saknas.',
}

export function buildGuestContext(session: CoachCallSession): string {
  const parts: string[] = []
  const workoutName = session.workoutName ?? session.name
  if (workoutName) {
    parts.push(`Dagens pass heter "${workoutName}".`)
  }
  if (session.instructions?.trim()) {
    parts.push(`Passets INSTRUKTIONER: ${session.instructions.trim()}`)
  }
  if (session.guidance?.trim()) {
    parts.push(`Passets GUIDNING: ${session.guidance.trim()}`)
  }
  return parts.join(' ')
}

export function buildSessionInstruction(
  session: CoachCallSession,
  trainerPrompt?: string | null,
  trainerName?: string | null,
  alreadyCompletedToday?: boolean,
  isSignedIn?: boolean,
  calendarEvents?: CalendarActivity[] | null,
) {
  const trainerNameLine = trainerName?.trim()
    ? `Ditt namn är ${trainerName.trim()}. `
    : ''
  if (!isSignedIn) {
    const guestContext = buildGuestContext(session)
    return `${guestContext} ${GUEST_SESSION_INSTRUCTION} ${trainerNameLine}${trainerPrompt?.trim() ?? ''} ${LANGUAGE_ADAPTATION_INSTRUCTION}`
  }
  const userContext = buildUserContext(session, calendarEvents)
  const trainerIdentity = trainerPrompt?.trim()
    ? `\n\nTrainer identity and style (apply this throughout the conversation):\n${trainerNameLine}${trainerPrompt.trim()}\n${PERSONA_STABILITY_INSTRUCTION} ${LANGUAGE_ADAPTATION_INSTRUCTION}`
    : `\n\nTrainer identity and style (apply this throughout the conversation):\n${trainerNameLine}${PERSONA_STABILITY_INSTRUCTION} ${LANGUAGE_ADAPTATION_INSTRUCTION}`

  if (alreadyCompletedToday) {
    return `${trainerIdentity}${userContext} ${ALREADY_COMPLETED_INSTRUCTION}`
  }

  if (session.onboarding) {
    return `${trainerIdentity}${userContext} ${ONBOARDING_SYSTEM_INSTRUCTION}`
  }

  return `${trainerIdentity}${userContext}${SESSION_INSTRUCTION}`
}
