import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * CI E2E 清单的账本：e2e/ci-specs.json 是唯一来源（npm run e2e:ci 读它）。
 * 这条测试守的是「新增了规格却谁也没注意到它从没在 CI 跑过」——
 * 曾经 ci.yml 手抄一份文件名，新规格漏登记就静默不跑（v0.5.24 的 limit-orders 一族即如此）。
 */
const ROOT = process.cwd()
const ledger = JSON.parse(readFileSync(join(ROOT, 'e2e/ci-specs.json'), 'utf-8')) as {
  ci: string[]
  localOnly: Record<string, string>
}
const specsOnDisk = readdirSync(join(ROOT, 'e2e'))
  .filter((f) => f.endsWith('.spec.ts'))
  .map((f) => `e2e/${f}`)
  .sort()

describe('e2e/ci-specs.json（CI E2E 清单单一来源）', () => {
  it('磁盘上每个规格都已登记：要么进 CI，要么写明为何只本地跑', () => {
    const listed = [...ledger.ci, ...Object.keys(ledger.localOnly)].sort()
    expect(listed).toEqual(specsOnDisk)
  })

  it('两份清单不重叠，且 ci 数组无重复', () => {
    const dup = ledger.ci.filter((s) => ledger.localOnly[s] !== undefined)
    expect(dup).toEqual([])
    expect(new Set(ledger.ci).size).toBe(ledger.ci.length)
  })

  it('清单里的文件都真实存在（改名/删除后要同步账本）', () => {
    const missing = [...ledger.ci, ...Object.keys(ledger.localOnly)].filter((s) => !existsSync(join(ROOT, s)))
    expect(missing).toEqual([])
  })

  it('localOnly 每条都带理由（否则等于把静默不跑改成了静默不跑）', () => {
    const thin = Object.entries(ledger.localOnly).filter(([, why]) => String(why).trim().length < 12)
    expect(thin.map(([f]) => f)).toEqual([])
  })

  it('ci.yml 不再自己抄写规格名（避免第二份清单漂移）', () => {
    const yml = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8')
    expect(yml).toContain('npm run e2e:ci')
    expect(yml).not.toMatch(/playwright test[^\n]*e2e\/[\w-]+\.spec\.ts/)
  })
})
