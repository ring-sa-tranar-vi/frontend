import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { getTrainingContextDeclaration } from './getTrainingContextDeclaration'
import { getTrainingContextHandler } from './getTrainingContextHandler'

export const trainingContextTool: LiveToolDefinition = {
  name: getTrainingContextDeclaration.name,
  declaration: getTrainingContextDeclaration,
  handler: getTrainingContextHandler,
}
