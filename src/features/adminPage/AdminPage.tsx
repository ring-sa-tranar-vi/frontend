import { SignInButton, SignOutButton, useAuth, useUser } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import FeedbackAdminPage from './FeedbackAdminPage'
import MainWorkoutPage from './MainWorkoutPage'
import TrainerAdminPage from './TrainerAdminPage'
import AdminDashboard from './AdminDashboard'
import { useAdminPage } from '../../hooks/useAdminPage'
import { useMyProfile } from '../../hooks/useMyProfile'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { fetchAdminUserCount } from '../../api/admins'

type AdminView = 'dashboard' | 'workouts' | 'trainers' | 'feedback'

function resolveInitialView(): AdminView {
  if (typeof window === 'undefined') return 'dashboard'
  const p = window.location.pathname
  if (p.endsWith('/trainers')) return 'trainers'
  if (p.endsWith('/feedback')) return 'feedback'
  if (p.endsWith('/workouts')) return 'workouts'
  return 'dashboard'
}

// ── Nav icon helpers ──────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  )
}
function IconWorkout() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
    </svg>
  )
}
function IconTrainers() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  )
}
function IconFeedback() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  )
}

// ── Mini sparkline for the sidebar "Active Users" widget ──────────────────
function SidebarSparkline() {
  return (
    <svg viewBox="0 0 80 30" className="h-8 w-full" preserveAspectRatio="none">
      <polyline
        points="0,25 10,20 20,22 30,16 40,18 50,12 60,10 70,6 80,3"
        fill="none"
        stroke="#5836d6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SidebarActiveUsersCard() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const { data } = useQuery<{ count: number; activeCount: number }>({
    queryKey: ['admin-user-count'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('No token')
      return fetchAdminUserCount(token)
    },
    staleTime: 60_000,
  })

  return (
    <div className="m-3 rounded-2xl bg-[#f5f0ff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <p className="text-[10px] font-semibold tracking-widest text-[#6f6a93] uppercase">
        {t('admin.activeUsers')}
      </p>
      <div className="mt-3 flex items-start gap-3">
        <svg
          viewBox="0 0 24 24"
          className="mt-1 h-5 w-5 text-[#5836d6]"
          fill="currentColor"
        >
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        <div>
          <p className="text-3xl leading-none font-extrabold text-[#100b2f]">
            {data?.activeCount ?? '–'}
          </p>
          <p className="mt-1 text-xs font-medium text-[#5836d6]">
            {t('admin.activeLast30Days')}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9b96b8]">
            {t('admin.totalRegistered')}: {data?.count ?? '–'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <SidebarSparkline />
      </div>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const { t } = useTranslation()
  const isAdmin = profile?.isAdmin === true
  const { isLoading, error } = useAdminPage(isAdmin)

  const [activeView, setActiveView] = useState<AdminView>(resolveInitialView)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    document.body.classList.add('admin-shell')

    return () => {
      document.body.classList.remove('admin-shell')
    }
  }, [])

  // ── Loading / auth guards ───────────────────────────────────────────────
  if (!isLoaded || profileLoading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#f5f0ff] text-[#100b2f]">
        <p className="text-sm font-medium text-[#6f6a93]">
          {t('admin.checkingAccess')}
        </p>
      </main>
    )
  }

  if (!isSignedIn) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#f5f0ff] px-6 text-[#100b2f]">
        <section className="max-w-md rounded-3xl border border-[#d8ccff] bg-white/70 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-semibold tracking-[0.24em] text-[#5836d6] uppercase">
            {t('admin.access')}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">
            {t('admin.signInTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6a93]">
            {t('admin.signInDescription')}
          </p>
          <SignInButton>
            <button
              type="button"
              className="mt-6 rounded-full bg-[#5836d6] px-5 py-2.5 text-sm font-bold text-white transition active:scale-95"
            >
              {t('auth.login')}
            </button>
          </SignInButton>
        </section>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#f5f0ff] px-6 text-[#100b2f]">
        <section className="max-w-md rounded-3xl border border-[#d8ccff] bg-white/70 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-semibold tracking-[0.24em] text-[#5836d6] uppercase">
            {t('admin.access')}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">
            {t('admin.notAdminTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6a93]">
            {t('admin.notAdminDescription')}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="mt-6 rounded-full bg-[#5836d6] px-5 py-2.5 text-sm font-bold text-white transition active:scale-95"
          >
            {t('admin.goBackHome')}
          </button>
        </section>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#f5f0ff] text-[#100b2f]">
        <p className="text-sm font-medium text-[#6f6a93]">
          {t('admin.loading')}
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#f5f0ff] px-6 text-[#100b2f]">
        <section className="max-w-md rounded-3xl border border-[#d8ccff] bg-white/70 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
          <h1 className="mt-3 text-3xl font-extrabold">
            {t('admin.loadErrorTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6a93]">
            {t('admin.loadErrorDescription')}
          </p>
        </section>
      </main>
    )
  }

  const navItems: {
    view: AdminView
    label: string
    Icon: () => ReactElement
  }[] = [
    { view: 'dashboard', label: t('admin.nav.dashboard'), Icon: IconDashboard },
    { view: 'workouts', label: t('admin.nav.workouts'), Icon: IconWorkout },
    { view: 'trainers', label: t('admin.nav.trainers'), Icon: IconTrainers },
    { view: 'feedback', label: t('admin.nav.feedback'), Icon: IconFeedback },
  ]

  const switchView = (view: AdminView) => {
    setActiveView(view)
    const routes: Record<AdminView, string> = {
      dashboard: '/admin',
      workouts: '/admin/workouts',
      trainers: '/admin/trainers',
      feedback: '/admin/feedback',
    }
    navigate({ to: routes[view] })
  }

  const handleSearchSubmit = () => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return

    if (q.includes('workout')) {
      switchView('workouts')
      return
    }
    if (q.includes('trainer')) {
      switchView('trainers')
      return
    }
    if (q.includes('feedback')) {
      switchView('feedback')
      return
    }
    if (q.includes('dashboard') || q.includes('overview')) {
      switchView('dashboard')
    }
  }

  const userName =
    user?.firstName ?? user?.fullName ?? t('admin.defaultUserName')
  const userAvatar = user?.imageUrl

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f0ff]">
      {/* ──────── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-white shadow-[2px_0_12px_rgba(88,54,214,0.08)]">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5836d6]">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-white"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <p className="text-xs leading-none font-extrabold tracking-widest text-[#100b2f] uppercase">
              {t('admin.brand')}
            </p>
            <p className="text-[10px] leading-tight font-semibold tracking-widest text-[#6f6a93] uppercase">
              {t('admin.console')}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex flex-col gap-1 px-3">
          {navItems.map(({ view, label, Icon }) => (
            <button
              key={view}
              onClick={() => switchView(view)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeView === view
                  ? 'bg-[#5836d6] text-white shadow-md'
                  : 'text-[#6f6a93] hover:bg-[#f5f0ff] hover:text-[#100b2f]'
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-4">
          <SidebarActiveUsersCard />
        </div>

        <div className="mt-auto border-t border-gray-100 px-3 py-4">
          <p className="px-1 pb-2 text-[10px] font-semibold tracking-widest text-[#6f6a93] uppercase">
            {t('admin.languageLabel')}
          </p>
          <LanguageSwitcher />
        </div>
      </aside>

      {/* ──────── MAIN AREA ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-5 py-2.5 shadow-sm">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="mr-2 rounded-md px-3 py-2 text-sm font-semibold text-[#5836d6] hover:bg-[#f5f0ff]"
            aria-label={t('admin.backToHomeAriaLabel')}
          >
            ← {t('admin.goBackHome')}
          </button>
          {/* Search */}
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-[#f5f0ff] px-4 py-2">
            <svg
              className="h-4 w-4 shrink-0 text-[#6f6a93]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={t('admin.searchPlaceholder')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSearchSubmit()
                }
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6f6a93]"
            />
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-[#d8ccff]"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5836d6] text-sm font-bold text-white">
                {userName[0]}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm leading-tight font-bold text-[#100b2f]">
                {userName}
              </p>
              <p className="text-xs leading-tight text-[#6f6a93]">
                {t('admin.superadmin')}
              </p>
            </div>
            <svg
              className="h-4 w-4 text-[#6f6a93]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>

            <SignOutButton>
              <button
                type="button"
                className="rounded-full border border-[#d8ccff] bg-white px-3 py-1.5 text-xs font-bold text-[#5836d6] transition hover:bg-[#f5f0ff] active:scale-95"
              >
                {t('auth.logout')}
              </button>
            </SignOutButton>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {activeView === 'dashboard' && (
            <AdminDashboard
              searchTerm={searchTerm}
              onOpenWorkouts={() => switchView('workouts')}
              onOpenFeedbacks={() => switchView('feedback')}
            />
          )}
          {activeView === 'workouts' && (
            <MainWorkoutPage
              onSwitchTab={(tab) => switchView(tab)}
              searchTerm={searchTerm}
            />
          )}
          {activeView === 'trainers' && (
            <TrainerAdminPage searchTerm={searchTerm} />
          )}
          {activeView === 'feedback' && <FeedbackAdminPage />}
        </main>
      </div>
    </div>
  )
}
