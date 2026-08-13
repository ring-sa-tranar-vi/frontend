import type { ScenarioId } from './types'

// The single place to configure what eval/runEval.ts actually runs.
// trainerId/workoutId must exist in your local backend's database — run
// GET /api/trainers and GET /api/workouts (or check backend/db-init/*.sql)
// to find real ids. Workouts with fully-written instructions/guidance and
// explicit rep counts (e.g. "Axelhöjningar", "Djupa knäböj" in
// backend/db-init/03-add-workouts.sql) make the rep-count rubric item
// meaningful — older seed rows often have empty instructions/guidance.
export const evalConfig = {
  runs: 1,

  trainerId: 2, // 1 = Eva in the seed data
  workoutId: 28, // "Axelhöjningar" (level 1, 5 explicit reps) in the seed data

  scenarioType: 'guest' as ScenarioId, // 'standard' | 'onboarding' | 'guest' | 'alreadyFinished'

  userInstruction: 'Du är väldigt rakt på sak.',

  // Only used to build the CoachCallSession for 'standard'/'alreadyFinished'
  // (buildGuestContext ignores them for guest calls, and onboarding is
  // establishing this info fresh, so it starts without it regardless).
  streak: 4,
  context: 'Tränar regelbundet, inga kända skador, vill bygga styrka.',
}
