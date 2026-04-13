// Roku External Control Protocol (ECP) service
// Requests are routed through the Vite dev-server CORS proxy at /roku-proxy/<ip>/<path>
// In a Tauri production build the requests can be made directly since there is no browser CORS restriction.

export interface RokuDeviceInfo {
  ip: string
  friendlyName: string
  modelName: string
  modelNumber: string
  serialNumber: string
  softwareVersion: string
  udn: string
}

export interface RokuApp {
  id: string
  name: string
  version: string
  type: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ecpUrl(ip: string, ecpPath: string): string {
  // In the browser we must go through the proxy to avoid CORS.
  // Detect whether we're in a Tauri WebView (window.__TAURI__ is defined).
  const isTauri = typeof window !== 'undefined' && !!(window as { __TAURI__?: unknown }).__TAURI__
  if (isTauri) {
    return `http://${ip}:8060${ecpPath}`
  }
  return `/roku-proxy/${ip}${ecpPath}`
}

function getText(doc: Document, tag: string): string {
  return doc.querySelector(tag)?.textContent?.trim() ?? ''
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchDeviceInfo(ip: string): Promise<RokuDeviceInfo> {
  const res = await fetch(ecpUrl(ip, '/query/device-info'), { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`ECP ${res.status}`)
  const doc = parseXml(await res.text())
  return {
    ip,
    friendlyName: getText(doc, 'friendly-device-name') || getText(doc, 'user-device-name') || ip,
    modelName: getText(doc, 'model-name'),
    modelNumber: getText(doc, 'model-number'),
    serialNumber: getText(doc, 'serial-number'),
    softwareVersion: getText(doc, 'software-version'),
    udn: getText(doc, 'udn'),
  }
}

export async function fetchApps(ip: string): Promise<RokuApp[]> {
  const res = await fetch(ecpUrl(ip, '/query/apps'), { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`ECP ${res.status}`)
  const doc = parseXml(await res.text())
  return Array.from(doc.querySelectorAll('app')).map((el) => ({
    id: el.getAttribute('id') ?? '',
    name: el.textContent?.trim() ?? '',
    version: el.getAttribute('version') ?? '',
    type: el.getAttribute('type') ?? '',
  }))
}

export async function fetchActiveApp(ip: string): Promise<RokuApp | null> {
  const res = await fetch(ecpUrl(ip, '/query/active-app'), { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return null
  const doc = parseXml(await res.text())
  const el = doc.querySelector('active-app > app')
  if (!el) return null
  return {
    id: el.getAttribute('id') ?? '',
    name: el.textContent?.trim() ?? '',
    version: el.getAttribute('version') ?? '',
    type: el.getAttribute('type') ?? '',
  }
}

export async function sendKey(ip: string, key: string): Promise<void> {
  await fetch(ecpUrl(ip, `/keypress/${key}`), { method: 'POST', signal: AbortSignal.timeout(5000) })
}

export async function launchApp(ip: string, appId: string): Promise<void> {
  await fetch(ecpUrl(ip, `/launch/${appId}`), { method: 'POST', signal: AbortSignal.timeout(5000) })
}

/** Returns true if a real Roku device responds at the given IP.
 *  Validates the ECP /query/device-info XML response to confirm it is a Roku
 *  device (not just any host that happens to return HTTP 200 on port 8060).
 */
export async function probeDevice(ip: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(ecpUrl(ip, '/query/device-info'), {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    const text = await res.text()
    const doc = parseXml(text)
    // A genuine Roku ECP response always has a non-empty <serial-number>.
    // Non-Roku devices may return HTTP 200 but will not have this field.
    const serialNumber = getText(doc, 'serial-number')
    return serialNumber.length > 0
  } catch {
    return false
  }
}

/** Returns the URL for the channel icon image (use as an <img> src). */
export function iconUrl(ip: string, appId: string): string {
  return ecpUrl(ip, `/query/icon/${appId}`)
}

/** Scan all 254 hosts in a /24 subnet in parallel batches. */
export async function scanSubnet(
  subnet: string, // e.g. "192.168.1"
  onFound: (ip: string) => void,
  onProgress: (scanned: number, total: number) => void,
  probeTimeoutMs = 1500,
): Promise<void> {
  const total = 254
  let scanned = 0
  const BATCH = 25

  for (let start = 1; start <= total; start += BATCH) {
    const end = Math.min(start + BATCH - 1, total)
    const batch = Array.from({ length: end - start + 1 }, (_, i) => `${subnet}.${start + i}`)
    await Promise.all(
      batch.map(async (ip) => {
        const found = await probeDevice(ip, probeTimeoutMs)
        scanned++
        onProgress(scanned, total)
        if (found) onFound(ip)
      }),
    )
  }
}
