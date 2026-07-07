import { getProgressEndpoint } from '../progress/progressEndpoint'
import type { LiveToolArgs } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { getUserEndpoint } from '../user/userEndpoint'
import { getWorkoutEndpoint } from '../workout/workoutEndpoint'

const defaultUserId = 1
const defaultWorkoutId = 1

export async function getTrainingContextHandler(args: LiveToolArgs) {
  const userId = readNumberArg(args, 'userId', defaultUserId)
  const workoutId = readNumberArg(args, 'workoutId', defaultWorkoutId)

  const [user, progress, workout] = await Promise.all([
    getUserEndpoint(userId),
    getProgressEndpoint(userId),
    getWorkoutEndpoint(workoutId),
  ])

  const whatDataExists = {
    user: user.ok,
    progress: progress.ok,
    workout: workout.ok,
  }

  const missingData = [
    user.ok ? null : `user: ${user.error}`,
    progress.ok ? null : `progress: ${progress.error}`,
    workout.ok ? null : `workout: ${workout.error}`,
  ].filter(Boolean)

  return {
    userId,
    workoutId,
    whatDataExists,
    missingData,
    endpoints: {
      user,
      progress,
      workout,
    },
    user: user.ok ? user.data : null,
    progress: progress.ok ? progress.data : null,
    workout: workout.ok ? workout.data : null,
    usableCoachContext: {
      userContext: user.ok ? user.data.context : null,
      intensityLevel: user.ok ? user.data.intensityLevel : null,
      currentStreak: progress.ok ? progress.data.currentStreak : null,
      completedWorkouts: progress.ok ? progress.data.completedWorkouts : [],
      workoutName: workout.ok ? workout.data.name : null,
      workoutInstructions: workout.ok ? workout.data.instructions : null,
      workoutType: workout.ok ? workout.data.type : null,
      workoutLevel: workout.ok ? workout.data.level : null,
      accessibility: workout.ok
        ? {
            kneeFriendly: workout.data.kneeFriendly ?? null,
            lowImpact: workout.data.lowImpact ?? null,
            seated: workout.data.seated ?? null,
            beginnerFriendly: workout.data.beginnerFriendly ?? null,
          }
        : null,
    },
    note: 'Frontend called existing REST endpoints on the deployed backend. Backend has no Gemini or AI-dev orchestration here.',
  }
}
