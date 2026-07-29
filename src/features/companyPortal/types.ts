export type EventForm = {
  name: string
  description: string
  time: string
  city: string
  venue: string
}

export const emptyEventForm: EventForm = {
  name: '',
  description: '',
  time: '',
  city: '',
  venue: '',
}
