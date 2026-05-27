import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'
import { useNodes } from '../hooks/useNodes'
import { connectionsApi, teamApi, integrationsApi } from '../lib/api'
import { getAccessToken } from '../lib/supabase'
import { markTeamRequestsSeen } from '../lib/teamRequestNotifications'
import {
  AppUserSearchResult,
  ConnectionsSearchResult,
  GitHubUserSearchResult,
  KNode,
  CollaboratorProfile,
  ProjectMember,
  RecommendedRole,
  ProjectIdea,
} from '../types'

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

// ── EasyTeamFind ──────────────────────────────────────────────────────────────

function initials(label: string | null | undefined): string {
  return (label ?? '?').slice(0, 1).toUpperCase()
}

function PersonRow({
  user,
  subtitle,
  action,
}: {
  user: { display_name: string | null; username?: string | null; avatar_url: string | null }
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-300 flex items-center justify-center font-semibold overflow-hidden shrink-0">
        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(user.display_name ?? user.username)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg text-sm truncate">{user.display_name ?? user.username ?? 'Unknown user'}</p>
        {subtitle && <p className="text-xs text-fg-subtle mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function InviteToProjectModal({
  user,
  role,
  ideaId,
  onClose,
  onSent,
}: {
  user: AppUserSearchResult
  role: string
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
        to_user_id: user.id,
        idea_id: ideaId,
        role,
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-300 flex items-center justify-center font-semibold overflow-hidden">
            {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(user.display_name ?? user.username)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-fg truncate">{user.display_name ?? user.username ?? 'Unknown user'}</p>
            <p className="text-xs text-fg-subtle truncate">Inviting as: {role}</p>
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
          placeholder="Hi — I’m building a project and would love to collaborate with you…"
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

function ProjectTeamPanel({
  ideaId,
  recommendedRoles,
  members,
  membersLoading,
  membersError,
  sentPending,
  loading,
  teamError,
  teamNotice,
  onRefresh,
  onCancelInvite,
  onInviteSent,
  canManageMembers,
  onRemoveMember,
  onToggleOwner,
}: {
  ideaId: string
  recommendedRoles: RecommendedRole[]
  members: ProjectMember[]
  membersLoading: boolean
  membersError: string
  sentPending: import('../types').TeamRequest[]
  loading: boolean
  teamError: string
  teamNotice: string
  onRefresh: () => void
  onCancelInvite: (id: string) => void
  onInviteSent: () => void
  canManageMembers: boolean
  onRemoveMember: (memberId: string) => void
  onToggleOwner: (memberId: string, next: boolean) => void
}) {
  const [role, setRole] = useState(recommendedRoles[0]?.role ?? '')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'cofoundry' | 'github' | 'linkedin'>('cofoundry')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ConnectionsSearchResult | null>(null)
  const [inviteTarget, setInviteTarget] = useState<AppUserSearchResult | null>(null)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())

  function setBusy(key: string, value: boolean) {
    setBusyKeys(prev => {
      const next = new Set(prev)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function runSearch() {
    if (query.trim().length < 2) return
    setSearching(true)
    setError('')
    try {
      setResults(await connectionsApi.search(query.trim()))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  async function inviteGitHub(user: GitHubUserSearchResult) {
    if (!user.email) return
    const key = `gh:${user.login}`
    setBusy(key, true)
    setError('')
    try {
      await connectionsApi.inviteGitHub({
        login: user.login,
        email: user.email,
        profileUrl: user.html_url,
        name: user.name,
      })
      // remove from view for quick feedback
      setResults(prev => prev ? ({ ...prev, githubUsers: prev.githubUsers.filter(u => u.login !== user.login) }) : prev)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setBusy(key, false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-fg">Team</h2>
          <p className="text-sm text-fg-muted mt-1">
            See who&apos;s on this project, manage pending invites, and find new teammates.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || membersLoading}
          className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50 shrink-0"
        >
          Refresh
        </button>
      </div>

      {(membersError || teamError) && (
        <p className="text-red-400 text-sm mb-4">{membersError || teamError}</p>
      )}
      {teamNotice && (
        <p className="text-emerald-400 text-sm mb-4">{teamNotice}</p>
      )}

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wide mb-3">Members</h3>
        {membersLoading ? (
          <p className="text-sm text-fg-subtle">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-fg-subtle">No teammates yet. Search below to invite someone.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-space-800/40 border border-space-600/40">
                <div className="w-9 h-9 rounded-full bg-space-700 overflow-hidden shrink-0">
                  {m.profile?.avatar_url ? (
                    <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-fg-subtle">
                      {(m.profile?.display_name ?? m.profile?.username ?? '?')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg truncate">
                      {m.profile?.display_name ?? m.profile?.username ?? 'Teammate'}
                    </p>
                    {m.is_owner && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-400/10 border-emerald-500/30 text-emerald-300 shrink-0">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] leading-none">
                          O
                        </span>
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg-subtle truncate">
                    {m.role ? `Role: ${m.role}` : 'Joined'}
                    {m.profile?.role ? ` · ${m.profile.role}` : ''}
                  </p>
                </div>
                {canManageMembers && (
                  <div className="shrink-0 flex items-center gap-2">
                    {!String(m.id).startsWith('owner:') && (
                      <button
                        type="button"
                        onClick={() => onToggleOwner(m.id, !m.is_owner)}
                        className="text-xs text-fg-subtle hover:text-fg px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {m.is_owner ? 'Remove owner' : 'Make owner'}
                      </button>
                    )}
                    {!String(m.id).startsWith('owner:') && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.id)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {sentPending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wide mb-3">Pending invites</h3>
          <div className="space-y-2">
            {sentPending.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-space-800/40 border border-space-600/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg truncate">
                    {r.to_profile?.display_name ?? r.to_profile?.username ?? 'Invitee'}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {r.role} · Awaiting response
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelInvite(r.id)}
                  disabled={loading}
                  className="text-xs text-fg-subtle hover:text-red-400 disabled:opacity-50 shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-space-600/40">
        <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wide mb-3">Find a teammate</h3>
        <p className="text-sm text-fg-muted mb-4">
          Pick a role, then search CoFoundry or GitHub to invite someone to this project.
        </p>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-xs text-fg-subtle mb-1.5">Role</label>
          <input
            value={role}
            onChange={e => setRole(e.target.value)}
            className="input-field text-sm"
            placeholder="e.g. marketing, designer, sales"
          />
          {recommendedRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recommendedRoles.slice(0, 4).map(r => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                    role === r.role ? 'bg-brand-500/10 border-brand-400/30 text-brand-300' : 'bg-space-700 border-space-600 text-fg-muted hover:border-fg-subtle'
                  }`}
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-fg-subtle mb-1.5">Search</label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-field text-sm"
              placeholder="Search by name, role, bio, or GitHub handle"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searching || query.trim().length < 2}
              className="px-4 py-2.5 btn-primary text-sm disabled:opacity-60"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {(['cofoundry', 'github', 'linkedin'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  tab === t ? 'bg-space-700 border-fg-subtle text-fg' : 'bg-space-800 border-space-600 text-fg-subtle hover:border-fg-subtle'
                }`}
              >
                {t === 'cofoundry' ? 'CoFoundry' : t === 'github' ? 'GitHub' : 'LinkedIn'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

      {/* Results */}
      {tab === 'linkedin' && (
        <div className="mt-5 card p-4 bg-space-800/30">
          <p className="text-sm text-fg-muted">
            LinkedIn search is coming soon. For now, invite people already on CoFoundry or from GitHub.
          </p>
        </div>
      )}

      {tab !== 'linkedin' && results && (
        <div className="mt-5 space-y-3">
          {tab === 'cofoundry' && (
            <>
              {results.appUsers.length === 0 && (
                <p className="text-sm text-fg-subtle">No CoFoundry users found.</p>
              )}
              {results.appUsers.map(u => (
                <PersonRow
                  key={u.id}
                  user={u}
                  subtitle={[
                    u.role ? u.role : null,
                    u.githubUsername ? `GitHub: @${u.githubUsername}` : null,
                    u.connectionStatus === 'connected' ? 'Connected' : u.connectionStatus === 'requested' ? 'Connection requested' : null,
                  ].filter(Boolean).join(' · ')}
                  action={
                    <button
                      type="button"
                      onClick={() => setInviteTarget(u)}
                      className="px-3 py-2 rounded-lg text-xs font-medium btn-primary"
                    >
                      Invite
                    </button>
                  }
                />
              ))}
            </>
          )}

          {tab === 'github' && (
            <>
              {results.githubUsers.length === 0 && (
                <p className="text-sm text-fg-subtle">No GitHub users found.</p>
              )}
              {results.githubUsers.map(u => (
                <div key={u.id} className="card p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-space-700 shrink-0">
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg text-sm truncate">{u.name ?? u.login}</p>
                    <p className="text-xs text-fg-subtle truncate">@{u.login} · {u.public_repos} public repos</p>
                    {u.bio && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{u.bio}</p>}
                    {!u.email && <p className="text-[11px] text-fg-subtle mt-1">No public email available.</p>}
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    {u.email ? (
                      <button
                        type="button"
                        onClick={() => inviteGitHub(u)}
                        disabled={busyKeys.has(`gh:${u.login}`)}
                        className="px-3 py-2 rounded-lg text-xs font-medium btn-primary disabled:opacity-60"
                      >
                        {busyKeys.has(`gh:${u.login}`) ? 'Sending…' : 'Invite to CoFoundry'}
                      </button>
                    ) : (
                      <a
                        href={u.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg text-xs font-medium btn-secondary text-center"
                      >
                        Open GitHub
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {inviteTarget && (
        <InviteToProjectModal
          user={inviteTarget}
          role={role || 'collaborator'}
          ideaId={ideaId}
          onClose={() => setInviteTarget(null)}
          onSent={() => {
            setInviteTarget(null)
            onInviteSent()
          }}
        />
      )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function BuildTeamPage() {
  const { user } = useAuth()
  const { refresh: refreshGraph } = useNodes(user?.id)

  const { nodes } = useStore()
  const addNode = useStore(s => s.addNode)
  const profile = useStore(s => s.profile)
  const projectNodes = nodes.filter(n => n.type === 'project')

  const [projects, setProjects] = useState<ProjectIdea[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selected, setSelected] = useState<ProjectIdea | null>(null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [activeRole, setActiveRole] = useState<RecommendedRole | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [teamReqLoading, setTeamReqLoading] = useState(false)
  const [teamReqError, setTeamReqError] = useState('')
  const [teamReqNotice, setTeamReqNotice] = useState('')
  const [teamReqSent, setTeamReqSent] = useState<import('../types').TeamRequest[]>([])
  const [teamReqReceived, setTeamReqReceived] = useState<import('../types').TeamRequest[]>([])

  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [members, setMembers] = useState<ProjectMember[]>([])

  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)

  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatMessages, setChatMessages] = useState<import('../types').ProjectChatMessage[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const wsIdeaRef = useRef<string | null>(null)

  const [creatingRepo, setCreatingRepo] = useState(false)
  const [repoError, setRepoError] = useState('')
  const [confirmCreateRepoOpen, setConfirmCreateRepoOpen] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoadingProjects(true)
    try {
      const { ideas } = await teamApi.listAccessibleIdeas()
      setProjects(ideas)
    } catch {
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  async function loadTeamRequests() {
    setTeamReqLoading(true)
    setTeamReqError('')
    try {
      const { sent, received } = await teamApi.getRequests()
      setTeamReqSent(sent)
      setTeamReqReceived(received)
      if (profile?.id) {
        const pending = received.filter(r => r.status === 'pending')
        if (pending.length > 0) {
          markTeamRequestsSeen(profile.id, pending)
        }
      }
    } catch (err: unknown) {
      setTeamReqError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setTeamReqLoading(false)
    }
  }

  useEffect(() => {
    if (mode !== 'view') return
    loadTeamRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if (mode !== 'view') return
    integrationsApi.status()
      .then(s => setGithubConnected(!!s.github))
      .catch(() => setGithubConnected(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  async function loadMembersForSelected() {
    if (!selected) return
    setMembersLoading(true)
    setMembersError('')
    try {
      const { members: m } = await teamApi.getMembers({ idea_id: selected.id })
      setMembers(m)
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'Failed to load team')
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  async function loadChatForSelected() {
    if (!selected) return
    setChatLoading(true)
    setChatError('')
    try {
      const { messages } = await teamApi.getChatMessages({ idea_id: selected.id })
      setChatMessages(messages)
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to load chat')
      setChatMessages([])
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChat() {
    if (!selected) return
    const text = chatDraft.trim()
    if (!text) return
    setChatError('')
    try {
      // Prefer WS when available; fall back to HTTP.
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN && wsIdeaRef.current === selected.id) {
        ws.send(JSON.stringify({ type: 'send', body: text }))
      } else {
        const msg = await teamApi.sendChatMessage({ idea_id: selected.id, body: text })
        setChatMessages(prev => [...prev, msg])
      }
      setChatDraft('')
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to send')
    }
  }

  useEffect(() => {
    if (mode !== 'view' || !selected) return
    if (selected.access === 'invited_pending') return
    loadMembersForSelected()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected?.id])

  useEffect(() => {
    if (mode !== 'view' || !selected) return
    // Close WS if we navigated to a different project.
    if (wsIdeaRef.current && wsIdeaRef.current !== selected.id) {
      try { wsRef.current?.close() } catch { /* noop */ }
      wsRef.current = null
      wsIdeaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected?.id])

  useEffect(() => {
    if (!chatOpen) return
    if (mode !== 'view' || !selected) return
    if (selected.access === 'invited_pending') return

    let cancelled = false

    async function connect() {
      setChatError('')
      setChatLoading(true)

      const ideaId = selected?.id
      if (!ideaId) {
        setChatLoading(false)
        return
      }

      const token = await getAccessToken()
      if (!token) {
        setChatError('Please sign in again to use chat.')
        setChatLoading(false)
        return
      }

      const wsBase =
        (import.meta as any)?.env?.VITE_WS_BASE_URL
          ? String((import.meta as any).env.VITE_WS_BASE_URL)
          : (import.meta as any)?.env?.DEV
            ? 'ws://localhost:3001'
            : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

      const wsUrl = `${wsBase.replace(/\/$/, '')}/ws/project-chat?idea_id=${encodeURIComponent(ideaId)}&token=${encodeURIComponent(token)}`

      // Close any existing connection
      try { wsRef.current?.close() } catch { /* noop */ }
      wsRef.current = null
      wsIdeaRef.current = ideaId

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = evt => {
        if (cancelled) return
        let msg: any
        try { msg = JSON.parse(String(evt.data)) } catch { return }
        if (msg?.type === 'history' && Array.isArray(msg.messages)) {
          setChatMessages(msg.messages)
          setChatLoading(false)
        } else if (msg?.type === 'message' && msg.message) {
          setChatMessages(prev => [...prev, msg.message])
          setChatLoading(false)
        } else if (msg?.type === 'ai_message' && msg.message) {
          setChatMessages(prev => [...prev, msg.message])
          setChatLoading(false)
        } else if (msg?.type === 'error') {
          setChatError(String(msg.error ?? 'Chat error'))
          setChatLoading(false)
        } else if (msg?.type === 'ready') {
          // wait for history
        }
      }

      ws.onerror = () => {
        if (cancelled) return
        setChatError('Chat connection error')
        setChatLoading(false)
      }

      ws.onclose = () => {
        if (cancelled) return
        wsRef.current = null
      }
    }

    connect()

    return () => {
      cancelled = true
      // Keep the socket open while widget is open; close on unmount/close below.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, selected?.id, mode])

  useEffect(() => {
    if (!chatOpen) {
      try { wsRef.current?.close() } catch { /* noop */ }
      wsRef.current = null
      wsIdeaRef.current = null
    }
  }, [chatOpen])

  async function handleCreate(data: FormData) {
    const project = await teamApi.createIdea({
      ...data,
      node_id: data.node_id || undefined,
    })
    // Backend returns the raw ProjectIdea; mark it as owned immediately
    // so the UI doesn't show "collaborator" until the next refresh.
    const owned: ProjectIdea = { ...project, access: 'owner', pending_team_request_id: null }
    setProjects(prev => [owned, ...prev])
    setSelected(owned)
    setMode('view')
    setActiveRole(null)
  }

  async function handleEdit(data: FormData) {
    if (!selected) return
    const updated = await teamApi.updateIdea(selected.id, {
      ...data,
      node_id: data.node_id || null,
    })
    // Preserve access flags that are computed locally or by /ideas/accessible.
    const merged: ProjectIdea = {
      ...updated,
      access: selected.access ?? updated.access,
      pending_team_request_id: selected.pending_team_request_id ?? updated.pending_team_request_id,
    }
    setProjects(prev => prev.map(p => p.id === merged.id ? merged : p))
    setSelected(merged)
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

  async function respondToTeamRequest(id: string, next: 'accepted' | 'declined') {
    setTeamReqError('')
    setTeamReqNotice('')
    try {
      await teamApi.respondToRequest(id, next)
      await loadTeamRequests()
      await loadProjects()
      if (selected?.access === 'owner') {
        await loadMembersForSelected()
      }
      if (next === 'declined' && selected?.access === 'invited_pending') {
        setSelected(null)
      }
      setTeamReqNotice(next === 'accepted' ? 'Request accepted' : 'Request declined')
    } catch (err: unknown) {
      setTeamReqError(err instanceof Error ? err.message : 'Failed to respond')
    }
  }

  async function cancelSentInvite(id: string) {
    setTeamReqError('')
    setTeamReqNotice('')
    try {
      await teamApi.cancelRequest(id)
      await loadTeamRequests()
      await loadProjects()
      setTeamReqNotice('Invite cancelled')
    } catch (err: unknown) {
      setTeamReqError(err instanceof Error ? err.message : 'Failed to cancel invite')
    }
  }

  async function removeMember(memberId: string) {
    if (!selected) return
    if (selected.access !== 'owner') return
    if (!window.confirm('Remove this member from the project?')) return
    setMembersError('')
    try {
      await teamApi.removeMember(memberId)
      await loadMembersForSelected()
      setTeamReqNotice('Member removed')
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  async function toggleMemberOwner(memberId: string, next: boolean) {
    if (!selected) return
    if (selected.access !== 'owner') return
    setMembersError('')
    try {
      const updated = await teamApi.setMemberOwner(memberId, next)
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
      setTeamReqNotice(next ? 'Member promoted to owner' : 'Owner role removed')
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'Failed to update owner')
    }
  }

  async function handleCreateRepo() {
    if (!selected) return
    if (selected.access !== 'owner') return
    if (selected.node_id) return

    setRepoError('')
    if (githubConnected === false) {
      // Require GitHub connection first
      window.location.href = '/integrations'
      return
    }

    setConfirmCreateRepoOpen(true)
  }

  async function confirmCreateRepo() {
    if (!selected) return
    setConfirmCreateRepoOpen(false)
    setCreatingRepo(true)
    try {
      const { idea, node } = await teamApi.createGitHubRepoForIdea(selected.id)
      const merged: ProjectIdea = {
        ...idea,
        access: selected.access ?? idea.access,
        pending_team_request_id: selected.pending_team_request_id ?? idea.pending_team_request_id,
      }
      setProjects(prev => prev.map(p => p.id === merged.id ? merged : p))
      setSelected(merged)
      // Ensure the new node is present immediately for attachedNode/link rendering.
      addNode(node)
      // Also refresh to keep edges/graph consistent.
      await refreshGraph()
    } catch (err: unknown) {
      setRepoError(err instanceof Error ? err.message : 'Failed to create repo')
    } finally {
      setCreatingRepo(false)
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
    setMobileProjectsOpen(false)
  }

  function selectProject(p: ProjectIdea) {
    setSelected(p)
    setMode('view')
    setActiveRole(null)
    setAnalyzeError('')
    setMobileProjectsOpen(false)
  }

  const stageStyle = selected ? (STAGE_STYLES[selected.stage] ?? STAGE_STYLES.prototype) : null
  const attachedNode = selected?.node_id ? projectNodes.find(n => n.id === selected.node_id) : null

  const receivedPending = teamReqReceived.filter(r => r.status === 'pending')
  const receivedPendingForSelected = selected
    ? receivedPending.filter(r => r.idea_id === selected.id || (selected.node_id && r.node_id === selected.node_id))
    : []

  const sentPendingForSelected = selected
    ? teamReqSent.filter(r => r.status === 'pending' && (r.idea_id === selected.id || (selected.node_id && r.node_id === selected.node_id)))
    : []

  const ProjectsRail = ({ compactHeader }: { compactHeader?: boolean }) => (
    <div className="flex flex-col overflow-hidden h-full">
      <div className={`px-3 py-3 border-b border-space-600 flex items-center justify-between ${compactHeader ? 'bg-space-900/70' : ''}`}>
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
          const isPendingInvite = p.access === 'invited_pending'
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
                {isPendingInvite && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-amber-300 bg-amber-400/10 border-amber-400/20">
                    Pending acceptance
                  </span>
                )}
                {p.analysis_at && (
                  <span className="text-[10px] text-emerald-400">Analyzed ✓</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">
      {confirmCreateRepoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-sm" onClick={() => setConfirmCreateRepoOpen(false)}>
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-fg mb-2">Create GitHub repo?</h3>
            <p className="text-sm text-fg-muted">
              We’ll create a new repository on your GitHub account and link it to this project.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                className="flex-1 py-2.5 btn-secondary text-sm"
                onClick={() => setConfirmCreateRepoOpen(false)}
                disabled={creatingRepo}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 btn-primary font-medium text-sm disabled:opacity-60"
                onClick={confirmCreateRepo}
                disabled={creatingRepo}
              >
                {creatingRepo ? 'Creating…' : 'Create repo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left rail */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-space-600 bg-space-900/50 overflow-hidden">
        <ProjectsRail />
      </aside>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto bg-space-950">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-20 bg-space-950/90 backdrop-blur-md border-b border-space-600">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Build a Team</p>
              <p className="text-sm text-fg font-semibold truncate">
                {mode === 'create' ? 'New project' : mode === 'edit' ? 'Edit project' : (selected?.title ?? 'Select a project')}
              </p>
            </div>
            <button
              onClick={() => setMobileProjectsOpen(true)}
              className="shrink-0 btn-secondary px-3 py-2 text-xs"
            >
              Projects
            </button>
          </div>
        </div>

        {/* Mobile projects drawer */}
        {mobileProjectsOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-space-950/70 backdrop-blur-sm"
              onClick={() => setMobileProjectsOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border border-space-600 bg-space-900 overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-space-600 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">Projects</p>
                <button
                  onClick={() => setMobileProjectsOpen(false)}
                  className="text-xs text-fg-subtle hover:text-fg-muted"
                >
                  Close
                </button>
              </div>
              <div className="h-[calc(80vh-48px)]">
                <ProjectsRail compactHeader />
              </div>
            </div>
          </div>
        )}

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
                  {selected.access === 'invited_pending' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs border font-medium text-amber-300 bg-amber-400/10 border-amber-400/20">
                      Pending acceptance
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle mt-1">
                  {attachedNode ? (
                    <>
                      <a
                        href={(attachedNode.metadata as any)?.github?.html_url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-fg-muted"
                        title={(attachedNode.metadata as any)?.github?.full_name ?? attachedNode.title}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span className="truncate max-w-[240px]">
                          {(attachedNode.metadata as any)?.github?.full_name ?? attachedNode.title}
                        </span>
                        <span className="text-fg-subtle">↗</span>
                      </a>
                    </>
                  ) : selected.access === 'owner' ? (
                    <div className="flex items-center gap-2">
                      <span>No GitHub repo linked.</span>
                      <button
                        type="button"
                        onClick={handleCreateRepo}
                        disabled={creatingRepo || selected.access !== 'owner'}
                        className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                      >
                        {creatingRepo ? 'Creating…' : 'Create repo'}
                      </button>
                    </div>
                  ) : null}
                </div>

                {repoError && <p className="text-xs text-red-400 mt-2">{repoError}</p>}
              </div>
              {selected.access === 'invited_pending' ? (
                <div className="shrink-0 text-xs text-fg-subtle">
                  You were invited to this project.
                </div>
              ) : selected.access === 'owner' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setMode('edit')} className="btn-secondary px-3 py-1.5 text-xs">Edit</button>
                  {selected.user_id === profile?.id && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      {deleting ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="shrink-0 text-xs text-fg-subtle">
                  You are a collaborator on this project.
                </div>
              )}
            </div>

            {/* Invitation banner (invitee only) */}
            {selected.access === 'invited_pending' && (
              <div className="card p-6 border border-amber-400/20 bg-amber-400/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-fg">Project invitation</h2>
                    <p className="text-sm text-fg-muted mt-1">
                      {(receivedPendingForSelected[0]?.from_profile?.display_name ??
                        receivedPendingForSelected[0]?.from_profile?.username ??
                        'The project owner')}{' '}
                      sent you an invitation to collaborate on this project.
                    </p>
                    {receivedPendingForSelected[0]?.role && (
                      <p className="text-xs text-fg-subtle mt-2">
                        Invited as <span className="text-fg-muted font-medium">{receivedPendingForSelected[0].role}</span>
                      </p>
                    )}
                    {receivedPendingForSelected[0]?.message && (
                      <p className="text-xs text-fg-muted mt-2 whitespace-pre-wrap">{receivedPendingForSelected[0].message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={loadTeamRequests}
                    className="shrink-0 text-xs text-brand-400 hover:text-brand-300"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={teamReqLoading || receivedPendingForSelected.length === 0}
                    onClick={() => receivedPendingForSelected[0] && respondToTeamRequest(receivedPendingForSelected[0].id, 'accepted')}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 transition-colors disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={teamReqLoading || receivedPendingForSelected.length === 0}
                    onClick={() => receivedPendingForSelected[0] && respondToTeamRequest(receivedPendingForSelected[0].id, 'declined')}
                    className="px-4 py-2 rounded-lg text-xs font-medium btn-secondary disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {selected.access !== 'invited_pending' && (
              <ProjectTeamPanel
                ideaId={selected.id}
                recommendedRoles={selected.recommended_roles}
                members={members}
                membersLoading={membersLoading}
                membersError={membersError}
                sentPending={sentPendingForSelected}
                loading={teamReqLoading}
                teamError={teamReqError}
                teamNotice={teamReqNotice}
                onRefresh={() => { loadMembersForSelected(); loadTeamRequests() }}
                onCancelInvite={cancelSentInvite}
                onInviteSent={() => { loadTeamRequests(); loadMembersForSelected() }}
                canManageMembers={selected.access === 'owner'}
                onRemoveMember={removeMember}
                onToggleOwner={toggleMemberOwner}
              />
            )}

            {/* GitHub access CTA (members after acceptance) */}
            {selected.access !== 'invited_pending' && selected.node_id && githubConnected === false && (
              <div className="card p-6 border border-brand-400/20 bg-brand-500/5">
                <h2 className="font-semibold text-fg">Get GitHub repo access</h2>
                <p className="text-sm text-fg-muted mt-1">
                  This project is linked to a GitHub repo. Connect your GitHub account so the project owner can grant you collaborator access.
                </p>
                <div className="mt-4">
                  <Link to="/integrations" className="btn-primary px-4 py-2 text-xs font-medium inline-block">
                    Connect GitHub →
                  </Link>
                </div>
              </div>
            )}

            {/* Group chat widget: floating bottom-right */}
            {selected.access !== 'invited_pending' && (
              <>
                {/* Floating chat button */}
                <button
                  type="button"
                  onClick={() => setChatOpen(v => !v)}
                  className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-400 text-white shadow-lg flex items-center justify-center border border-white/10"
                  aria-label={chatOpen ? 'Close chat' : 'Open chat'}
                >
                  {/* chat icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20 2H4a2 2 0 0 0-2 2v15.586l4.293-4.293A1 1 0 0 1 7 15h13a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm0 11H6.586L4 15.586V4h16v9Z" />
                  </svg>
                </button>

                {/* Chat drawer */}
                {chatOpen && (
                  <div className="fixed bottom-24 right-6 z-40 w-[min(360px,calc(100vw-3rem))] h-[420px] rounded-2xl border border-space-600 bg-space-900 shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-space-600 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">Project chat</p>
                        <p className="text-[11px] text-fg-subtle truncate">{selected.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatOpen(false)}
                        className="text-xs text-fg-subtle hover:text-fg-muted"
                      >
                        Close
                      </button>
                    </div>

                    {chatError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 m-3">{chatError}</p>}

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {chatLoading ? (
                        <p className="text-sm text-fg-subtle">Connecting…</p>
                      ) : chatMessages.length === 0 ? (
                        <p className="text-sm text-fg-subtle">No messages yet. Say hi.</p>
                      ) : (
                        chatMessages.map(m => {
                          const mine = m.sender_id === profile?.id
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-3 py-2 border ${
                                mine
                                  ? 'bg-brand-500/20 border-brand-400/30 text-fg'
                                  : 'bg-space-800/60 border-space-600/40 text-fg'
                              }`}>
                                <p className="text-[11px] text-fg-subtle mb-1 truncate">
                                  {mine ? 'You' : (m.sender?.display_name ?? (m.sender?.username ? `@${m.sender.username}` : 'Someone'))}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="p-3 border-t border-space-600">
                      <div className="flex gap-2">
                        <input
                          value={chatDraft}
                          onChange={e => setChatDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              sendChat()
                            }
                          }}
                          className="input-field text-sm flex-1"
                          placeholder="Message…"
                        />
                        <button
                          type="button"
                          onClick={sendChat}
                          disabled={!chatDraft.trim()}
                          className="px-4 py-2.5 btn-primary text-sm disabled:opacity-60"
                        >
                          Send
                        </button>
                      </div>
                      <p className="text-[10px] text-fg-subtle mt-2">
                        Live via WebSocket.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

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

            {/* Analyze prompt (owner only) */}
            {selected.access === 'owner' && !selected.analysis_at && (
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
            {selected.access === 'owner' && selected.analysis_at && selected.recommended_roles.length > 0 && (
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
