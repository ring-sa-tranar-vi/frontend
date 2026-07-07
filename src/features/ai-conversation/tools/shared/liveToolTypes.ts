import type { FunctionDeclaration } from '@google/genai'

// Varje Gemini Live-tool består av en declaration och en handler.
// Declaration = vad Gemini ser och kan välja att kalla.
// Handler = frontend-koden som körs när Gemini kallar toolen.
export type LiveToolArgs = Record<string, unknown>

export type LiveToolHandler = (
  args: LiveToolArgs,
) => Promise<Record<string, unknown>>

export type LiveToolDefinition = {
  name: string
  declaration: FunctionDeclaration
  handler: LiveToolHandler
}

export type EndpointResult<T> =
  | {
      ok: true
      path: string
      data: T
    }
  | {
      ok: false
      path: string
      error: string
    }
