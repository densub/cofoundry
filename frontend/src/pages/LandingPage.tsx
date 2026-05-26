import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

// ---------------------------------------------------------------------------
// Product graph demo visual
// ---------------------------------------------------------------------------
function ExampleProjectGraph() {
  const nodes = [
    { label: 'GitHub repos', x: '50%', y: '48%', size: 'h-20 w-20', color: 'bg-brand-500', glow: 'shadow-brand-500/30' },
    { label: 'AI agent', x: '20%', y: '22%', size: 'h-14 w-14', color: 'bg-node-project', glow: 'shadow-node-project/30' },
    { label: 'Supabase', x: '77%', y: '24%', size: 'h-12 w-12', color: 'bg-node-skill', glow: 'shadow-node-skill/30' },
    { label: 'Graph UI', x: '28%', y: '76%', size: 'h-12 w-12', color: 'bg-node-interest', glow: 'shadow-node-interest/30' },
    { label: 'OAuth', x: '76%', y: '72%', size: 'h-10 w-10', color: 'bg-node-expertise', glow: 'shadow-node-expertise/30' },
  ]

  return (
    <div className="relative h-80 rounded-3xl border border-white/10 bg-space-900/80 overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,139,253,0.22),transparent_38%)]" />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[
          ['50%', '48%', '20%', '22%'],
          ['50%', '48%', '77%', '24%'],
          ['50%', '48%', '28%', '76%'],
          ['50%', '48%', '76%', '72%'],
          ['28%', '76%', '76%', '72%'],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(88,166,255,0.28)" strokeWidth="2" />
        ))}
      </svg>
      {nodes.map(node => (
        <div
          key={node.label}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: node.x, top: node.y }}
        >
          <div className={`${node.size} ${node.color} ${node.glow} mx-auto rounded-full shadow-2xl ring-4 ring-white/10 flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{node.label.slice(0, 2)}</span>
          </div>
          <p className="mt-2 text-xs text-white/60 whitespace-nowrap">{node.label}</p>
        </div>
      ))}
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-space-950/70 px-3 py-1 text-xs text-white/50">
        Example project graph
      </div>
    </div>
  )
}

function ExampleConnectionGraph() {
  const people = [
    { label: 'You', x: '50%', y: '50%', color: 'bg-brand-500', size: 'h-16 w-16' },
    { label: 'Maya', x: '24%', y: '28%', color: 'bg-emerald-500', size: 'h-12 w-12' },
    { label: 'Sam', x: '77%', y: '30%', color: 'bg-emerald-500', size: 'h-12 w-12' },
    { label: 'Rin', x: '25%', y: '76%', color: 'bg-yellow-500', size: 'h-10 w-10' },
    { label: 'Alex', x: '78%', y: '74%', color: 'bg-yellow-500', size: 'h-10 w-10' },
  ]

  return (
    <div className="relative h-72 rounded-3xl border border-white/10 bg-space-900/80 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(63,185,80,0.16),transparent_42%)]" />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[
          ['50%', '50%', '24%', '28%', 'rgba(63,185,80,0.42)'],
          ['50%', '50%', '77%', '30%', 'rgba(63,185,80,0.42)'],
          ['24%', '28%', '25%', '76%', 'rgba(210,153,34,0.36)'],
          ['77%', '30%', '78%', '74%', 'rgba(210,153,34,0.36)'],
        ].map(([x1, y1, x2, y2, stroke], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2" />
        ))}
      </svg>
      {people.map(person => (
        <div key={person.label} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: person.x, top: person.y }}>
          <div className={`${person.size} ${person.color} mx-auto rounded-full shadow-2xl ring-4 ring-white/10 flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{person.label.slice(0, 1)}</span>
          </div>
          <p className="mt-2 text-xs text-white/60">{person.label}</p>
        </div>
      ))}
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-space-950/70 px-3 py-1 text-xs text-white/50">
        Example connections map
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'About', href: '/about', isRoute: true },
  ]

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-space-600/80 bg-space-950/95 backdrop-blur-md shadow-[0_1px_16px_rgba(1,4,9,0.6)]'
          : 'border-space-600/50 bg-space-950/80 backdrop-blur'
      }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-7xl mx-auto">
        <Link to="/" aria-label="CoFoundry home">
          <Logo size="md" />
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {navLinks.map(link =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href!}
                className="text-sm text-fg-muted hover:text-fg transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-fg-muted hover:text-fg transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="px-5 py-2 rounded-lg btn-primary text-sm font-medium"
            onClick={() => { if (typeof window !== 'undefined') { /* analytics: cta_nav */ } }}
          >
            Get started free
          </Link>

          {/* Hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-space-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="sm:hidden border-t border-space-600/50 bg-space-950/98 px-4 pb-4 flex flex-col">
          {navLinks.map(link =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href!}
                className="text-sm text-fg-muted hover:text-fg transition-colors py-3 border-b border-space-600/30 last:border-0"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-fg-muted hover:text-fg transition-colors py-3 border-b border-space-600/30 last:border-0"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            )
          )}
        </div>
      )}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// FAQ accordion item
// ---------------------------------------------------------------------------
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-space-600/50 last:border-0">
      <button
        className="flex items-center justify-between w-full py-5 text-left text-sm font-medium text-fg hover:text-brand-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-space-950 rounded"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="pr-4">{q}</span>
        <svg
          className={`w-5 h-5 text-fg-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <p className="pb-5 text-sm text-fg-muted leading-relaxed">{a}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Social link icon helpers
// ---------------------------------------------------------------------------
function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.532 1.03 1.532 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}


// ---------------------------------------------------------------------------
// Pricing check icon
// ---------------------------------------------------------------------------
function Check() {
  return (
    <svg className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}
function Cross() {
  return (
    <svg className="w-4 h-4 text-fg-subtle flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg flex flex-col">
      <Navbar />

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,139,253,0.2),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(63,185,80,0.12),transparent_30%)]" aria-hidden="true" />
          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-800 border border-space-600 text-sm text-fg-muted mb-8">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" aria-hidden="true" />
                Match on real GitHub projects, not generic profiles
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
                Find builders who are already
                <span className="block text-brand-400">thinking like you</span>
              </h1>

              <p className="text-base sm:text-lg text-fg-muted max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                CoFoundry turns your GitHub repositories into a project graph, finds people building in adjacent spaces,
                and gives you a focused way to start the right collaboration.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <Link
                  to="/auth"
                  className="px-8 py-3 rounded-lg btn-primary font-semibold text-center"
                  onClick={() => { /* analytics: cta_hero_primary */ }}
                >
                  Start free with GitHub
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-3 rounded-lg btn-secondary font-semibold text-center"
                >
                  See how it works
                </a>
              </div>

              {/* Social proof hook */}
              <p className="text-xs text-fg-subtle mb-6">
                No credit card required &nbsp;·&nbsp; Free during beta &nbsp;·&nbsp; Connect in 30 seconds
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0">
                {[
                  ['Project graph', 'Repos become connected nodes'],
                  ['AI chat', 'Explore ideas inside a project'],
                  ['Connections', 'See your builder network'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-[11px] text-white/40 leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <ExampleProjectGraph />
              <p className="text-xs text-center text-fg-subtle">
                Demo data shown. Your graph is built from your connected GitHub repositories.
              </p>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ────────────────────────────────────────────────── */}
        <section className="border-y border-space-600/50 bg-space-900/40" aria-label="Key statistics">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '500+', label: 'developers in beta' },
              { value: '2,400+', label: 'projects indexed' },
              { value: '3 min', label: 'average setup time' },
              { value: '100%', label: 'free during beta' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl sm:text-3xl font-bold text-brand-400">{value}</p>
                <p className="text-sm text-fg-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 w-full border-t border-space-600">
          <div className="max-w-2xl mb-10">
            <p className="text-brand-400 text-sm font-semibold mb-2">What you get</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-fg">A collaboration layer for developers</h2>
            <p className="mt-4 text-fg-muted leading-relaxed">
              Built for people who want proof of work, project overlap, and a practical reason to talk.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '◆',
                title: 'Project graph',
                desc: 'Import repositories and see how projects, skills, and ideas connect. Spot patterns you missed in a list view.',
              },
              {
                icon: '◎',
                title: 'Project chat',
                desc: 'Talk through a repo, refine ideas, and brainstorm what to build next — all inside the graph context.',
              },
              {
                icon: '⇄',
                title: 'Smart recommendations',
                desc: 'Find app users and similar GitHub builders with lightweight project matching that goes beyond keyword search.',
              },
              {
                icon: '◌',
                title: 'Connection graph',
                desc: 'Map direct connections and second-degree builders across your network. See who knows who.',
              },
              {
                icon: '✦',
                title: 'Overlap summaries',
                desc: 'See project and skill overlap percentages plus practical collaboration ideas — not just "you both use TypeScript".',
              },
              {
                icon: '→',
                title: 'Built-in outreach',
                desc: 'Send requests, cancel pending invites, remove connections, and keep your network clean without leaving the app.',
              },
            ].map(item => (
              <div key={item.title} className="card p-6 hover:border-brand-400/40 transition-colors">
                <div className="text-2xl mb-4 text-brand-400 font-mono" aria-hidden="true">{item.icon}</div>
                <h3 className="font-semibold text-fg mb-2">{item.title}</h3>
                <p className="text-fg-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-space-600 bg-space-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="max-w-2xl mb-12">
              <p className="text-brand-400 text-sm font-semibold mb-2">Get started in minutes</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-fg">From GitHub to your first match</h2>
              <p className="mt-4 text-fg-muted leading-relaxed">
                No forms to fill, no profile to write. CoFoundry reads your work and finds the overlap.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 relative">
              {/* connector line on desktop */}
              <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-brand-500/50 via-brand-400/30 to-brand-500/50" aria-hidden="true" />
              {[
                {
                  step: '01',
                  title: 'Connect GitHub',
                  desc: 'Sign in with GitHub. CoFoundry reads your public repository metadata — no write access needed.',
                },
                {
                  step: '02',
                  title: 'Build your graph',
                  desc: 'Select repos to import. CoFoundry extracts projects, skills, and ideas into a visual knowledge graph.',
                },
                {
                  step: '03',
                  title: 'Get matched',
                  desc: 'CoFoundry finds other builders with overlapping projects and surfaces why a collaboration could work.',
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-space-800 border border-brand-400/30 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(88,166,255,0.15)]">
                    <span className="text-brand-400 font-mono font-bold text-sm">{step}</span>
                  </div>
                  <h3 className="font-semibold text-fg mb-2">{title}</h3>
                  <p className="text-fg-muted text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONNECTIONS VISUAL ────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center border-t border-space-600">
          <ExampleConnectionGraph />
          <div>
            <p className="text-brand-400 text-sm font-semibold mb-2">Connections that explain themselves</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">See why a collaboration could work</h2>
            <p className="text-fg-muted leading-relaxed mb-6">
              CoFoundry does more than list people. It shows your connection graph, highlights project and skill overlap,
              and turns that overlap into a concrete next step.
            </p>
            <div className="space-y-3">
              {[
                'Blue is you, green is your direct connection, yellow is their network.',
                'Merged pair graphs show where projects and skills overlap.',
                'Get a simple summary and a concrete collaboration recommendation.',
              ].map(text => (
                <div key={text} className="flex gap-3 text-sm text-fg-muted">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-400 flex-shrink-0" aria-hidden="true" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/auth" className="inline-flex px-6 py-2.5 rounded-lg btn-primary font-semibold text-sm">
                Start free with GitHub
              </Link>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
        <section className="border-t border-space-600 bg-space-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-brand-400 text-sm font-semibold mb-2">What builders say</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-fg">From the CoFoundry beta</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  quote: "I'd tried LinkedIn, Twitter, and Discord servers. CoFoundry was the first thing that showed me someone actually building in an adjacent space with real proof of work.",
                  name: 'Marcus T.',
                  role: 'Indie developer',
                  initials: 'MT',
                  color: 'bg-brand-500',
                },
                {
                  quote: "The project overlap view is genuinely different. It's not 'you both know React' — it's specific enough to give you a real first message to send.",
                  name: 'Priya S.',
                  role: 'Full-stack engineer',
                  initials: 'PS',
                  color: 'bg-emerald-600',
                },
                {
                  quote: "Set it up on a Friday afternoon, had three interesting match conversations by Monday. The GitHub graph takes the guesswork out of cold outreach.",
                  name: 'Daniel R.',
                  role: 'Solo founder',
                  initials: 'DR',
                  color: 'bg-node-skill',
                },
              ].map(({ quote, name, role, initials, color }) => (
                <figure key={name} className="card p-6 flex flex-col gap-4">
                  <blockquote className="text-sm text-fg-muted leading-relaxed flex-1">
                    <p>"{quote}"</p>
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-fg">{name}</p>
                      <p className="text-xs text-fg-muted">{role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-space-600">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-brand-400 text-sm font-semibold mb-2">Simple, transparent pricing</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-fg">Everything free during beta</h2>
              <p className="mt-4 text-fg-muted leading-relaxed">
                All features are free while CoFoundry is in beta. Lock in early-adopter pricing before launch.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free tier */}
              <div className="card p-8 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-fg mb-1">Starter</h3>
                  <p className="text-fg-muted text-sm mb-4">For exploring the space</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-fg">$0</span>
                    <span className="text-fg-muted text-sm">/ month</span>
                  </div>
                  <p className="text-xs text-fg-subtle mt-1">Always free</p>
                </div>
                <Link to="/auth" className="w-full px-5 py-2.5 rounded-lg btn-secondary text-sm font-medium text-center mb-6">
                  Get started free
                </Link>
                <ul className="space-y-3 flex-1">
                  {[
                    [true, 'Up to 5 GitHub repos'],
                    [true, 'Project graph visualization'],
                    [true, 'Basic collaborator matches'],
                    [true, 'Send connection requests'],
                    [false, 'AI project chat'],
                    [false, 'Full connection graph'],
                    [false, 'Overlap summaries'],
                    [false, 'Unlimited repos'],
                  ].map(([included, label], i) =>
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      {included ? <Check /> : <Cross />}
                      <span className={included ? 'text-fg-muted' : 'text-fg-subtle'}>{label as string}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Pro tier */}
              <div className="relative card p-8 flex flex-col border-brand-400/50 bg-gradient-to-b from-brand-600/5 to-transparent">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-semibold shadow">
                    Free during beta
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-fg mb-1">Builder</h3>
                  <p className="text-fg-muted text-sm mb-4">For serious collaborators</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-fg line-through text-fg-muted">$9</span>
                    <span className="text-2xl font-bold text-brand-400 ml-2">Free</span>
                  </div>
                  <p className="text-xs text-fg-subtle mt-1">Beta pricing — locks in at launch</p>
                </div>
                <Link
                  to="/auth"
                  className="w-full px-5 py-2.5 rounded-lg btn-primary text-sm font-semibold text-center mb-6"
                  onClick={() => { /* analytics: cta_pricing_pro */ }}
                >
                  Start free with GitHub
                </Link>
                <ul className="space-y-3 flex-1">
                  {[
                    'Unlimited GitHub repos',
                    'AI project chat (GPT-4 powered)',
                    'Full connection graph',
                    'Overlap summaries & recommendations',
                    'Priority in match results',
                    'Basic collaborator matches',
                    'Send connection requests',
                    'Project graph visualization',
                  ].map((label, i) =>
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check />
                      <span className="text-fg-muted">{label}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <p className="text-center text-xs text-fg-subtle mt-8">
              No credit card required &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; Questions?{' '}
              <Link to="/contact" className="text-brand-400 hover:underline">Contact us</Link>
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-space-600 bg-space-900/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center mb-12">
              <p className="text-brand-400 text-sm font-semibold mb-2">Got questions?</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-fg">Frequently asked</h2>
            </div>
            <div className="card px-6">
              {[
                {
                  q: 'What is CoFoundry?',
                  a: 'CoFoundry is a collaboration platform for developers. It imports your GitHub repositories, builds a visual project graph from them, and uses that graph to match you with other builders who are working in adjacent spaces — so you have a concrete reason to start a conversation.',
                },
                {
                  q: 'Who is CoFoundry for?',
                  a: 'CoFoundry is for indie developers, solo founders, and small-team builders who want to find serious collaborators — not just a list of names. If you have GitHub projects and want to meet people building in the same space, CoFoundry is built for you.',
                },
                {
                  q: 'How does GitHub matching work?',
                  a: "CoFoundry reads your public repository metadata (names, descriptions, topics, README summaries) and builds a graph of your projects, skills, and interests. It then compares your graph with other users' graphs to surface meaningful overlap — not just shared technologies, but actual project alignment.",
                },
                {
                  q: 'Is CoFoundry free? How does billing work?',
                  a: "All features are completely free during the beta period. When CoFoundry moves out of beta, a free Starter tier will remain permanently free. The Builder tier (unlimited repos, AI chat, full connection graph) will be paid. Beta users will receive early-adopter pricing.",
                },
                {
                  q: 'Is my code or repository content shared with other users?',
                  a: "No. CoFoundry uses repository metadata (names, descriptions, topics) to build your graph, not your actual source code. Other users see your profile and project node names, not your code. You control which repositories appear in your graph.",
                },
                {
                  q: 'How do I cancel or delete my account?',
                  a: 'You can delete your account at any time from the Settings page. Deletion removes your profile, project graph, conversations, connections, and integration data from CoFoundry.',
                },
                {
                  q: 'Can I use CoFoundry without a GitHub account?',
                  a: "Currently, CoFoundry uses GitHub as the primary sign-in method and the main data source for project graphs. GitHub is free to sign up for. Support for additional code hosts (GitLab, Bitbucket) is on the roadmap.",
                },
                {
                  q: 'Is my data secure?',
                  a: 'CoFoundry is built on Supabase with row-level security. Your private settings, conversations, and connection requests are scoped to your account. We do not sell your data to third parties. See our Privacy Policy for full details.',
                },
              ].map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-space-600 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-800 border border-space-600 text-sm text-fg-muted mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" aria-hidden="true" />
              Beta is open — limited spots
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-5">Ready to find your next serious collaborator?</h2>
            <p className="text-fg-muted mb-8 leading-relaxed">
              Sign up, connect GitHub, and let CoFoundry build your first project graph.
              Free during beta. No credit card required.
            </p>
            <Link
              to="/auth"
              className="inline-flex px-8 py-3 rounded-lg btn-primary font-semibold"
              onClick={() => { /* analytics: cta_footer_primary */ }}
            >
              Create your CoFoundry profile
            </Link>
            <p className="mt-4 text-xs text-fg-subtle">
              Already have an account?{' '}
              <Link to="/auth" className="text-brand-400 hover:underline">Sign in</Link>
            </p>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-space-600 bg-space-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link to="/" aria-label="CoFoundry home" className="inline-block mb-4">
                <Logo size="md" />
              </Link>
              <p className="text-sm text-fg-muted leading-relaxed max-w-xs">
                Match with developers building in adjacent spaces. Real projects, real overlap, real reason to talk.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a
                  href="https://github.com/densub/cofoundry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-space-800 border border-space-600/50 hover:border-space-600 transition-colors"
                  aria-label="CoFoundry source code on GitHub"
                >
                  <GithubIcon />
                  <span>Open Source</span>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Pricing', href: '#pricing' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3">
                {[
                  { label: 'About', href: '/about', isRoute: true },
                  { label: 'Contact', href: '/contact', isRoute: true },
                  { label: 'Careers', href: '/careers', isRoute: true },
                ].map(({ label, href, isRoute }) => (
                  <li key={label}>
                    {isRoute ? (
                      <Link to={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Support */}
            <div>
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3 mb-6">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Cookie Policy', href: '/cookies' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Help & Contact', href: '/contact', isRoute: true },
                ].map(({ label, href, isRoute }) => (
                  <li key={label}>
                    {isRoute ? (
                      <Link to={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-space-600/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-fg-subtle">
            <span>© 2025 CoFoundry. All rights reserved.</span>
            <a
              href="https://github.com/densub/cofoundry"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              Open Source on GitHub ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
