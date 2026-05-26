import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'cofoundry_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, [])

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch { /* ignore */ }
    setVisible(false)
  }

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'dismissed') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 sm:px-6 sm:py-5 bg-space-800/95 backdrop-blur border-t border-space-600 shadow-[0_-4px_24px_rgba(1,4,9,0.5)]"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3 text-sm text-fg-muted">
          <span className="text-xl mt-0.5" aria-hidden="true">🍪</span>
          <p className="leading-relaxed">
            We use essential cookies to keep CoFoundry running and remember your preferences.{' '}
            <Link to="/cookies" className="text-brand-400 hover:underline">
              Cookie Policy
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={dismiss}
            className="px-4 py-2 text-sm rounded-lg btn-secondary"
          >
            Dismiss
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded-lg btn-primary font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
