/**
 * Ollama / Gemma integration — AI query routing.
 *
 * Query prefix convention
 * ───────────────────────
 *   "SEARCH:<url or search terms>"  → headless browser navigation + page summary
 *   "QUESTION:<natural language>"   → multimodal analysis (DOM text + screenshot)
 *   (anything else)                 → plain text completion
 *
 * All inference is offloaded to the local Ollama instance on port 11434,
 * keeping the Thin Client lightweight.
 */

import { type CdpSemanticEngine } from '../semantic/cdp.js'

const OLLAMA_BASE = process.env.OLLAMA_BASE ?? 'http://localhost:11434'
const MODEL       = process.env.OLLAMA_MODEL ?? 'gemma2'    // 'gemma2' | 'gemma2:27b' etc.

// Time (ms) to wait for a page to settle after navigation before reading DOM.
const NAV_SETTLE_MS = 2000

// Maximum characters sent to the model as DOM / page-text context.
const DOM_CTX_CHARS   = 4000
const DOM_MULTI_CHARS = 2000

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface OllamaGenerateRequest {
  model:   string
  prompt:  string
  stream:  boolean
  images?: string[]
}

interface OllamaGenerateResponse {
  model:    string
  response: string
  done:     boolean
}

async function generate(prompt: string, imageBase64?: string): Promise<string> {
  const body: OllamaGenerateRequest = { model: MODEL, prompt, stream: false }
  if (imageBase64) body.images = [imageBase64]

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Ollama ${res.status}: ${detail}`)
  }

  const data = (await res.json()) as OllamaGenerateResponse
  return data.response.trim()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface QueryResult {
  type:     'search' | 'question' | 'text'
  query:    string
  response: string
}

export class OllamaRouter {
  constructor(private readonly engine: CdpSemanticEngine) {}

  /**
   * Route a raw query string to the appropriate handler and return the
   * model's response together with the resolved query type.
   */
  async route(raw: string): Promise<QueryResult> {
    const q = raw.trim()

    if (q.startsWith('SEARCH:')) {
      return this.handleSearch(q.slice('SEARCH:'.length).trim())
    }
    if (q.startsWith('QUESTION:')) {
      return this.handleQuestion(q.slice('QUESTION:'.length).trim())
    }

    const response = await generate(q)
    return { type: 'text', query: q, response }
  }

  // ── SEARCH handler ─────────────────────────────────────────────────────────

  private async handleSearch(query: string): Promise<QueryResult> {
    const url = /^https?:\/\//i.test(query)
      ? query
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`

    await this.engine.navigate(url)
    // Allow the page to render dynamic content.
    await sleep(NAV_SETTLE_MS)

    const domText = await this.engine.getDomText()
    const prompt  = [
      `You navigated to: ${url}`,
      '',
      'Page text (truncated):',
      domText.slice(0, DOM_CTX_CHARS),
      '',
      'Summarise the key content on this page in 2-3 sentences.',
    ].join('\n')

    const response = await generate(prompt)
    return { type: 'search', query, response }
  }

  // ── QUESTION handler ───────────────────────────────────────────────────────

  private async handleQuestion(question: string): Promise<QueryResult> {
    // Capture DOM text and screenshot in parallel for minimal added latency.
    const [domText, screenshot] = await Promise.all([
      this.engine.getDomText(),
      this.engine.captureScreenshot(),
    ])

    const prompt = [
      'DOM text context (truncated):',
      domText.slice(0, DOM_MULTI_CHARS),
      '',
      `Question: ${question}`,
    ].join('\n')

    const response = await generate(prompt, screenshot)
    return { type: 'question', query: question, response }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
