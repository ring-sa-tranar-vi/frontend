export const DEFAULT_TRAINER_ID = 1

const TRAINER_PREFERENCE_STORAGE_KEY = 'home-trainer-id'

export function getStoredTrainerId() {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(TRAINER_PREFERENCE_STORAGE_KEY)
  const parsedValue = Number(rawValue)

  if (!Number.isInteger(parsedValue) || parsedValue < DEFAULT_TRAINER_ID) {
    return null
  }

  return parsedValue
}

export function setStoredTrainerId(trainerId: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TRAINER_PREFERENCE_STORAGE_KEY, String(trainerId))
}

const LANGUAGE_FILTER_STORAGE_KEY = 'trainer-language-filter'

export function getStoredLanguageFilter(): string[] | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LANGUAGE_FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed as string[]
    }
  } catch {
    // ignore corrupt localStorage
  }

  return null
}

export function setStoredLanguageFilter(langs: string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    LANGUAGE_FILTER_STORAGE_KEY,
    JSON.stringify(langs),
  )
}
