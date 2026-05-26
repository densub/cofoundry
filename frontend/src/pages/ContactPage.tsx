import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-space-600/80 bg-space-950/95 backdrop-blur-md">
        <Link to="/" aria-label="CoFoundry home" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-fg-muted hover:text-fg transition-colors hidden sm:inline">
            ← Back to home
          </Link>
          <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">Get started free</Link>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-brand-400 font-semibold mb-3">Contact</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in touch</h1>
        <p className="text-fg-muted leading-relaxed mb-10">
          CoFoundry is open source and built in public. The fastest way to reach us is through GitHub.
        </p>

        <div className="space-y-4">
          <a
            href="https://github.com/densub/cofoundry/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-6 flex items-start gap-4 hover:border-brand-400/40 transition-colors block"
          >
            <div className="w-10 h-10 rounded-xl bg-space-700 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-fg-muted" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.532 1.03 1.532 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-fg mb-1">Open a GitHub issue</p>
              <p className="text-sm text-fg-muted leading-relaxed">
                Bug reports, feature requests, and questions — all tracked in the open.
                github.com/densub/cofoundry
              </p>
            </div>
          </a>

          <a
            href="https://github.com/densub/cofoundry/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-6 flex items-start gap-4 hover:border-brand-400/40 transition-colors block"
          >
            <div className="w-10 h-10 rounded-xl bg-space-700 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-fg mb-1">GitHub Discussions</p>
              <p className="text-sm text-fg-muted leading-relaxed">
                Ask questions, share ideas, and connect with others building with CoFoundry.
              </p>
            </div>
          </a>

          <a
            href="https://densub.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-6 flex items-start gap-4 hover:border-brand-400/40 transition-colors block"
          >
            <div className="w-10 h-10 rounded-xl bg-space-700 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-fg mb-1">Founder's site</p>
              <p className="text-sm text-fg-muted leading-relaxed">
                densub.xyz — the person behind CoFoundry.
              </p>
            </div>
          </a>
        </div>
      </main>

      <footer className="border-t border-space-600 px-4 sm:px-8 py-6 text-xs text-fg-subtle">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2025 CoFoundry. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-fg transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
