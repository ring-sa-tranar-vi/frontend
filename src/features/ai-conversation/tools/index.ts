import type {
  FunctionCall,
  FunctionResponse,
  ToolListUnion,
} from '@google/genai'
import { progressTool } from './progress/progressTool'
import { activityTool } from './activity/activityTool'
import { feedbackTool } from './feedback/feedbackTool'
import type { LiveToolDefinition } from './shared/liveToolTypes'
import { trainingContextTool } from './trainingContext/trainingContextTool'
import { userTool } from './user/userTool'
import { workoutCatalogTool } from './workout/workoutCatalogTool'
import { workoutTool } from './workout/workoutTool'

// Det här är den enda filen som kopplar ihop alla tools med Gemini Live.
// För att lägga till ett nytt tool:
// 1. Välj domänmapp: user, progress, workout eller skapa en ny
// 2. Skapa declaration + handler + *Tool.ts i den mappen
// 3. Lägg till tool-objektet i liveToolDefinitions nedan
const liveToolDefinitions: LiveToolDefinition[] = [
  progressTool,
  activityTool,
  feedbackTool,
  trainingContextTool,
  userTool,
  workoutCatalogTool,
  workoutTool,
]

const liveToolHandlers = Object.fromEntries(
  liveToolDefinitions.map((tool) => [tool.name, tool.handler]),
)

export const liveTools: ToolListUnion = [
  {
    functionDeclarations: liveToolDefinitions.map((tool) => tool.declaration),
  },
]

export const coachLiveTools: ToolListUnion = [
  {
    functionDeclarations: liveToolDefinitions
      .filter(
        (tool) =>
          !['get_training_context', 'create_feedback'].includes(tool.name),
      )
      .map((tool) => tool.declaration),
  },
]

export async function executeLiveToolCall(
  functionCall: FunctionCall,
): Promise<FunctionResponse> {
  const name = functionCall.name ?? 'unknown_tool'
  const handler = liveToolHandlers[name]

  if (!handler) {
    return {
      id: functionCall.id,
      name,
      response: {
        error: `Unknown live tool: ${name}`,
      },
    }
  }

  try {
    const output = await handler(functionCall.args ?? {})

    return {
      id: functionCall.id,
      name,
      response: {
        output,
      },
    }
  } catch (error) {
    return {
      id: functionCall.id,
      name,
      response: {
        error: error instanceof Error ? error.message : 'Live tool failed.',
      },
    }
  }
}
