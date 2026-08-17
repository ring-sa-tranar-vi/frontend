import type { CoachCallSession } from '../src/features/session/types'
import type { evalConfig } from './eval.config'
import { fetchTrainer, fetchWorkout, fetchWorkoutCatalog } from './realData'
import type { ScenarioFixture, ScenarioId } from './types'

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  standard: 'Standard (inloggad, vanligt pass)',
  onboarding: 'Onboarding (första samtalet)',
  guest: 'Gäst (ej inloggad)',
  alreadyFinished: 'Redan klar idag',
}

export async function buildScenario(
  cfg: typeof evalConfig,
  apiBaseUrl: string,
): Promise<ScenarioFixture> {
  const [trainer, workout, workoutsCatalog] = await Promise.all([
    fetchTrainer(apiBaseUrl, cfg.trainerId),
    fetchWorkout(apiBaseUrl, cfg.workoutId),
    fetchWorkoutCatalog(apiBaseUrl),
  ])

  const baseSession: CoachCallSession = {
    workoutId: workout.id,
    isAuthenticated: cfg.scenarioType !== 'guest',
    workoutName: workout.name,
    instructions: workout.instructions,
    guidance: workout.guidance,
    level: workout.level,
    video: workout.video,
  }

  const session: CoachCallSession = {
    ...baseSession,
    ...scenarioSessionOverrides(cfg, workout.name),
  }

  return {
    id: cfg.scenarioType,
    label: SCENARIO_LABELS[cfg.scenarioType],
    session,
    isSignedIn: cfg.scenarioType !== 'guest',
    alreadyCompletedToday: cfg.scenarioType === 'alreadyFinished',
    trainerPrompt: trainer.prompt,
    trainerName: trainer.name,
    trainerVoice: trainer.voice,
    calendarEvents: null,
    workoutsCatalog,
    expectedTerminalTool:
      cfg.scenarioType === 'guest' ? 'end_guest_session' : 'finish_session',
  }
}

function scenarioSessionOverrides(
  cfg: typeof evalConfig,
  workoutName: string,
): Partial<CoachCallSession> {
  switch (cfg.scenarioType) {
    case 'standard':
      return {
        userName: 'Anna',
        intensityLevel: 3,
        context: cfg.context,
        currentStreak: cfg.streak,
        completedWorkouts: [
          { dateLabel: 'igår', workoutName: 'Rörlighet & core' },
        ],
        onboarding: false,
      }
    case 'alreadyFinished':
      return {
        userName: 'Anna',
        intensityLevel: 3,
        context: cfg.context,
        currentStreak: cfg.streak,
        completedWorkouts: [{ dateLabel: 'idag', workoutName }],
        onboarding: false,
      }
    case 'onboarding':
      // userName deliberately omitted — exercises the "ask for name" branch.
      return {
        currentStreak: 0,
        completedWorkouts: [],
        onboarding: true,
      }
    case 'guest':
      return { onboarding: false }
  }
}
