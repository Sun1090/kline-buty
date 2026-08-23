#!/usr/bin/env node
/**
 * T169: 全库 .md#锚点 目标存在性校验。
 * 对每个 [text](target.md#anchor) 链接：解析目标文件的标题，用与 VitePress 相同的
 * slugify 规则生成 id，验证 anchor 命中。覆盖 en/zh 两树。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'

const ROOT = 'docs/knowledge'
function slugify(str) {
  return str
    .replace(/[「」『』【】]/g, '')
    .replace(/[·]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9一-鿿㐀-䶿_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
const files = []
;(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.md')) files.push(p)
  }
})(ROOT)

// 标题 id 缓存（含 README.md→index 的文件名）
const headingCache = new Map()
function headingsOf(file) {
  if (headingCache.has(file)) return headingCache.get(file)
  const set = new Set()
  try {
    let fence = false
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue }
      if (fence) continue
      const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
      if (m) set.add(slugify(m[2].replace(/[#*`]/g, '')))
    }
  } catch { /* 文件不存在时返回空集 */ }
  headingCache.set(file, set)
  return set
}

let checked = 0
let broken = 0
for (const f of files) {
  let fence = false
  for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue }
    if (fence) continue
    for (const m of line.matchAll(/\]\(([^)#\s]+\.md)#([^)\s]+)\)/g)) {
      const [, target, anchor] = m
      if (/^https?:/.test(target)) continue
      const resolved = join(dirname(f), target)
      checked++
      // VitePress 对重复标题会加 -1/-2 后缀；先精确匹配，再尝试去后缀匹配
      const hs = headingsOf(resolved)
      const baseAnchor = anchor.replace(/-\d+$/, '')
      if (!hs.has(anchor) && !hs.has(baseAnchor)) {
        broken++
        console.log(`BROKEN ${relative(ROOT, f)}:${i + 1} -> ${target}#${anchor}`)
        console.log(`   (${[...hs].slice(0, 4).join(' | ')}...)`)
      }
    }
  }
}
console.log(`\nanchor-links checked=${checked} broken=${broken}`)
process.exit(broken ? 1 : 0)
