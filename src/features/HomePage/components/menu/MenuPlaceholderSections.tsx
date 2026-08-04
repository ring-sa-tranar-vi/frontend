import ActivitySummarySection from './ActivitySummarySection'
import CallbackSchedulerSection from './CallbackSchedulerSection'
import MenuCalendarSection from './MenuCalendarSection'
import PhysicalEventsSection from './PhysicalEventsSection'
import { useActivitySummary } from '../../../../hooks/useActivitySummary'
import { useEventsAndOrganisations } from '../../../../hooks/useEventsAndOrganisations'
import { menuPlaceholderData } from './placeholderData'
import type {
  CalendarActivity,
  CallbackRequest,
  MenuPlaceholderData,
} from './types'
import { useMemo } from 'react'

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
    () => new Set(attendedEventsById.keys()),
    [attendedEventsById],
  )
  const calendarCancellationEventId = calendarAttendance.attendanceMutation
    .isPending
    ? String(calendarAttendance.attendanceMutation.variables?.event.id)
    : undefined
  const cancelledCalendarEventId = calendarAttendance.attendanceMutation
    .isSuccess
    ? String(calendarAttendance.attendanceMutation.variables?.event.id)
    : undefined

  function cancelCalendarEvent(activity: CalendarActivity) {
    const event = attendedEventsById.get(activity.id)

    if (!event || calendarAttendance.attendanceMutation.isPending) return

    calendarAttendance.attendanceMutation.mutate({
      event,
      isAttending: true,
    })
  }

  return (
    <div className="divide-y divide-(--brand-border)/60">
      <div className="pb-7">
        <ActivitySummarySection
          summary={activityQuery.data}
          isLoading={activityQuery.isLoading}
          isError={activityQuery.isError && !activityQuery.data}
          onRetry={() => void activityQuery.refetch()}
        />
      </div>
      <div className="py-7">
        <PhysicalEventsSection onFindEvents={onFindEvents} />
      </div>
      <div className="py-7">
        <MenuCalendarSection
          enabled={dataEnabled}
          cancelableEventIds={calendarEventIds}
          cancellingEventId={calendarCancellationEventId}
          cancelledEventId={cancelledCalendarEventId}
          cancellationError={calendarAttendance.attendanceMutation.isError}
          onCancelEvent={cancelCalendarEvent}
          onDismissCancellationError={() =>
            calendarAttendance.attendanceMutation.reset()
          }
        />
      </div>
      <div className="py-7">
        <CallbackSchedulerSection
          initialRequest={data.callback}
          onConfirm={onConfirmCallback}
        />
      </div>
    </div>
  )
}
