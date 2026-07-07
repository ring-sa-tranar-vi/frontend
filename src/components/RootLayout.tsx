import { useAuth } from '@clerk/react'
import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCreateCurrentUserProfile } from '../features/auth/useCreateCurrentUserProfile'
import AppStageFrame from './AppStageFrame'
import { fetchTrainersWithToken } from '../api/trainers'

export default function RootLayout() {
  const queryClient = useQueryClient()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  useCreateCurrentUserProfile()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    void (async () => {
      const token = await getToken()

      if (!token) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey: ['trainers'],
        queryFn: () => fetchTrainersWithToken(token),
      })
    })()
  }, [getToken, isLoaded, isSignedIn, queryClient])

  if (isAdminRoute) {
    return (
      <main className="relative min-h-dvh w-full text-[#221447]">
        <Outlet />
      </main>
    )
  }

  return (
    <main className="app-root app-root-shell relative flex w-full items-center justify-center overflow-hidden text-[#221447]">
      <AppStageFrame>
        <Outlet />
      </AppStageFrame>
    </main>
  )
}
