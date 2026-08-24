import { getApiBaseUrl } from '../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export class OrganizationApplicationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'OrganizationApplicationError'
    this.status = status
  }
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED'

export type OrganizationApplication = {
  id: number
  userId: number
  orgName: string
  description: string
  city: string
  motivation: string
  status: ApplicationStatus
  createdAt: string
  reviewedAt: string | null
  paymentStatus: PaymentStatus
}

export type CreateOrganizationApplication = {
  organizationName: string
  description: string
  city: string
  motivation: string
}

async function readErrorMessage(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return `Request failed (${response.status})`

  try {
    const problem = JSON.parse(text) as {
      detail?: unknown
      message?: unknown
      title?: unknown
    }
    const message = problem.detail ?? problem.message ?? problem.title
    return typeof message === 'string' && message.trim() ? message : text
  } catch {
    return text
  }
}

async function request<T>(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new OrganizationApplicationError(message, response.status)
  }

  return response.json() as Promise<T>
}

export function fetchOrganizationApplications(token: string) {
  return request<OrganizationApplication[]>(
    '/api/organization-applications',
    token,
  )
}

export function fetchMyOrganizationApplication(token: string) {
  return request<OrganizationApplication>(
    '/api/organization-applications/me',
    token,
  )
}

export async function fetchMyOrganizationApplicationOrNull(token: string) {
  try {
    return await fetchMyOrganizationApplication(token)
  } catch (error) {
    if (error instanceof OrganizationApplicationError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function createOrganizationApplication(
  payload: CreateOrganizationApplication,
  token: string,
) {
  const response = await fetch(`${API_URL}/api/organization-applications`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new OrganizationApplicationError(message, response.status)
  }
}

export function approveOrganizationApplication(id: number, token: string) {
  return request<OrganizationApplication>(
    `/api/organization-applications/${id}/approve`,
    token,
    { method: 'PUT' },
  )
}

export function rejectOrganizationApplication(id: number, token: string) {
  return request<OrganizationApplication>(
    `/api/organization-applications/${id}/reject`,
    token,
    { method: 'PUT' },
  )
}

export function updateApplicationPaymentStatus(
  id: number,
  status: PaymentStatus,
  token: string,
) {
  const params = new URLSearchParams({ status })
  return request<OrganizationApplication>(
    `/api/organization-applications/${id}/payment-status?${params}`,
    token,
    { method: 'PUT' },
  )
}
