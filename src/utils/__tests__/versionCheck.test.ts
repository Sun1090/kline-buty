import { describe, expect, it } from 'vitest'
import { VERSION_KEY, checkVersionUpdate, isNewerVersion, readLastVersion, readMetaVersion } from '../versionCheck'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v)
    },
  }
}

describe('versionCheck（P4 更新提示）', () => {
  it('readMetaVersion：读 meta app-version', () => {
    const doc = { querySelector: () => ({ getAttribute: () => '1.2.3' }) }
    expect(readMetaVersion(doc as never)).toBe('1.2.3')
    const docEmpty = { querySelector: () => null }
    expect(readMetaVersion(docEmpty as never)).toBe('')
  })

  it('无 meta 版本 → 不提示', () => {
    const storage = mem()
    expect(checkVersionUpdate('', storage).hasUpdate).toBe(false)
  })

  it('首次运行 → 记录版本不提示', () => {
    const storage = mem()
    const r = checkVersionUpdate('1.0.0', storage)
    expect(r.hasUpdate).toBe(false)
    expect(readLastVersion(storage)).toBe('1.0.0')
  })

  it('同版本再次运行 → 不提示', () => {
    const storage = mem()
    checkVersionUpdate('1.0.0', storage)
    const r = checkVersionUpdate('1.0.0', storage)
    expect(r.hasUpdate).toBe(false)
  })

  it('版本升级 → 提示并更新记录', () => {
    const storage = mem()
    checkVersionUpdate('1.0.0', storage)
    const r = checkVersionUpdate('1.1.0', storage)
    expect(r.hasUpdate).toBe(true)
    expect(r.version).toBe('1.1.0')
    expect(readLastVersion(storage)).toBe('1.1.0')
  })

  it('isNewerVersion：语义化版本比较', () => {
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true)
    expect(isNewerVersion('1.0.9', '1.1.0')).toBe(false)
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
  })

  it('VERSION_KEY 固定', () => {
    expect(VERSION_KEY).toBe('kline-buty:lastVersion')
  })
})
