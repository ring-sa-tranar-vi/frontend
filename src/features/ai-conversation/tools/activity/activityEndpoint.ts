import type { EndpointResult } from '../shared/liveToolTypes'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'https://backend-training.up.railway.app'
).replace(/\/$/, '')

export async function postActivityEndpoint(userId: number, workoutId: number) {
  const path = `/api/activity-logs`
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workoutId, status: 'COMPLETED' }),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        ok: false,
        path,
        error: text || `Request failed: ${res.status}`,
      } as EndpointResult<unknown>
    }

    const data = await res.json()
    return { ok: true, path, data } as EndpointResult<unknown>
  } catch (error) {
    return {
      ok: false,
      path,
      error: error instanceof Error ? error.message : 'Request failed.',
    } as EndpointResult<unknown>
  }
}
