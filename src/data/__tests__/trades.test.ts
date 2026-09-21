import { describe, expect, it } from 'vitest'
import { TAPE_CAP, fmtTradeClock, mergeTrades, parseTrades, type TradePrint } from '../trades'

const print = (id: number, over: Partial<TradePrint> = {}): TradePrint => ({
  id,
  price: 100 + id,
  qty: 1,
  time: 1_700_000_000_000 + id * 1000,
  buy: true,
  ...over,
})

describe('parseTrades', () => {
  it('现货/永续同构字段映射：isBuyerMaker=false 记为主动买', () => {
    const out = parseTrades([
      { id: 1, price: '100.5', qty: '0.2', time: 1_700_000_000_000, isBuyerMaker: false },
      { id: 2, price: '100.6', qty: '0.3', time: 1_700_000_000_001, isBuyerMaker: true },
    ])
    expect(out).toEqual([
      { id: 1, price: 100.5, qty: 0.2, time: 1_700_000_000_000, buy: true },
      { id: 2, price: 100.6, qty: 0.3, time: 1_700_000_000_001, buy: false },
    ])
  })

  it('isBuyerMaker 缺失按主动买处理，字段非法的条目丢弃', () => {
    const out = parseTrades([
      { id: 7, price: '1', qty: '2', time: 3 },
      { id: 'x', price: '1', qty: '1', time: 1 },
      { id: 8, price: 'NaN', qty: '1', time: 1 },
      { id: 9, price: '1', qty: '1' },
    ])
    expect(out).toEqual([{ id: 7, price: 1, qty: 2, time: 3, buy: true }])
  })
})

describe('mergeTrades', () => {
  it('相邻两轮重叠页按 id 去重并保持升序', () => {
    const prev = mergeTrades([], [print(1), print(2), print(3)])
    const next = mergeTrades(prev, [print(3), print(4), print(5)])
    expect(next.map((t) => t.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('时间同刻多笔按 id 稳定排序', () => {
    const out = mergeTrades([], [print(3, { time: 1000 }), print(1, { time: 1000 }), print(2, { time: 1000 })])
    expect(out.map((t) => t.id)).toEqual([1, 2, 3])
  })

  it('无新成交 / 空页时返回原引用，避免定时器造成的空重渲染', () => {
    const prev = mergeTrades([], [print(1), print(2)])
    expect(mergeTrades(prev, [])).toBe(prev)
    expect(mergeTrades(prev, [print(1), print(2)])).toBe(prev)
  })

  it('超过上限时丢弃最旧成交', () => {
    const base = Array.from({ length: TAPE_CAP }, (_, i) => print(i + 1))
    const merged = mergeTrades(base, [print(TAPE_CAP + 1)])
    expect(merged).toHaveLength(TAPE_CAP)
    expect(merged[0].id).toBe(2)
    expect(merged[merged.length - 1].id).toBe(TAPE_CAP + 1)
  })
})

describe('fmtTradeClock', () => {
  it('本地时区 HH:MM:SS 补零', () => {
    expect(fmtTradeClock(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('03:04:05')
    expect(fmtTradeClock(new Date(2026, 10, 30, 23, 59, 58).getTime())).toBe('23:59:58')
  })
})
