import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { getWorkoutCatalogDeclaration } from './getWorkoutCatalogDeclaration'
import { getWorkoutCatalogHandler } from './getWorkoutCatalogHandler'

export const workoutCatalogTool: LiveToolDefinition = {
  name: getWorkoutCatalogDeclaration.name,
  declaration: getWorkoutCatalogDeclaration,
  handler: getWorkoutCatalogHandler,
}
