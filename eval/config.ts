// Same Live model production uses (see LIVE_MODEL in
// src/features/ai-conversation/core/useGeminiLive.ts). Only the coach talks
// to this model — it's the one actor whose auth+transport we want to match
// exactly (ephemeral token via the backend, AUDIO-modality Live connection).
const DEFAULT_COACH_MODEL = 'gemini-3.1-flash-live-preview'
// Simulated user + judge are pure eval scaffolding with no production
// equivalent, so they use a plain text model via a regular API key instead.
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash'

export interface EvalConfig {
  apiBaseUrl: string
  apiKey: string
  coachModel: string
  userModel: string
  judgeModel: string
  maxTurns: number
}

export function loadConfig(): EvalConfig {
  const apiBaseUrl = (
    process.env.EVAL_API_BASE_URL ??
    process.env.VITE_API_URL ??
    process.env.API_BASE ??
    'http://localhost:8080'
  ).replace(/\/$/, '')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY saknas. Lägg till den i din befintliga .env (endast simulator/domare använder den — coachen använder ephemeral tokens från backend). Se eval/README.md.',
    )
  }

  return {
    apiBaseUrl,
    apiKey,
    coachModel: process.env.EVAL_COACH_MODEL ?? DEFAULT_COACH_MODEL,
    userModel: process.env.EVAL_USER_MODEL ?? DEFAULT_TEXT_MODEL,
    judgeModel: process.env.EVAL_JUDGE_MODEL ?? DEFAULT_TEXT_MODEL,
    maxTurns: Number(process.env.EVAL_MAX_TURNS ?? 20),
  }
}
