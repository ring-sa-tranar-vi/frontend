import { getEndpoint } from '../shared/endpointClient'
import type { BackendProgressResponse } from './progressTypes'

// Progress-domainens backend-call. Den använder befintlig deployad REST endpoint.
export function getProgressEndpoint(userId: number) {
  return getEndpoint<BackendProgressResponse>(`/api/users/${userId}/progress`)
}
