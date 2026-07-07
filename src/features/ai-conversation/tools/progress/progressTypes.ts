export type BackendProgressResponse = {
  currentStreak: number
  completedWorkouts: Array<{
    dateLabel: string
    workoutName: string
  }>
}
