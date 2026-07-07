import type { LiveToolArgs } from './liveToolTypes'

// Gemini kan skicka numeriska argument både som number och string.
// Handlers använder denna så alla tools tolkar id:n likadant.
export function readNumberArg(
  args: LiveToolArgs,
  name: string,
  fallback: number,
) {
  const value = args[name]

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}
