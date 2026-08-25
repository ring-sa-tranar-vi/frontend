import { Outlet, useRouterState } from '@tanstack/react-router'
import { useCreateCurrentUserProfile } from '../features/auth/useCreateCurrentUserProfile'
import AppStageFrame from './AppStageFrame'
import useAppStartup from '../hooks/useAppStartup'
import SplashScreen from './SpashScreen'

export default function RootLayout() {
  const { isAppReady } = useAppStartup()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  useCreateCurrentUserProfile()

  if (!isAppReady) {
    return <SplashScreen />
  }

  if (isAdminRoute) {
    return (
      <main className="relative min-h-dvh w-full text-(--brand-ink)">
        <Outlet />
      </main>
    )
  }

  return (
    <main className="app-root app-root-shell relative flex w-full items-center justify-center overflow-hidden text-(--brand-ink)">
      <AppStageFrame>
        <Outlet />
      </AppStageFrame>
    </main>
  )
}
