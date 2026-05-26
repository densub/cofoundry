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
  user_type?: 'developer' | 'collaborator'
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

export interface ExpertiseProfile {
  id: string
  user_id: string
  headline: string | null
  expertise_tags: string[]
  industries: string[]
  linkedin_url: string | null
  portfolio_url: string | null
  past_ventures: string | null
  looking_for: 'cofounder' | 'early-team' | 'advisor' | null
  commitment: 'full-time' | 'part-time' | 'advisory' | null
  open_to_equity: boolean
  created_at: string
  updated_at: string
}

export interface RecommendedRole {
  role: string
  title: string
  why: string
  priority: number
  is_technical?: boolean
}

export interface ProjectIdea {
  id: string
  user_id: string
  node_id: string | null
  title: string
  problem_statement: string
  solution_description: string | null
  target_market: string | null
  stage: 'idea' | 'prototype' | 'launched' | 'growing'
  skills_i_bring: string | null
  project_summary: string | null
  recommended_roles: RecommendedRole[]
  analysis_at: string | null
  status: 'active' | 'paused' | 'filled'
  created_at: string
  updated_at: string
}

export interface TeamAnalysis {
  id: string
  node_id: string
  owner_id: string
  project_summary: string
  target_market: string
  project_stage: 'idea' | 'prototype' | 'launched' | 'growing'
  recommended_roles: RecommendedRole[]
  created_at: string
}

export interface CollaboratorProfile {
  id: string
  user_id: string
  headline: string | null
  expertise_tags: string[]
  industries: string[]
  linkedin_url: string | null
  portfolio_url: string | null
  skills_description: string | null
  looking_for: string | null
  commitment: string | null
  open_to_equity: boolean
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
    username: string | null
  }
}

export interface TeamRequest {
  id: string
  role: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  direction: 'dev_to_collab' | 'collab_to_dev'
  created_at: string
  updated_at: string
  node_id: string | null
  idea_id: string | null
  nodes: { id: string; title: string } | null
  project_ideas: { id: string; title: string } | null
  from_profile: { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null
  to_profile: { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null
}

export interface TeamProject {
  id: string
  source: 'github' | 'idea'
  node_id: string | null
  idea_id: string | null
  title: string
  project_summary: string
  target_market: string
  project_stage: 'idea' | 'prototype' | 'launched' | 'growing'
  recommended_roles: RecommendedRole[]
  created_at: string
  nodes: { id: string; title: string; user_id: string } | null
  profiles: { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null
}
