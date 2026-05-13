/**
 * ビルド済み drum-machine/ を静的配信する最小サーバー（Node.js 18+）。
 * レンタルサーバーで Node が使える場合: drum-machine と本ファイルを置き
 *   PORT=8080 node server/static-server.mjs
 * 環境変数 PORT（既定 3000）、HOST（既定 0.0.0.0）
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'drum-machine')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wav': 'audio/wav',
  '.map': 'application/json',
}

/**
 * 公開ルート外へのパス解決を防ぐ（path traversal / ルート外 .. / プレフィックス攻撃を緩和）。
 * 以前の full.startsWith(root) だけでは、中間の .. や root が別パスのプレフィックスになる場合に不十分なことがある。
 */
function safeResolve(root, urlPath) {
  const rootR = path.resolve(root)
  const raw = urlPath.split('?')[0]
  if (raw.includes('\0')) return null
  let decoded
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const full = path.resolve(rootR, decoded)
  const rel = path.relative(rootR, full)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  return full
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  let pathname
  try {
    pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname
  } catch {
    res.writeHead(400)
    res.end()
    return
  }

  if (pathname === '/') pathname = '/index.html'

  let filePath = safeResolve(ROOT, pathname.slice(1))
  if (!filePath) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  const trySend = (p) => {
    fs.stat(p, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
        return
      }
      const ext = path.extname(p).toLowerCase()
      const type = MIME[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      fs.createReadStream(p).pipe(res)
    })
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isFile()) {
      trySend(filePath)
      return
    }
    if (!err && st.isDirectory()) {
      const index = path.join(filePath, 'index.html')
      trySend(index)
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
  })
})

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log(`static-server: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/ (root=${ROOT})`)
})
