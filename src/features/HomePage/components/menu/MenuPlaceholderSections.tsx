import ActivitySummarySection from './ActivitySummarySection'
import CallbackSchedulerSection from './CallbackSchedulerSection'
import MenuCalendarSection from './MenuCalendarSection'
import PhysicalEventsSection from './PhysicalEventsSection'
import { menuPlaceholderData } from './placeholderData'
import type { CallbackRequest, MenuPlaceholderData } from './types'

export default function MenuPlaceholderSections({
  data = menuPlaceholderData,
  onFindEvents,
  onConfirmCallback,
}: {
  data?: MenuPlaceholderData
  onFindEvents?: () => void
  onConfirmCallback?: (request: CallbackRequest) => void | Promise<void>
}) {
  return (
    <div className="divide-y divide-(--brand-border)/60">
      <div className="pb-7">
        <ActivitySummarySection summary={data.activity} />
      </div>
      <div className="py-7">
        <PhysicalEventsSection onFindEvents={onFindEvents} />
      </div>
      <div className="py-7">
        <MenuCalendarSection
          initialMonth={data.calendar.initialMonth}
          initialSelectedDate={data.calendar.initialSelectedDate}
          activities={data.calendar.activities}
          nextActivityId={data.calendar.nextActivityId}
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
