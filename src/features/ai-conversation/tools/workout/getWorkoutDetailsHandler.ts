import type { LiveToolArgs } from '../shared/liveToolTypes'
import { readNumberArg } from '../shared/readNumberArg'
import { getWorkoutEndpoint } from './workoutEndpoint'

const defaultWorkoutId = 1

export async function getWorkoutDetailsHandler(args: LiveToolArgs) {
  const workoutId = readNumberArg(args, 'workoutId', defaultWorkoutId)
  const workout = await getWorkoutEndpoint(workoutId)

  return {
    workoutId,
    endpoint: workout,
    workout: workout.ok ? workout.data : null,
    usableCoachContext: {
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
  }
}
