import { describe, expect, it } from 'vitest'
import { debugViewWritesEnabled } from '../debugViewWrites'

describe('debugViewWritesEnabled（#222 诊断门控）', () => {
  it('URL 带 ?debugViewWrites 即开（不要求值）', () => {
    expect(debugViewWritesEnabled('?debugViewWrites&perf=1500')).toBe(true)
    expect(debugViewWritesEnabled('?perf=1500&debugViewWrites=1')).toBe(true)
  })

  it('不带 flag 或空 search 关闭；其它参数不误开', () => {
    expect(debugViewWritesEnabled('?perf=1500')).toBe(false)
    expect(debugViewWritesEnabled('')).toBe(false)
    expect(debugViewWritesEnabled('?debugviewwrites')).toBe(false) // 大小写敏感
  })
})
