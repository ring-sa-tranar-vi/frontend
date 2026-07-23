import type { EndpointResult } from '../shared/liveToolTypes'
import { getApiBaseUrl } from '../../../../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type ActivityLogResponse = {
  id: number
  userId: number
  workoutId: number
  completedAt: string
  durationSeconds: number
  feedback: string
  status: string
}

export async function postActivityEndpoint(
  userId: number,
  workoutId: number,
  durationSeconds = 0,
  feedback = '',
) {
  const path = `/api/activity-logs`
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        workoutId,
        completedAt: new Date().toISOString().replace(/Z$/, ''),
        durationSeconds: Math.max(0, Math.round(durationSeconds)),
        feedback,
        status: 'COMPLETED',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        ok: false,
        path,
        error: text || `Request failed: ${res.status}`,
      } as EndpointResult<ActivityLogResponse>
    }

    const data = (await res.json()) as ActivityLogResponse
    return { ok: true, path, data } as EndpointResult<ActivityLogResponse>
  } catch (error) {
    return {
      ok: false,
      path,
      error: error instanceof Error ? error.message : 'Request failed.',
    } as EndpointResult<ActivityLogResponse>
  }
}
