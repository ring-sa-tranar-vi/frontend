import {
  GoogleGenAI,
  MediaResolution,
  Modality,
  type FunctionCall,
  type FunctionResponse,
  type LiveServerMessage,
  type Session,
  type ToolListUnion,
} from '@google/genai'

// A Node-side counterpart to
// src/features/ai-conversation/core/useGeminiLive.ts, used only for the
// coach — the one actor whose production auth+transport we actually want to
// match. Reuses the exact same ai.live.connect() config production uses
// (AUDIO modality — these Live models reject Modality.TEXT, confirmed
// empirically) instead of trying to avoid audio. We harvest text via
// outputAudioTranscription and discard the synthesized audio bytes rather
// than playing them.
const DEFAULT_VOICE = 'Puck'

export type LiveChatTurnEvent =
  { kind: 'text'; text: string } | { kind: 'toolCall'; calls: FunctionCall[] }

export interface LiveChatTurnResult {
  // Chronological order the events actually arrived in, so callers can tell
  // whether a tool call happened before/after/interleaved with speech.
  events: LiveChatTurnEvent[]
  text: string
  functionCalls: FunctionCall[]
}

export interface LiveChat {
  sendMessage(text: string): Promise<LiveChatTurnResult>
  sendFunctionResponses(
    responses: FunctionResponse[],
  ): Promise<LiveChatTurnResult>
  close(): void
}

export interface CreateLiveChatParams {
  apiKey: string // ephemeral token, minted via mintLiveToken()
  model: string
  systemInstruction?: string
  tools?: ToolListUnion
  voice?: string
}

function flatten(events: LiveChatTurnEvent[]): {
  text: string
  functionCalls: FunctionCall[]
} {
  return {
    text: events
      .filter(
        (e): e is Extract<LiveChatTurnEvent, { kind: 'text' }> =>
          e.kind === 'text',
      )
      .map((e) => e.text)
      .join('')
      .trim(),
    functionCalls: events.flatMap((e) =>
      e.kind === 'toolCall' ? e.calls : [],
    ),
  }
}

export function createLiveChat(
  params: CreateLiveChatParams,
): Promise<LiveChat> {
  return new Promise((resolveConnect, rejectConnect) => {
    const ai = new GoogleGenAI({
      apiKey: params.apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    })

    let resolveTurn: ((result: LiveChatTurnResult) => void) | null = null
    let rejectTurn: ((error: Error) => void) | null = null
    let pendingEvents: LiveChatTurnEvent[] = []
    let connected = false
    let sessionRef: Session | null = null

    function settleTurn() {
      const events = pendingEvents
      pendingEvents = []
      const resolve = resolveTurn
      resolveTurn = null
      rejectTurn = null
      resolve?.({ events, ...flatten(events) })
    }

    void ai.live
      .connect({
        model: params.model,
        config: {
          responseModalities: [Modality.AUDIO],
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          systemInstruction: params.systemInstruction
            ? { parts: [{ text: params.systemInstruction }] }
            : undefined,
          tools: params.tools,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: params.voice ?? DEFAULT_VOICE },
            },
          },
        },
        callbacks: {
          onopen: () => {
            connected = true
          },
          onmessage: (message: LiveServerMessage) => {
            // AUDIO modality: text lives in outputTranscription, not
            // message.text (that getter reads modelTurn text parts, which
            // are empty here — modelTurn instead carries inlineData audio we
            // deliberately never read).
            const text = message.serverContent?.outputTranscription?.text
            if (text) {
              const last = pendingEvents[pendingEvents.length - 1]
              if (last?.kind === 'text') {
                last.text += text
              } else {
                pendingEvents.push({ kind: 'text', text })
              }
            }

            const calls = message.toolCall?.functionCalls ?? []
            if (calls.length > 0)
              pendingEvents.push({ kind: 'toolCall', calls })

            const turnDone =
              Boolean(message.serverContent?.turnComplete) ||
              Boolean(message.serverContent?.waitingForInput) ||
              calls.length > 0

            if (turnDone && resolveTurn) settleTurn()
          },
          onerror: (e: ErrorEvent) => {
            const err = new Error(e.message || 'Gemini Live websocket error.')
            if (!connected) {
              rejectConnect(err)
              return
            }
            rejectTurn?.(err)
            resolveTurn = null
            rejectTurn = null
          },
          onclose: (e: CloseEvent) => {
            if (!connected) {
              rejectConnect(
                new Error(
                  e.reason || `Gemini Live closed with code ${e.code}.`,
                ),
              )
              return
            }
            if (rejectTurn) {
              rejectTurn(
                new Error(
                  e.reason || `Gemini Live closed with code ${e.code}.`,
                ),
              )
              resolveTurn = null
              rejectTurn = null
            }
          },
        },
      })
      .then((session) => {
        sessionRef = session
        resolveConnect({
          sendMessage(text: string) {
            return new Promise<LiveChatTurnResult>((resolve, reject) => {
              resolveTurn = resolve
              rejectTurn = reject
              sessionRef?.sendClientContent({
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true,
              })
            })
          },
          sendFunctionResponses(responses: FunctionResponse[]) {
            return new Promise<LiveChatTurnResult>((resolve, reject) => {
              resolveTurn = resolve
              rejectTurn = reject
              sessionRef?.sendToolResponse({ functionResponses: responses })
            })
          },
          close() {
            sessionRef?.close()
          },
        })
      })
      .catch(rejectConnect)
  })
}
