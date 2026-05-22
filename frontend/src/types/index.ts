export type NodeType = 'root' | 'project' | 'interest' | 'skill' | 'expertise' | 'idea' | 'custom'

export interface KNode {
  id: string
  user_id: string
  parent_id: string | null
  type: NodeType
  title: string
  content: string
  summary: string | null
  metadata: Record<string, unknown>
  is_root: boolean
  size_weight: number
  created_at: string
  updated_at: string
}

export interface KEdge {
  id: string
  from_node_id: string
  to_node_id: string
  relationship_type: string
  weight: number
}

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  role: string | null
  bio: string | null
  avatar_url: string | null
  is_onboarded: boolean
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface NodeOperation {
  type: 'create_child' | 'expand_node' | 'narrow_node' | 'update_content'
  title: string
  nodeType: NodeType
  reason: string
}

export interface MatchedNodePair {
  myNodeId: string
  myNodeTitle: string
  myNodeType: string
  theirNodeId: string
  theirNodeTitle: string
  theirNodeType: string
  similarity: number
}

export interface UserMatch {
  matchId?: string
  userId: string
  displayName: string | null
  role: string | null
  avatarUrl: string | null
  score: number
  matchedNodes: MatchedNodePair[]
  connectionStatus?: 'connected' | 'incoming' | 'requested' | null
  cached?: boolean
}

export interface ConnectionProfile {
  id: string
  username: string | null
  display_name: string | null
  role: string | null
  bio: string | null
  avatar_url: string | null
}

export interface ConnectionRequest {
  id: string
  requester_id: string
  recipient_id: string
  status: string
  created_at: string
  updated_at: string
  user: ConnectionProfile | null
}

export interface Connection {
  id: string
  created_at: string
  user: ConnectionProfile | null
}

export interface ExternalInvite {
  id: string
  github_login: string
  github_profile_url: string
  email: string
  status: string
  created_at: string
}

export interface ConnectionsSummary {
  connections: Connection[]
  incomingRequests: ConnectionRequest[]
  outgoingRequests: ConnectionRequest[]
  externalInvites: ExternalInvite[]
}

export interface ConnectionsNetworkGraph {
  me: ConnectionProfile | null
  connections: ConnectionProfile[]
  secondDegreeConnections?: ConnectionProfile[]
  links: Array<{ source: string; target: string }>
}

export interface ConnectionGraphSlice {
  nodes: KNode[]
  edges: KEdge[]
}

export interface ConnectionPairGraph {
  user: ConnectionProfile | null
  score: number
  matchedNodes: MatchedNodePair[]
  my: ConnectionGraphSlice
  their: ConnectionGraphSlice
  matchEdges?: KEdge[]
}

export interface AppUserSearchResult extends ConnectionProfile {
  connectionStatus: 'connected' | 'incoming' | 'requested' | null
  githubUsername: string | null
}

export interface GitHubUserSearchResult {
  id: number
  login: string
  name: string | null
  bio: string | null
  email: string | null
  avatar_url: string
  html_url: string
  public_repos: number
}

export interface GitHubCollaboratorMatch extends GitHubUserSearchResult {
  score: number
  matchedRepos: Array<{
    myRepo: string
    githubRepo: string
    githubRepoUrl: string
    language: string | null
    topics: string[]
    stars: number
    reason: string
  }>
}

export interface ConnectionsSearchResult {
  appUsers: AppUserSearchResult[]
  githubUsers: GitHubUserSearchResult[]
}

export interface ProjectOverlap {
  yourProject: string
  theirProject: string
  similarity: number
  yourStack: string
  theirStack: string
  projectIdea: string
  commonInterest: string
  collaboration: string
}

export interface MatchInsights {
  summary: string
  projectOverlaps: ProjectOverlap[]
  cached?: boolean
}

// For react-force-graph
export interface GraphNode extends KNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  relationship_type: string
  weight: number
}
