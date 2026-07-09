/**
 * Single source of truth for the backend origin used by the browser.
 * Must match the logic in `api/users.ts` so profile GET and PUT hit the same host.
 */
export function getApiBaseUrl(): string {
  const isLocalHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

  return (
    import.meta.env.VITE_API_URL ?? (isLocalHost ? 'http://localhost:8080' : '')
  ).replace(/\/$/, '')
}
