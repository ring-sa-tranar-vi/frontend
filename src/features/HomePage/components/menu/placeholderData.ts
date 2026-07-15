import type { MenuPlaceholderData } from './types'

export const menuPlaceholderData: MenuPlaceholderData = {
  activity: {
    currentStreak: 37,
    personalRecord: 86,
    activeWeekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  calendar: {
    initialMonth: '2026-07-01',
    initialSelectedDate: '2026-07-14',
    activities: [
      {
        id: 'placeholder-callback-1',
        date: '2026-07-03',
        kind: 'callback',
        title: 'menu.calendar.callback',
        time: '19:39',
      },
      {
        id: 'placeholder-workout-1',
        date: '2026-07-07',
        kind: 'workout',
        title: 'menu.calendar.calmWorkout',
        time: '10:00',
        trainerName: 'Eva',
      },
      {
        id: 'placeholder-workout-2',
        date: '2026-07-14',
        kind: 'workout',
        title: 'menu.calendar.completedWorkout',
      },
      {
        id: 'placeholder-workout-next',
        date: '2026-07-16',
        kind: 'workout',
        title: 'menu.calendar.calmWorkout',
        time: '10:00',
        trainerName: 'Eva',
      },
      {
        id: 'placeholder-callback-2',
        date: '2026-07-23',
        kind: 'callback',
        title: 'menu.calendar.callback',
        time: '19:39',
      },
    ],
    nextActivityId: 'placeholder-workout-next',
  },
  callback: {
    weekday: 'wednesday',
    time: '19:39',
    repeat: 'never',
  },
}
