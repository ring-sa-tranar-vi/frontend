import type { LiveToolArgs } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { postActivityEndpoint } from './activityEndpoint'
import { getProgressEndpoint } from '../progress/progressEndpoint'

export async function createActivityHandler(args: LiveToolArgs) {
  const userId = readNumberArg(args, 'userId', 1)
  const workoutId = readNumberArg(args, 'workoutId', 1)
  const durationSeconds = readNumberArg(args, 'durationSeconds', 0)

  const activity = await postActivityEndpoint(
    userId,
    workoutId,
    durationSeconds,
  )

  const progress = await getProgressEndpoint(userId)

  return {
    userId,
    workoutId,
    activityLogId: activity.ok ? activity.data.id : null,
    activityEndpoint: activity,
    progressEndpoint: progress,
    activity: activity.ok ? activity.data : null,
    progress: progress.ok ? progress.data : null,
    usableCoachContext: {
      currentStreak: progress.ok ? progress.data.currentStreak : null,
      completedWorkouts: progress.ok ? progress.data.completedWorkouts : [],
    },
  }
}
