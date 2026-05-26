import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { connectionsApi } from '../../lib/api'
import {
  CONNECTION_REQUESTS_SEEN_EVENT,
  countUnseenConnectionRequests,
} from '../../lib/connectionNotifications'
import { useStore } from '../../store/useStore'
import { Logo } from '../brand/Logo'

type IconProps = { className?: string }
type NavLink = {
  to: string
  label: string
  Icon: (props: IconProps) => JSX.Element
}

function GraphIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5a3 3 0 100 6 3 3 0 000-6zM5 16a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM19 16a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10.2 10.4l-3.5 6.1M13.8 10.4l3.5 6.1M7.5 18.5h9" />
    </svg>
  )
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0M18 10.5a3 3 0 110-6M19.5 20.25a5.6 5.6 0 00-2.3-4.5" />
    </svg>
  )
}

function IntegrationsIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 7.5h-1.5A3.75 3.75 0 003 11.25v0A3.75 3.75 0 006.75 15h1.5M15.75 7.5h1.5A3.75 3.75 0 0121 11.25v0A3.75 3.75 0 0117.25 15h-1.5M8.25 11.25h7.5M9 4.5l-1.5 3M15 4.5l1.5 3M9 18l-1.5 3M15 18l1.5 3" />
    </svg>
  )
}

function TeamIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-5.447-3.724M9 20H4v-2a4 4 0 015.447-3.724M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zM3 10a3 3 0 116 0 3 3 0 01-6 0z" />
    </svg>
  )
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.3 4.1c.4-1.6 2.9-1.6 3.4 0 .2.8 1.1 1.2 1.8.8 1.5-.8 3.2 1 2.4 2.4-.4.7 0 1.6.8 1.8 1.6.4 1.6 2.9 0 3.4-.8.2-1.2 1.1-.8 1.8.8 1.5-1 3.2-2.4 2.4-.7-.4-1.6 0-1.8.8-.4 1.6-2.9 1.6-3.4 0-.2-.8-1.1-1.2-1.8-.8-1.5.8-3.2-1-2.4-2.4.4-.7 0-1.6-.8-1.8-1.6-.4-1.6-2.9 0-3.4.8-.2 1.2-1.1.8-1.8-.8-1.5 1-3.2 2.4-2.4.7.4 1.6 0 1.8-.8z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function Navbar() {
  const { signOut } = useAuth()
  const profile = useStore(s => s.profile)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unseenRequests, setUnseenRequests] = useState(0)

  const links: NavLink[] = [
    { to: '/dashboard', label: 'My Graph', Icon: GraphIcon },
    { to: '/connections', label: 'My Connections', Icon: UsersIcon },
    { to: '/build-team', label: 'Build a Team', Icon: TeamIcon },
    { to: '/integrations', label: 'Integrations', Icon: IntegrationsIcon },
    { to: '/settings', label: 'Settings', Icon: SettingsIcon },
  ]

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profile?.id || !profile.is_onboarded) {
      setUnseenRequests(0)
      return
    }

    let cancelled = false

    async function refreshUnseenRequests() {
      try {
        const summary = await connectionsApi.list()
        if (!cancelled) {
          setUnseenRequests(countUnseenConnectionRequests(profile!.id, summary.incomingRequests))
        }
      } catch {
        if (!cancelled) setUnseenRequests(0)
      }
    }

    refreshUnseenRequests()
    const interval = window.setInterval(refreshUnseenRequests, 30_000)
    window.addEventListener('focus', refreshUnseenRequests)
    window.addEventListener(CONNECTION_REQUESTS_SEEN_EVENT, refreshUnseenRequests)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshUnseenRequests)
      window.removeEventListener(CONNECTION_REQUESTS_SEEN_EVENT, refreshUnseenRequests)
    }
  }, [profile?.id, profile?.is_onboarded, location.pathname])

  function notificationBadge(link: NavLink) {
    if (link.to !== '/connections' || unseenRequests === 0) return null
    return (
      <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[0.7rem] leading-none font-bold flex items-center justify-center shadow-lg shadow-red-500/30 ring-2 ring-space-900">
        {unseenRequests > 99 ? '99+' : unseenRequests}
      </span>
    )
  }

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-space-900/90 backdrop-blur-md border-b border-space-600">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        <Link to="/dashboard" className="hover:opacity-90 transition-opacity">
          <Logo size="sm" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              aria-label={link.label}
              title={link.label}
              className={`relative h-10 px-3 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-space-700 text-fg'
                  : 'text-fg-muted hover:text-fg hover:bg-space-800'
              }`}
            >
              <link.Icon className="w-5 h-5" />
              <span>{link.label}</span>
              {notificationBadge(link)}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {profile?.display_name && (
            <span className="text-sm text-fg-muted">{profile.display_name}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-fg-muted hover:text-fg transition-colors px-3 py-1.5 rounded-lg hover:bg-space-800"
          >
            Sign out
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-fg-muted hover:text-fg hover:bg-space-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-space-600 bg-space-900/95 backdrop-blur-md px-3 py-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                aria-label={link.label}
                title={link.label}
                className={`relative h-12 px-3 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-space-700 text-fg'
                    : 'text-fg-muted hover:text-fg hover:bg-space-800'
                }`}
              >
                <link.Icon className="w-5 h-5" />
                <span>{link.label}</span>
                {notificationBadge(link)}
              </Link>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-space-600 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-fg-muted/70">Signed in</p>
              <p className="text-sm text-fg truncate">{profile?.display_name ?? 'Account'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 text-sm text-fg-muted hover:text-fg transition-colors px-3 py-2 rounded-lg hover:bg-space-800"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
