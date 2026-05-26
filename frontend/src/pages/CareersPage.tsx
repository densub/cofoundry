import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function CareersPage() {
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

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-brand-400 font-semibold mb-3">Careers</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight">
          Build the future of developer collaboration
        </h1>
        <p className="text-lg text-fg-muted leading-relaxed mb-14">
          CoFoundry is an open source project with a clear mission: make it easier for the right developers
          to find each other. We're early, moving fast, and the road ahead is genuinely interesting.
        </p>

        {/* What we're building toward */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-fg mb-5">Where we're headed</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: '◆',
                title: 'Beyond GitHub',
                desc: 'Expanding the graph to more data sources — GitLab, Bitbucket, and beyond — to build a richer picture of what developers actually build.',
              },
              {
                icon: '◎',
                title: 'Smarter matching',
                desc: 'Moving from keyword overlap to deep semantic understanding of project intent, complementary skill sets, and collaboration fit.',
              },
              {
                icon: '⇄',
                title: 'Network effects',
                desc: 'As more builders join, the graph gets richer and matches get sharper. We\'re building toward the network that makes that flywheel spin.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card p-5">
                <div className="text-xl mb-3 text-brand-400 font-mono" aria-hidden="true">{icon}</div>
                <h3 className="font-semibold text-fg text-sm mb-2">{title}</h3>
                <p className="text-fg-muted text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open roles */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-fg mb-2">Open roles</h2>
          <p className="text-fg-muted text-sm mb-6">
            There are no paid positions right now — CoFoundry is a bootstrapped open source project at an
            early stage. That will change as it grows.
          </p>
          <div className="card p-8 text-center">
            <div
              className="w-14 h-14 rounded-2xl bg-space-700 border border-space-600 flex items-center justify-center mx-auto mb-5"
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <p className="font-semibold text-fg mb-2">No open positions yet</p>
            <p className="text-sm text-fg-muted max-w-sm mx-auto leading-relaxed">
              We're not hiring right now, but we're always interested in connecting with developers who care
              about the problem we're solving.
            </p>
          </div>
        </section>

        {/* Contribute */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-fg mb-2">Contribute to the project</h2>
          <p className="text-fg-muted text-sm leading-relaxed mb-6">
            The best way to get involved today is through the open source codebase. Fix a bug, build a feature,
            improve the docs, or just open an issue with a good idea. Contributors who shape the product early
            will have a real stake in where it goes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://github.com/densub/cofoundry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg btn-primary text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.532 1.03 1.532 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              View the codebase
            </a>
            <a
              href="https://github.com/densub/cofoundry/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg btn-secondary text-sm font-medium"
            >
              Browse open issues
            </a>
          </div>
        </section>

        {/* Stay in the loop */}
        <section className="card p-8">
          <h2 className="text-xl font-semibold text-fg mb-3">Stay in the loop</h2>
          <p className="text-sm text-fg-muted leading-relaxed mb-5">
            Watch the GitHub repository to follow development and be among the first to know when
            things change — including when we do start hiring.
          </p>
          <a
            href="https://github.com/densub/cofoundry"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-400 hover:underline font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Watch on GitHub
          </a>
        </section>
      </main>

      <footer className="border-t border-space-600 px-4 sm:px-8 py-6 text-xs text-fg-subtle">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2025 CoFoundry. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-fg transition-colors">About</Link>
            <Link to="/contact" className="hover:text-fg transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
