/**
 * Chrome DevTools Protocol (CDP) Semantic Engine.
 *
 * Uses Puppeteer + HeadlessExperimental.beginFrame to deterministically
 * capture browser frames, then extracts interactive DOM elements and maps
 * them to the 64-D manifold via buildSemanticFrame().
 */

import puppeteer, { type Browser, type Page, type CDPSession } from 'puppeteer-core'
import { buildSemanticFrame, type DomElement, type SemanticFrame } from './manifold.js'

export interface CdpEngineOptions {
  /** Absolute path to the Chrome/Chromium binary. Auto-detected if omitted. */
  executablePath?: string
  viewportWidth?:  number
  viewportHeight?: number
  /** URL to open on launch. */
  targetUrl?:      string
  /** Initial LOD level (0 = full density). */
  lodLevel?:       number
}

/** CSS selector covering all interactive / navigable DOM elements. */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex]'

export class CdpSemanticEngine {
  private browser: Browser | null    = null
  private page:    Page | null       = null
  private cdp:     CDPSession | null = null
  private seq = 0

  constructor(private readonly opts: CdpEngineOptions = {}) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async launch(): Promise<void> {
    const vw = this.opts.viewportWidth  ?? 1920
    const vh = this.opts.viewportHeight ?? 1080

    this.browser = await puppeteer.launch({
      executablePath: this.opts.executablePath ?? 'google-chrome-stable',
      headless:       true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${vw},${vh}`,
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    })

    this.page = await this.browser.newPage()
    await this.page.setViewport({ width: vw, height: vh })

    // Open a CDP session for deterministic frame capture.
    this.cdp = await this.page.createCDPSession()

    // HeadlessExperimental is available in Chrome ≥ 112 headless mode.
    // Failure is non-fatal — frame capture degrades to a standard screenshot.
    await this.cdp.send('HeadlessExperimental.enable').catch(() => undefined)

    if (this.opts.targetUrl) {
      await this.page.goto(this.opts.targetUrl, { waitUntil: 'networkidle2' })
    }
  }

  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = null
    this.page    = null
    this.cdp     = null
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Navigate to a URL and wait for the network to settle. */
  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('CdpSemanticEngine: not launched')
    await this.page.goto(url, { waitUntil: 'networkidle2' })
  }

  // ---------------------------------------------------------------------------
  // Frame capture
  // ---------------------------------------------------------------------------

  /**
   * Deterministically capture one frame using HeadlessExperimental.beginFrame,
   * extract all interactive DOM elements visible in the viewport, and return
   * the resulting SemanticFrame with populated 64-D manifold vectors.
   */
  async captureFrame(): Promise<SemanticFrame> {
    if (!this.page || !this.cdp) throw new Error('CdpSemanticEngine: not launched')

    const vw = this.opts.viewportWidth  ?? 1920
    const vh = this.opts.viewportHeight ?? 1080

    // Trigger a deterministic compositor frame.  Falls back silently if the
    // HeadlessExperimental domain is unavailable in this Chrome build.
    await this.cdp
      .send('HeadlessExperimental.beginFrame', { screenshot: { format: 'png' } })
      .catch(() => undefined)

    // Extract bounding boxes for interactive elements inside the viewport.
    const elements = await this.page.evaluate(
      (selector, vwInner, vhInner) => {
        return Array.from(document.querySelectorAll(selector))
          .map((el) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0)          return null
            if (rect.x + rect.width  < 0 || rect.x  > vwInner) return null
            if (rect.y + rect.height < 0 || rect.y  > vhInner) return null

            const tag  = el.tagName.toLowerCase()
            const role = el.getAttribute('role') ?? tag

            return {
              tag,
              role,
              x:      rect.x,
              y:      rect.y,
              width:  rect.width,
              height: rect.height,
              text:   ((el as HTMLElement).innerText ?? '').slice(0, 64),
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      },
      INTERACTIVE_SELECTOR,
      vw,
      vh,
    ) as DomElement[]

    return buildSemanticFrame(this.seq++, elements, vw, vh, this.opts.lodLevel ?? 0)
  }

  // ---------------------------------------------------------------------------
  // Context helpers for AI queries
  // ---------------------------------------------------------------------------

  /** Capture the current page as a base64-encoded PNG (for multimodal AI). */
  async captureScreenshot(): Promise<string> {
    if (!this.page) throw new Error('CdpSemanticEngine: not launched')
    return this.page.screenshot({ type: 'png', encoding: 'base64' }) as Promise<string>
  }

  /** Return the full visible text of the page (for LLM context). */
  async getDomText(): Promise<string> {
    if (!this.page) throw new Error('CdpSemanticEngine: not launched')
    return this.page.evaluate(() => document.body?.innerText ?? '')
  }

  /** Return the current page URL. */
  async currentUrl(): Promise<string> {
    if (!this.page) throw new Error('CdpSemanticEngine: not launched')
    return this.page.url()
  }
}
