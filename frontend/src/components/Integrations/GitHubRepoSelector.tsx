import { useCallback, useEffect, useMemo, useState } from 'react'
import { GitHubRepoSummary, integrationsApi } from '../../lib/api'

interface Props {
  onSaved: (message: string) => void
  onError: (message: string) => void
}

export default function GitHubRepoSelector({ onSaved, onError }: Props) {
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hasSavedSelection, setHasSavedSelection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const loadRepos = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await integrationsApi.listGitHubRepos(refresh)
      setRepos(data.repos)
      const initial =
        data.selectedRepoFullNames === null
          ? new Set(data.repos.map(r => r.full_name))
          : new Set(data.selectedRepoFullNames)
      setSelected(initial)
      setHasSavedSelection(data.selectedRepoFullNames !== null)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onError])

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter(
      r =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        (r.language?.toLowerCase().includes(q) ?? false),
    )
  }, [repos, search])

  function toggle(fullName: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fullName)) next.delete(fullName)
      else next.add(fullName)
      return next
    })
  }

  function selectAllVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      for (const r of filtered) next.add(r.full_name)
      return next
    })
  }

  function clearVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      for (const r of filtered) next.delete(r.full_name)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await integrationsApi.saveGitHubRepoSelection(Array.from(selected))
      setHasSavedSelection(true)
      onSaved(res.message)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to save selection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="text-xs text-white/40 py-2">Loading repositories…</p>
    )
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-white/70">
            Choose which repositories appear in <span className="text-white">My Graph</span> and to your connections.
          </p>
          <p className="text-xs text-white/35 mt-1">
            {selected.size} of {repos.length} selected
            {!hasSavedSelection && repos.length > 0 ? ' · save to apply' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-brand-400 hover:text-brand-300 shrink-0"
        >
          {expanded ? 'Collapse' : 'Choose repos'}
        </button>
      </div>

      {expanded && (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search repositories…"
              className="flex-1 rounded-lg bg-space-700 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => loadRepos(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh list'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={selectAllVisible} className="text-white/50 hover:text-white">
              Select visible
            </button>
            <span className="text-white/20">·</span>
            <button type="button" onClick={clearVisible} className="text-white/50 hover:text-white">
              Clear visible
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
            {filtered.length === 0 ? (
              <p className="text-xs text-white/40 px-3 py-4">No repositories match your search.</p>
            ) : (
              filtered.map(repo => (
                <label
                  key={repo.full_name}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(repo.full_name)}
                    onChange={() => toggle(repo.full_name)}
                    className="mt-1 rounded border-white/20 bg-space-700 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white font-medium truncate">{repo.full_name}</span>
                    <span className="block text-xs text-white/40 truncate">
                      {[repo.language, repo.stargazers_count ? `${repo.stargazers_count} ★` : null]
                        .filter(Boolean)
                        .join(' · ') || 'No description'}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl font-medium text-sm bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save selection (${selected.size})`}
          </button>
        </>
      )}
    </div>
  )
}
