import { describe, expect, it } from 'vitest'
import { HARD_LIMIT_KB, checkStorageHealth, measureStorage, storageAdvisory, utf8Bytes, WARN_THRESHOLD_KB } from '../storageMonitor'

const mem = (entries: Record<string, string>) => {
  const keys = Object.keys(entries)
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => entries[k] ?? null,
  }
}

describe('storageMonitor（N11 localStorage 容量监控）', () => {
  it('utf8Bytes：ASCII 1 字节/中文 3 字节/emoji 4 字节', () => {
    expect(utf8Bytes('abc')).toBe(3)
    expect(utf8Bytes('中')).toBe(3)
    expect(utf8Bytes('😀')).toBe(4) // 代理对
    expect(utf8Bytes('')).toBe(0)
  })

  it('measureStorage：统计字节与条目数', () => {
    const s = mem({ a: 'x', b: '中文' })
    const r = measureStorage(s)
    expect(r.keys).toBe(2)
    expect(r.bytes).toBe(utf8Bytes('a') + utf8Bytes('x') + utf8Bytes('b') + utf8Bytes('中文'))
  })

  it('checkStorageHealth：小数据无警告', () => {
    const h = checkStorageHealth(mem({ a: '1' }), WARN_THRESHOLD_KB)
    expect(h.warn).toBe(false)
    expect(h.nearLimit).toBe(false)
    expect(h.keys).toBe(1)
  })

  it('checkStorageHealth：超阈值警告', () => {
    // 构造超过 warnKb 的数据
    const big = 'x'.repeat(WARN_THRESHOLD_KB * 1024)
    const h = checkStorageHealth(mem({ big }), WARN_THRESHOLD_KB)
    expect(h.warn).toBe(true)
  })

  it('storageAdvisory：超阈值返回用量文案', () => {
    const big = 'x'.repeat(WARN_THRESHOLD_KB * 1024)
    const a = storageAdvisory(mem({ big }))
    expect(a.warn).toBe(true)
    expect(a.message).toMatch(/(KB|MB)/)
  })

  it('storageAdvisory：正常时不提示', () => {
    const a = storageAdvisory(mem({ a: '1' }))
    expect(a.warn).toBe(false)
  })

  it('HARD_LIMIT_KB 常量为 10000', () => {
    expect(HARD_LIMIT_KB).toBe(10_000)
  })
})
