import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { teamApi } from '../lib/api'
import { useStore } from '../store/useStore'
import { TeamProject, RecommendedRole } from '../types'

const STAGE_STYLES: Record<string, { label: string; className: string }> = {
  idea:      { label: 'Idea',      className: 'text-fg-muted bg-white/5 border-white/10' },
  prototype: { label: 'Prototype', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  launched:  { label: 'Launched',  className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  growing:   { label: 'Growing',   className: 'text-brand-400 bg-brand-400/10 border-brand-400/20' },
}

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'business', label: 'Business Dev' },
  { value: 'design', label: 'Design' },
  { value: 'product', label: 'Product' },
  { value: 'domain-expert', label: 'Domain Expert' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'community', label: 'Community' },
  { value: 'developer', label: 'Developer (technical)' },
  { value: 'cto', label: 'CTO (technical)' },
]

const STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  { value: 'idea', label: 'Idea' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'launched', label: 'Launched' },
  { value: 'growing', label: 'Growing' },
]

const SOURCE_OPTIONS = [
  { value: '', label: 'All projects' },
  { value: 'github', label: 'GitHub repos' },
  { value: 'idea', label: 'Business ideas' },
]

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) return <img src={url} alt={name ?? ''} className="w-8 h-8 rounded-full object-cover ring-2 ring-space-700" />
  return (
    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

function SourceBadge({ source }: { source: 'github' | 'idea' }) {
  if (source === 'github') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-space-700 border border-space-600 text-fg-subtle">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        GitHub
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-400/10 border border-amber-400/20 text-amber-400">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
      Idea
    </span>
  )
}

