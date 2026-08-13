import type { CalendarActivity } from '../src/features/HomePage/components/menu/types'
import type { CoachCallSession } from '../src/features/session/types'

export type ScenarioId = 'standard' | 'onboarding' | 'guest' | 'alreadyFinished'

export type TerminalTool = 'finish_session' | 'end_guest_session'

export interface WorkoutCatalogItem {
  id: number
  name: string
  description?: string
  level?: string
}

export interface ScenarioFixture {
  id: ScenarioId
  label: string
  session: CoachCallSession
  isSignedIn: boolean
  alreadyCompletedToday: boolean
  trainerPrompt?: string | null
  trainerName?: string | null
  trainerVoice?: string | null
  calendarEvents?: CalendarActivity[] | null
  workoutsCatalog: WorkoutCatalogItem[]
  expectedTerminalTool: TerminalTool
}

export type Speaker = 'coach' | 'user'

export type TranscriptEvent =
  | { kind: 'text'; text: string }
  | { kind: 'toolCall'; name: string; args: Record<string, unknown> }

export interface TranscriptTurn {
  turn: number
  speaker: Speaker
  events: TranscriptEvent[]
}

export interface ToolCallLogEntry {
  turn: number
  name: string
  args: Record<string, unknown>
  ok: boolean
  errorText?: string
}

export interface DeterministicCheckResult {
  id: string
  pass: boolean
  detail?: string
}

export interface RubricItemResult {
  id: string
  pass: boolean
  reasoning: string
}

export interface JudgeVerdict {
  overallPass: boolean
  score: number
  items: RubricItemResult[]
  summary: string
}

export type TerminatedBy = 'terminal_tool' | 'turn_cap' | 'error'

export interface RunResult {
  scenarioId: ScenarioId
  scenarioLabel: string
  runIndex: number
  transcript: TranscriptTurn[]
  toolLog: ToolCallLogEntry[]
  deterministic: DeterministicCheckResult[]
  terminatedBy: TerminatedBy
  turnCount: number
  judge: JudgeVerdict | null
  startedAt: string
  finishedAt: string
  error?: string
}
