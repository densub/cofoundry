import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-space-600/80">
        <Logo size="md" />
        <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">
          Get started
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-800 border border-space-600 text-sm text-fg-muted mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
          Match on real GitHub projects
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight max-w-3xl">
          Find your next
          <span className="block text-brand-400">co-founder</span>
        </h1>

        <p className="text-lg text-fg-muted max-w-xl mb-10 leading-relaxed">
          CoFoundry imports your repos, maps them as a project graph, and matches you with
          builders working on similar code — friendly, focused, and developer-first.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/auth" className="px-8 py-3 rounded-lg btn-primary font-semibold">
            Start with GitHub
          </Link>
          <a href="#how" className="px-8 py-3 rounded-lg btn-secondary font-medium">
            How it works
          </a>
        </div>
      </div>

      <section id="how" className="max-w-4xl mx-auto px-6 py-20 w-full border-t border-space-600">
        <h2 className="text-2xl font-bold text-center mb-12 text-fg">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '◆',
              title: 'Connect GitHub',
              desc: 'Onboarding pulls in your repositories as project nodes. No manual skill tags.',
            },
            {
              icon: '◎',
              title: 'Explore your graph',
              desc: 'See projects as bubbles. Chat with any repo to refine ideas before you reach out.',
            },
            {
              icon: '⇄',
              title: 'Match & collaborate',
              desc: 'We compare project overlap and suggest concrete ways to build together.',
            },
          ].map(item => (
            <div key={item.title} className="card p-6">
              <div className="text-2xl mb-4 text-brand-400 font-mono">{item.icon}</div>
              <h3 className="font-semibold text-fg mb-2">{item.title}</h3>
              <p className="text-fg-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-fg-subtle border-t border-space-600">
        CoFoundry — built for developers who ship together
      </footer>
    </div>
  )
}
