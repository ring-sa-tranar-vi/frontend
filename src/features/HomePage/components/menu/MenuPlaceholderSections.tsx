import ActivitySummarySection from './ActivitySummarySection'
import CallbackSchedulerSection from './CallbackSchedulerSection'
import MenuCalendarSection from './MenuCalendarSection'
import PhysicalEventsSection from './PhysicalEventsSection'
import { useActivitySummary } from '../../../../hooks/useActivitySummary'
import { menuPlaceholderData } from './placeholderData'
import type { CallbackRequest, MenuPlaceholderData } from './types'

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
        <MenuCalendarSection enabled={dataEnabled} />
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
