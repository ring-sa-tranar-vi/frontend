export type BackendWorkoutResponse = {
  id: number
  name: string
  description?: string | null
  dashboardName?: string | null
  dashboardDescription?: string | null
  instructions?: string | null
  guidance?: string | null

  level?: number | string | null
  type?: string | null

  image?: string | null
  video?: string | null

  enabled?: boolean
}
