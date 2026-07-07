import type { LiveToolArgs } from '../shared/liveToolTypes'
import { fixedLiveUserId } from '../shared/liveIntroDefaults'
import { getProgressEndpoint } from './progressEndpoint'

export async function getProgressHandler(args: LiveToolArgs) {
  void args
  const userId = fixedLiveUserId
  const progress = await getProgressEndpoint(userId)

  return {
    userId,
    endpoint: progress,
    progress: progress.ok ? progress.data : null,
    usableCoachContext: {
      currentStreak: progress.ok ? progress.data.currentStreak : null,
      completedWorkouts: progress.ok ? progress.data.completedWorkouts : [],
    },
  }
}
