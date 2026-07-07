import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal'
import { useTranslation } from 'react-i18next'
import type { ToastType } from '../../hooks/useToast'
import { fetchWorkouts, deleteWorkout } from '../../api/workouts'

type Workout = {
  id: number
  name: string
  type?: string
  level?: number
  durationSeconds?: number
}

type StatusFn = (
  message: string,
  options?: { type?: ToastType; duration?: number },
) => void

type Props = {
  onEdit: (workoutId: number) => void
  onCreate: () => void
  onStatusChange?: StatusFn
}

export default function AllWorkoutsPage({
  onEdit,
  onCreate,
  onStatusChange,
}: Props) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<number | null>(
    null,
  )

  //  FETCH workouts
  const {
    data: workouts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      return fetchWorkouts(token)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const token = await getToken()

      if (!token) {
        throw new Error('Missing Clerk token')
      }

      setDeletingWorkoutId(workoutId)
      onStatusChange?.('Deleting workout...', { type: 'info' })

      return deleteWorkout(workoutId, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      onStatusChange?.('Workout deleted.', { type: 'success' })
      setDeletingWorkoutId(null)
    },
    onError: () => {
      onStatusChange?.('Failed to delete workout.', { type: 'error' })
      setDeletingWorkoutId(null)
    },
  })

  const [confirmModal, setConfirmModal] = useState<
    { open: true; workout: Workout } | { open: false }
  >({ open: false })

  const scheduleDelete = (workout: Workout) => {
    if (deletingWorkoutId != null) {
      onStatusChange?.('Finish the current delete first.', { type: 'info' })
      return
    }

    setConfirmModal({ open: true, workout })
  }

  const onConfirmDelete = async () => {
    if (confirmModal.open !== true) return
    setConfirmModal({ open: false })
    await deleteMutation.mutateAsync(confirmModal.workout.id)
  }

  const onCancelDelete = () => setConfirmModal({ open: false })

  if (isLoading) {
    return <p className="text-sm text-(--brand-muted)">Loading workouts...</p>
  }

  if (isError) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>
  }

  return (
    <div className="space-y-4">
      {confirmModal.open && (
        <ConfirmModal
          open={true}
          title={t('workoutsAdmin.deleteTitle')}
          body={t('workoutsAdmin.deleteBody', {
            name: confirmModal.workout.name,
          })}
          requireTyping={'DELETE'}
          confirmLabel={t('workoutsAdmin.deleteConfirm')}
          cancelLabel={t('workoutsAdmin.cancel')}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('workoutsAdmin.allWorkouts')}</h2>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full bg-(--brand-primary) px-4 py-2 text-sm font-semibold text-(--brand-on-primary)"
        >
          {t('workoutsAdmin.addWorkout')}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {workouts.map((workout: Workout) => (
          <div
            key={workout.id}
            onClick={() => onEdit(workout.id)}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-(--brand-border) bg-(--brand-surface-glass) p-4 transition hover:border-(--brand-primary)"
          >
            {/* Info */}
            <div>
              <p className="font-semibold">{workout.name}</p>
              <p className="text-xs text-(--brand-muted)">
                {workout.type ?? 'No type'} • Level {workout.level ?? '-'} •{' '}
                {workout.durationSeconds ?? '-'} sec
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(workout.id)
                }}
                className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white"
              >
                {t('workoutsAdmin.edit')}
              </button>

              <button
                onClick={(event) => {
                  event.stopPropagation()
                  scheduleDelete(workout)
                }}
                disabled={deletingWorkoutId === workout.id}
                className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {deletingWorkoutId === workout.id
                  ? t('workoutsAdmin.deleting')
                  : t('workoutsAdmin.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
