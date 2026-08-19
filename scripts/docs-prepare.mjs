#!/usr/bin/env node
/**
 * 文档站准备：把 docs/knowledge 交易知识库（唯一数据源）的 27 个篇章目录同步到
 * docs-site/docs/（VitePress srcDir 根，路由 /01-入门基础/ 等；.gitignore 忽略拷贝，避免重复入库）。
 * - 篇章 README.md 在拷贝中改名为 index.md → 静态托管下 /01-入门基础/ 直接命中 index.html；
 * - 知识库根 README.md（全库索引）由 docs-site/docs/index.md 落地页承接其快速导航/路线图内容。
 * docs:dev / docs:build 都会先执行本脚本，保证拷贝始终最新。
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

// 清理旧拷贝（篇章目录 + 早期版本的 knowledge/ 挂载点），避免残留污染构建
for (const entry of readdirSync(DEST)) {
  if (/^\d{2}-/.test(entry) || entry === 'knowledge') {
    rmSync(join(DEST, entry), { recursive: true, force: true })
  }
}

// 仅同步篇章目录（01-… ~ 27-…），跳过根 README.md 与 scripts/
const chapters = readdirSync(SRC)
  .filter((d) => /^\d{2}-/.test(d) && statSync(join(SRC, d)).isDirectory())
  .sort()

let copied = 0
for (const ch of chapters) {
  const dest = join(DEST, ch)
  cpSync(join(SRC, ch), dest, { recursive: true })
  // 篇章 README.md → index.md：保证 /章节/ 路由在任意静态托管可直接命中
  const readme = join(dest, 'README.md')
  if (existsSync(readme)) renameSync(readme, join(dest, 'index.md'))
  copied++
}
console.log(`[docs] 已同步 ${copied} 个篇章 -> ${DEST}`)
