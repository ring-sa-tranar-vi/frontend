import {
  getSharedAudioContext,
  resumeSharedAudioContext,
} from './sharedAudioContext'

type CachedAudio = {
  objectUrl?: string
  promise?: Promise<void>
}

const preloadedAudio = new Map<string, CachedAudio>()

type PlaySessionAudioOptions = {
  onEnded?: () => void
}

// Persistent element + graph nodes — never disconnected after creation.
// Changing src and calling play()/pause() does not modify the Web Audio
// graph topology, so the audio renderer never needs to recompile the graph.
let sessionElement: HTMLAudioElement | null = null
let sessionAudioMuted = false

function setupSessionElement(ctx: AudioContext): HTMLAudioElement {
  if (!sessionElement) {
    sessionElement = new Audio()
    sessionElement.setAttribute('playsinline', 'true')
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    ctx.createMediaElementSource(sessionElement).connect(gain)
  }
  sessionElement.muted = sessionAudioMuted
  return sessionElement
}

export function preloadSessionAudio(url?: string | null) {
  if (!url || preloadedAudio.has(url)) {
    return
  }

  const startedAt = performance.now()
  console.debug('[SessionAudio] Preload start', { url })
  const cached: CachedAudio = {}
  cached.promise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Audio preload failed: ${response.status}`)
      }
      return response.blob()
    })
    .then((blob) => {
      cached.objectUrl = URL.createObjectURL(blob)
      console.debug('[SessionAudio] Preloaded audio', {
        url,
        bytes: blob.size,
        ms: Math.round(performance.now() - startedAt),
      })
    })
    .catch((error) => {
      preloadedAudio.delete(url)
      console.warn('[SessionAudio] Audio preload failed', { url, error })
    })

  preloadedAudio.set(url, cached)
}

export async function startSessionAudio(
  url: string,
  options: PlaySessionAudioOptions = {},
) {
  const cachedAudio = preloadedAudio.get(url)
  if (cachedAudio?.promise && !cachedAudio.objectUrl) {
    await Promise.race([
      cachedAudio.promise,
      new Promise((resolve) => window.setTimeout(resolve, 350)),
    ])
  }

  const ctx = getSharedAudioContext()
  await resumeSharedAudioContext()
  const element = setupSessionElement(ctx)

  const playableUrl = cachedAudio?.objectUrl ?? url
  element.pause()
  element.src = playableUrl
  element.currentTime = 0
  element.onended = options.onEnded ?? null

  console.debug('[SessionAudio] Play started', {
    url,
    cached: Boolean(cachedAudio?.objectUrl),
  })
  await element.play()
}

export async function primeSessionAudio() {
  await resumeSharedAudioContext()
  const ctx = getSharedAudioContext()
  // Set up the persistent session element + graph connection during the
  // user gesture so iOS allows later play() calls outside a gesture.
  setupSessionElement(ctx)

  // Warm up the AudioContext with a silent buffer.
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
}

export function stopSessionAudio() {
  if (!sessionElement) return
  sessionElement.onended = null
  sessionElement.pause()
}

export function setSessionAudioMuted(muted: boolean) {
  sessionAudioMuted = muted
  if (sessionElement) {
    sessionElement.muted = muted
  }
}
