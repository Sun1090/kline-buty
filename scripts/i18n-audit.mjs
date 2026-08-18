#!/usr/bin/env node
/**
 * i18n 深度巡检：静态扫描 src 下 TS/TSX 源码中的硬编码中文 UI 文案。
 * - 跳过 i18n 字典（messages.ts）与测试目录/文件
 * - 跳过注释与模板字符串
 * - 白名单：语言自名（中文/日本語/한국어）与专有名词（与 parity.test.ts 一致）
 * 发现硬编码中文 → 打印并退出码 1（CI 可接入）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const EXT = new Set(['.ts', '.tsx'])
const SKIP_FILE = new Set(['messages.ts'])
const ALLOW = ['XABCD', 'OKX', '币安', 'K 线', 'TradingView', 'PWA', 'A股', 'BTC', 'ETH', 'WebSocket']
const LANG_SELF_NAMES = new Set(['中文', '日本語', '한국어'])

/** 去注释与模板字符串：简单状态机，逐字符剥离 // 与 /* *\/ 与 `...`（防误报注释/模板内中文） */
function stripCommentsAndTemplates(src) {
  let out = ''
  let i = 0
  const n = src.length
  let inLine = false
  let inBlock = false
  let inTemplate = false
  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    if (inLine) {
      if (c === '\n') { inLine = false; out += c }
      i++
      continue
    }
    if (inBlock) {
      if (c === '*' && d === '/') { inBlock = false; i += 2 }
      else i++
      continue
    }
    if (inTemplate) {
      if (c === '\\') { i += 2; continue }
      if (c === '`') { inTemplate = false; i++; continue }
      out += c
      i++
      continue
    }
    if (c === '/' && d === '/') { inLine = true; i += 2; continue }
    if (c === '/' && d === '*') { inBlock = true; i += 2; continue }
    if (c === '`') { inTemplate = true; i++; continue }
    out += c
    i++
  }
  return out
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(full, acc)
    } else if (EXT.has(extname(full)) && !SKIP_FILE.has(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      acc.push(full)
    }
  }
  return acc
}

const STR_RE = /(['"])((?:\\.|(?!\1).)*)\1/g
const TPL_RE = /`((?:\\.|[^`\\])*)`/g
const EXPR_RE = /\$\{[^}]*\}/g

/** 模板字符串的字面部分：剔除 ${...} 表达式，仅对静态文本检查中文 */
function templateLiteralParts(tpl) {
  return tpl.split(EXPR_RE)
}

function isHardcodedZh(val) {
  if (!/[\u4e00-\u9fff]/.test(val)) return false
  if (LANG_SELF_NAMES.has(val)) return false
  if (ALLOW.some((w) => val.includes(w))) return false
  return true
}

const findings = []
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf-8')
  const clean = stripCommentsAndTemplates(text)
  let m
  STR_RE.lastIndex = 0
  while ((m = STR_RE.exec(clean)) !== null) {
    const val = m[2]
    if (isHardcodedZh(val)) {
      const lineNo = clean.slice(0, m.index).split('\n').length
      findings.push(`${relative(ROOT, file)}:${lineNo}  ${JSON.stringify(val)}`)
    }
  }
  TPL_RE.lastIndex = 0
  while ((m = TPL_RE.exec(clean)) !== null) {
    for (const part of templateLiteralParts(m[1])) {
      if (isHardcodedZh(part)) {
        const lineNo = clean.slice(0, m.index).split('\n').length
        findings.push(`${relative(ROOT, file)}:${lineNo}  template ${JSON.stringify(part)}`)
      }
    }
  }
}

if (findings.length) {
  console.error(`i18n 巡检发现 ${findings.length} 处硬编码中文：`)
  for (const f of findings) console.error('  ' + f)
  process.exit(1)
}
console.log('i18n 巡检通过：src 下无硬编码中文 UI 文案（语言自名/专有名词白名单除外）')
