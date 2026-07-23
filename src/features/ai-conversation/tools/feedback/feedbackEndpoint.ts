import type { EndpointResult } from '../shared/liveToolTypes'
import { getApiBaseUrl } from '../../../../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

export async function postFeedbackEndpoint(body: Record<string, unknown>) {
  const path = `/api/feedbacks`
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        ok: false,
        path,
        error: text || `Request failed: ${res.status}`,
      } as EndpointResult<unknown>
    }

    const data = await res.json()
    return { ok: true, path, data } as EndpointResult<unknown>
  } catch (error) {
    return {
      ok: false,
      path,
      error: error instanceof Error ? error.message : 'Request failed.',
    } as EndpointResult<unknown>
  }
}
