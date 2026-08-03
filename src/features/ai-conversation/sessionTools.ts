import type { CoachCallSession } from '../session/types'
import {
  ALREADY_COMPLETED_TOOLS,
  SESSION_CONTROL_TOOLS,
  ONBOARDING_TOOLS,
} from './prompts'
import { GUEST_SESSION_TOOLS } from './prompts'

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
  return [...SESSION_CONTROL_TOOLS]
}
