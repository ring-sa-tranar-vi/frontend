import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { getUserProfileDeclaration } from './getUserProfileDeclaration'
import { getUserProfileHandler } from './getUserProfileHandler'

export const userTool: LiveToolDefinition = {
  name: getUserProfileDeclaration.name,
  declaration: getUserProfileDeclaration,
  handler: getUserProfileHandler,
}
