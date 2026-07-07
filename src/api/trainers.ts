const API_BASE =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://backend-training.up.railway.app')

export async function fetchTrainers() {
  const url = `${API_BASE}/api/trainers`
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to load trainers.')
  }

  return res.json()
}

export async function fetchTrainersWithToken(token: string) {
  const url = `${API_BASE}/api/trainers`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to load trainers.')
  }

  return res.json()
}

export async function fetchTrainerByIdWithToken(id: number, token: string) {
  const res = await fetch(`${API_BASE}/api/trainers/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to load trainer.')
  }

  return res.json()
}

export async function createTrainerWithToken(data: unknown, token: string) {
  const res = await fetch(`${API_BASE}/api/trainers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to create trainer.')
  }

  return res.json()
}

export async function updateTrainerWithToken(
  id: number,
  data: unknown,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/trainers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 405) {
      throw new Error(text || 'PUT is not supported for trainer updates.')
    }

    throw new Error(text || 'Failed to update trainer.')
  }

  return res.json()
}

export async function deleteTrainerWithToken(id: number, token: string) {
  const res = await fetch(`${API_BASE}/api/trainers/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Failed to delete trainer.')
  }

  return true
}
