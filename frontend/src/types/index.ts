export type NodeType = 'root' | 'project' | 'interest' | 'skill' | 'expertise' | 'idea' | 'custom'

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  fork: boolean
  private: boolean
  language: string | null
  topics: string[]
  updated_at: string
}

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
  theirNodeId: string
  theirNodeTitle: string
  theirNodeType: string
  similarity: number
}

export interface UserMatch {
  userId: string
  displayName: string | null
  role: string | null
  avatarUrl: string | null
  score: number
  matchedNodes: MatchedNodePair[]
  cached?: boolean
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
