import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-space-600/80 bg-space-950/95 backdrop-blur-md">
        <Link to="/" aria-label="CoFoundry home" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-fg-muted hover:text-fg transition-colors hidden sm:inline">← Back to home</Link>
          <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">Get started free</Link>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-brand-400 font-semibold mb-3">Terms of Service</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Use CoFoundry responsibly</h1>
        <p className="text-fg-muted leading-relaxed mb-10">
          These starter terms describe expected product behavior and user responsibilities. They are not legal
          advice. Review with counsel before production launch.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-fg-muted">
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Your account</h2>
            <p>
              You are responsible for keeping your account secure and for the activity that happens under your
              account. Do not use CoFoundry to impersonate others or misrepresent your work.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Acceptable use</h2>
            <p>
              Do not abuse the service, attempt to bypass rate limits, scrape private data, attack the platform,
              spam other users, or use AI features to extract secrets, hidden prompts, credentials, or private app data.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">GitHub and third-party services</h2>
            <p>
              CoFoundry depends on services like GitHub, Supabase, and AI providers. Their availability and rules
              may affect what CoFoundry can do. You are responsible for complying with third-party terms.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">AI output</h2>
            <p>
              AI responses may be incomplete or incorrect. Treat suggestions as a starting point, not professional,
              legal, financial, or security advice. Verify important decisions yourself.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Content ownership</h2>
            <p>
              You retain responsibility for the content you import or create. CoFoundry uses that content to provide
              graph, matching, chat, and collaboration features.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Service changes</h2>
            <p>
              Features, limits, and availability may change as CoFoundry evolves. Continued use means you accept the
              current product behavior and applicable policies.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-space-600 px-4 sm:px-8 py-6 text-xs text-fg-subtle">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2025 CoFoundry. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
            <Link to="/cookies" className="hover:text-fg transition-colors">Cookie Policy</Link>
            <Link to="/contact" className="hover:text-fg transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
