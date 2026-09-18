import { describe, expect, it } from 'vitest'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import { dayKeyFor, groupTradesByDay, dailySummary, todayRealizedPnl, weekKeyFor, monthKeyFor, realizedPnlIn, realizedPnlWhere } from '../daily'

const t = (id: string, at: number, kind: 'open' | 'close' = 'open', pnl?: number): TradeRecord =>
  ({ id, at, symbol: 'BTCUSDT', side: 'buy', kind, price: 100, qty: 1, fee: 0.1, feeRate: 0.001, ...(pnl !== undefined ? { pnl } : {}) })

// UTC 日基准：2026-01-05（周一）00:00 UTC 毫秒时间戳
const D0 = 1_767_571_200_000
const HOUR = 3_600_000
const DAY = 86_400_000

describe('dayKeyFor', () => {
  it('UTC 日键格式 YYYY-MM-DD', () => {
    expect(dayKeyFor(D0)).toBe('2026-01-05')
    expect(dayKeyFor(D0 + 23 * HOUR)).toBe('2026-01-05')
    expect(dayKeyFor(D0 + 24 * HOUR)).toBe('2026-01-06')
  })
})

describe('groupTradesByDay', () => {
  it('空流水 → 空数组', () => {
    expect(groupTradesByDay([])).toEqual([])
  })
  it('按 UTC 日分组，新日在前的组序（输入顺序）', () => {
    const trades = [t('a', D0 + 26 * HOUR), t('b', D0), t('c', D0 + 25 * HOUR)]
    const groups = groupTradesByDay(trades)
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-01-06', '2026-01-05'])
    expect(groups[0].trades.map((x) => x.id)).toEqual(['a', 'c'])
    expect(groups[1].trades.map((x) => x.id)).toEqual(['b'])
  })
  it('同日内保持输入顺序', () => {
    const trades = [t('a', D0 + 2 * HOUR), t('b', D0), t('c', D0 + 1 * HOUR)]
    expect(groupTradesByDay(trades)[0].trades.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('dailySummary', () => {
  it('汇总笔数/已平仓数/净盈亏', () => {
    const day = {
      dayKey: '2026-01-05',
      trades: [
        t('o1', D0, 'open'),
        t('c1', D0 + HOUR, 'close', 12.5),
        t('c2', D0 + 2 * HOUR, 'close', -3.2),
      ],
    }
    expect(dailySummary(day)).toEqual({ count: 3, closed: 2, pnl: 9.3 })
  })
  it('无平仓 → pnl 0 / closed 0', () => {
    const day = { dayKey: '2026-01-05', trades: [t('o1', D0, 'open'), t('o2', D0 + HOUR, 'open')] }
    expect(dailySummary(day)).toEqual({ count: 2, closed: 0, pnl: 0 })
  })
})

describe('todayRealizedPnl', () => {
  it('汇总今日平仓 pnl（UTC 今日），忽略开仓与其他日', () => {
    const trades = [
      t('c1', D0 + HOUR, 'close', 12.5), // 今日 close
      t('o1', D0, 'open'),
      t('c2', D0 + 2 * HOUR, 'close', -3.2), // 今日 close
      t('cOld', D0 - 24 * HOUR, 'close', 99), // 昨日 close，应忽略
    ]
    expect(todayRealizedPnl(trades, D0)).toBe(9.3)
  })
  it('今日无平仓 → 0', () => {
    const trades = [t('o1', D0, 'open'), t('cOld', D0 - 24 * HOUR, 'close', 99)]
    expect(todayRealizedPnl(trades, D0)).toBe(0)
  })
  it('空流水 → 0', () => {
    expect(todayRealizedPnl([], D0)).toBe(0)
  })
})

describe('weekKeyFor / monthKeyFor', () => {
  it('周键从周一（1970-01-05）起算的 7 天桶：同周同键、跨周边界递增', () => {
    // D0 = 2026-01-05（周一）
    expect(weekKeyFor(D0)).toBe('W2922')
    expect(weekKeyFor(D0 + 6 * DAY)).toBe('W2922') // 周日仍属本周
    expect(weekKeyFor(D0 + 7 * DAY)).toBe('W2923') // 下周一
  })
  it('月键 YYYY-MM：跨月变化', () => {
    expect(monthKeyFor(D0)).toBe('2026-01')
    expect(monthKeyFor(D0 + 26 * DAY)).toBe('2026-01') // 2026-01-31 仍属 1 月
    expect(monthKeyFor(D0 + 27 * DAY)).toBe('2026-02') // 2026-02-01
    expect(monthKeyFor(D0 + 59 * DAY)).toBe('2026-03') // 2026-03-05
  })
})

describe('realizedPnlIn / realizedPnlWhere', () => {
  it('realizedPnlIn 按周键口径只汇总该周平仓', () => {
    const trades = [
      t('c1', D0 + HOUR, 'close', 10.5),
      t('c2', D0 + 7 * DAY, 'close', -4.2), // 下周，应排除
      t('o1', D0, 'open'),
    ]
    expect(realizedPnlIn(trades, weekKeyFor, weekKeyFor(D0))).toBe(10.5)
  })
  it('realizedPnlIn 按月键口径汇总（含跨月排除）', () => {
    const trades = [
      t('c1', D0, 'close', 3),
      t('c2', D0 + 27 * DAY, 'close', 7), // 2026-02-01，应排除
    ]
    expect(realizedPnlIn(trades, monthKeyFor, '2026-01')).toBe(3)
    expect(realizedPnlIn(trades, monthKeyFor, '2026-02')).toBe(7)
  })
  it('realizedPnlWhere 仅汇总 close 且匹配谓词、未带 pnl 的排除', () => {
    const trades = [
      t('c1', D0, 'close', 5),
      t('cNoPnl', D0, 'close'), // 无 pnl 字段
      t('o1', D0, 'open'),
    ]
    expect(realizedPnlWhere(trades, () => true)).toBe(5)
    expect(realizedPnlWhere(trades, (x) => x.id === 'cNoPnl')).toBe(0)
  })
})
