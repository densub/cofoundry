import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg">
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-space-600/80">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">Sign up</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
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
    </div>
  )
}
