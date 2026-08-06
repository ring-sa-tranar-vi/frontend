import ActivitySummarySection from './ActivitySummarySection'
import CallbackSchedulerSection from './CallbackSchedulerSection'
import MenuCalendarSection from './MenuCalendarSection'
import PhysicalEventsSection from './PhysicalEventsSection'
import { useActivitySummary } from '../../../../hooks/useActivitySummary'
import { useCallbackPreferences } from '../../../../hooks/useCallbackPreferences'
import { useEventsAndOrganisations } from '../../../../hooks/useEventsAndOrganisations'
import { menuPlaceholderData } from './placeholderData'
import type {
  CalendarActivity,
  CallbackRequest,
  CallbackWeekday,
  MenuPlaceholderData,
} from './types'
import { useMemo } from 'react'

const callbackWeekdayByDayIndex: CallbackWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function getCallbackWeekday(dateKey: string): CallbackWeekday | null {
  const date = new Date(`${dateKey}T12:00:00`)

  if (Number.isNaN(date.getTime())) return null
  return callbackWeekdayByDayIndex[date.getDay()] ?? null
}

function toCalendarEventId(eventId: string | number): string {
  return `EVENT-${eventId}`
}

function getEventIdFromCalendarActivity(activityId: string): string {
  return activityId.startsWith('EVENT-')
    ? activityId.slice('EVENT-'.length)
    : activityId
}

export default function MenuPlaceholderSections({
  data = menuPlaceholderData,
  onFindEvents,
  onConfirmCallback,
  dataEnabled = false,
}: {
  data?: MenuPlaceholderData
  onFindEvents?: () => void
  onConfirmCallback?: (request: CallbackRequest) => void | Promise<void>
  dataEnabled?: boolean
}) {
  const activityQuery = useActivitySummary(dataEnabled)
  const calendarAttendance = useEventsAndOrganisations(dataEnabled, {
    fetchEvents: false,
    fetchOrganisations: false,
    fetchFollowing: false,
  })
  const callbackPreferences = useCallbackPreferences()

  const attendedEventsById = useMemo(
    () =>
      new Map(
        (calendarAttendance.attendingQuery.data ?? []).map((event) => [
          String(event.id),
          event,
        ]),
      ),
    [calendarAttendance.attendingQuery.data],
  )
  const calendarEventIds = useMemo(
    () => new Set([...attendedEventsById.keys()].map(toCalendarEventId)),
    [attendedEventsById],
  )
  const calendarCancellationEventId = calendarAttendance.attendanceMutation
    .isPending
    ? toCalendarEventId(
        calendarAttendance.attendanceMutation.variables?.event.id ?? '',
      )
    : undefined
  const cancelledCalendarEventId = calendarAttendance.attendanceMutation
    .isSuccess
    ? toCalendarEventId(
        calendarAttendance.attendanceMutation.variables?.event.id ?? '',
      )
    : undefined
  const cancellingCallbackId = callbackPreferences.removeCallbackMutation
    .isPending
    ? callbackPreferences.removeCallbackMutation.variables?.activityId
    : undefined
  const cancelledCallbackId = callbackPreferences.removeCallbackMutation
    .isSuccess
    ? callbackPreferences.removeCallbackMutation.variables?.activityId
    : undefined

  function cancelCalendarEvent(activity: CalendarActivity) {
    const eventId = getEventIdFromCalendarActivity(activity.id)
    const event = attendedEventsById.get(eventId)

    if (!event || calendarAttendance.attendanceMutation.isPending) return

    calendarAttendance.attendanceMutation.mutate({
      event,
      isAttending: true,
    })
  }

  function cancelCalendarCallback(activity: CalendarActivity) {
    const weekday = getCallbackWeekday(activity.date)

    if (!weekday || callbackPreferences.removeCallbackMutation.isPending) return

    callbackPreferences.removeCallbackMutation.mutate({
      weekday,
      activityId: activity.id,
    })
  }

  async function saveCallback(request: CallbackRequest) {
    await callbackPreferences.saveCallbackMutation.mutateAsync(request)
  }

  return (
    <div className="space-y-7">
      <ActivitySummarySection
        summary={activityQuery.data}
        isLoading={activityQuery.isLoading}
        isError={activityQuery.isError && !activityQuery.data}
        onRetry={() => void activityQuery.refetch()}
      />
      <PhysicalEventsSection onFindEvents={onFindEvents} />
      <MenuCalendarSection
        enabled={dataEnabled}
        cancelableEventIds={calendarEventIds}
        cancellingActivityId={
          calendarCancellationEventId ?? cancellingCallbackId
        }
        cancelledActivityId={cancelledCalendarEventId ?? cancelledCallbackId}
        cancellationError={
          calendarAttendance.attendanceMutation.isError ||
          callbackPreferences.removeCallbackMutation.isError
        }
        onCancelEvent={cancelCalendarEvent}
        onCancelCallback={cancelCalendarCallback}
        onDismissCancellationError={() => {
          calendarAttendance.attendanceMutation.reset()
          callbackPreferences.removeCallbackMutation.reset()
        }}
      />
      <CallbackSchedulerSection
        initialRequest={data.callback}
        onConfirm={onConfirmCallback ?? saveCallback}
      />
    </div>
  )
}
