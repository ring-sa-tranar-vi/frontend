import type { LiveToolDefinition } from '../shared/liveToolTypes'
import { createFeedbackDeclaration } from './createFeedbackDeclaration'
import { createFeedbackHandler } from './createFeedbackHandler'

export const feedbackTool: LiveToolDefinition = {
  name: createFeedbackDeclaration.name,
  declaration: createFeedbackDeclaration,
  handler: createFeedbackHandler,
}
