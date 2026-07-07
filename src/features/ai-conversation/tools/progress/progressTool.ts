import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { getProgressDeclaration } from './getProgressDeclaration'
import { getProgressHandler } from './getProgressHandler'

export const progressTool: LiveToolDefinition = {
  name: getProgressDeclaration.name,
  declaration: getProgressDeclaration,
  handler: getProgressHandler,
}
