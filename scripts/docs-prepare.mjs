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
console.log(`[docs] 已同步 en/${en} 章 + zh/${zh} 章 -> ${DEST}`)
