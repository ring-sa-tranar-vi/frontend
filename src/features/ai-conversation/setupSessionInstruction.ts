import type { CalendarActivity } from '../HomePage/components/menu/types'
import type { CoachCallSession } from '../session/types'
import { ALREADY_COMPLETED_INSTRUCTION } from './prompts/alreadyFinishedPrompt'
import { GUEST_SESSION_INSTRUCTION } from './prompts/guestPrompts'
import { ONBOARDING_SYSTEM_INSTRUCTION } from './prompts/onboardingPrompts'

import { buildGuestContext, buildUserContext } from './prompts/setupPrompts'
import { SESSION_INSTRUCTION } from './prompts/standardPrompts'

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
    return `${guestContext} ${GUEST_SESSION_INSTRUCTION} ${trainerNameLine}${trainerPrompt?.trim() ?? ''}`
  }
  const userContext = buildUserContext(session, calendarEvents)
  const personaStability =
    'Detta gäller alla trainers: behåll exakt samma trainer-personlighet, språk, dialekt, röststil, energi och tonläge genom hela samtalet, inklusive instruktioner, feedback, avbrott och avslut. Om trainerprompten säger nervös, lugn, hetsig, elegant, varm eller något annat ska det märkas konsekvent hela tiden. Använd användarkontexten för vad du säger, men byt aldrig persona.'
  const trainerIdentity = trainerPrompt?.trim()
    ? `\n\nTrainer identity and style (apply this throughout the conversation):\n${trainerNameLine}${trainerPrompt.trim()}\n${personaStability}`
    : `\n\nTrainer identity and style (apply this throughout the conversation):\n${trainerNameLine}${personaStability}`

  if (alreadyCompletedToday) {
    return `${trainerIdentity}${userContext} ${ALREADY_COMPLETED_INSTRUCTION}`
  }

  if (session.onboarding) {
    return `${trainerIdentity}${userContext} ${ONBOARDING_SYSTEM_INSTRUCTION}`
  }

  return `${trainerIdentity}${userContext}${SESSION_INSTRUCTION}`
}
