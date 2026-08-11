import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export type AdminUser = {
  id: number
  name?: string | null
  intensityLevel?: number | null
  context?: string | null
  trainerId?: number | null
  city?: string | null
  active?: boolean
  enabled?: boolean
}

export type AdminUserUpdate = Pick<
  AdminUser,
  'name' | 'intensityLevel' | 'context' | 'trainerId' | 'city'
>

async function adminRequest(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Admin request failed (${response.status})`)
  }
  return response
}

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const response = await adminRequest('/api/admin/users', token)
  return response.json() as Promise<AdminUser[]>
}

export default fetchAdminUsers

export async function updateAdminUser(
  token: string,
  id: number,
  payload: AdminUserUpdate,
): Promise<string> {
  const response = await adminRequest(`/api/admin/users/${id}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.text()
}
