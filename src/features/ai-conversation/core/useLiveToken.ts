import { useEffect, useRef, useState } from 'react'

interface AuthTokenResponse {
  name?: string
  token?: string
  expireTime?: string
}

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'https://backend-training.up.railway.app'
).replace(/\/$/, '')

export function useLiveToken() {
  const [token, setToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const inFlightRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  async function loadToken(): Promise<string | null> {
    if (inFlightRef.current) return null

    inFlightRef.current = true
    controllerRef.current = new AbortController()
    setTokenLoading(true)
    setTokenError(null)

    try {
      const res = await fetch(`${API_URL}/api/live-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uses: 10 }),
        signal: controllerRef.current.signal,
      })

      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status} ${res.statusText}`)
      }

      const contentType = res.headers.get('content-type') ?? ''
      let tokenValue: string | null = null

      if (contentType.includes('application/json')) {
        const data = (await res.json()) as AuthTokenResponse
        console.debug('[Token] full response:', data)

        if (data.expireTime) {
          console.debug(
            '[Token] expires at:',
            new Date(data.expireTime).toISOString(),
          )
        }

        tokenValue = data.token ?? data.name ?? null
        if (!tokenValue) throw new Error('Token missing in response')
      } else {
        const text = await res.text()
        if (!text) throw new Error('Empty token response')
        tokenValue = text.trim()
      }

      setToken(tokenValue)
      return tokenValue
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setTokenError((error as Error).message)
      }
      return null
    } finally {
      inFlightRef.current = false
      controllerRef.current = null
      setTokenLoading(false)
    }
  }

  return {
    token,
    setToken,
    loadToken,
    tokenLoading,
    tokenError,
  }
}
