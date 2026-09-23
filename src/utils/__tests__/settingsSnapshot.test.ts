import { describe, expect, it } from 'vitest'
import { applySettingsSnapshot, buildSettingsSnapshot, SNAPSHOT_VERSION } from '../settingsSnapshot'
import type { SettingsStorage } from '../settingsSnapshot'

class FakeStorage implements SettingsStorage {
  private map = new Map<string, string>()
  get length(): number {
    return this.map.size
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v)
  }
  entries(): Record<string, string> {
    return Object.fromEntries(this.map)
  }
}

/** 真实持久化形状：usePersistedState 写 JSON 编码值，versionCheck / i18n / 提醒渠道写裸串 */
const seeded = () => {
  const s = new FakeStorage()
  s.setItem('kline-buty:lastVersion', '0.5.29')
  s.setItem('kline-buty:lang', 'en')
  s.setItem('kline-buty:alertChannel', 'https://hooks.example.com/x')
  s.setItem('kline-buty:symbol', '"BTCUSDT"')
  s.setItem('kline-buty:paperBalance', '10000')
  s.setItem('kline-buty:favorites', '["BTCUSDT","SOLUSDT"]')
  s.setItem('kline-buty:indicatorParams', '{"maPeriods":[5,10,20]}')
  s.setItem('kline-cache:BTCUSDT:1m', '{"v":1,"candles":[]}')
  s.setItem('__kline_buty_probe__', '1')
  return s
}

describe('buildSettingsSnapshot（H7/H8 设置快照导出）', () => {
  it('裸串值不再让导出抛错，且逐字保留', () => {
    const text = buildSettingsSnapshot(seeded(), 1700000000000)
    const snap = JSON.parse(text) as { version: number; savedAt: number; settings: Record<string, string> }
    expect(snap.version).toBe(SNAPSHOT_VERSION)
    expect(snap.savedAt).toBe(1700000000000)
    expect(snap.settings['kline-buty:lastVersion']).toBe('0.5.29')
    expect(snap.settings['kline-buty:lang']).toBe('en')
    expect(snap.settings['kline-buty:indicatorParams']).toBe('{"maPeriods":[5,10,20]}')
  })

  it('只收 kline-buty: 命名空间（K 线缓存与存储探针不是设置）', () => {
    const snap = JSON.parse(buildSettingsSnapshot(seeded())) as { settings: Record<string, string> }
    expect(Object.keys(snap.settings).sort()).toEqual(
      [
        'kline-buty:alertChannel',
        'kline-buty:favorites',
        'kline-buty:indicatorParams',
        'kline-buty:lang',
        'kline-buty:lastVersion',
        'kline-buty:paperBalance',
        'kline-buty:symbol',
      ].sort(),
    )
  })

  it('损坏的持久化值（脏缓存/截断 JSON）不阻断导出', () => {
    const s = seeded()
    s.setItem('kline-buty:drawings', '{broken json')
    const snap = JSON.parse(buildSettingsSnapshot(s)) as { settings: Record<string, string> }
    expect(snap.settings['kline-buty:drawings']).toBe('{broken json')
  })
})

describe('applySettingsSnapshot（H7/H8 设置快照导入）', () => {
  it('导出 → 清空 → 导入：每个键逐字恢复（含带引号的 JSON 字符串值）', () => {
    const source = seeded()
    const text = buildSettingsSnapshot(source)
    const target = new FakeStorage()
    expect(applySettingsSnapshot(text, target)).toBe(true)
    expect(target.entries()).toEqual({
      'kline-buty:lastVersion': '0.5.29',
      'kline-buty:lang': 'en',
      'kline-buty:alertChannel': 'https://hooks.example.com/x',
      'kline-buty:symbol': '"BTCUSDT"',
      'kline-buty:paperBalance': '10000',
      'kline-buty:favorites': '["BTCUSDT","SOLUSDT"]',
      'kline-buty:indicatorParams': '{"maPeriods":[5,10,20]}',
    })
  })

  it('v1 旧快照（值是已解析结构）按旧编码写回', () => {
    const target = new FakeStorage()
    const text = JSON.stringify({
      version: 1,
      settings: { 'kline-buty:symbol': 'BTCUSDT', 'kline-buty:paperBalance': 10000, 'kline-buty:favorites': ['ETHUSDT'] },
    })
    expect(applySettingsSnapshot(text, target)).toBe(true)
    expect(target.entries()).toEqual({
      'kline-buty:symbol': '"BTCUSDT"',
      'kline-buty:paperBalance': '10000',
      'kline-buty:favorites': '["ETHUSDT"]',
    })
  })

  it('非 kline-buty: 前缀的键忽略', () => {
    const target = new FakeStorage()
    applySettingsSnapshot('{"version":2,"settings":{"kline-cache:BTCUSDT:1m":"x","kline-buty:lang":"ja"}}', target)
    expect(target.entries()).toEqual({ 'kline-buty:lang': 'ja' })
  })

  it.each([
    ['非 JSON 文本', 'not json at all'],
    ['JSON 但非对象', '"just a string"'],
    ['未知版本', '{"version":3,"settings":{"kline-buty:lang":"en"}}'],
    ['缺 settings', '{"version":2}'],
    ['settings 非对象', '{"version":2,"settings":"en"}'],
  ])('非法快照 → false 且不写任何键（%s）', (_label, text) => {
    const target = new FakeStorage()
    expect(applySettingsSnapshot(text, target)).toBe(false)
    expect(target.length).toBe(0)
  })
})
