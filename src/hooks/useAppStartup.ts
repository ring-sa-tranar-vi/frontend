import { useAuth } from '@clerk/react'
import { useCreateCurrentUserProfile } from '../features/auth/useCreateCurrentUserProfile'
import { useEffect, useState } from 'react'
import {
  getStoredTrainerId,
  setStoredTrainerId,
} from '../features/HomePage/trainerPreference'
import { useTrainers } from './useTrainers'
import { useActivitySummary } from './useActivitySummary'
import useCurrentWorkout from './useCurrentWorkout'

export default function useAppStartup() {
  const [isStorageSyncComplete, setIsStorageSyncComplete] = useState(false)
  const { userId } = useAuth()
  const { isProfileSyncReady, profile } = useCreateCurrentUserProfile()
  const { isFetched: isTrainersFetched } = useTrainers()
  const { isFetched: isActivitySummaryFetched } = useActivitySummary(!!userId)
  const { isFetched: isWorkoutsFetched } = useCurrentWorkout()

  useEffect(() => {
    if (profile?.trainerId && userId) {
      const storedTrainerId = getStoredTrainerId()
      if (storedTrainerId !== profile.trainerId) {
        setStoredTrainerId(profile.trainerId!)
      }
      setIsStorageSyncComplete(true)
    } else {
      setIsStorageSyncComplete(true)
    }
  }, [profile])

  const isTrainsersReady = !!userId ? isTrainersFetched : true
  const isActivitySummaryReady = !!userId ? isActivitySummaryFetched : true

  return {
    isAppReady:
      isProfileSyncReady &&
      isTrainsersReady &&
      isActivitySummaryReady &&
      isWorkoutsFetched &&
      isStorageSyncComplete,
  }
}
