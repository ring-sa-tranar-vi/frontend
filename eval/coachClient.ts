import type { ToolListUnion } from '@google/genai'
import { createLiveChat, type LiveChat } from './liveChat'
import { mintLiveToken } from './liveToken'
import { timeIt } from './timing'

export interface CreateCoachChatParams {
  apiBaseUrl: string
  model: string
  systemInstruction: string
  tools: ToolListUnion
  voice?: string | null
}

export async function createCoachChat(
  params: CreateCoachChatParams,
): Promise<LiveChat> {
  const token = await timeIt('mint ephemeral token', () =>
    mintLiveToken(params.apiBaseUrl),
  )
  return timeIt('coach Live connect', () =>
    createLiveChat({
      apiKey: token,
      model: params.model,
      systemInstruction: params.systemInstruction,
      tools: params.tools,
      voice: params.voice ?? undefined,
    }),
  )
}
