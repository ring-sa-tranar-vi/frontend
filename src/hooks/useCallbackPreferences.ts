import { useAuth } from '@clerk/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiBaseUrl } from '../lib/apiBaseUrl'
import useCurrentUser from './useCurrentUser'
import type {
  CallbackRequest,
  CallbackWeekday,
} from '../features/HomePage/components/menu/types'

const API_DAY_BY_WEEKDAY: Record<CallbackWeekday, string> = {
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
  friday: 'FRIDAY',
  saturday: 'SATURDAY',
  sunday: 'SUNDAY',
}

type CallbackRemoval = {
  activityId: string
  weekday: CallbackWeekday
}

async function requestCallbackPreference(
  path: string,
  token: string,
  init: RequestInit,
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed (${response.status})`)
  }
}

export function useCallbackPreferences() {
  const { getToken, isSignedIn } = useAuth()
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()

  async function getRequestContext() {
    if (!isSignedIn || !userId) {
      throw new Error('Missing signed-in user')
    }

    const token = await getToken()
    if (!token) {
      throw new Error('Missing Clerk token')
    }

    return { token, userId }
  }

  const saveCallbackMutation = useMutation({
    mutationFn: async (request: CallbackRequest) => {
      const { token, userId } = await getRequestContext()

      await requestCallbackPreference(
        `/api/users/${userId}/callback-preference`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: API_DAY_BY_WEEKDAY[request.weekday],
            time: `${request.time}:00`,
            repeatType: request.repeat === 'never' ? 'NEVER' : 'WEEKLY',
          }),
        },
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const removeCallbackMutation = useMutation({
    mutationFn: async ({ weekday }: CallbackRemoval) => {
      const { token, userId } = await getRequestContext()

      await requestCallbackPreference(
        `/api/users/${userId}/callback-preference/${API_DAY_BY_WEEKDAY[weekday]}`,
        token,
        { method: 'DELETE' },
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  return { saveCallbackMutation, removeCallbackMutation }
}
