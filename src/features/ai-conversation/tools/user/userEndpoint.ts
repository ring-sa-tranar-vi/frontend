import { getEndpoint } from '../shared/endpointClient'
import type { BackendUserResponse } from './userTypes'

// User-domainens enda backend-call just nu.
// Lägg fler user-endpoints i denna mapp när backend får dem.
export function getUserEndpoint(userId: number) {
  return getEndpoint<BackendUserResponse>(`/api/users/${userId}`)
}
