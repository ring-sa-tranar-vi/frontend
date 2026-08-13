// src/features/ai-conversation's helpers.ts calls window.setTimeout at call time
// (sleep(), waitForAIToFinishSpeaking()) since it's normally only ever imported by
// browser code. Alias window -> globalThis so those calls resolve under plain Node
// when the eval harness reuses dispatchToolCall() unmodified. Must be imported first,
// before any src/ module executes a tool call.
if (typeof window === 'undefined') {
  ;(globalThis as unknown as { window: typeof globalThis }).window = globalThis
}
