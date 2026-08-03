export type EventForm = {
  name: string
  description: string
  time: string
  city: string
  venue: string
  eventType: '' | 'IN_PERSON' | 'ONLINE'
}

export const emptyEventForm: EventForm = {
  name: '',
  description: '',
  time: '',
  city: '',
  venue: '',
  eventType: '',
}
