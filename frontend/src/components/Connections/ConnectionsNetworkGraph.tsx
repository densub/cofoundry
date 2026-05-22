import { useRef, useMemo, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCenter } from 'd3-force'
import { ConnectionsNetworkGraph as NetworkData } from '../../types'

interface NetworkNode {
  id: string
  label: string
  avatarUrl: string | null
  role?: string | null
  tier: 'me' | 'direct' | 'second'
  x?: number
  y?: number
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
}

interface Props {
  data: NetworkData
  width: number
  height: number
  onSelectUser?: (userId: string) => void
}

export default function ConnectionsNetworkGraph({ data, width, height, onSelectUser }: Props) {
  const fgRef = useRef<any>(null)

  const graphData = useMemo(() => {
    const meId = data.me?.id ?? 'me'
    const nodes: NetworkNode[] = []
    if (data.me) {
      nodes.push({
        id: meId,
        label: data.me.display_name ?? data.me.username ?? 'You',
        avatarUrl: data.me.avatar_url,
        role: data.me.role,
        tier: 'me',
      })
    }
    for (const c of data.connections) {
      if (!c) continue
      nodes.push({
        id: c.id,
        label: c.display_name ?? c.username ?? 'Connection',
        avatarUrl: c.avatar_url,
        role: c.role,
        tier: 'direct',
      })
    }
    for (const c of data.secondDegreeConnections ?? []) {
      if (!c || nodes.some(node => node.id === c.id)) continue
      nodes.push({
        id: c.id,
        label: c.display_name ?? c.username ?? 'Their connection',
        avatarUrl: c.avatar_url,
        role: c.role,
        tier: 'second',
      })
    }
    const links: NetworkLink[] = data.links.map(l => ({ source: l.source, target: l.target }))
    return { nodes, links }
  }, [data])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg || graphData.nodes.length === 0) return
    fg.d3Force('charge')?.strength(-420)
    fg.d3Force('link')?.distance(140).strength(0.35)
    fg.d3Force('center', forceCenter(0, 0).strength(0.08))
    fg.d3ReheatSimulation()
  }, [graphData, width, height])

  const drawNode = useCallback((node: NetworkNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0
    const y = node.y ?? 0
    const radius = node.tier === 'me' ? 28 : node.tier === 'direct' ? 22 : 18
    const color =
      node.tier === 'me'
        ? '#58a6ff'
        : node.tier === 'direct'
          ? '#3fb950'
          : '#f2cc60'

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color + '33'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = node.tier === 'me' ? 2.5 : 1.5
    ctx.stroke()

    if (node.avatarUrl && globalScale > 0.25) {
      // Avatar ring hint — initials fallback drawn below
    }

    const fontSize = Math.max(9, 11 / globalScale)
    const roleFontSize = fontSize * 0.8
    ctx.font = `600 ${fontSize}px Inter, sans-serif`
    ctx.fillStyle = '#FFFFFFDD'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const label = node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label
    ctx.fillText(label, x, y + radius + 6)
    if (node.role) {
      ctx.font = `500 ${roleFontSize}px Inter, sans-serif`
      ctx.fillStyle = '#FFFFFF88'
      const role = node.role.length > 20 ? node.role.slice(0, 18) + '…' : node.role
      ctx.fillText(role, x, y + radius + 8 + fontSize)
    }
  }, [])

  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      if (node.tier !== 'direct' || !onSelectUser) return
      onSelectUser(node.id)
    },
    [onSelectUser]
  )

  const handleEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit(400, 60)
  }, [])

  if (!graphData.nodes.length) return null

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="transparent"
      nodeId="id"
      nodeVal={(n: NetworkNode) => (n.tier === 'me' ? 56 : n.tier === 'direct' ? 44 : 30)}
      nodeCanvasObject={drawNode}
      nodeCanvasObjectMode={() => 'replace'}
      linkColor={(link: NetworkLink) => {
        const source = typeof link.source === 'object' ? (link.source as NetworkNode).tier : null
        const target = typeof link.target === 'object' ? (link.target as NetworkNode).tier : null
        return source === 'second' || target === 'second'
          ? 'rgba(242,204,96,0.35)'
          : 'rgba(88,166,255,0.35)'
      }}
      linkWidth={1.4}
      onNodeClick={handleNodeClick}
      onEngineStop={handleEngineStop}
      warmupTicks={60}
      cooldownTicks={200}
      minZoom={0.4}
      maxZoom={4}
    />
  )
}
