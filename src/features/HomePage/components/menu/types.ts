export const callbackWeekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type CallbackWeekday = (typeof callbackWeekdays)[number]

export type CallbackRepeat = 'never' | 'weekly' | 'everyOtherWeek'

export type CallbackRequest = {
  weekday: CallbackWeekday
  time: string
  repeat: CallbackRepeat
}

export type ActivitySummary = {
  currentStreak: number
  personalRecord: number
  activeWeekdays: readonly CallbackWeekday[]
}

export type CalendarActivityKind = 'workout' | 'event' | 'callback'

export type CalendarActivity = {
  id: string
  date: string
  kind: CalendarActivityKind
  title: string
  time?: string
  description?: string
  completed: boolean
}

export type CalendarEventDto = {
  id: string
  type: string
  title: string
  description?: string | null
  time: string
  completed: boolean
}

export type MenuPlaceholderData = {
  callback: CallbackRequest
}
