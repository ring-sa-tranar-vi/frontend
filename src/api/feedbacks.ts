import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_BASE = getApiBaseUrl()

export async function fetchWorkoutFeedbackSummaryWithToken(token: string) {
  const res = await fetch(`${API_BASE}/api/admin/workouts/feedback-summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to load feedback summary.')
  }

  return res.json()
}
