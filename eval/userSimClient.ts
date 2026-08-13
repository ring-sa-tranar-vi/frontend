import { GoogleGenAI } from '@google/genai'

// The simulated user has no production equivalent — there's no "real" auth
// path to match — so it just uses a plain API key against the regular text
// API instead of an ephemeral Live token (which only the coach needs).
export interface TextChatTurnResult {
  text: string
}

export interface TextChat {
  sendMessage(text: string): Promise<TextChatTurnResult>
  close(): void
}

const USER_SIM_FRAME = [
  'Du spelar en person i ett telefonsamtal med en AI-tränare.',
  'Svara ENDAST med det du skulle säga högt i telefonen — inga scenanvisningar, citattecken eller meta-kommentarer.',
  'Svara naturligt på det tränaren precis sa.',
  'Du får ALDRIG själv anropa några verktyg eller avsluta samtalet på egen hand — du bestämmer bara vad personen säger, inklusive att svara kort ("hej då", "tack") på tränarens avslutningsfras istället för att själv initiera det.',
].join(' ')

export interface CreateUserSimChatParams {
  apiKey: string
  model: string
  userInstruction: string
}

export function createUserSimChat(params: CreateUserSimChatParams): TextChat {
  const ai = new GoogleGenAI({ apiKey: params.apiKey })
  const systemInstruction = [USER_SIM_FRAME, params.userInstruction].join(' ')

  const chat = ai.chats.create({
    model: params.model,
    config: { systemInstruction },
  })

  return {
    async sendMessage(text: string) {
      const response = await chat.sendMessage({ message: text })
      return { text: response.text?.trim() ?? '' }
    },
    close() {},
  }
}
