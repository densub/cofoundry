export type NodeType = 'root' | 'project' | 'interest' | 'skill' | 'expertise' | 'idea' | 'custom'

export interface Node {
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

export interface Edge {
  id: string
  from_node_id: string
  to_node_id: string
  relationship_type: string
  weight: number
  created_at: string
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
  title?: string
  nodeType?: NodeType
  reason?: string
  content?: string
}

export interface GraphData {
  nodes: Node[]
  edges: Edge[]
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

export interface ProjectIdea {
  id: string
  user_id: string
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

export interface TeamRequest {
  id: string
  from_user_id: string
  to_user_id: string
  node_id: string | null
  idea_id: string | null
  role: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  direction: 'dev_to_collab' | 'collab_to_dev'
  created_at: string
  updated_at: string
}
