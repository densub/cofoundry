import { supabaseAdmin } from '../lib/supabase'
import {
  filterEdgesForNodes,
  filterExposedNodes,
  getGitHubRepoSelection,
  getGitHubRepoSelections,
  isNodeExposed,
} from './githubSelection'

export interface MatchedProjectPair {
  myNodeId: string
  myNodeTitle: string
  myNodeType: string
  theirNodeId: string
  theirNodeTitle: string
  theirNodeType: string
  similarity: number
}

export interface GraphNodeRow {
  id: string
  user_id: string
  parent_id: string | null
  type: string
  title: string
  content: string
  summary: string | null
  metadata: Record<string, unknown>
  is_root: boolean
  size_weight: number
  created_at: string
  updated_at: string
}

export interface GraphEdgeRow {
  id: string
  from_node_id: string
  to_node_id: string
  relationship_type: string
  weight: number
}

const MAX_PAIRS = 10
const MATCH_THRESHOLD = 0.55
const OVERLAP_TYPES = ['project', 'skill', 'expertise']

export async function computePairProjectMatches(
  userId: string,
  otherUserId: string
): Promise<{ matchedNodes: MatchedProjectPair[]; score: number }> {
  const [selections, { data: myNodesRaw }] = await Promise.all([
    getGitHubRepoSelections([userId, otherUserId]),
    supabaseAdmin
      .from('nodes')
      .select('id, title, type, embedding, metadata')
      .eq('user_id', userId)
      .in('type', OVERLAP_TYPES)
      .not('embedding', 'is', null),
  ])

  const mySelection = selections.get(userId) ?? null
  const theirSelection = selections.get(otherUserId) ?? null
  const myNodes = (myNodesRaw ?? []).filter(n =>
    isNodeExposed(
      { type: n.type, title: n.title, metadata: n.metadata as Record<string, unknown> },
      mySelection,
    ),
  )

  const { data: theirNodesRaw } = await supabaseAdmin
    .from('nodes')
    .select('id, title, type, metadata')
    .eq('user_id', otherUserId)
    .in('type', OVERLAP_TYPES)

  const theirExposedIds = new Set(
    (theirNodesRaw ?? [])
      .filter(n =>
        isNodeExposed(
          { type: n.type, title: n.title, metadata: n.metadata as Record<string, unknown> },
          theirSelection,
        ),
      )
      .map(n => n.id),
  )

  if (!myNodes?.length) return { matchedNodes: [], score: 0 }

  const pairMap = new Map<string, MatchedProjectPair>()

  await Promise.all(
    myNodes.slice(0, 8).map(async myNode => {
      const { data: similar } = await supabaseAdmin.rpc('match_nodes', {
        query_embedding: myNode.embedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: 12,
        exclude_user_id: userId,
      })

      if (!similar) return

      for (const match of similar as Array<{
        user_id: string
        id: string
        title: string
        type: string
        similarity: number
      }>) {
        if (match.user_id !== otherUserId || !OVERLAP_TYPES.includes(match.type)) continue
        if (!theirExposedIds.has(match.id)) continue
        const key = `${myNode.id}:${match.id}`
        const existing = pairMap.get(key)
        if (!existing || match.similarity > existing.similarity) {
          pairMap.set(key, {
            myNodeId: myNode.id,
            myNodeTitle: myNode.title,
            myNodeType: myNode.type,
            theirNodeId: match.id,
            theirNodeTitle: match.title,
            theirNodeType: match.type,
            similarity: match.similarity,
          })
        }
      }
    })
  )

  const matchedNodes = Array.from(pairMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_PAIRS)

  return {
    matchedNodes,
    score: matchedNodes[0]?.similarity ?? 0,
  }
}

export async function loadUserProjectGraph(userId: string): Promise<{
  nodes: GraphNodeRow[]
  edges: GraphEdgeRow[]
}> {
  const [selection, { data: nodes }] = await Promise.all([
    getGitHubRepoSelection(userId),
    supabaseAdmin
      .from('nodes')
      .select(
        'id, user_id, parent_id, type, title, content, summary, metadata, is_root, size_weight, created_at, updated_at'
      )
      .eq('user_id', userId)
      .in('type', ['root', 'project', 'skill', 'expertise']),
  ])

  const nodeRows = filterExposedNodes((nodes ?? []) as GraphNodeRow[], selection)
  const nodeIds = nodeRows.map(n => n.id)
  if (!nodeIds.length) return { nodes: [], edges: [] }

  const { data: edges } = await supabaseAdmin
    .from('edges')
    .select('id, from_node_id, to_node_id, relationship_type, weight')
    .in('from_node_id', nodeIds)

  const visible = new Set(nodeIds)
  const edgeRows = filterEdgesForNodes((edges ?? []) as GraphEdgeRow[], visible)

  return { nodes: nodeRows, edges: edgeRows }
}
