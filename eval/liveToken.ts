// Mints a Gemini Live ephemeral auth token via the same backend endpoint the
// real app uses (see src/features/ai-conversation/core/useLiveToken.ts). No
// static Gemini API key is needed here — the backend holds the real key and
// only ever hands out short-lived, scoped tokens. LiveTokenController.java
// has no auth requirement on this route (falls under anyRequest().permitAll()
// in SecurityConfig.java), so a plain Node fetch works the same as the browser.
interface LiveTokenResponse {
  name?: string
  token?: string
  expireTime?: string
}

export async function mintLiveToken(
  apiBaseUrl: string,
  uses = 1,
): Promise<string> {
  const res = await fetch(`${apiBaseUrl}/api/live-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uses }),
  })

  if (!res.ok) {
    throw new Error(
      `Kunde inte hämta live-token från ${apiBaseUrl}/api/live-tokens (${res.status} ${res.statusText}). Kör backend lokalt?`,
    )
  }

  const data = (await res.json()) as LiveTokenResponse
  const token = data.token ?? data.name
  if (!token) {
    throw new Error('Live-token saknades i svaret från /api/live-tokens.')
  }
  return token
}
