import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'
import http from 'http'

/** Vite dev-server plugin: forward /roku-proxy/<ip>/<path> → http://<ip>:8060/<path>
 *  This is needed in browser dev mode to avoid CORS restrictions when talking to Roku ECP.
 *  In a Tauri production build the requests go directly to the device with no proxy needed.
 */
function rokuProxyPlugin(): Plugin {
  return {
    name: 'roku-proxy',
    configureServer(server) {
      server.middlewares.use('/roku-proxy', (req: IncomingMessage, res: ServerResponse) => {
        // URL pattern: /roku-proxy/<ip>/<path...>
        const url = req.url ?? '/'
        const match = url.match(/^\/([^/]+)(\/.*)$/)
        if (!match) {
          res.writeHead(400)
          res.end('Bad Request')
          return
        }
        const [, ip, ecpPath] = match
        const options = {
          hostname: ip,
          port: 8060,
          path: ecpPath,
          method: req.method ?? 'GET',
          headers: { 'Content-Type': 'text/plain' },
          timeout: 5000,
        }
        const proxy = http.request(options, (proxyRes) => {
          if (res.headersSent) return
          res.writeHead(proxyRes.statusCode ?? 200, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'text/xml',
            'Access-Control-Allow-Origin': '*',
          })
          proxyRes.pipe(res)
        })
        proxy.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(502)
            res.end('Unreachable')
          }
        })
        proxy.on('timeout', () => {
          proxy.destroy()
          if (!res.headersSent) {
            res.writeHead(504)
            res.end('Timeout')
          }
        })
        // Clean up the outgoing proxy request if the browser disconnects
        // (e.g. AbortSignal.timeout during a network scan).
        req.on('close', () => {
          proxy.destroy()
        })
        req.pipe(proxy)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), rokuProxyPlugin()],
})
