import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

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
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
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
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg flex flex-col overflow-hidden">
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-space-600/80 bg-space-950/80 backdrop-blur">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <a href="#features" className="hidden sm:inline text-sm text-fg-muted hover:text-fg transition-colors">Features</a>
          <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">Sign up</Link>
        </div>
      </nav>

      <main>
        <section className="relative px-4 sm:px-6 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,139,253,0.2),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(63,185,80,0.12),transparent_30%)]" />
          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-800 border border-space-600 text-sm text-fg-muted mb-8">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
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

              <div className="flex justify-center lg:justify-start">
                <Link to="/auth" className="px-8 py-3 rounded-lg btn-primary font-semibold text-center">
                  Start free with GitHub
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-10 max-w-xl mx-auto lg:mx-0">
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

            <div id="demo" className="space-y-4">
              <ExampleProjectGraph />
              <p className="text-xs text-center text-fg-subtle">
                Demo data shown. Your graph is built from your connected GitHub repositories.
              </p>
            </div>
          </div>
        </section>

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
                desc: 'Import repositories and see how projects, skills, and ideas connect.',
              },
              {
                icon: '◎',
                title: 'Project chat',
                desc: 'Talk through a repo, refine ideas, and brainstorm what to build next.',
              },
              {
                icon: '⇄',
                title: 'Smart recommendations',
                desc: 'Find app users and similar GitHub builders with lightweight project matching.',
              },
              {
                icon: '◌',
                title: 'Connection graph',
                desc: 'Map direct connections and second-degree builders across your network.',
              },
              {
                icon: '✦',
                title: 'Overlap summaries',
                desc: 'See project and skill overlap percentages plus practical collaboration ideas.',
              },
              {
                icon: '→',
                title: 'Built-in outreach',
                desc: 'Send requests, cancel pending invites, remove connections, and keep your network clean.',
              },
            ].map(item => (
              <div key={item.title} className="card p-6 hover:border-brand-400/40 transition-colors">
                <div className="text-2xl mb-4 text-brand-400 font-mono">{item.icon}</div>
                <h3 className="font-semibold text-fg mb-2">{item.title}</h3>
                <p className="text-fg-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

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
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-400 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-space-600 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold mb-5">Ready to find your next serious collaborator?</h2>
            <p className="text-fg-muted mb-8 leading-relaxed">
              Sign up, connect GitHub, and let CoFoundry build your first project graph.
            </p>
            <Link to="/auth" className="inline-flex px-8 py-3 rounded-lg btn-primary font-semibold">
              Create your CoFoundry profile
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-8 py-8 text-xs text-fg-subtle border-t border-space-600">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>CoFoundry — built for developers who ship together</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-fg transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
