import { CalendarDays, MessageSquareText, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CoachCallSession, SessionPanel } from '../types'
import { ExercisePanel } from './ExercisePanel'
import { TrainingSuitePanel } from './TrainingSuitePanel'
import { UserInfoPanel } from './UserInfoPanel'
import { AppSheet, AppSheetNotice } from '../../../components/AppSheet'

type SessionInfoPanelProps = {
  session: CoachCallSession
  panel: SessionPanel
  onClose: () => void
}

export function SessionInfoPanel({
  session,
  panel,
  onClose,
}: SessionInfoPanelProps) {
  const { t } = useTranslation()
  if (panel === 'none') return null

  if (panel === 'suite') {
    return (
      <AppSheet
        open
        title={t('sessionCall.suiteTitle')}
        subtitle={t('sessionCall.suiteSubtitle')}
        icon={<CalendarDays size={20} strokeWidth={2.4} />}
        onClose={onClose}
        height="default"
      >
        {session.isAuthenticated ? (
          <TrainingSuitePanel
            streakDays={session.currentStreak}
            items={session.completedWorkouts}
          />
        ) : (
          <AppSheetNotice>{t('sessionCall.notLoggedIn')}</AppSheetNotice>
        )}
      </AppSheet>
    )
  }

  if (panel === 'exercise') {
    return (
      <AppSheet
        open
        title={t('sessionCall.instructionsTitle')}
        subtitle={session.workoutName ?? session.name}
        icon={<MessageSquareText size={20} strokeWidth={2.4} />}
        onClose={onClose}
        height="large"
      >
        <ExercisePanel session={session} />
      </AppSheet>
    )
  }

  return (
    <AppSheet
      open
      title={t('sessionCall.myInfoTitle')}
      subtitle={t('sessionCall.myInfoSubtitle')}
      icon={<UserRound size={20} strokeWidth={2.4} />}
      onClose={onClose}
      height="default"
    >
      {session.isAuthenticated ? (
        <UserInfoPanel session={session} />
      ) : (
        <AppSheetNotice>{t('sessionCall.notLoggedIn')}</AppSheetNotice>
      )}
    </AppSheet>
  )
}
