import type { CalendarActivity } from '../../HomePage/components/menu/types'
import type { CoachCallSession } from '../../session/types'

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
  if (session.workoutInstructions?.trim()) {
    parts.push(`Passets INSTRUKTIONER: ${session.workoutInstructions.trim()}`)
  }
  if (session.workoutGuidance?.trim()) {
    parts.push(`Passets GUIDNING: ${session.workoutGuidance.trim()}`)
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
  if (session.workoutInstructions?.trim()) {
    parts.push(`Passets INSTRUKTIONER: ${session.workoutInstructions.trim()}`)
  }
  if (session.workoutGuidance?.trim()) {
    parts.push(`Passets GUIDNING: ${session.workoutGuidance.trim()}`)
  }
  return parts.join(' ')
}
