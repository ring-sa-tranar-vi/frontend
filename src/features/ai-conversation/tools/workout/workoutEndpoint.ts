import { getEndpoint } from '../shared/endpointClient'
import type { BackendWorkoutResponse } from './workoutTypes'

// Workout-domainens backend-call. Den använder befintlig deployad REST endpoint.
export function getWorkoutEndpoint(workoutId: number) {
  return getEndpoint<BackendWorkoutResponse>(`/api/workouts/${workoutId}`)
}
