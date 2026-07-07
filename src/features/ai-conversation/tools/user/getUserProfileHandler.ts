import { readNumberArg } from '../shared/readNumberArg'
import type { LiveToolArgs } from '../shared/liveToolTypes'
import { getUserEndpoint } from './userEndpoint'

const defaultUserId = 1

export async function getUserProfileHandler(args: LiveToolArgs) {
  const userId = readNumberArg(args, 'userId', defaultUserId)
  const user = await getUserEndpoint(userId)

  return {
    userId,
    endpoint: user,
    user: user.ok ? user.data : null,
    usableCoachContext: {
      userContext: user.ok ? user.data.context : null,
      intensityLevel: user.ok ? user.data.intensityLevel : null,
    },
  }
}
