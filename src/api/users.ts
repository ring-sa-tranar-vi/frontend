import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export default async function fetchMyProfile(token: string) {
  const res = await fetch(`${API_URL}/api/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(errorText || `Failed to fetch user profile (${res.status})`)
  }

  return res.json()
}
