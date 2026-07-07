import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export default async function fetchAdminPage(token: string) {
  const res = await fetch(`${API_URL}/api/admin`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Not authorized')
  return res.text()
}

export async function fetchAdminUserCount(
  token: string,
): Promise<{ count: number; activeCount: number }> {
  const res = await fetch(`${API_URL}/api/admin/users/count`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not fetch user count')
  return res.json()
}
