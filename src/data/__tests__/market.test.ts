import { describe, expect, it } from 'vitest'
import { MarketStore } from '../market'
import type { Candle } from '../../chart/types'

function c(time: number, close = time): Candle {
  return { time, open: close, high: close, low: close, close, volume: 1, isClosed: true }
}

describe('MarketStore', () => {
  it('追加保持有序，最新在尾部', () => {
    const s = new MarketStore()
    s.upsert(c(1))
    s.upsert(c(2))
    s.upsert(c(3))
    expect(s.all().map((x) => x.time)).toEqual([1, 2, 3])
  })

  it('同时间戳重复推送 → 替换不重复', () => {
    const s = new MarketStore()
    s.upsert(c(1, 100))
    s.upsert(c(1, 105))
    s.upsert(c(2))
    expect(s.all()).toHaveLength(2)
    expect(s.all()[0].close).toBe(105)
  })

  it('乱序插入（补数场景）→ 按时间落位', () => {
    const s = new MarketStore()
    s.upsert(c(5))
    s.upsert(c(6))
    s.upsert(c(2))
    s.upsert(c(3))
    s.upsert(c(6, 999))
    expect(s.all().map((x) => x.time)).toEqual([2, 3, 5, 6])
    expect(s.all().map((x) => x.close)).toEqual([2, 3, 5, 999])
  })

  it('分页合并：历史页 + 实时流幂等', () => {
    const s = new MarketStore()
    // 第一页：time 100..200
    const page1 = Array.from({ length: 101 }, (_, i) => c(100 + i))
    s.upsertAll(page1)
    // 补数页（time 50..100），与已有重叠
    const page2 = Array.from({ length: 51 }, (_, i) => c(50 + i))
    s.upsertAll(page2)
    // 实时追加
    s.upsert(c(201))
    const times = s.all().map((x) => x.time)
    expect(times.length).toBe(152)
    expect(times[0]).toBe(50)
    expect(times[times.length - 1]).toBe(201)
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])
  })

  it('reset 清空', () => {
    const s = new MarketStore()
    s.upsert(c(1))
    s.reset()
    expect(s.all()).toHaveLength(0)
  })
})
