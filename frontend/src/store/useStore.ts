import { create } from 'zustand'
import { KNode, KEdge, Profile, Message } from '../types'

interface AppState {
  profile: Profile | null
  nodes: KNode[]
  edges: KEdge[]
  selectedNode: KNode | null
  isChatOpen: boolean
  chatMessages: Message[]
  chatConversationId: string | undefined
  isGraphLoading: boolean

  setProfile: (p: Profile | null) => void
  setNodes: (nodes: KNode[]) => void
  setEdges: (edges: KEdge[]) => void
  addNode: (node: KNode) => void
  updateNode: (node: KNode) => void
  removeNode: (id: string) => void
  addEdge: (edge: KEdge) => void
  selectNode: (node: KNode | null) => void
  openChat: (node: KNode) => void
  closeChat: () => void
  setChatMessages: (msgs: Message[]) => void
  appendChatMessage: (msg: Message) => void
  updateLastAssistantMessage: (content: string) => void
  setGraphLoading: (v: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  profile: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  isChatOpen: false,
  chatMessages: [],
  chatConversationId: undefined,
  isGraphLoading: false,

  setProfile: (profile) => set({ profile }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  updateNode: (node) => set((s) => ({
    nodes: s.nodes.map(n => n.id === node.id ? node : n),
    selectedNode: s.selectedNode?.id === node.id ? node : s.selectedNode,
  })),

  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter(n => n.id !== id),
    selectedNode: s.selectedNode?.id === id ? null : s.selectedNode,
    isChatOpen: s.selectedNode?.id === id ? false : s.isChatOpen,
  })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  selectNode: (node) => set({ selectedNode: node }),

  openChat: (node) => set({ selectedNode: node, isChatOpen: true, chatMessages: [], chatConversationId: undefined }),

  closeChat: () => set({ isChatOpen: false, selectedNode: null, chatMessages: [] }),

  setChatMessages: (chatMessages) => set({ chatMessages }),

  appendChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  updateLastAssistantMessage: (content) => set((s) => {
    const msgs = [...s.chatMessages]
    const lastIdx = msgs.length - 1
    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
      msgs[lastIdx] = { ...msgs[lastIdx], content }
    }
    return { chatMessages: msgs }
  }),

  setGraphLoading: (isGraphLoading) => set({ isGraphLoading }),
}))
