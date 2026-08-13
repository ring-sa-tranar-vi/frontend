import type { ToolListUnion } from '@google/genai'
import { createLiveChat, type LiveChat } from './liveChat'
import { mintLiveToken } from './liveToken'

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
  const token = await mintLiveToken(params.apiBaseUrl)
  return createLiveChat({
    apiKey: token,
    model: params.model,
    systemInstruction: params.systemInstruction,
    tools: params.tools,
    voice: params.voice ?? undefined,
  })
}
