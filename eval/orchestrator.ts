import type { FunctionResponse } from '@google/genai'
import { buildSessionInstruction } from '../src/features/ai-conversation/prompts/setupPrompts'
import { getSessionTools } from '../src/features/ai-conversation/tools/setupSessionTools'
import { dispatchToolCall } from '../src/features/ai-conversation/tools/toolRegistry'
import { runDeterministicChecks } from './checks/deterministic'
import { createCoachChat } from './coachClient'
import type { EvalConfig } from './config'
import type { LiveChat, LiveChatTurnResult } from './liveChat'
import {
  createMockToolExecutionContext,
  type ToolExecutionContext,
} from './mockToolContext'
import type {
  RunResult,
  ScenarioFixture,
  TerminatedBy,
  ToolCallLogEntry,
  TranscriptEvent,
  TranscriptTurn,
} from './types'
import { createUserSimChat, type TextChat } from './userSimClient'

interface TerminatedState {
  terminated: boolean
}

function pushCoachEvents(
  transcript: TranscriptTurn[],
  turn: number,
  resp: LiveChatTurnResult,
): void {
  if (resp.events.length === 0) return
  const events: TranscriptEvent[] = resp.events.flatMap(
    (e): TranscriptEvent[] => {
      if (e.kind === 'text') return [{ kind: 'text', text: e.text }]
      return e.calls.map((c) => ({
        kind: 'toolCall',
        name: c.name ?? 'unknown',
        args: (c.args ?? {}) as Record<string, unknown>,
      }))
    },
  )
  transcript.push({ turn, speaker: 'coach', events })
}

async function processCoachTurn(
  initialResp: LiveChatTurnResult,
  turn: number,
  coachChat: LiveChat,
  mockCtx: ToolExecutionContext,
  consumeFollowUp: () => string | null,
  transcript: TranscriptTurn[],
  toolLog: ToolCallLogEntry[],
  terminatedState: TerminatedState,
): Promise<LiveChatTurnResult> {
  let resp = initialResp

  for (;;) {
    const calls = resp.functionCalls
    pushCoachEvents(transcript, turn, resp)

    if (calls.length === 0) {
      const followUp = consumeFollowUp()
      if (!followUp) return resp
      resp = await coachChat.sendMessage(followUp)
      continue
    }

    const responses: FunctionResponse[] = []
    for (const fc of calls) {
      const res = await dispatchToolCall(fc, mockCtx)
      const output = (res.response?.output ?? {}) as {
        ok?: boolean
        error?: string
      }
      toolLog.push({
        turn,
        name: fc.name ?? 'unknown',
        args: (fc.args ?? {}) as Record<string, unknown>,
        ok: output.ok !== false,
        errorText: output.error,
      })
      responses.push(res)
      if (res.name === 'finish_session' || res.name === 'end_guest_session') {
        terminatedState.terminated = true
      }
    }

    resp = await coachChat.sendFunctionResponses(responses)

    if (terminatedState.terminated) {
      pushCoachEvents(transcript, turn, resp)
      return resp
    }
  }
}

export async function runConversation(
  scenario: ScenarioFixture,
  userInstruction: string,
  runIndex: number,
  cfg: EvalConfig,
): Promise<RunResult> {
  const startedAt = new Date().toISOString()
  const transcript: TranscriptTurn[] = []
  const toolLog: ToolCallLogEntry[] = []
  const terminatedState: TerminatedState = { terminated: false }
  let turn = 0
  let terminatedBy: TerminatedBy = 'turn_cap'
  let error: string | undefined
  let coachChat: LiveChat | undefined
  let userChat: TextChat | undefined

  try {
    const systemInstruction = buildSessionInstruction(
      scenario.session,
      scenario.trainerPrompt,
      scenario.trainerName,
      scenario.alreadyCompletedToday,
      scenario.isSignedIn,
      scenario.calendarEvents,
    )
    const tools = getSessionTools({
      isSignedIn: scenario.isSignedIn,
      alreadyCompletedToday: scenario.alreadyCompletedToday,
      session: scenario.session,
    })

    coachChat = await createCoachChat({
      apiBaseUrl: cfg.apiBaseUrl,
      model: cfg.coachModel,
      systemInstruction,
      tools,
      voice: scenario.trainerVoice,
    })
    userChat = createUserSimChat({
      apiKey: cfg.apiKey,
      model: cfg.userModel,
      userInstruction,
    })
    const { ctx: mockCtx, consumePendingFollowUp } =
      createMockToolExecutionContext({
        workoutsCatalog: scenario.workoutsCatalog,
        currentWorkoutLevel: scenario.session.level,
        onSideEffect: () => {},
      })

    let coachResp = await coachChat.sendMessage('Starta samtalet.')
    coachResp = await processCoachTurn(
      coachResp,
      turn,
      coachChat,
      mockCtx,
      consumePendingFollowUp,
      transcript,
      toolLog,
      terminatedState,
    )

    while (!terminatedState.terminated && turn < cfg.maxTurns) {
      turn += 1
      const coachText = coachResp.text.trim()
      if (!coachText) break // safety valve: nothing for the user-sim to react to

      const userResp = await userChat.sendMessage(coachText)
      const userText = userResp.text.trim() || '(tystnad)'
      transcript.push({
        turn,
        speaker: 'user',
        events: [{ kind: 'text', text: userText }],
      })

      coachResp = await coachChat.sendMessage(userText)
      coachResp = await processCoachTurn(
        coachResp,
        turn,
        coachChat,
        mockCtx,
        consumePendingFollowUp,
        transcript,
        toolLog,
        terminatedState,
      )
    }

    terminatedBy = terminatedState.terminated ? 'terminal_tool' : 'turn_cap'
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    terminatedBy = 'error'
  } finally {
    coachChat?.close()
    userChat?.close()
  }

  return {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    runIndex,
    transcript,
    toolLog,
    deterministic: runDeterministicChecks(transcript, scenario),
    terminatedBy,
    turnCount: turn,
    judge: null,
    startedAt,
    finishedAt: new Date().toISOString(),
    error,
  }
}
