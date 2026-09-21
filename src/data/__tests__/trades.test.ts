import { describe, expect, it } from 'vitest'
import {
  TAPE_BIG_STEPS,
  TAPE_CAP,
  TAPE_FILTER_DEFAULT,
  avgTradeQty,
  filterTape,
  fmtTradeClock,
  mergeTrades,
  parseTrades,
  type TradePrint,
} from '../trades'

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

describe('avgTradeQty / filterTape', () => {
  const prints = [
    print(1, { qty: 1, buy: true }),
    print(2, { qty: 2, buy: false }),
    print(3, { qty: 11, buy: true }),
  ]

  it('窗口均值：空表为 0，否则为数量算术平均', () => {
    expect(avgTradeQty([])).toBe(0)
    expect(avgTradeQty(prints)).toBeCloseTo(14 / 3, 10)
  })

  it('方向筛选：all 全放行，buy/sell 只留对应主动方向', () => {
    expect(filterTape(prints, { side: 'all', bigMultiple: 0 })).toHaveLength(3)
    expect(filterTape(prints, { side: 'buy', bigMultiple: 0 }).map((t) => t.id)).toEqual([1, 3])
    expect(filterTape(prints, { side: 'sell', bigMultiple: 0 }).map((t) => t.id)).toEqual([2])
  })

  it('大单筛选：数量 ≥ 均值 × 倍数，并与方向叠加', () => {
    // 均值 4.67，×2 → 阈值 9.33，只有 id 3 通过
    expect(filterTape(prints, { side: 'all', bigMultiple: 2 }).map((t) => t.id)).toEqual([3])
    expect(filterTape(prints, { side: 'sell', bigMultiple: 2 })).toEqual([])
  })

  it('无成交时大单档不放行任何成交；默认筛选档位常量有效', () => {
    expect(filterTape([], { side: 'all', bigMultiple: 5 })).toEqual([])
    expect(TAPE_FILTER_DEFAULT).toEqual({ side: 'all', bigMultiple: 0 })
    expect(TAPE_BIG_STEPS[0]).toBe(0)
  })
})

describe('fmtTradeClock', () => {  it('本地时区 HH:MM:SS 补零', () => {
    expect(fmtTradeClock(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('03:04:05')
    expect(fmtTradeClock(new Date(2026, 10, 30, 23, 59, 58).getTime())).toBe('23:59:58')
  })
})
