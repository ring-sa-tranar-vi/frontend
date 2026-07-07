import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { createActivityDeclaration } from './createActivityDeclaration'
import { createActivityHandler } from './createActivityHandler'

export const activityTool: LiveToolDefinition = {
  name: createActivityDeclaration.name,
  declaration: createActivityDeclaration,
  handler: createActivityHandler,
}
