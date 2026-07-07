const API_BASE =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://backend-training.up.railway.app')

export async function createWorkout(data: unknown) {
  const url = `${API_BASE}/api/workouts`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to create workout.')
  }

  return res.json()
}

export async function createWorkoutWithToken(data: unknown, token: string) {
  const res = await fetch(`${API_BASE}/api/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to create workout.')
  }

  return res.json()
}

//  GET all workouts
export async function fetchWorkouts(token: string) {
  const res = await fetch(`${API_BASE}/api/workouts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch workouts')
  }

  return res.json()
}

export async function fetchRecommendedWorkoutId(
  token: string,
  trainerId: string,
  userId: string,
) {
  const res = await fetch(
    `${API_BASE}/api/trainers/trainer/${trainerId}/recommend-for/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!res.ok) {
    throw new Error('Failed to fetch recommended workout ID')
  }

  return res.json()
}

// GET one workout
export async function fetchWorkoutById(id: number, token: string) {
  const res = await fetch(`${API_BASE}/api/workouts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch workout')
  }

  return res.json()
}

//  UPDATE workout
export async function updateWorkout(id: number, data: unknown, token: string) {
  const res = await fetch(`${API_BASE}/api/workouts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    throw new Error('Failed to update workout')
  }

  return res.json()
}

// DELETE workout
export async function deleteWorkout(id: number, token: string) {
  const res = await fetch(`${API_BASE}/api/workouts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to delete workout')
  }

  return true
}

export async function setWorkoutEnabledWithToken(
  id: number,
  enabled: boolean,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/workouts/${id}/enabled`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to update workout status')
  }

  return res.json()
}
