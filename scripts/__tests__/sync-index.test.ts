import { describe, expect, it } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'docs/knowledge/scripts/sync-index.py')
const README = join(ROOT, 'docs/knowledge/README.md')
const ZH = join(ROOT, 'docs/knowledge/zh')

function countMdFiles(dir: string): number {
  let count = 0
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      count += countMdFiles(full)
    } else if (entry.endsWith('.md') && entry !== 'README.md') {
      count++
    }
  }
  return count
}

describe('sync-index.py', () => {
  it('脚本存在且可执行', () => {
    expect(existsSync(SCRIPT)).toBe(true)
    expect(() => execSync(`python3 ${SCRIPT}`, { cwd: ROOT })).not.toThrow()
  })

  it('README 索引篇数与 zh/ 实际文档数一致', () => {
    const content = readFileSync(README, 'utf-8')
    const m = content.match(/共\s*\*\*(\d+)\s*个篇章\s*\/\s*(\d+)\s*篇文档/)
    expect(m).not.toBeNull()
    const [, nCh, nDocs] = m!
    expect(Number(nCh)).toBeGreaterThan(0)
    // zh/ 下的 .md 文件数（排除 README.md）应与索引篇数一致
    const actual = countMdFiles(ZH)
    expect(Number(nDocs)).toBe(actual)
  })

  it('README 含目录与内容约定锚点（脚本据此切片重建）', () => {
    const content = readFileSync(README, 'utf-8')
    expect(content).toContain('## 目录')
    expect(content).toContain('## 内容约定')
    expect(content).toContain('## 知识库规模')
  })

  it('目录每行含文档链接 markdown 格式', () => {
    const content = readFileSync(README, 'utf-8')
    // 「## 目录」与「## 知识库规模」之间应有表格行 [xxx.md](zh/...)
    const catalog = content.split('## 目录')[1]?.split('## 知识库规模')[0] ?? ''
    const linkLines = catalog.match(/\[(.+\.md)\]\(zh\/[^)]+\)/g) ?? []
    expect(linkLines.length).toBeGreaterThan(100) // 已有 174 篇
    // 每个链接指向的文件应实际存在
    let missing = 0
    for (const link of linkLines) {
      const path = link.match(/\((zh\/[^)]+)\)/)![1]
      if (!existsSync(join(ROOT, 'docs/knowledge', path))) missing++
    }
    expect(missing).toBe(0)
  })

  it('重新运行幂等：索引不漂移', () => {
    const before = readFileSync(README, 'utf-8')
    execSync(`python3 ${SCRIPT}`, { cwd: ROOT })
    const after = readFileSync(README, 'utf-8')
    // 幂等：两次输出应一致（无未提交变更）
    expect(after).toBe(before)
  })
})
