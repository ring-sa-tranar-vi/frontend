import {
  getSharedAudioContext,
  resumeSharedAudioContext,
} from './sharedAudioContext'

const FALLBACK_AMBIENCE = 'gym-ambience-loop.mp3'
const PATH_PREFIX = '/phone-sounds/'

// Module State
let ringback: HTMLAudioElement | null = null
let callAudioMuted = false

// Single reusable click audio instance
const disconnectClick = new Audio(`${PATH_PREFIX}phone_click.mp3`)
disconnectClick.preload = 'auto'

// Web Audio State
const gymAmbienceCache = new Map<string, AudioBuffer>()
const pendingFetches = new Map<string, Promise<AudioBuffer | null>>()

let gymAmbienceSource: AudioBufferSourceNode | null = null
let gymAmbienceGain: GainNode | null = null

/** Safe helper to play HTML5 audio ignoring autoplay restrictions */
function safePlay(audio: HTMLAudioElement) {
  audio.currentTime = 0
  audio.muted = callAudioMuted
  void audio.play().catch(() => {})
}

function playDisconnectClick() {
  safePlay(disconnectClick)
}

/* ==========================================================================
   Ringback Controls (HTML5 Audio)
   ========================================================================== */

export function startRingback() {
  if (ringback) return
  ringback = new Audio(`${PATH_PREFIX}ringback_tone.mp3`)
  ringback.loop = true
  safePlay(ringback)
}

export function stopRingback() {
  if (!ringback) return
  ringback.pause()
  ringback = null
  playDisconnectClick()
}

/* ==========================================================================
   Ambience Controls (Web Audio API)
   ========================================================================== */

async function fetchAndDecodeAudio(
  filename: string,
): Promise<AudioBuffer | null> {
  // Check in-memory cache first
  if (gymAmbienceCache.has(filename)) {
    return gymAmbienceCache.get(filename)!
  }

  // Prevent duplicate concurrent network fetches for the same file
  if (pendingFetches.has(filename)) {
    return pendingFetches.get(filename)!
  }

  const fetchPromise = (async () => {
    const path = `${PATH_PREFIX}${filename}`
    try {
      const response = await fetch(path)
      if (!response.ok) {
        console.error(`[ambience] fetch failed (${response.status}): ${path}`)
        return null
      }

      const contentType = response.headers.get('Content-Type') ?? ''
      if (
        !contentType.includes('audio') &&
        !contentType.includes('octet-stream')
      ) {
        console.error(
          `[ambience] invalid content-type "${contentType}" for ${path}`,
        )
        return null
      }

      const ctx = getSharedAudioContext()
      const arrayBuffer = await response.arrayBuffer()
      const buffer = await ctx.decodeAudioData(arrayBuffer)

      gymAmbienceCache.set(filename, buffer)
      return buffer
    } catch (err) {
      console.error(`[ambience] loading error for ${filename}:`, err)
      return null
    } finally {
      pendingFetches.delete(filename)
    }
  })()

  pendingFetches.set(filename, fetchPromise)
  return fetchPromise
}

export async function startGymAmbience(ambienceFile?: string | null) {
  if (gymAmbienceSource) return // Ambience is already playing

  const ctx = getSharedAudioContext()
  await resumeSharedAudioContext()

  const filename = ambienceFile?.trim() || FALLBACK_AMBIENCE
  const buffer = await fetchAndDecodeAudio(filename)

  if (!buffer) return

  // Create gain node for volume control
  const gain = ctx.createGain()
  gain.gain.value = callAudioMuted ? 0 : 0.7
  gain.connect(ctx.destination)

  // Create source node
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(gain)
  source.start()

  gymAmbienceSource = source
  gymAmbienceGain = gain
}

export function stopGymAmbience() {
  if (!gymAmbienceSource) return

  playDisconnectClick()

  // Stop and disconnect nodes to release Web Audio resources
  gymAmbienceSource.stop()
  gymAmbienceSource.disconnect()
  gymAmbienceSource = null

  if (gymAmbienceGain) {
    gymAmbienceGain.disconnect()
    gymAmbienceGain = null
  }
}

/* ==========================================================================
   State & Mute Management
   ========================================================================== */

export function setCallAudioMuted(muted: boolean) {
  callAudioMuted = muted
  disconnectClick.muted = muted

  if (ringback) {
    ringback.muted = muted
  }

  if (gymAmbienceGain) {
    // Smooth transition to avoid audible audio clicks/pops
    const ctx = getSharedAudioContext()
    gymAmbienceGain.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05)
  }
}
