import { GoogleGenAI, Type } from '@google/genai'
import { getRubric } from './rubrics'
import type {
  DeterministicCheckResult,
  JudgeVerdict,
  ScenarioFixture,
  ToolCallLogEntry,
  TranscriptTurn,
} from './types'

// The judge has no production equivalent, so — like the user-sim — it uses a
// plain API key against generateContent instead of an ephemeral Live token.
// That also means it gets real JSON-schema response mode, which is far more
// reliable than anything the Live API (audio-only for these models) could offer.
export interface RunJudgeParams {
  apiKey: string
  model: string
  scenario: ScenarioFixture
  transcript: TranscriptTurn[]
  toolLog: ToolCallLogEntry[]
  deterministic: DeterministicCheckResult[]
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallPass: { type: Type.BOOLEAN },
    score: { type: Type.NUMBER, description: '0–100' },
    summary: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          pass: { type: Type.BOOLEAN },
          reasoning: { type: Type.STRING },
        },
        required: ['id', 'pass', 'reasoning'],
      },
    },
  },
  required: ['overallPass', 'score', 'summary', 'items'],
}

function formatTranscript(transcript: TranscriptTurn[]): string {
  return transcript
    .map((t) => {
      const who = t.speaker === 'coach' ? 'Coach' : 'Användare'
      const parts = t.events.map((e) =>
        e.kind === 'text'
          ? e.text
          : `[VERKTYG: ${e.name}(${JSON.stringify(e.args)})]`,
      )
      const body =
        parts.filter(Boolean).join(' ') || '(inget tal, endast verktygsanrop)'
      return `[tur ${t.turn}] ${who}: ${body}`
    })
    .join('\n')
}

function formatDeterministic(results: DeterministicCheckResult[]): string {
  return results
    .map(
      (r) =>
        `- ${r.id}: ${r.pass ? 'OK' : `MISSLYCKADES (${r.detail ?? 'okänd orsak'})`}`,
    )
    .join('\n')
}

export async function runJudge(params: RunJudgeParams): Promise<JudgeVerdict> {
  const rubric = getRubric(params.scenario.id)

  const prompt = [
    'Du är en noggrann QA-granskare av AI-tränarsamtal på svenska. Du får ett transkript från ett testsamtal mellan en AI-coach och en simulerad användare, samt en checklista att bedöma samtalet mot.',
    `Scenario: ${params.scenario.label}.`,
    '',
    'Automatiska kontroller (redan beräknade mekaniskt — lita på dessa, härled inte om dem):',
    formatDeterministic(params.deterministic),
    '',
    'Checklista att bedöma (svara med pass/fail + kort motivering per punkt, med exakt dessa id:n):',
    rubric.map((item) => `- ${item.id}: ${item.description}`).join('\n'),
    '',
    'Transkript:',
    formatTranscript(params.transcript),
    '',
    'Bedöm varje punkt i checklistan mot transkriptet. Svara med JSON enligt schemat. overallPass ska vara false om någon punkt i checklistan misslyckas eller om någon automatisk kontroll misslyckades. score är en helhetsbedömning 0–100 av samtalskvaliteten.',
  ].join('\n')

  const ai = new GoogleGenAI({ apiKey: params.apiKey })
  const response = await ai.models.generateContent({
    model: params.model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  const raw = response.text
  if (!raw) {
    throw new Error('Domaren svarade utan innehåll.')
  }

  return JSON.parse(raw) as JudgeVerdict
}
