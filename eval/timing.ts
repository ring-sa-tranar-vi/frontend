export function summarize(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export async function timeIt<T>(
  label: string,
  fn: () => Promise<T>,
  describe?: (result: T) => string | undefined,
): Promise<T> {
  const start = Date.now()
  const result = await fn()
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const extra = describe?.(result)
  console.log(`    ⏱ ${label} (${elapsed}s)${extra ? `: ${extra}` : ''}`)
  return result
}

/** Prints a section header so `npm run eval`'s terminal output reads as a live
 * narrative (initierar → samtal pågår → domaren bedömer → rapport) instead of
 * going quiet for a minute at a time. */
export function phase(label: string): void {
  console.log(`\n▶ ${label}`)
}
