let sharedCtx: AudioContext | null = null

export function getSharedAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext()
  }
  return sharedCtx
}

export function getSharedAudioContextIfExists(): AudioContext | null {
  return sharedCtx
}

export async function resumeSharedAudioContext(): Promise<void> {
  const ctx = getSharedAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
