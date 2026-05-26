import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function CookiePolicyPage() {
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

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-brand-400 font-semibold mb-3">Cookie Policy</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">How CoFoundry uses cookies</h1>
        <p className="text-fg-muted leading-relaxed mb-10">
          This page explains the cookies and similar storage mechanisms CoFoundry uses and why.
          Last updated: May 2025.
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-fg-muted">
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files stored in your browser. CoFoundry primarily uses browser{' '}
              <code className="text-brand-300 bg-space-700 px-1 rounded text-xs">localStorage</code> and session
              storage rather than traditional HTTP cookies. The effect is similar: small pieces of data
              are saved in your browser to keep the app working correctly.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Essential storage (always active)</h2>
            <p className="mb-4">
              These are required for CoFoundry to function. You cannot opt out of them without also
              opting out of using the service.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-space-600">
                  <th className="text-left text-fg py-2 pr-4 font-medium">Key</th>
                  <th className="text-left text-fg py-2 pr-4 font-medium">Purpose</th>
                  <th className="text-left text-fg py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-600/50">
                {[
                  ['supabase.auth.token', 'Keeps you signed in between sessions', 'Session'],
                  ['cofoundry_cookie_consent', 'Remembers your cookie banner choice', '1 year'],
                  ['sb-*', 'Supabase authentication state', 'Session'],
                ].map(([key, purpose, duration]) => (
                  <tr key={key}>
                    <td className="py-2 pr-4 font-mono text-brand-300">{key}</td>
                    <td className="py-2 pr-4">{purpose}</td>
                    <td className="py-2 text-fg-subtle">{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Analytics (optional)</h2>
            <p>
              CoFoundry may add privacy-friendly analytics (such as Plausible or Fathom) in the future to
              understand how the product is used. These tools do not use third-party tracking cookies and
              do not fingerprint users. This section will be updated before any analytics are enabled.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Third-party services</h2>
            <p className="mb-3">
              CoFoundry is built on services that may set their own storage:
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-brand-400 mt-0.5">·</span>
                <span><strong className="text-fg">Supabase</strong> — authentication and database. Sets session tokens required to keep you signed in.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 mt-0.5">·</span>
                <span><strong className="text-fg">GitHub OAuth</strong> — sign-in provider. GitHub's own cookies apply during the OAuth flow on github.com.</span>
              </li>
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Managing cookies</h2>
            <p className="mb-3">
              You can clear all CoFoundry storage at any time from your browser's developer tools
              (Application → Local Storage) or by deleting your account in Settings.
            </p>
            <p>
              For general cookie management, visit your browser's privacy settings. Note that clearing
              essential cookies will sign you out of CoFoundry.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Questions?</h2>
            <p>
              If you have questions about how CoFoundry handles cookies or data, please{' '}
              <Link to="/contact" className="text-brand-400 hover:underline">contact us</Link> or
              read our{' '}
              <Link to="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-space-600 px-4 sm:px-8 py-6 text-xs text-fg-subtle">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2025 CoFoundry. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-fg transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-fg transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
