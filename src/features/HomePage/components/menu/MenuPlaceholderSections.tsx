import ActivitySummarySection from './ActivitySummarySection'
import MenuCalendarSection from './MenuCalendarSection'
import PhysicalEventsSection from './PhysicalEventsSection'
import { useActivitySummary } from '../../../../hooks/useActivitySummary'
import { useEventsAndOrganisations } from '../../../../hooks/useEventsAndOrganisations'
import type { CalendarActivity } from './types'
import { useMemo } from 'react'

function toCalendarEventId(eventId: string | number): string {
  return `EVENT-${eventId}`
}

function getEventIdFromCalendarActivity(activityId: string): string {
  return activityId.startsWith('EVENT-')
    ? activityId.slice('EVENT-'.length)
    : activityId
}

export default function MenuPlaceholderSections({
  onFindEvents,
  dataEnabled = false,
}: {
  onFindEvents: () => void
  dataEnabled?: boolean
}) {
  const activityQuery = useActivitySummary(dataEnabled)
  const calendarAttendance = useEventsAndOrganisations(dataEnabled, {
    fetchEvents: false,
    fetchOrganisations: false,
    fetchFollowing: false,
  })
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
  function cancelCalendarEvent(activity: CalendarActivity) {
    const eventId = getEventIdFromCalendarActivity(activity.id)
    const event = attendedEventsById.get(eventId)

    if (!event || calendarAttendance.attendanceMutation.isPending) return

    calendarAttendance.attendanceMutation.mutate({
      event,
      isAttending: true,
    })
  }

  return (
    <div className="space-y-4">
      <ActivitySummarySection
        summary={activityQuery.data}
        isLoading={activityQuery.isLoading}
        isError={activityQuery.isError && !activityQuery.data}
        onRetry={() => void activityQuery.refetch()}
      />
      <MenuCalendarSection
        enabled={dataEnabled}
        cancelableEventIds={calendarEventIds}
        cancellingActivityId={calendarCancellationEventId}
        cancelledActivityId={cancelledCalendarEventId}
        cancellationError={calendarAttendance.attendanceMutation.isError}
        onCancelEvent={cancelCalendarEvent}
        onDismissCancellationError={() => {
          calendarAttendance.attendanceMutation.reset()
        }}
      />
      <PhysicalEventsSection onFindEvents={onFindEvents} />
    </div>
  )
}
