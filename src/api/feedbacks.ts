const API_BASE =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://backend-training.up.railway.app')

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

export async function fetchRecentAdminFeedbacksWithToken(token: string) {
  const res = await fetch(`${API_BASE}/api/admin/feedbacks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to load recent feedback entries.')
  }

  return res.json()
}