function RoleBadge({ role }: { role: RecommendedRole }) {
  const ICONS: Record<string, string> = {
    marketing: '📣', sales: '🤝', business: '💼', design: '🎨',
    product: '🧭', 'domain-expert': '🔬', operations: '⚙️',
    finance: '📊', legal: '⚖️', community: '🌐',
    developer: '💻', cto: '🛠️',
  }
  const techClass = role.is_technical ? 'bg-brand-500/10 border-brand-400/30 text-brand-300' : 'bg-space-700 border-space-600 text-fg-muted'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border ${techClass}`}>
      <span aria-hidden="true">{ICONS[role.role] ?? '👤'}</span>
      {role.title}
    </span>
  )
}

function ProjectCard({
  project, onApply, applied,
}: {
  project: TeamProject
  onApply: (p: TeamProject, role: RecommendedRole) => void
  applied: Set<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const stage = STAGE_STYLES[project.project_stage] ?? STAGE_STYLES.prototype
  const p = project.profiles
  const displayTitle = project.title || project.nodes?.title || 'Untitled project'

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-brand-400/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={p?.display_name ?? null} url={p?.avatar_url ?? null} />
          <div className="min-w-0">
            <p className="font-semibold text-fg text-sm truncate">{displayTitle}</p>
            <p className="text-xs text-fg-subtle truncate">{p?.display_name ?? 'Anonymous'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SourceBadge source={project.source} />
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] border font-medium ${stage.className}`}>
            {stage.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-fg-muted leading-relaxed line-clamp-3">{project.project_summary}</p>

      {project.target_market && (
        <p className="text-xs text-fg-subtle">
          <span className="text-fg-muted font-medium">For: </span>{project.target_market}
        </p>
      )}

      <div>
        <p className="text-xs text-fg-subtle mb-2">Looking for</p>
        <div className="flex flex-wrap gap-1.5">
          {project.recommended_roles.slice(0, expanded ? undefined : 3).map(r => (
            <RoleBadge key={r.role} role={r} />
          ))}
          {!expanded && project.recommended_roles.length > 3 && (
            <button onClick={() => setExpanded(true)} className="text-[11px] text-brand-400 hover:underline">
              +{project.recommended_roles.length - 3} more
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-1 border-t border-space-600/40">
        {project.recommended_roles.map(role => {
          const key = `${project.id}:${role.role}`
          return (
            <div key={role.role} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-fg truncate">{role.title}</p>
                <p className="text-[11px] text-fg-subtle line-clamp-1">{role.why}</p>
              </div>
              <button
                onClick={() => onApply(project, role)}
                disabled={applied.has(key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${applied.has(key) ? 'bg-space-700 text-fg-subtle cursor-default' : 'btn-primary'}`}
              >
                {applied.has(key) ? 'Applied ✓' : "I'm interested"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ApplyModal({
  project, role, onClose, onSent,
}: {
  project: TeamProject
  role: RecommendedRole
  onClose: () => void
  onSent: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const profile = useStore(s => s.profile)
  const displayTitle = project.title || project.nodes?.title || 'Untitled project'

  async function send() {
    const ownerId = project.profiles?.id
    if (!ownerId) { setError('Project owner not found'); return }
    if (!project.node_id && !project.idea_id) { setError('Project reference missing'); return }
    setSending(true)
    setError('')
    try {
      await teamApi.sendRequest({
        to_user_id: ownerId,
        node_id: project.node_id ?? undefined,
        idea_id: project.idea_id ?? undefined,
        role: role.role,
        message: message.trim() || undefined,
        direction: 'collab_to_dev',
      })
      onSent()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <SourceBadge source={project.source} />
          <h2 className="font-semibold text-fg text-sm">{displayTitle}</h2>
        </div>
        <p className="text-xs text-fg-muted mb-4">
          Expressing interest in: <strong>{role.title}</strong>
        </p>
        <label className="block text-sm font-medium text-fg mb-2">
          Introduce yourself <span className="text-fg-subtle font-normal">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="input-field resize-none mb-4"
          placeholder={`Hi, I'm ${profile?.display_name ?? 'reaching out'} — I can help with ${role.title.toLowerCase()} for this project…`}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 btn-secondary text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="flex-1 py-2.5 btn-primary font-medium text-sm disabled:opacity-60">
            {sending ? 'Sending…' : 'Send introduction'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<TeamProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [applyTarget, setApplyTarget] = useState<{ project: TeamProject; role: RecommendedRole } | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  async function load(role = roleFilter, stage = stageFilter, source = sourceFilter) {
    setLoading(true)
    setError('')
    try {
      const { projects: results } = await teamApi.getProjects({
        role: role || undefined,
        stage: stage || undefined,
        source: source || undefined,
      })
      setProjects(results)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter(role: string, stage: string, source: string) {
    setRoleFilter(role)
    setStageFilter(stage)
    setSourceFilter(source)
    load(role, stage, source)
  }

  function onApplySent() {
    if (applyTarget) {
      setApplied(s => new Set([...s, `${applyTarget.project.id}:${applyTarget.role.role}`]))
    }
    setApplyTarget(null)
  }

  const hasFilters = roleFilter || stageFilter || sourceFilter

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fg">Explore projects</h1>
          <p className="text-fg-muted text-sm mt-1">
            Find technical projects and startup ideas looking for someone with your background.
          </p>
        </div>
        <Link to="/settings" className="text-xs text-brand-400 hover:underline">Update my profile →</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={sourceFilter}
          onChange={e => applyFilter(roleFilter, stageFilter, e.target.value)}
          className="input-field w-auto text-sm py-2 pr-8"
        >
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={e => applyFilter(e.target.value, stageFilter, sourceFilter)}
          className="input-field w-auto text-sm py-2 pr-8"
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={stageFilter}
          onChange={e => applyFilter(roleFilter, e.target.value, sourceFilter)}
          className="input-field w-auto text-sm py-2 pr-8"
        >
          {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => applyFilter('', '', '')} className="text-xs text-fg-muted hover:text-fg px-3 py-2 btn-secondary">
            Clear filters
          </button>
        )}
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card p-5 h-48 animate-pulse bg-space-800/50" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="card p-6 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={() => load()} className="text-xs text-brand-400 hover:text-brand-300">Retry</button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🔭</div>
          <h2 className="text-lg font-semibold text-fg mb-2">No projects found</h2>
          <p className="text-fg-muted text-sm max-w-sm mx-auto leading-relaxed">
            {hasFilters
              ? 'No projects match your current filters. Try adjusting them.'
              : 'Developers and founders are still building their team listings. Check back soon.'}
          </p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <>
          <p className="text-xs text-fg-subtle mb-4">{projects.length} project{projects.length !== 1 ? 's' : ''} found</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onApply={(proj, role) => setApplyTarget({ project: proj, role })}
                applied={applied}
              />
            ))}
          </div>
        </>
      )}

      {applyTarget && (
        <ApplyModal
          project={applyTarget.project}
          role={applyTarget.role}
          onClose={() => setApplyTarget(null)}
          onSent={onApplySent}
        />
      )}
    </div>
  )
}
