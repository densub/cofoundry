import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../store/useStore'
import { Logo } from '../brand/Logo'

export default function Navbar() {
  const { signOut } = useAuth()
  const profile = useStore(s => s.profile)
  const location = useLocation()

  const links = [
    { to: '/dashboard', label: 'My Graph' },
    { to: '/matches', label: 'Matches' },
    { to: '/integrations', label: 'Integrations' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-space-900/90 backdrop-blur-md border-b border-space-600">
      <div className="flex items-center justify-between px-6 h-14">
        <Link to="/dashboard" className="hover:opacity-90 transition-opacity">
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-3">
          {profile?.display_name && (
            <span className="text-sm text-fg-muted">{profile.display_name}</span>
          )}
          <button
            onClick={signOut}
            className="text-sm text-fg-muted hover:text-fg transition-colors px-3 py-1.5 rounded-lg hover:bg-space-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
