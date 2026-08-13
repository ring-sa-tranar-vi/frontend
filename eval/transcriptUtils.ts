import type { TranscriptTurn } from './types'

export function turnText(turn: TranscriptTurn): string {
  return turn.events
    .filter((e) => e.kind === 'text')
    .map((e) => e.text)
    .join(' ')
    .trim()
}

export function turnToolCallNames(turn: TranscriptTurn): string[] {
  return turn.events.filter((e) => e.kind === 'toolCall').map((e) => e.name)
}

/** True if `turn` has both spoken text and a tool call, in either order. */
export function turnHasTextAndToolCall(turn: TranscriptTurn): boolean {
  const hasText = turn.events.some(
    (e) => e.kind === 'text' && e.text.trim().length > 0,
  )
  const hasToolCall = turn.events.some((e) => e.kind === 'toolCall')
  return hasText && hasToolCall
}
