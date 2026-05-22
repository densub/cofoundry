import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { connectionsApi, matchingApi } from '../lib/api'
import { markConnectionRequestsSeen } from '../lib/connectionNotifications'
import { similarityPercent } from '../lib/similarity'
import { useStore } from '../store/useStore'
import {
  AppUserSearchResult,
  Connection,
  ConnectionProfile,
  ConnectionsNetworkGraph,
  ConnectionsSearchResult,
  ConnectionsSummary,
  GitHubCollaboratorMatch,
  GitHubUserSearchResult,
  UserMatch,
} from '../types'
import ConnectionPairGraphModal from '../components/Connections/ConnectionPairGraphModal'
import ConnectionsNetworkGraphView from '../components/Connections/ConnectionsNetworkGraph'
import MatchDetailModal from '../components/Matches/MatchDetailModal'

const emptySummary: ConnectionsSummary = {
  connections: [],
  incomingRequests: [],
  outgoingRequests: [],
  externalInvites: [],
}

function initials(profile: ConnectionProfile | AppUserSearchResult | null): string {
  const label = profile?.display_name ?? profile?.username ?? '?'
  return label.slice(0, 1).toUpperCase()
}

function PersonCard({
  user,
  action,
  muted,
  onViewGraph,
}: {
  user: ConnectionProfile | null
  action?: React.ReactNode
  muted?: string
  onViewGraph?: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-800 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-300 flex items-center justify-center font-semibold overflow-hidden">
        {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white truncate">{user?.display_name ?? user?.username ?? 'Unknown user'}</p>
        {user?.role && <p className="text-sm text-white/50 truncate">{user.role}</p>}
        {user?.bio && <p className="text-sm text-white/35 line-clamp-2 mt-1">{user.bio}</p>}
        {muted && <p className="text-xs text-white/30 mt-1">{muted}</p>}
      </div>
      <div className="flex flex-col sm:items-end gap-2 flex-shrink-0 w-full sm:w-auto">
        {onViewGraph && (
          <button
            type="button"
            onClick={onViewGraph}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-brand-500/40 text-sm transition-colors"
          >
            View graph
          </button>
        )}
        {action}
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const pct = similarityPercent(score)
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : '#F59E0B'
  return (
    <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${pct * 0.879} 87.9`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</span>
    </div>
  )
}

function RecommendationCard({
  match,
  onSelect,
  action,
}: {
  match: UserMatch
  onSelect: () => void
  action: React.ReactNode
}) {
  const topMatches = match.matchedNodes.slice(0, 2)
  return (
    <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-space-800 p-4 sm:p-5 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
        className="flex items-start gap-3 sm:gap-4 cursor-pointer min-w-0"
      >
        <ScoreRing score={match.score} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{match.displayName ?? 'Anonymous'}</h3>
          {match.role && <p className="text-sm text-white/50 mt-0.5">{match.role}</p>}
          <div className="mt-3 space-y-1.5">
            {topMatches.map((mn, i) => (
              <div key={i} className="text-xs text-white/40 break-words">
                <span className="text-white/70 break-all">{mn.myNodeTitle}</span>
                <span className="mx-1">matches</span>
                <span className="break-all">{mn.theirNodeTitle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">{action}</div>
    </div>
  )
}

function GitHubRecommendationCard({
  match,
  onInvite,
  busy,
}: {
  match: GitHubCollaboratorMatch
  onInvite: () => void
  busy: boolean
}) {
  const topRepo = match.matchedRepos[0]
  return (
    <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-space-800 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        <ScoreRing score={match.score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <img src={match.avatar_url} alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white truncate">{match.name ?? match.login}</h3>
              <p className="text-xs text-white/45 truncate">@{match.login} · {match.public_repos} public repos</p>
            </div>
          </div>
          {match.bio && <p className="text-sm text-white/35 line-clamp-2 mt-3">{match.bio}</p>}
          {topRepo && (
            <div className="mt-3 text-xs text-white/40 break-words">
              <span className="text-white/70 break-all">{topRepo.myRepo}</span>
              <span className="mx-1">matches</span>
              <a href={topRepo.githubRepoUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200 break-all">
                {topRepo.githubRepo}
              </a>
              <p className="mt-1 text-white/30">{topRepo.reason}</p>
            </div>
          )}
        </div>
      </div>
      {match.email ? (
        <button
          onClick={onInvite}
          disabled={busy}
          className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-sm font-medium transition-colors"
        >
          {busy ? 'Sending...' : 'Send invite'}
        </button>
      ) : (
        <a
          href={match.html_url}
          target="_blank"
          rel="noreferrer"
          className="w-full py-2 rounded-xl border border-white/10 text-center text-white/60 hover:text-white hover:border-white/30 text-sm transition-colors"
        >
          Open GitHub
        </a>
      )}
    </div>
  )
}

export default function ConnectionsPage() {
  const profile = useStore(s => s.profile)
  const [summary, setSummary] = useState<ConnectionsSummary>(emptySummary)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ConnectionsSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [matches, setMatches] = useState<UserMatch[]>([])
  const [githubMatches, setGithubMatches] = useState<GitHubCollaboratorMatch[]>([])
  const [githubMatchesMessage, setGithubMatchesMessage] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<UserMatch | null>(null)
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [networkGraph, setNetworkGraph] = useState<ConnectionsNetworkGraph | null>(null)
  const [networkLoading, setNetworkLoading] = useState(false)
  const [graphUser, setGraphUser] = useState<ConnectionProfile | null>(null)
  const networkRef = useRef<HTMLDivElement>(null)
  const [networkDims, setNetworkDims] = useState({ width: 0, height: 280 })

  async function loadSummary() {
    setSummaryLoading(true)
    try {
      const nextSummary = await connectionsApi.list()
      setSummary(nextSummary)
      if (profile?.id && nextSummary.incomingRequests.length > 0) {
        markConnectionRequestsSeen(profile.id, nextSummary.incomingRequests)
      }
    } finally {
      setSummaryLoading(false)
    }
  }

  async function loadNetworkGraph() {
    setNetworkLoading(true)
    try {
      setNetworkGraph(await connectionsApi.getNetworkGraph())
    } catch {
      setNetworkGraph(null)
    } finally {
      setNetworkLoading(false)
    }
  }

  useEffect(() => {
    loadSummary().catch(() => setError('Failed to load connections'))
    loadNetworkGraph()
    matchingApi.getSaved()
      .then(({ matches: saved }) => setMatches(saved))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function measure() {
      if (networkRef.current) {
        setNetworkDims({
          width: networkRef.current.offsetWidth,
          height: 280,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [networkGraph, summary.connections.length])

  function setBusy(key: string, value: boolean) {
    setBusyKeys(prev => {
      const next = new Set(prev)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) return
    setSearching(true)
    setError('')
    setNotice('')
    try {
      setSearchResults(await connectionsApi.search(query.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function sendRequest(userId: string) {
    setBusy(userId, true)
    setError('')
    try {
      await connectionsApi.sendRequest(userId)
      setNotice('Connection request sent')
      await loadSummary()
      setMatches(prev => prev.map(match =>
        match.userId === userId ? { ...match, connectionStatus: 'requested' } : match
      ))
      if (searchResults) {
        setSearchResults({
          ...searchResults,
          appUsers: searchResults.appUsers.map(user =>
            user.id === userId ? { ...user, connectionStatus: 'requested' } : user
          ),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setBusy(userId, false)
    }
  }

  async function acceptRequest(id: string) {
    setBusy(id, true)
    setError('')
    try {
      await connectionsApi.acceptRequest(id)
      await loadSummary()
      await loadNetworkGraph()
      setNotice('Connection accepted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request')
    } finally {
      setBusy(id, false)
    }
  }

  async function removeConnection(user: ConnectionProfile | UserMatch | AppUserSearchResult) {
    const userId = 'userId' in user ? user.userId : user.id
    setBusy(`remove:${userId}`, true)
    setError('')
    try {
      await connectionsApi.removeConnection(userId)
      await loadSummary()
      await loadNetworkGraph()
      setMatches(prev => prev.map(match =>
        match.userId === userId ? { ...match, connectionStatus: null } : match
      ))
      setNotice('Connection removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove connection')
    } finally {
      setBusy(`remove:${userId}`, false)
    }
  }

  async function declineRequest(id: string) {
    setBusy(id, true)
    setError('')
    try {
      await connectionsApi.declineRequest(id)
      await loadSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline request')
    } finally {
      setBusy(id, false)
    }
  }

  async function cancelRequest(id: string, userId?: string) {
    setBusy(id, true)
    setError('')
    try {
      await connectionsApi.cancelRequest(id)
      await loadSummary()
      if (userId) {
        setMatches(prev => prev.map(match =>
          match.userId === userId ? { ...match, connectionStatus: null } : match
        ))
        if (searchResults) {
          setSearchResults({
            ...searchResults,
            appUsers: searchResults.appUsers.map(user =>
              user.id === userId ? { ...user, connectionStatus: null } : user
            ),
          })
        }
      }
      setNotice('Request cancelled')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request')
    } finally {
      setBusy(id, false)
    }
  }

  async function inviteGitHub(user: GitHubUserSearchResult) {
    if (!user.email) return
    setBusy(`gh:${user.login}`, true)
    setError('')
    try {
      await connectionsApi.inviteGitHub({
        login: user.login,
        email: user.email,
        profileUrl: user.html_url,
        name: user.name,
      })
      await loadSummary()
      setGithubMatches(prev => prev.filter(match => match.login !== user.login))
      setNotice(`Invite sent to ${user.login}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setBusy(`gh:${user.login}`, false)
    }
  }

  async function findMatches(refresh = false) {
    setMatchesLoading(true)
    setError('')
    setGithubMatchesMessage('')
    try {
      const [{ matches: found }, github] = await Promise.all([
        matchingApi.findMatches({ refresh }),
        matchingApi.findGitHubMatches({ limit: 10 }).catch(err => ({
          matches: [] as GitHubCollaboratorMatch[],
          message: err instanceof Error ? err.message : 'Failed to find GitHub matches',
        })),
      ])
      setMatches(found)
      setGithubMatches(github.matches)
      setGithubMatchesMessage(github.message ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches')
    } finally {
      setMatchesLoading(false)
    }
  }

  async function handleMatchAction(userId: string, status: 'connected' | 'dismissed') {
    if (status === 'connected') {
      await sendRequest(userId)
      return
    }
    const match = matches.find(item => item.userId === userId)
    if (match?.matchId) {
      await matchingApi.updateStatus(match.matchId, 'dismissed').catch(() => {})
    }
    setMatches(prev => prev.filter(item => item.userId !== userId))
    setNotice('Recommendation dismissed')
  }

  function appUserAction(user: AppUserSearchResult) {
    const outgoing = summary.outgoingRequests.find(request => request.user?.id === user.id)
    if (user.connectionStatus === 'connected') {
      return (
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setGraphUser(user)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-sm transition-colors"
          >
            View graph
          </button>
          <span className="text-xs text-emerald-400 px-3">Connected</span>
          <button
            type="button"
            onClick={() => removeConnection(user)}
            disabled={busyKeys.has(`remove:${user.id}`)}
            className="text-xs text-white/35 hover:text-red-300 transition-colors disabled:opacity-40"
          >
            {busyKeys.has(`remove:${user.id}`) ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )
    }
    if (user.connectionStatus === 'requested') {
      return (
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          <span className="text-xs text-white/40 px-3 py-1">Requested</span>
          {outgoing && (
            <button
              type="button"
              onClick={() => cancelRequest(outgoing.id, user.id)}
              disabled={busyKeys.has(outgoing.id)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-sm transition-colors disabled:opacity-40"
            >
              {busyKeys.has(outgoing.id) ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      )
    }
    if (user.connectionStatus === 'incoming') {
      return <span className="text-xs text-brand-300 px-3 py-2">They requested you</span>
    }
    return (
      <button
        onClick={() => sendRequest(user.id)}
        disabled={busyKeys.has(user.id)}
        className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-sm font-medium transition-colors"
      >
        {busyKeys.has(user.id) ? 'Sending...' : 'Connect'}
      </button>
    )
  }

  function matchAction(match: UserMatch) {
    const outgoing = summary.outgoingRequests.find(request => request.user?.id === match.userId)
    if (match.connectionStatus === 'connected') {
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setGraphUser({
              id: match.userId,
              display_name: match.displayName,
              username: null,
              role: match.role,
              bio: null,
              avatar_url: match.avatarUrl,
            })}
            className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-sm transition-colors"
          >
            View graph
          </button>
          <button
            type="button"
            onClick={() => removeConnection(match)}
            disabled={busyKeys.has(`remove:${match.userId}`)}
            className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 text-sm transition-colors disabled:opacity-40"
          >
            {busyKeys.has(`remove:${match.userId}`) ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )
    }
    if (match.connectionStatus === 'requested') {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm text-white/40 py-1">Request sent</p>
          {outgoing && (
            <button
              type="button"
              onClick={() => cancelRequest(outgoing.id, match.userId)}
              disabled={busyKeys.has(outgoing.id)}
              className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-sm transition-colors disabled:opacity-40"
            >
              {busyKeys.has(outgoing.id) ? 'Cancelling...' : 'Cancel request'}
            </button>
          )}
        </div>
      )
    }
    if (match.connectionStatus === 'incoming') {
      return <p className="text-center text-sm text-brand-300 py-2">They requested you</p>
    }
    return (
      <button
        onClick={() => sendRequest(match.userId)}
        disabled={busyKeys.has(match.userId)}
        className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-sm font-medium transition-colors disabled:opacity-40"
      >
        {busyKeys.has(match.userId) ? 'Sending...' : 'Connect'}
      </button>
    )
  }

  const connectedMatches = matches.filter(match => match.connectionStatus === 'connected')
  const appMatches = matches.filter(match => match.connectionStatus !== 'connected')
  const hasAnyRecommendations = matches.length > 0 || githubMatches.length > 0

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Connections</h1>
        <p className="text-white/40 text-sm mt-1">
          See your current connections, handle requests, and search CoFoundry or GitHub for people to invite.
        </p>
      </div>

      {notice && <p className="text-sm text-emerald-400 bg-emerald-400/10 rounded-xl px-4 py-3 mb-4">{notice}</p>}
      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 mb-4">{error}</p>}

      {(networkLoading || (networkGraph && networkGraph.connections.length > 0)) && (
        <section className="rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5 mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Connections graph</h2>
              <p className="text-sm text-white/40">
                You at the center — click a connection to see shared project overlap.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="text-sm text-brand-400 hover:text-brand-300 whitespace-nowrap"
            >
              Your projects →
            </Link>
          </div>
          <div
            ref={networkRef}
            className="relative rounded-xl bg-space-950 border border-white/5 min-h-[280px]"
          >
            {networkLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-white/35">Loading graph...</p>
              </div>
            )}
            {!networkLoading && networkGraph && networkGraph.connections.length > 0 && networkDims.width > 0 && (
              <ConnectionsNetworkGraphView
                data={networkGraph}
                width={networkDims.width}
                height={networkDims.height}
                onSelectUser={id => {
                  const conn = summary.connections.find((c: Connection) => c.user?.id === id)
                  if (conn?.user) setGraphUser(conn.user)
                }}
              />
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Search people</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, role, bio, or GitHub handle"
            className="flex-1 rounded-xl bg-space-900 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 font-medium text-sm transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults && (
          <div className="mt-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3">CoFoundry users</h3>
              <div className="space-y-3">
                {searchResults.appUsers.length === 0 && <p className="text-sm text-white/35">No app users found.</p>}
                {searchResults.appUsers.map(user => (
                  <PersonCard key={user.id} user={user} muted={user.githubUsername ? `GitHub: @${user.githubUsername}` : undefined} action={appUserAction(user)} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3">GitHub users</h3>
              <div className="space-y-3">
                {searchResults.githubUsers.length === 0 && <p className="text-sm text-white/35">No GitHub users found.</p>}
                {searchResults.githubUsers.map(user => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-space-800 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{user.name ?? user.login}</p>
                      <p className="text-sm text-white/50">@{user.login} · {user.public_repos} public repos</p>
                      {user.bio && <p className="text-sm text-white/35 line-clamp-2 mt-1">{user.bio}</p>}
                      {!user.email && <p className="text-xs text-white/30 mt-1">No public email on GitHub. You can open their profile instead.</p>}
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                      {user.email ? (
                        <button
                          onClick={() => inviteGitHub(user)}
                          disabled={busyKeys.has(`gh:${user.login}`)}
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-sm font-medium transition-colors"
                        >
                          {busyKeys.has(`gh:${user.login}`) ? 'Sending...' : 'Send invite'}
                        </button>
                      ) : (
                        <a
                          href={user.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto px-3 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-sm text-center transition-colors"
                        >
                          Open GitHub
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <section className="rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Connections</h2>
          <div className="space-y-3">
            {summaryLoading && <p className="text-sm text-white/35">Loading connections...</p>}
            {!summaryLoading && summary.connections.length === 0 && <p className="text-sm text-white/35">No connections yet.</p>}
            {summary.connections.map(connection => (
              <PersonCard
                key={connection.id}
                user={connection.user}
                onViewGraph={
                  connection.user?.id
                    ? () => setGraphUser(connection.user!)
                    : undefined
                }
                action={
                  connection.user?.id ? (
                    <button
                      type="button"
                      onClick={() => removeConnection(connection.user!)}
                      disabled={busyKeys.has(`remove:${connection.user.id}`)}
                      className="text-xs text-white/35 hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                      {busyKeys.has(`remove:${connection.user.id}`) ? 'Removing...' : 'Remove'}
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Requests</h2>
          <div className="space-y-3">
            {summary.incomingRequests.length === 0 && summary.outgoingRequests.length === 0 && (
              <p className="text-sm text-white/35">No pending requests.</p>
            )}
            {summary.incomingRequests.map(request => (
              <PersonCard
                key={request.id}
                user={request.user}
                muted="Wants to connect"
                action={
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => acceptRequest(request.id)}
                      disabled={busyKeys.has(request.id)}
                      className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-sm transition-colors disabled:opacity-40"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineRequest(request.id)}
                      disabled={busyKeys.has(request.id)}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white text-sm transition-colors disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                }
              />
            ))}
            {summary.outgoingRequests.map(request => (
              <PersonCard
                key={request.id}
                user={request.user}
                muted="Request sent"
                action={
                  <button
                    type="button"
                    onClick={() => cancelRequest(request.id, request.user?.id)}
                    disabled={busyKeys.has(request.id)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-sm transition-colors disabled:opacity-40"
                  >
                    {busyKeys.has(request.id) ? 'Cancelling...' : 'Cancel'}
                  </button>
                }
              />
            ))}
          </div>
        </section>
      </div>

      <section className="w-full min-w-0 rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Recommended collaborators</h2>
            <p className="text-sm text-white/40">Project-based matches from CoFoundry users and public GitHub repositories.</p>
          </div>
          <button
            onClick={() => findMatches(true)}
            disabled={matchesLoading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-colors disabled:opacity-40"
          >
            {matchesLoading ? 'Scanning...' : hasAnyRecommendations ? 'Refresh' : 'Find matches'}
          </button>
        </div>

        {!hasAnyRecommendations && !matchesLoading && (
          <p className="text-sm text-white/35">No recommendations yet. Import GitHub projects to improve matching.</p>
        )}

        {connectedMatches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Already in your connections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              {connectedMatches.map(match => (
                <RecommendationCard
                  key={match.userId}
                  match={match}
                  onSelect={() => setGraphUser({
                    id: match.userId,
                    display_name: match.displayName,
                    username: null,
                    role: match.role,
                    bio: null,
                    avatar_url: match.avatarUrl,
                  })}
                  action={matchAction(match)}
                />
              ))}
            </div>
          </div>
        )}

        {appMatches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-3">People on CoFoundry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              {appMatches.map(match => (
                <RecommendationCard
                  key={match.userId}
                  match={match}
                  onSelect={() => setSelectedMatch(match)}
                  action={matchAction(match)}
                />
              ))}
            </div>
          </div>
        )}

        {(githubMatches.length > 0 || githubMatchesMessage) && (
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3">Similar builders on GitHub</h3>
            {githubMatchesMessage && githubMatches.length === 0 && (
              <p className="text-sm text-white/35">{githubMatchesMessage}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              {githubMatches.map(match => (
                <GitHubRecommendationCard
                  key={match.login}
                  match={match}
                  busy={busyKeys.has(`gh:${match.login}`)}
                  onInvite={() => inviteGitHub(match)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {summary.externalInvites.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-space-800/50 p-4 sm:p-5 mt-6">
          <h2 className="text-lg font-semibold text-white mb-3">External invites</h2>
          <div className="space-y-2">
            {summary.externalInvites.map(invite => (
              <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 text-sm">
                <a href={invite.github_profile_url} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200">
                  @{invite.github_login}
                </a>
                <span className="text-white/40 truncate">{invite.email}</span>
                <span className={invite.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}>{invite.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onAction={(userId, status) => {
            handleMatchAction(userId, status)
            setSelectedMatch(null)
          }}
        />
      )}

      {graphUser && (
        <ConnectionPairGraphModal
          user={graphUser}
          onClose={() => setGraphUser(null)}
        />
      )}
    </div>
  )
}
