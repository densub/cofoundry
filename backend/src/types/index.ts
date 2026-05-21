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
