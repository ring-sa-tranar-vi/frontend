import type { Trainer } from '../src/features/session/types'
import type { WorkoutCatalogItem } from './types'

// Real trainer/workout data from the local backend — GET /api/trainers/{id}
// and GET /api/workouts/{id} are both unauthenticated (confirmed in
// TrainerController.java / WorkoutController.java), so a plain fetch works.
export interface RealWorkout {
  id: number
  name: string
  instructions: string | null
  guidance: string | null
  level: number | null
  video: string | null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `GET ${url} misslyckades (${res.status} ${res.statusText}). Kör backend lokalt?`,
    )
  }
  return (await res.json()) as T
}

export async function fetchTrainer(
  apiBaseUrl: string,
  trainerId: number,
): Promise<Trainer> {
  return fetchJson<Trainer>(`${apiBaseUrl}/api/trainers/${trainerId}`)
}

export async function fetchWorkout(
  apiBaseUrl: string,
  workoutId: number,
): Promise<RealWorkout> {
  return fetchJson<RealWorkout>(`${apiBaseUrl}/api/workouts/${workoutId}`)
}

export async function fetchWorkoutCatalog(
  apiBaseUrl: string,
): Promise<WorkoutCatalogItem[]> {
  const workouts = await fetchJson<RealWorkout[]>(`${apiBaseUrl}/api/workouts`)
  return workouts.map((w) => ({
    id: w.id,
    name: w.name,
    level: w.level != null ? String(w.level) : undefined,
  }))
}
