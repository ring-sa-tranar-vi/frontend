import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

function authHeaders(token?: string | null): HeadersInit | undefined {
  if (!token) return undefined
  return { Authorization: `Bearer ${token}` }
}

export default async function fetchAdminPage(token?: string | null) {
  const res = await fetch(`${API_URL}/api/admin`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Not authorized')
  return res.text()
}

export async function fetchAdminUserCount(
  token?: string | null,
): Promise<{ count: number; activeCount: number }> {
  const res = await fetch(`${API_URL}/api/admin/users/count`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Could not fetch user count')
  return res.json()
}
