import { getJson } from '../../../../lib/api/fetcher'
import type { EndpointResult } from './liveToolTypes'

// Alla Live-tools ska prata med backend genom denna helper.
// getJson använder VITE_API_URL och fallbackar till deployad backend:
// https://backend-training.up.railway.app
// Det betyder att AI-dev inte skapar egna backend-routes och inte pratar lokalt.
export async function getEndpoint<T>(path: string): Promise<EndpointResult<T>> {
  try {
    return {
      ok: true,
      path,
      data: await getJson<T>(path),
    }
  } catch (error) {
    return {
      ok: false,
      path,
      error:
        error instanceof Error ? error.message : 'Endpoint request failed.',
    }
  }
}
