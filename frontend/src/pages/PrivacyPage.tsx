import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-space-950 text-fg">
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-space-600/80">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        <Link to="/auth" className="px-5 py-2 rounded-lg btn-primary text-sm">Sign up</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-brand-400 font-semibold mb-3">Privacy Policy</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">How CoFoundry handles your data</h1>
        <p className="text-fg-muted leading-relaxed mb-10">
          This policy explains the product intent in plain language. It is not legal advice.
          Update it with counsel before launching commercially.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-fg-muted">
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Data we collect</h2>
            <p>
              CoFoundry stores your profile information, GitHub integration metadata, imported repository
              summaries, graph nodes, connection requests, conversations, and settings needed to run the app.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">GitHub data</h2>
            <p>
              When you connect GitHub, we use repository metadata to create project nodes and recommend
              collaborators. We do not need your GitHub password. You can disconnect integrations from the app.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">AI usage</h2>
            <p>
              Node chat is restricted to your own GitHub project nodes. CoFoundry trims context, caches repeated
              answers when possible, and avoids sending unrelated app data, secrets, or other users' private data
              to the AI provider.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Sharing and visibility</h2>
            <p>
              Your profile may be visible to authenticated users for matching and collaboration. Connection
              requests, private conversations, and account settings are intended to stay scoped to your account.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Account deletion</h2>
            <p>
              You can delete your account from settings. Deletion is intended to remove your profile, graph,
              conversations, integrations, and related social data from CoFoundry.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold text-fg mb-3">Contact</h2>
            <p>
              For privacy questions, contact the CoFoundry team through the support channel or repository owner.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
