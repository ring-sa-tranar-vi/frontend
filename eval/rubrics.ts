import type { ScenarioId } from './types'

export interface RubricItem {
  id: string
  description: string
}

const ALWAYS: RubricItem[] = [
  { id: 'natural_language', description: 'Språket är naturligt.' },
  {
    id: 'natural_ending',
    description:
      'Samtalet avslutas naturligt — användaren har sagt hej då, tränaren lägger inte på i örat på användaren (avslutar aldrig ensidigt).',
  },
  {
    id: 'trainer_behaves_naturally',
    description: 'Tränaren gör inget onaturligt eller konstigt i samtalet.',
  },
]

const WORKOUT_ITEMS: RubricItem[] = [
  { id: 'gives_instructions', description: 'Användaren får instruktioner.' },
  {
    id: 'gives_rep_by_rep_guidance',
    description: 'Användaren får guidning genom varje repetition.',
  },
  {
    id: 'rep_count_matches_instruction',
    description:
      'Antalet repetitioner stämmer med det som angavs i instruktionen.',
  },
]

const SCENARIO_ONLY: Record<ScenarioId, RubricItem[]> = {
  standard: [],
  onboarding: [
    {
      id: 'onboarding_captures_profile',
      description: 'Onboardingen fångar namn, nivå och kontext.',
    },
  ],
  guest: [
    {
      id: 'guest_prompted_to_sign_up',
      description: 'Användaren tipsas om att skapa ett konto.',
    },
  ],
  alreadyFinished: [
    {
      id: 'encouraged_to_call_tomorrow',
      description: 'Användaren uppmanas att ringa imorgon.',
    },
  ],
}

// alreadyFinished never runs through a workout, so the instructions/guidance/
// rep-count items are excluded entirely for it, not just marked N/A.
export function getRubric(scenarioId: ScenarioId): RubricItem[] {
  const workoutItems = scenarioId === 'alreadyFinished' ? [] : WORKOUT_ITEMS
  return [...ALWAYS, ...workoutItems, ...SCENARIO_ONLY[scenarioId]]
}
