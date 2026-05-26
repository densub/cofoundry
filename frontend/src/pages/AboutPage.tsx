import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function AboutPage() {
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

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 border-b border-space-600">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(56,139,253,0.12),transparent_50%)]" aria-hidden="true" />
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="text-brand-400 text-sm font-semibold mb-4">About CoFoundry</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Built by a developer who kept meeting the wrong people
            </h1>
            <p className="text-lg text-fg-muted leading-relaxed">
              CoFoundry exists because co-founder discovery is broken. LinkedIn profiles are polished resumes.
              Twitter introductions fade. Discord servers are noise. We wanted something built on actual work.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="space-y-10 text-sm leading-relaxed text-fg-muted">
            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">Our mission</h2>
              <p className="mb-4">
                CoFoundry's goal is simple: give every developer a way to find collaborators based on what they
                actually build — not what they claim to build. We use GitHub as the ground truth.
              </p>
              <p>
                When you connect GitHub, CoFoundry builds a knowledge graph of your projects, skills, and ideas.
                That graph becomes your calling card. When someone else's graph overlaps with yours in a meaningful
                way, CoFoundry surfaces it — with a concrete reason to reach out.
              </p>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">Why GitHub?</h2>
              <p className="mb-4">
                GitHub is where developers do their real work. Commit history, project structure, and README files
                reveal far more about how someone thinks than any résumé bullet point. CoFoundry reads that signal
                and turns it into a matching layer.
              </p>
              <p>
                We only read public repository metadata. We never access your source code directly, and we don't
                need write access to your GitHub account.
              </p>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">Where we are today</h2>
              <p className="mb-4">
                CoFoundry is in public beta. The core features — project graph, AI project chat, connection graph,
                and collaborator matching — are live and free to use.
              </p>
              <p>
                We're a small, focused team iterating fast based on feedback from our beta users. If you have
                thoughts, ideas, or bugs to report, we want to hear from you.
              </p>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">The builder</h2>
              <div className="flex items-start gap-4 mt-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-fg">densub</p>
                  <p className="text-xs text-fg-muted mb-3">Founder &amp; Developer</p>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://densub.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
                    >
                      densub.xyz ↗
                    </a>
                    <a
                      href="https://github.com/densub"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
                    >
                      github.com/densub ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">Open Source</h2>
              <p className="mb-5">
                CoFoundry is fully open source. The entire codebase is on GitHub — read it, fork it,
                contribute to it, or adapt it for your own projects.
              </p>
              <a
                href="https://github.com/densub/cofoundry"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg btn-secondary text-sm font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.532 1.03 1.532 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                View source on GitHub
              </a>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-4">Get in touch</h2>
              <p className="mb-4">
                We're always happy to talk to developers using CoFoundry — whether that's a feature request,
                a bug report, or just a conversation about the problem we're solving.
              </p>
              <Link
                to="/contact"
                className="inline-flex px-5 py-2.5 rounded-lg btn-primary text-sm font-medium"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
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
