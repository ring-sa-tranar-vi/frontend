import type { CoachCallSession } from '../session/types'
import { ALREADY_COMPLETED_TOOLS } from './prompts/alreadyFinishedPrompt'
import { GUEST_SESSION_TOOLS } from './prompts/guestPrompts'
import { ONBOARDING_TOOLS } from './prompts/onboardingPrompts'
import { SESSION_TOOLS } from './prompts/standardPrompts'

export interface GetSessionToolsOptions {
  isSignedIn?: boolean
  alreadyCompletedToday?: boolean
  session: CoachCallSession
}

export function getSessionTools({
  isSignedIn,
  alreadyCompletedToday,
  session,
}: GetSessionToolsOptions) {
  if (!isSignedIn) {
    return [...GUEST_SESSION_TOOLS]
  }
  if (alreadyCompletedToday) {
    return [...ALREADY_COMPLETED_TOOLS]
  }
  if (session.onboarding) {
    return [...ONBOARDING_TOOLS]
  }
  return [...SESSION_TOOLS]
}
