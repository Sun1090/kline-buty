#!/usr/bin/env node
/**
 * 文档站构建：准备知识库拷贝 → vitepress build → 把产物合并进主应用 dist/knowledge/，
 * 使 GitHub Pages / Vercel / Docker / E2E 一次构建同时产出应用 + 文档站。
 * base 由环境变量 DOCS_BASE_PATH 控制（Pages=/kline-buty/knowledge/，其余默认 /knowledge/）。
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

execSync('node scripts/docs-prepare.mjs', { stdio: 'inherit', cwd: ROOT })
execSync('npx vitepress build docs-site', { stdio: 'inherit', cwd: ROOT })

const SITE = join(ROOT, 'docs-site', '.vitepress', 'dist')
const DEST = join(ROOT, 'dist', 'knowledge')
if (!existsSync(SITE)) {
  console.error(`[docs] vitepress 产物不存在: ${SITE}`)
  process.exit(1)
}
rmSync(DEST, { recursive: true, force: true })
mkdirSync(DEST, { recursive: true })
cpSync(SITE, DEST, { recursive: true })

// VitePress 1.x sitemap 的 <loc>/<hreflang href> 都不拼 base，这里按实际站点与 BASE 补齐
const sitemap = join(DEST, 'sitemap.xml')
if (existsSync(sitemap)) {
  const base = process.env.DOCS_BASE_PATH || '/knowledge/'
  const siteUrl = process.env.DOCS_SITE_URL || 'https://kline-buty.vercel.app'
  const raw = readFileSync(sitemap, 'utf8')
  const fixed = raw.replaceAll(`${siteUrl}/`, `${siteUrl}${base}`)
  if (fixed !== raw) {
    writeFileSync(sitemap, fixed)
    console.log(`[docs] sitemap.xml 已补 ${siteUrl}${base}`)
  }
}
console.log(`[docs] 已合并文档站产物 -> ${DEST}`)
