import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'
import http from 'http'

export default defineConfig({
  plugins: [react()],
  server: {
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
          res.writeHead(proxyRes.statusCode ?? 200, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'text/xml',
            'Access-Control-Allow-Origin': '*',
          })
          proxyRes.pipe(res)
        })
        proxy.on('error', () => {
          res.writeHead(502)
          res.end('Unreachable')
        })
        proxy.on('timeout', () => {
          proxy.destroy()
          res.writeHead(504)
          res.end('Timeout')
        })
        req.pipe(proxy)
      })
    },
  },
})
