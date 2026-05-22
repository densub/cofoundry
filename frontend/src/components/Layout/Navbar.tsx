import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../store/useStore'
import { Logo } from '../brand/Logo'

export default function Navbar() {
  const { signOut } = useAuth()
  const profile = useStore(s => s.profile)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/dashboard', label: 'My Graph' },
    { to: '/matches', label: 'Matches' },
    { to: '/integrations', label: 'Integrations' },
    { to: '/settings', label: 'Settings' },
  ]

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-space-700 text-fg'
                  : 'text-fg-muted hover:text-fg hover:bg-space-800'
              }`}
            >
              {link.label}
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
          <div className="space-y-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-space-700 text-fg'
                    : 'text-fg-muted hover:text-fg hover:bg-space-800'
                }`}
              >
                {link.label}
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
