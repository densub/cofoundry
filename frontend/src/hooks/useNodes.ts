import { useEffect, useCallback } from 'react'
import { nodesApi } from '../lib/api'
import { useStore } from '../store/useStore'

export function useNodes(userId: string | undefined) {
  const { setNodes, setEdges, setGraphLoading } = useStore()

  const refresh = useCallback(async () => {
    if (!userId) return
    setGraphLoading(true)
    try {
      const { nodes, edges } = await nodesApi.getGraph()
      setNodes(nodes)
      setEdges(edges)
    } finally {
      setGraphLoading(false)
    }
  }, [userId, setNodes, setEdges, setGraphLoading])

  useEffect(() => { refresh() }, [refresh])

  return { refresh }
}
