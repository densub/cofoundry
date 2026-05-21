import { useRef, useCallback, useMemo, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide, forceCenter } from 'd3-force'
import { KNode, KEdge, GraphNode, GraphLink } from '../../types'
import { useStore } from '../../store/useStore'

/** Wide initial ring so the sim starts fragmented, not stacked on the origin */
function scatterInitialPosition(index: number, total: number): { x: number; y: number } {
  const t = total <= 1 ? 0 : index / total
  const angle = t * Math.PI * 2 + (index * 1.618033988749895) % (Math.PI * 2)
  const ring = 120 + (index % 5) * 55 + Math.sin(index * 2.1) * 40
  const jitter = 35
  return {
    x: Math.cos(angle) * ring + (Math.random() - 0.5) * jitter,
    y: Math.sin(angle) * ring + (Math.random() - 0.5) * jitter,
  }
}

const TYPE_COLORS: Record<string, string> = {
  root:      '#58a6ff',
  project:   '#388bfd',
  interest:  '#3fb950',
  skill:     '#d29922',
  expertise: '#f85149',
  idea:      '#db61a2',
  custom:    '#8b949e',
}

const TYPE_LABELS: Record<string, string> = {
  root: 'ROOT', project: 'PROJECT', interest: 'INTEREST',
  skill: 'SKILL', expertise: 'EXPERTISE', idea: 'IDEA', custom: 'CUSTOM',
}

interface Props {
  nodes: KNode[]
  edges: KEdge[]
  width: number
  height: number
}

export default function BubbleGraph({ nodes, edges, width, height }: Props) {
  const fgRef = useRef<any>(null)
  const { openChat, selectedNode } = useStore()

  const graphData = useMemo(() => {
    const total = nodes.length
    return {
      nodes: nodes.map((n, i) => {
        const pos = scatterInitialPosition(i, total)
        return { ...n, x: pos.x, y: pos.y, fx: undefined, fy: undefined } as GraphNode
      }),
      links: edges.map(e => ({
        source: e.from_node_id,
        target: e.to_node_id,
        relationship_type: e.relationship_type,
        weight: e.weight,
      })) as GraphLink[],
    }
  }, [nodes, edges])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg || graphData.nodes.length === 0) return

    const charge = fg.d3Force('charge')
    charge?.strength(-520).distanceMax(1200)

    const link = fg.d3Force('link')
    link
      ?.distance((l: GraphLink) => {
        const src = typeof l.source === 'object' ? (l.source as GraphNode) : null
        const isRootLink = src?.type === 'root' || l.relationship_type === 'contains'
        return isRootLink ? 180 : 130
      })
      .strength((l: GraphLink) => (l.relationship_type === 'contains' ? 0.22 : 0.12))

    fg.d3Force(
      'collision',
      forceCollide<GraphNode>()
        .radius((n: GraphNode) => (n.size_weight ?? 1) * 22 + 28)
        .strength(0.85)
        .iterations(2),
    )

    fg.d3Force('center', forceCenter(0, 0).strength(0.025))

    fg.d3ReheatSimulation()
  }, [graphData, width, height])

  const drawNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const baseSize = (node.size_weight ?? 1) * 10
    const isSelected = selectedNode?.id === node.id
    const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.custom
    const x = node.x ?? 0
    const y = node.y ?? 0

    // Outer glow (selected or hover)
    if (isSelected) {
      ctx.shadowBlur = 30
      ctx.shadowColor = color
    } else {
      ctx.shadowBlur = 12
      ctx.shadowColor = color + '88'
    }

    // Gradient fill
    const grad = ctx.createRadialGradient(x, y, 0, x, y, baseSize)
    grad.addColorStop(0, color + 'DD')
    grad.addColorStop(0.6, color + '88')
    grad.addColorStop(1, color + '22')
    ctx.beginPath()
    ctx.arc(x, y, baseSize, 0, 2 * Math.PI)
    ctx.fillStyle = grad
    ctx.fill()

    // Border ring
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(x, y, baseSize, 0, 2 * Math.PI)
    ctx.strokeStyle = isSelected ? '#FFFFFF' : color + 'CC'
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.stroke()

    // Type badge (only at reasonable zoom)
    if (globalScale > 0.4) {
      const badgeSize = Math.max(6, 9 / globalScale)
      ctx.font = `bold ${badgeSize}px Inter, sans-serif`
      ctx.fillStyle = '#FFFFFF99'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(TYPE_LABELS[node.type]?.slice(0, 3) ?? '?', x, y)
    }

    // Label below bubble
    if (globalScale > 0.3) {
      const fontSize = Math.max(8, 11 / globalScale)
      ctx.font = `${fontSize}px Inter, sans-serif`
      ctx.fillStyle = '#FFFFFFCC'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = node.title.length > 22 ? node.title.slice(0, 20) + '…' : node.title
      ctx.fillText(label, x, y + baseSize + 4)
    }
  }, [selectedNode])

  const nodeVal = useCallback((node: GraphNode) => (node.size_weight ?? 1) * 52, [])

  const linkColor = useCallback((link: GraphLink) => {
    if (link.relationship_type === 'contains') return 'rgba(88,166,255,0.22)'
    return 'rgba(255,255,255,0.06)'
  }, [])

  const linkWidth = useCallback((link: GraphLink) => {
    if (link.relationship_type === 'contains') return 1.2
    return 0.5
  }, [])

  const linkCurvature = useCallback((link: GraphLink) => {
    const id =
      typeof link.source === 'object'
        ? (link.source as GraphNode).id
        : String(link.source)
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
    return 0.15 + (Math.abs(h) % 10) * 0.04
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    openChat(node)
    fgRef.current?.centerAt(node.x, node.y, 600)
    fgRef.current?.zoom(2.5, 600)
  }, [openChat])

  const handleBackgroundClick = useCallback(() => {
    useStore.getState().closeChat()
  }, [])

  const handleEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit(400, 80)
  }, [])

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="#0d1117"
      nodeId="id"
      nodeVal={nodeVal}
      nodeCanvasObject={drawNode}
      nodeCanvasObjectMode={() => 'replace'}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkCurvature={linkCurvature}
      linkDirectionalParticles={1}
      linkDirectionalParticleWidth={1}
      linkDirectionalParticleColor={() => 'rgba(88,166,255,0.35)'}
      onNodeClick={handleNodeClick}
      onBackgroundClick={handleBackgroundClick}
      onEngineStop={handleEngineStop}
      warmupTicks={80}
      cooldownTicks={320}
      d3AlphaDecay={0.012}
      d3VelocityDecay={0.35}
      minZoom={0.25}
      maxZoom={6}
      nodeLabel={(node: GraphNode) => `${node.title}\n${node.summary ?? ''}`}
    />
  )
}
