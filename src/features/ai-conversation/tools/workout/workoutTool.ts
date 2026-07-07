import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { getWorkoutDetailsDeclaration } from './getWorkoutDetailsDeclaration'
import { getWorkoutDetailsHandler } from './getWorkoutDetailsHandler'

export const workoutTool: LiveToolDefinition = {
  name: getWorkoutDetailsDeclaration.name,
  declaration: getWorkoutDetailsDeclaration,
  handler: getWorkoutDetailsHandler,
}
