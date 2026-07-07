import { fallbackIntroWorkoutId } from '../shared/liveIntroDefaults'
import { getWorkoutCatalogEndpoint } from './workoutEndpoint'

export async function getWorkoutCatalogHandler() {
  const workouts = await getWorkoutCatalogEndpoint()
  const simplifiedWorkouts = workouts.ok
    ? workouts.data.map((workout) => ({
        id: workout.id,
        name: workout.name,
        type: workout.type ?? null,
        level: workout.level ?? null,
        durationMinutes: workout.durationMinutes ?? null,
        kneeFriendly: workout.kneeFriendly ?? null,
        lowImpact: workout.lowImpact ?? null,
        seated: workout.seated ?? null,
        beginnerFriendly: workout.beginnerFriendly ?? null,
      }))
    : []

  const recommendedFallbackWorkoutId =
    simplifiedWorkouts.find(
      (workout) =>
        workout.beginnerFriendly &&
        workout.lowImpact &&
        (workout.seated || workout.kneeFriendly),
    )?.id ??
    simplifiedWorkouts.find(
      (workout) => workout.beginnerFriendly && workout.lowImpact,
    )?.id ??
    simplifiedWorkouts[0]?.id ??
    fallbackIntroWorkoutId

  return {
    endpoint: workouts,
    workoutCount: simplifiedWorkouts.length,
    workouts: simplifiedWorkouts,
    recommendedFallbackWorkoutId,
    note: 'Use this catalog to pick the intro workout. After choosing, call get_workout_details exactly once for the selected workout id.',
  }
}
