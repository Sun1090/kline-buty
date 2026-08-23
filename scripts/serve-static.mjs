#!/usr/bin/env node
/**
 * 极简静态服务器：本地 / E2E 使用，行为与生产托管对齐（GitHub Pages / Vercel）：
 * - 目录请求 → 目录内 index.html（如 /knowledge/ → knowledge/index.html）
 * - 真实文件直接命中（含 .html / 中文路径）
 * - 其余路径 → SPA 回退到根 index.html（应用路由）
 * 取代 `serve -s`：serve v14 内置 cleanUrls 会把 .html 301 到无后缀路径，
 * 导致 /knowledge/ 子站与 .html 链接本地行为与线上不一致。
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const PORT = Number(process.argv[2] || 5173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

function resolveFile(pathname) {
  let p = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  if (p === '.' || p === '/') p = '/index.html'
  if (p.endsWith('/')) p += 'index.html'
  const file = join(DIST, p)
  if (!file.startsWith(DIST)) return null
  if (existsSync(file) && statSync(file).isFile()) return file
  return null
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const file = resolveFile(url.pathname)
  if (file) {
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(readFileSync(file))
    return
  }
  // 知识库未知路径 → 知识库双语 404 页（与线上 vercel.json 的 /knowledge 软 404 对齐）
  if (url.pathname === '/knowledge' || url.pathname.startsWith('/knowledge/')) {
    const nf = join(DIST, 'knowledge', '404.html')
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
    res.end(readFileSync(nf))
    return
  }
  // SPA 回退：应用路由（如 /?symbol=BTCUSDT 或未知路径）→ 根 index.html
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end(readFileSync(join(DIST, 'index.html')))
}).listen(PORT, () => {
  console.log(`[static] serving ${DIST} at http://localhost:${PORT}`)
})
