import OpenAI from 'openai'

let openai: OpenAI | null = null
let warnedMissingKey = false

function isConfiguredKey(key: string | undefined): boolean {
  if (!key?.trim()) return false
  const k = key.trim()
  if (/your_|optional|replace|example|changeme|\.\.\./i.test(k)) return false
  return k.startsWith('sk-') && k.length > 20
}

function getClient() {
  const key = process.env.OPENAI_API_KEY
  if (!isConfiguredKey(key)) {
    if (!warnedMissingKey && typeof key === 'string' && key.trim()) {
      console.warn('[embedding] OPENAI_API_KEY is unset or placeholder — embeddings disabled')
      warnedMissingKey = true
    }
    return null
  }
  if (!openai) openai = new OpenAI({ apiKey: key })
  return openai
}

export async function embedText(text: string): Promise<number[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // token limit safety
    })
    return response.data[0].embedding
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'invalid_api_key') {
      console.warn('[embedding] Invalid OPENAI_API_KEY — embeddings disabled')
      openai = null
      return null
    }
    throw err
  }
}

export async function embedNode(title: string, summary: string | null, content: string): Promise<number[] | null> {
  const text = [title, summary, content.slice(0, 2000)].filter(Boolean).join('\n\n')
  return embedText(text)
}
