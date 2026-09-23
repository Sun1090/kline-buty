import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * data-testid 用量账本：生产代码里每个可静态解析出的 testid 都必须被某个测试引用。
 *
 * 守的是「加了钩子却从来没有用例」——这类钩子只在 DOM 里躺着（生产包也带着），
 * 却会让人误以为那个控件被覆盖了。曾经一次性清出 32 个（多为 flex 容器包装层）。
 * 变红的处理方式是二选一：给它写真实断言，或者删掉钩子；不要往测试里塞一句「存在」。
 *
 * 匹配口径刻意留了假阴性、不放假阳性：
 * - 模板串（`qo-qty-${n}`）按其静态前缀（≥3 字符）判活，前缀在测试里出现过即算活。
 * - `data-testid={testId}` 这种由调用方传值的，扫不到字面量就跳过；调用方写出的
 *   `testId="…"` / `testIdPrefix="…"` 字面量会作为声明被单独检查。
 */
const ROOT = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

const prodFiles = walk('src').filter((f) => !f.includes('__tests__'))
const refFiles = [...walk('e2e'), ...walk('scripts'), ...walk('src').filter((f) => f.includes('__tests__')), '.github/workflows/ci.yml']
const refs = refFiles.map((f) => readFileSync(join(ROOT, f), 'utf-8'))

type Decl = { file: string; line: number; kind: 'static' | 'prefix'; value: string }

/** 从一行 JSX 里取出 testid 表达式的静态部分：字面量、或模板的静态前缀 */
function parse(expr: string): Decl['kind'] | null {
  const inner = expr.trim().replace(/^\{/, '').replace(/\}$/, '')
  const lit = inner.match(/^["'`]([^"'`]+)["'`]?$/)
  if (lit) return 'static'
  return null
}

const decls: Decl[] = []
for (const f of prodFiles) {
  const src = readFileSync(join(ROOT, f), 'utf-8')
  src.split('\n').forEach((line, i) => {
    // data-testid="x" / data-testid={`x-${y}`} / data-testid={'x'} / testId="x" / testIdPrefix="x"
    const m = line.match(/(data-testid|testId|testIdPrefix)=\{?((?:`[^`]*`)|(?:"[^"]*")|(?:'[^']*'))/)
    if (!m) return
    const [, attr, raw] = m
    // testIdPrefix 是前缀：子组件据此拼出 `${prefix}-color-${id}` / `${prefix}-search` 等
    const asPrefix = attr === 'testIdPrefix'
    const template = raw.startsWith('`')
    if (!template) {
      const value = raw.replace(/^["'`]|["'`]$/g, '')
      if (!value || /[\\{}]/.test(value)) return
      decls.push({ file: f, line: i + 1, kind: asPrefix ? 'prefix' : 'static', value })
      return
    }
    // 模板：取第一段静态前缀；含 ${} 在前缀之前则无法判定，跳过
    const prefix = raw.slice(1).split('${')[0]
    if (prefix.length >= 3) decls.push({ file: f, line: i + 1, kind: 'prefix', value: prefix })
    else if (!raw.includes('${') && parse(raw) === 'static') decls.push({ file: f, line: i + 1, kind: 'static', value: raw.slice(1, -1) })
  })
}

const dead = decls.filter((d) => {
  const quoted = `"${d.value}"`
  return !refs.some((t) => (d.kind === 'static' ? t.includes(quoted) || t.includes(`'${d.value}'`) : t.includes(d.value)))
})

describe('data-testid 账本（生产钩子必须被用例引用）', () => {
  it('扫到了声明（扫不到说明解析器坏了，这条测试就成了摆设）', () => {
    expect(decls.length).toBeGreaterThan(200)
  })

  it('没有零引用的生产 testid：要么写出断言，要么删掉钩子', () => {
    expect(dead.map((d) => `${d.file}:${d.line} ${d.kind === 'prefix' ? `${d.value}*` : d.value}`)).toEqual([])
  })
})
