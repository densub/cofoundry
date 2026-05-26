import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { teamApi } from '../lib/api'
import { KNode, CollaboratorProfile, RecommendedRole, ProjectIdea } from '../types'

const STAGE_STYLES: Record<string, { label: string; className: string }> = {
  idea:      { label: 'Idea',      className: 'text-fg-muted bg-white/5 border-white/10' },
  prototype: { label: 'Prototype', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  launched:  { label: 'Launched',  className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  growing:   { label: 'Growing',   className: 'text-brand-400 bg-brand-400/10 border-brand-400/20' },
}

const ROLE_ICONS: Record<string, string> = {
  marketing: '📣', sales: '🤝', business: '💼', design: '🎨',
  product: '🧭', 'domain-expert': '🔬', operations: '⚙️',
  finance: '📊', legal: '⚖️', community: '🌐',
  developer: '💻', cto: '🛠️',
}

const STAGE_OPTIONS = [
  { value: 'idea',      label: 'Just an idea',    desc: 'Concept stage, no work done yet' },
  { value: 'prototype', label: 'Early prototype', desc: 'Some validation or initial build' },
  { value: 'launched',  label: 'Launched',        desc: 'Live product or service' },
  { value: 'growing',   label: 'Growing',         desc: 'Active users or traction' },
]

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 'sm' }: { name: string | null; url: string | null; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (url) return <img src={url} alt={name ?? ''} className={`${sz} rounded-full object-cover ring-2 ring-space-700`} />
  return (
    <div className={`${sz} rounded-full bg-brand-600 flex items-center justify-center font-bold text-white`}>
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

// ── GitHubRepoSelector ──────────────────────────────────────────────────────

function GitHubRepoSelector({
  projectNodes,
  value,
  onChange,
}: {
  projectNodes: KNode[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div>
      <label className="block text-sm text-fg-muted mb-1.5">
        GitHub repository <span className="text-fg-subtle">(optional)</span>
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field text-sm"
      >
        <option value="">None — describe your idea without a repo</option>
        {projectNodes.map(n => (
          <option key={n.id} value={n.id}>{n.title}</option>
        ))}
      </select>
      {value && (
        <p className="text-xs text-brand-400 mt-1.5 flex items-center gap-1">
          <span aria-hidden="true">✓</span>
          CoFoundry will enrich the team analysis with this repo's data.
        </p>
      )}
      {projectNodes.length === 0 && (
        <p className="text-xs text-fg-subtle mt-1.5">
          No GitHub repos imported yet.{' '}
          <a href="/integrations" className="text-brand-400 hover:text-brand-300">Connect GitHub →</a>
        </p>
      )}
    </div>
  )
}

// ── Project form ────────────────────────────────────────────────────────────

type FormData = {
  title: string
  problem_statement: string
  solution_description: string
  target_market: string
  stage: 'idea' | 'prototype' | 'launched' | 'growing'
  skills_i_bring: string
  node_id: string
}

const BLANK: FormData = {
  title: '', problem_statement: '', solution_description: '',
  target_market: '', stage: 'idea', skills_i_bring: '', node_id: '',
}

function ProjectForm({
  projectNodes,
  initial,
  onSave,
  onCancel,
}: {
  projectNodes: KNode[]
  initial?: Partial<FormData>
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormData>({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // When a repo is selected and title/problem are still empty, pre-fill from node
  function handleNodeChange(nodeId: string) {
    set('node_id', nodeId)
    if (!nodeId) return
    const node = projectNodes.find(n => n.id === nodeId)
    if (!node) return
    if (!form.title.trim()) set('title', node.title)
    if (!form.problem_statement.trim() && node.summary) set('problem_statement', node.summary)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.problem_statement.trim()) {
      setError('Title and problem statement are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  const isEdit = !!initial?.title

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg">{isEdit ? 'Edit project' : 'New project'}</h2>
        <button onClick={onCancel} className="text-sm text-fg-subtle hover:text-fg-muted">Cancel</button>
      </div>
      <p className="text-fg-muted text-sm -mt-2">
        Describe your project and CoFoundry will recommend the team you need to build it.
        {!isEdit && ' You can optionally link a GitHub repo to enrich the analysis.'}
      </p>

      <GitHubRepoSelector projectNodes={projectNodes} value={form.node_id} onChange={handleNodeChange} />

      <div className="border-t border-space-600/40 pt-5 space-y-5">
        <div>
          <label className="block text-sm text-fg-muted mb-1.5">Project title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="input-field"
            placeholder="e.g. AI-powered newsletter curator"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm text-fg-muted mb-1.5">Problem you're solving *</label>
          <textarea
            value={form.problem_statement}
            onChange={e => set('problem_statement', e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="What pain point are you addressing? Who feels it?"
          />
        </div>

        <div>
          <label className="block text-sm text-fg-muted mb-1.5">
            Your solution <span className="text-fg-subtle">(optional)</span>
          </label>
          <textarea
            value={form.solution_description}
            onChange={e => set('solution_description', e.target.value)}
            rows={2}
            className="input-field resize-none"
            placeholder="How do you plan to solve it?"
          />
        </div>

        <div>
          <label className="block text-sm text-fg-muted mb-1.5">
            Target market <span className="text-fg-subtle">(optional)</span>
          </label>
          <input
            value={form.target_market}
            onChange={e => set('target_market', e.target.value)}
            className="input-field"
            placeholder="e.g. Indie writers with 1k+ newsletter subscribers"
          />
        </div>

        <div>
          <label className="block text-sm text-fg-muted mb-3">Current stage</label>
          <div className="grid grid-cols-2 gap-2">
            {STAGE_OPTIONS.map(o => (
              <label
                key={o.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  form.stage === o.value
                    ? 'border-brand-400/50 bg-brand-500/5'
                    : 'border-space-600 hover:border-fg-subtle'
                }`}
              >
                <input
                  type="radio" name="stage" value={o.value}
                  checked={form.stage === o.value}
                  onChange={() => set('stage', o.value)}
                  className="mt-0.5 accent-brand-500"
                />
                <div>
                  <p className="text-xs font-medium text-fg">{o.label}</p>
                  <p className="text-[11px] text-fg-subtle">{o.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-fg-muted mb-1.5">
            What you bring to this <span className="text-fg-subtle">(optional)</span>
          </label>
          <textarea
            value={form.skills_i_bring}
            onChange={e => set('skills_i_bring', e.target.value)}
            rows={2}
            className="input-field resize-none"
            placeholder="Your relevant skills, experience, network, or domain knowledge"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 btn-secondary text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 btn-primary font-medium text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save project'}
        </button>
      </div>
    </div>
  )
}

// ── CollaboratorCard ────────────────────────────────────────────────────────

function CollaboratorCard({
  collab, onInvite, invited,
}: {
  collab: CollaboratorProfile
  onInvite: (c: CollaboratorProfile) => void
  invited: boolean
}) {
  const p = collab.profiles
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={p.display_name} url={p.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg text-sm truncate">{p.display_name ?? 'Anonymous'}</p>
          <p className="text-xs text-fg-muted leading-snug mt-0.5 line-clamp-2">{collab.headline}</p>
        </div>
      </div>
      {collab.skills_description && (
        <p className="text-xs text-fg-subtle leading-relaxed line-clamp-2 italic">{collab.skills_description}</p>
      )}
      {collab.expertise_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {collab.expertise_tags.slice(0, 4).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-space-700 border border-space-600 text-fg-muted">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[11px] text-fg-subtle capitalize">{collab.commitment?.replace('-', ' ')}</span>
        <button
          onClick={() => onInvite(collab)}
          disabled={invited}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            invited ? 'bg-space-700 text-fg-subtle cursor-default' : 'btn-primary'
          }`}
        >
          {invited ? 'Invited ✓' : 'Invite'}
        </button>
      </div>
    </div>
  )
}

// ── InviteModal ─────────────────────────────────────────────────────────────

function InviteModal({
  collab, role, ideaId, onClose, onSent,
}: {
  collab: CollaboratorProfile
  role: RecommendedRole
  ideaId: string
  onClose: () => void
  onSent: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    setSending(true)
    setError('')
    try {
      await teamApi.sendRequest({
        to_user_id: collab.user_id,
        idea_id: ideaId,
        role: role.role,
        message: message.trim() || undefined,
        direction: 'dev_to_collab',
      })
      onSent()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <Avatar name={collab.profiles.display_name} url={collab.profiles.avatar_url} size="md" />
          <div>
            <p className="font-semibold text-fg">{collab.profiles.display_name}</p>
            <p className="text-xs text-fg-muted">{role.title}</p>
          </div>
        </div>
        <label className="block text-sm font-medium text-fg mb-2">
          Add a personal message <span className="text-fg-subtle font-normal">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="input-field resize-none mb-4"
          placeholder={`Hi ${collab.profiles.display_name?.split(' ')[0] ?? 'there'}, I'm building something I think you'd be perfect for…`}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 btn-secondary text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="flex-1 py-2.5 btn-primary font-medium text-sm disabled:opacity-60">
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CollaboratorPanel ───────────────────────────────────────────────────────

function CollaboratorPanel({
  activeRole, ideaId, onClose,
}: {
  activeRole: RecommendedRole
  ideaId: string
  onClose: () => void
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteTarget, setInviteTarget] = useState<CollaboratorProfile | null>(null)
  const [invited, setInvited] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    teamApi.getCollaborators({ role: activeRole.role }).then(({ collaborators: r }) => {
      if (!cancelled) setCollaborators(r)
    }).catch(() => {
      if (!cancelled) setCollaborators([])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeRole.role])

  function onInviteSent() {
    if (inviteTarget) setInvited(s => new Set([...s, inviteTarget.user_id]))
    setInviteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-fg">{activeRole.title} matches</h2>
        <button onClick={onClose} className="text-xs text-fg-subtle hover:text-fg-muted">× Close</button>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="card p-4 h-32 animate-pulse bg-space-800/50" />)}
        </div>
      )}

      {!loading && collaborators.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-fg-muted text-sm">No collaborators found for this role yet.</p>
          <p className="text-xs text-fg-subtle mt-2">Share CoFoundry with the non-technical people you know.</p>
        </div>
      )}

      {!loading && collaborators.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {collaborators.map(c => (
            <CollaboratorCard
              key={c.user_id}
              collab={c}
              onInvite={setInviteTarget}
              invited={invited.has(c.user_id)}
            />
          ))}
        </div>
      )}

      {inviteTarget && (
        <InviteModal
          collab={inviteTarget}
          role={activeRole}
          ideaId={ideaId}
          onClose={() => setInviteTarget(null)}
          onSent={onInviteSent}
        />
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function BuildTeamPage() {
  const { nodes } = useStore()
  const projectNodes = nodes.filter(n => n.type === 'project')

  const [projects, setProjects] = useState<ProjectIdea[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selected, setSelected] = useState<ProjectIdea | null>(null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [activeRole, setActiveRole] = useState<RecommendedRole | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoadingProjects(true)
    try {
      const { ideas } = await teamApi.listMyIdeas()
      setProjects(ideas)
    } catch {
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleCreate(data: FormData) {
    const project = await teamApi.createIdea({
      ...data,
      node_id: data.node_id || undefined,
    })
    setProjects(prev => [project, ...prev])
    setSelected(project)
    setMode('view')
    setActiveRole(null)
  }

  async function handleEdit(data: FormData) {
    if (!selected) return
    const updated = await teamApi.updateIdea(selected.id, {
      ...data,
      node_id: data.node_id || null,
    })
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelected(updated)
    setMode('view')
  }

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    setDeleting(true)
    try {
      await teamApi.deleteIdea(selected.id)
      setProjects(prev => prev.filter(p => p.id !== selected.id))
      setSelected(null)
      setMode('view')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAnalyze() {
    if (!selected) return
    setAnalyzing(true)
    setAnalyzeError('')
    setActiveRole(null)
    try {
      const updated = await teamApi.analyzeIdea(selected.id)
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
      setSelected(updated)
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  function openCreate() {
    setSelected(null)
    setMode('create')
    setActiveRole(null)
  }

  function selectProject(p: ProjectIdea) {
    setSelected(p)
    setMode('view')
    setActiveRole(null)
    setAnalyzeError('')
  }

  const stageStyle = selected ? (STAGE_STYLES[selected.stage] ?? STAGE_STYLES.prototype) : null
  const attachedNode = selected?.node_id ? projectNodes.find(n => n.id === selected.node_id) : null

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">

      {/* Left rail */}
      <aside className="w-64 shrink-0 border-r border-space-600 bg-space-900/50 flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-space-600 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-fg uppercase tracking-wider">My Projects</h2>
          <button
            onClick={openCreate}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingProjects && (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-space-800 animate-pulse" />)}
            </div>
          )}

          {!loadingProjects && projects.length === 0 && mode !== 'create' && (
            <div className="p-4 text-center mt-4">
              <div className="text-3xl mb-3">💡</div>
              <p className="text-sm text-fg-muted mb-3">No projects yet.</p>
              <button onClick={openCreate} className="text-xs text-brand-400 hover:text-brand-300">
                Create your first project →
              </button>
            </div>
          )}

          {projects.map(p => {
            const s = STAGE_STYLES[p.stage] ?? STAGE_STYLES.idea
            const isSelected = selected?.id === p.id && mode === 'view'
            const hasRepo = !!p.node_id
            return (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={`w-full text-left px-4 py-3 border-b border-space-600/50 transition-colors hover:bg-space-800/60 ${
                  isSelected ? 'bg-space-800 border-l-2 border-l-brand-400' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-fg' : 'text-fg-muted'}`}>
                    {p.title}
                  </p>
                  {hasRepo && (
                    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-fg-subtle" fill="currentColor" viewBox="0 0 24 24" aria-label="Has GitHub repo">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.className}`}>
                    {s.label}
                  </span>
                  {p.analysis_at && (
                    <span className="text-[10px] text-emerald-400">Analyzed ✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto bg-space-950">

        {/* Create form */}
        {mode === 'create' && (
          <ProjectForm
            projectNodes={projectNodes}
            onSave={handleCreate}
            onCancel={() => setMode('view')}
          />
        )}

        {/* Edit form */}
        {mode === 'edit' && selected && (
          <ProjectForm
            projectNodes={projectNodes}
            initial={{
              title: selected.title,
              problem_statement: selected.problem_statement,
              solution_description: selected.solution_description ?? '',
              target_market: selected.target_market ?? '',
              stage: selected.stage,
              skills_i_bring: selected.skills_i_bring ?? '',
              node_id: selected.node_id ?? '',
            }}
            onSave={handleEdit}
            onCancel={() => setMode('view')}
          />
        )}

        {/* Empty state */}
        {mode === 'view' && !selected && !loadingProjects && (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div>
              <div className="text-5xl mb-4">◆</div>
              <h2 className="text-xl font-semibold text-fg mb-2">Build your dream team</h2>
              <p className="text-fg-muted text-sm max-w-sm mx-auto leading-relaxed mb-6">
                Describe any project — technical or non-technical. Attach a GitHub repo if you have one.
                CoFoundry recommends the exact people you need.
              </p>
              <button onClick={openCreate} className="btn-primary px-6 py-2.5 text-sm font-medium">
                Create a project →
              </button>
            </div>
          </div>
        )}

        {/* Project detail */}
        {mode === 'view' && selected && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-fg">{selected.title}</h1>
                  {stageStyle && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs border font-medium ${stageStyle.className}`}>
                      {stageStyle.label}
                    </span>
                  )}
                </div>
                {attachedNode && (
                  <div className="flex items-center gap-1.5 text-xs text-fg-subtle mt-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    {attachedNode.title}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setMode('edit')} className="btn-secondary px-3 py-1.5 text-xs">Edit</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Problem + solution cards */}
            <div className={`grid gap-4 ${selected.solution_description ? 'sm:grid-cols-2' : ''}`}>
              <div className="card p-4">
                <p className="text-xs font-medium text-fg-muted mb-1">Problem</p>
                <p className="text-sm text-fg-muted leading-relaxed">{selected.problem_statement}</p>
              </div>
              {selected.solution_description && (
                <div className="card p-4">
                  <p className="text-xs font-medium text-fg-muted mb-1">Solution</p>
                  <p className="text-sm text-fg-muted leading-relaxed">{selected.solution_description}</p>
                </div>
              )}
            </div>

            {/* Analyze prompt */}
            {!selected.analysis_at && (
              <div className="card p-6 text-center border-dashed">
                {analyzing ? (
                  <>
                    <div className="flex justify-center gap-2 mb-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                    <p className="text-fg-muted text-sm">
                      {attachedNode ? 'Analyzing your project and GitHub repo…' : 'Analyzing your project…'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-3">✨</div>
                    <h3 className="font-semibold text-fg mb-2">Analyze with AI</h3>
                    <p className="text-fg-muted text-sm mb-4 max-w-xs mx-auto leading-relaxed">
                      {attachedNode
                        ? `CoFoundry will analyze your description and the ${attachedNode.title} repo to recommend your ideal team.`
                        : 'CoFoundry will identify the technical and non-technical roles your project needs.'}
                    </p>
                    {analyzeError && <p className="text-red-400 text-sm mb-3">{analyzeError}</p>}
                    <button onClick={handleAnalyze} className="btn-primary px-6 py-2.5 text-sm font-medium">
                      Analyze →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Analysis results */}
            {selected.analysis_at && selected.recommended_roles.length > 0 && (
              <>
                {/* Overview card */}
                {selected.project_summary && (
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="font-semibold text-fg">Project overview</h2>
                      {selected.target_market && (
                        <span className="text-xs text-fg-subtle">
                          <span className="text-fg-muted font-medium">For: </span>{selected.target_market}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-fg-muted leading-relaxed">{selected.project_summary}</p>
                    {attachedNode && (
                      <p className="text-xs text-brand-400 mt-3 flex items-center gap-1">
                        <span>✓</span> Analysis enriched with {attachedNode.title} repo data
                      </p>
                    )}
                  </div>
                )}

                {/* Role cards */}
                <div>
                  <h2 className="font-semibold text-fg mb-4">Recommended team roles</h2>
                  <div className="space-y-3">
                    {selected.recommended_roles.map(role => (
                      <div
                        key={role.role}
                        className={`card p-5 transition-colors ${
                          activeRole?.role === role.role ? 'border-brand-400/50' : 'hover:border-space-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">{ROLE_ICONS[role.role] ?? '👤'}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-fg-subtle font-mono">#{role.priority}</span>
                                <h3 className="font-semibold text-fg text-sm">{role.title}</h3>
                                {role.is_technical && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-space-700 text-fg-subtle border border-space-600">Technical</span>
                                )}
                              </div>
                              <p className="text-sm text-fg-muted leading-relaxed">{role.why}</p>
                            </div>
                          </div>

                          {role.is_technical ? (
                            <span className="shrink-0 px-3 py-1.5 rounded-lg text-xs text-fg-subtle bg-space-700 border border-space-600">
                              Discoverable ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => setActiveRole(activeRole?.role === role.role ? null : role)}
                              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                activeRole?.role === role.role ? 'btn-primary' : 'btn-secondary'
                              }`}
                            >
                              {activeRole?.role === role.role ? 'Browsing' : 'Find people'}
                            </button>
                          )}
                        </div>

                        {/* Technical role inline CTA */}
                        {role.is_technical && (
                          <div className="mt-3 pt-3 border-t border-space-600/40 flex items-start gap-2 text-xs text-fg-subtle">
                            <span className="text-emerald-400 shrink-0">✓</span>
                            <p>Your project is listed on Explore — technical co-founders browsing CoFoundry can find and reach out to you directly.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collaborator finder */}
                {activeRole && !activeRole.is_technical && (
                  <CollaboratorPanel
                    activeRole={activeRole}
                    ideaId={selected.id}
                    onClose={() => setActiveRole(null)}
                  />
                )}

                {/* Re-analyze */}
                <div className="card p-4 flex items-center gap-3 bg-space-800/40">
                  <span className="text-lg shrink-0">🔄</span>
                  <p className="text-xs text-fg-muted flex-1">Analysis refreshes automatically after 7 days.</p>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="shrink-0 text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
                  >
                    Re-run
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
