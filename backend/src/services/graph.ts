import { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabase'
import { embedNode } from './embedding'
import { Node, Edge, NodeType } from '../types'

export async function getUserGraph(
  userId: string,
  client: SupabaseClient
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const [nodesRes, edgesRes] = await Promise.all([
    client.from('nodes').select('*').eq('user_id', userId).order('created_at'),
    client
      .from('edges')
      .select('*')
      .in(
        'from_node_id',
        (await client.from('nodes').select('id').eq('user_id', userId)).data?.map(n => n.id) ?? []
      ),
  ])

  return {
    nodes: (nodesRes.data as Node[]) ?? [],
    edges: (edgesRes.data as Edge[]) ?? [],
  }
}

export async function createNode(
  userId: string,
  data: {
    type: NodeType
    title: string
    content: string
    summary: string
    parentId?: string
    isRoot?: boolean
    sizeWeight?: number
    metadata?: Record<string, unknown>
  }
): Promise<Node> {
  const embedding = await embedNode(data.title, data.summary, data.content)

  const { data: node, error } = await supabaseAdmin
    .from('nodes')
    .insert({
      user_id: userId,
      parent_id: data.parentId ?? null,
      type: data.type,
      title: data.title,
      content: data.content,
      summary: data.summary,
      embedding: embedding ? JSON.stringify(embedding) : null,
      is_root: data.isRoot ?? false,
      size_weight: data.sizeWeight ?? 1.0,
      metadata: data.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Auto-create edge from parent if provided
  if (data.parentId) {
    await supabaseAdmin.from('edges').insert({
      from_node_id: data.parentId,
      to_node_id: node.id,
      relationship_type: 'contains',
    })
  }

  return node as Node
}

export async function updateNodeContent(
  nodeId: string,
  content: string,
  summary: string
): Promise<void> {
  const { data: node } = await supabaseAdmin
    .from('nodes')
    .select('title')
    .eq('id', nodeId)
    .single()

  const embedding = node ? await embedNode(node.title, summary, content) : null

  await supabaseAdmin.from('nodes').update({
    content,
    summary,
    embedding: embedding ? JSON.stringify(embedding) : undefined,
  }).eq('id', nodeId)
}

export async function getAdjacentContext(nodeId: string): Promise<string> {
  const { data: edges } = await supabaseAdmin
    .from('edges')
    .select('*')
    .or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`)

  if (!edges?.length) return 'No adjacent nodes yet.'

  const adjacentIds = edges.map(e =>
    e.from_node_id === nodeId ? e.to_node_id : e.from_node_id
  )

  const { data: nodes } = await supabaseAdmin
    .from('nodes')
    .select('title, type, summary')
    .in('id', adjacentIds)

  return (nodes ?? [])
    .map(n => `- [${n.type}] ${n.title}: ${n.summary ?? ''}`)
    .join('\n')
}
