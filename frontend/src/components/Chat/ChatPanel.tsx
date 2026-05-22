import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '../../store/useStore'
import { streamChat, chatApi } from '../../lib/api'
import { NodeOperation } from '../../types'
import ChatMessage from './ChatMessage'

const TYPE_COLORS: Record<string, string> = {
  root: '#8B5CF6', project: '#3B82F6', interest: '#10B981',
  skill: '#F59E0B', expertise: '#EF4444', idea: '#EC4899', custom: '#6B7280',
}

export default function ChatPanel() {
  const {
    selectedNode, isChatOpen, closeChat,
    chatMessages, appendChatMessage, updateLastAssistantMessage,
    chatConversationId, addNode, addEdge,
  } = useStore()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingOp, setPendingOp] = useState<NodeOperation | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'content'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (isChatOpen) inputRef.current?.focus()
  }, [isChatOpen])

  if (!isChatOpen || !selectedNode) return null

  const color = TYPE_COLORS[selectedNode.type] ?? TYPE_COLORS.custom
  const canChat = selectedNode.type === 'project' && Boolean(selectedNode.metadata?.github)

  async function handleSend() {
    if (!input.trim() || streaming || !selectedNode || !canChat) return

    const userMsg = { role: 'user' as const, content: input.trim(), timestamp: new Date().toISOString() }
    appendChatMessage(userMsg)
    setInput('')
    setStreaming(true)
    setPendingOp(null)

    appendChatMessage({ role: 'assistant', content: '', timestamp: new Date().toISOString() })
    let fullText = ''

    try {
      for await (const chunk of streamChat(
        selectedNode.id,
        chatMessages,
        userMsg.content,
        chatConversationId
      )) {
        if (chunk.done) break
        if (chunk.text) {
          fullText += chunk.text
          updateLastAssistantMessage(fullText)
        }
        if (chunk.operations) {
          setPendingOp(chunk.operations as NodeOperation)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed. Please try again.'
      updateLastAssistantMessage(message)
    } finally {
      setStreaming(false)
    }
  }

  async function handleAcceptOperation(op: NodeOperation) {
    if (!selectedNode) return
    try {
      const newNode = await chatApi.acceptOperation(selectedNode.id, op)
      addNode(newNode)
      addEdge({
        id: crypto.randomUUID(),
        from_node_id: selectedNode.id,
        to_node_id: newNode.id,
        relationship_type: 'contains',
        weight: 1,
      })
      setPendingOp(null)
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="absolute inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] flex flex-col bg-space-800 border-l border-white/10 animate-slide-in z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ borderTopColor: color, borderTopWidth: 2 }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          <div className="min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-widest">{selectedNode.type}</p>
            <h3 className="font-semibold text-white truncate">{selectedNode.title}</h3>
          </div>
        </div>
        <button onClick={closeChat} className="text-white/40 hover:text-white transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['chat', 'content'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-white border-b-2' : 'text-white/40 hover:text-white/70'
            }`}
            style={activeTab === tab ? { borderBottomColor: color } : {}}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'content' ? (
        <div className="flex-1 overflow-y-auto p-4 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{selectedNode.content || '*No content yet.*'}</ReactMarkdown>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-white/30 text-sm pt-8">
                <div className="text-3xl mb-3">◇</div>
                {canChat ? (
                  <>
                    <p>Chat about this GitHub project.</p>
                    <p className="mt-1">Ask questions, explore ideas, or brainstorm improvements.</p>
                  </>
                ) : (
                  <>
                    <p>Chat is limited to GitHub project nodes.</p>
                    <p className="mt-1">This protects app data and keeps AI focused on one project.</p>
                  </>
                )}
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <ChatMessage key={i} message={msg} isStreaming={streaming && i === chatMessages.length - 1 && msg.role === 'assistant'} />
            ))}

            {/* Pending operation card */}
            {pendingOp && (
              <div className="rounded-xl border border-white/20 bg-space-700 p-4 space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-widest">Suggested node</p>
                <p className="font-semibold text-white">{pendingOp.title}</p>
                <p className="text-sm text-white/60">{pendingOp.reason}</p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => handleAcceptOperation(pendingOp)}
                    className="px-3 py-1.5 text-sm rounded-lg text-white font-medium transition-colors"
                    style={{ backgroundColor: color + 'CC' }}
                  >
                    Create node
                  </button>
                  <button
                    onClick={() => setPendingOp(null)}
                    className="px-3 py-1.5 text-sm rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={canChat ? 'Ask about this GitHub project…' : 'Chat is only available for GitHub project nodes'}
                rows={2}
                className="flex-1 resize-none rounded-xl bg-space-700 border border-white/10 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                disabled={!canChat}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming || !canChat}
                className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40 flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
