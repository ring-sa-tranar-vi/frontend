import { turnHasTextAndToolCall, turnToolCallNames } from '../transcriptUtils'
import type {
  DeterministicCheckResult,
  ScenarioFixture,
  TranscriptTurn,
} from '../types'

const TERMINAL_TOOLS = new Set(['finish_session', 'end_guest_session'])

/**
 * All 4 production prompts share an explicit rule: never call the terminal tool
 * (finish_session/end_guest_session) in the same model turn as the goodbye text —
 * the coach must say goodbye, end its turn, and only call the tool in a LATER turn
 * after the user replied. This is mechanically checkable from the raw transcript,
 * so it doesn't need to rely on the (self-grading) LLM judge.
 */
function checkNoSameTurnGoodbyeAndTerminate(
  transcript: TranscriptTurn[],
): DeterministicCheckResult {
  const violation = transcript.find(
    (t) =>
      t.speaker === 'coach' &&
      turnHasTextAndToolCall(t) &&
      turnToolCallNames(t).some((name) => TERMINAL_TOOLS.has(name)),
  )
  return {
    id: 'two_party_goodbye_same_turn',
    pass: !violation,
    detail: violation
      ? `Tur ${violation.turn}: sa avslutningsfras och anropade avslutningsverktyg i samma tur.`
      : undefined,
  }
}

function checkTerminalToolMatchesExpected(
  transcript: TranscriptTurn[],
  scenario: ScenarioFixture,
): DeterministicCheckResult {
  const calledTerminalTools = transcript
    .flatMap((t) => turnToolCallNames(t))
    .filter((name) => TERMINAL_TOOLS.has(name))

  if (calledTerminalTools.length === 0) {
    return {
      id: 'terminal_tool_matches_expected',
      pass: false,
      detail: 'Inget avslutningsverktyg anropades.',
    }
  }

  const usedWrongTool = calledTerminalTools.some(
    (name) => name !== scenario.expectedTerminalTool,
  )
  return {
    id: 'terminal_tool_matches_expected',
    pass: !usedWrongTool,
    detail: usedWrongTool
      ? `Förväntade "${scenario.expectedTerminalTool}", fick: ${calledTerminalTools.join(', ')}.`
      : undefined,
  }
}

export function runDeterministicChecks(
  transcript: TranscriptTurn[],
  scenario: ScenarioFixture,
): DeterministicCheckResult[] {
  return [
    checkNoSameTurnGoodbyeAndTerminate(transcript),
    checkTerminalToolMatchesExpected(transcript, scenario),
  ]
}
