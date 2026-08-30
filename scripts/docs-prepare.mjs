#!/usr/bin/env node
/**
 * 文档站准备：同步双语知识库源到 VitePress srcDir。
 * 源（docs/knowledge/，唯一数据源）：
 * - en/<chapter-slug>/…  → docs-site/docs/<chapter-slug>/…（根 locale = English）
 * - zh/<chapter-slug>/…  → docs-site/docs/zh/<chapter-slug>/…（/zh/ locale = 简体中文）
 * 章节 README.md 拷贝中改名为 index.md，静态托管下 /<chapter>/ 直接命中。
 * 落地页 docs-site/docs/index.md（en）与 docs-site/docs/zh/index.md（zh）为手写源，不入同步清理范围。
 * docs:dev / docs:build 都会先执行本脚本。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'docs', 'knowledge')
const DEST = join(ROOT, 'docs-site', 'docs')

if (!existsSync(SRC)) {
  console.error(`[docs] 源目录不存在: ${SRC}`)
  process.exit(1)
}

mkdirSync(DEST, { recursive: true })
mkdirSync(join(DEST, 'zh'), { recursive: true })

// 手写落地页与静态资源，不做同步清理
const PRESERVE = new Set(['index.md', 'zh', 'public', '.vitepress'])

// 清理旧拷贝：顶层（en 产物 + 历史数字目录）与 zh/ 下的章节目录
for (const entry of readdirSync(DEST)) {
  if (PRESERVE.has(entry)) continue
  rmSync(join(DEST, entry), { recursive: true, force: true })
}
for (const entry of readdirSync(join(DEST, 'zh'))) {
  if (entry === 'index.md') continue
  rmSync(join(DEST, 'zh', entry), { recursive: true, force: true })
}

/** 同步一个语言树：src 子目录（en/zh）→ dest 前缀，返回章节数 */
function syncLocale(sub) {
  const srcLocale = join(SRC, sub)
  if (!existsSync(srcLocale)) return 0
  const destLocale = sub === 'en' ? DEST : join(DEST, sub)
  const chapters = readdirSync(srcLocale).filter(
    (d) => statSync(join(srcLocale, d)).isDirectory() && !d.startsWith('_') && d !== 'scripts',
  )
  for (const ch of chapters) {
    const dest = join(destLocale, ch)
    cpSync(join(srcLocale, ch), dest, { recursive: true })
    const readme = join(dest, 'README.md')
    if (existsSync(readme)) renameSync(readme, join(dest, 'index.md'))
  }
  return chapters.length
}

const en = syncLocale('en')
const zh = syncLocale('zh')

// T25：篇尾「相关阅读」——按章内阅读序取邻居 3 篇（构建产物内追加，源树不受影响，重跑天然幂等）
import { readFileSync, writeFileSync } from 'node:fs'

function docNo(text) {
  const m = text.match(/^#\s*(\d+)\s*·/m)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

function docTitle(text) {
  const fm = text.match(/^title:\s*"?([^"\n]+)"?\s*$/m)
  if (fm) return fm[1].trim()
  const h1 = text.match(/^#\s*.+?·\s*(.+)$/m)
  return h1 ? h1[1].trim() : ''
}

function appendRelated(localeDir, sectionTitle) {
  const base = sub === 'en' ? DEST : join(DEST, 'zh')
  const root = join(base, localeDir)
  if (!existsSync(root)) return
  for (const ch of readdirSync(root)) {
    const dir = join(root, ch)
    if (!statSync(dir).isDirectory() || ch.startsWith('_')) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'index.md')
    const docs = files
      .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }))
      .map((d) => ({ ...d, no: docNo(d.text), title: docTitle(d.text) }))
      .sort((a, b) => a.no - b.no)
    if (docs.length < 2) continue
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i]
      if (!d.title) continue
      const picks = [docs[(i + 1) % docs.length], docs[(i + 2) % docs.length], docs[(i - 1 + docs.length) % docs.length]]
        .filter((p, idx, arr) => p.file !== d.file && arr.findIndex((x) => x.file === p.file) === idx)
        .slice(0, 3)
      const lines = picks.map((p) => `- [${p.title}](./${p.file.replace(/\.md$/, '.md')})`)
      d.text = d.text.replace(/\s*$/, '') + `\n\n## ${sectionTitle}\n\n` + lines.join('\n') + '\n'
      writeFileSync(join(dir, d.file), d.text)
    }
  }
}

let sub = 'zh'
appendRelated('.', '相关阅读')
sub = 'en'
appendRelated('.', 'Further Reading')

console.log(`[docs] 已同步 en/${en} 章 + zh/${zh} 章 -> ${DEST}（含相关阅读）`)
