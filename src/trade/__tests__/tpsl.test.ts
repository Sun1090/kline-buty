import { describe, expect, it } from 'vitest'
import { planTrailMoves, planTpSlExits, type TrailMove } from '../tpsl'
import { EMPTY_POSITIONS, type Positions } from '../positions'
import type { Position } from '../../position/pnl'

const pos = (over: Partial<Position> = {}): Position => ({
  entry: 100,
  quantity: 1,
  direction: 'long',
  takeProfit: 120,
  stopLoss: 90,
  ...over,
})

const slots = (long: Position | null = null, short: Position | null = null): Positions => ({ long, short })

const priceMap = (map: Record<string, number>) => (sym: string) => map[sym] ?? null

/** source 是持仓原对象引用，比对结构时剥离（toEqual 忽略 undefined 字段） */
const stripSource = (exits: ReturnType<typeof planTpSlExits>) => exits.map((e) => ({ ...e, source: undefined }))

/** 模拟 hook 的写回：把 planTrailMoves 的推进结果落到持仓上（换新对象） */
const applyMoves = (positions: Record<string, Positions>, moves: TrailMove[]): Record<string, Positions> => {
  const next = { ...positions }
  for (const m of moves) {
    const slots = next[m.symbol] ?? EMPTY_POSITIONS
    next[m.symbol] = { ...slots, [m.slot]: { ...slots[m.slot]!, stopLoss: m.stop } }
  }
  return next
}

describe('planTpSlExits 跨品种止盈止损判定', () => {
  it('多头触止盈 / 触止损各产出一条', () => {
    const positions = { BTCUSDT: slots(pos()) }
    const exits = planTpSlExits(positions, priceMap({ BTCUSDT: 120 }))
    expect(stripSource(exits)).toEqual([
      { symbol: 'BTCUSDT', slot: 'long', reason: 'takeProfit', price: 120, entry: 100, qty: 1, direction: 'long' },
    ])
    // source 指向持仓原对象：调用方据此与显式平仓簿记共享去重
    expect(exits[0].source).toBe(positions.BTCUSDT.long)
    expect(planTpSlExits(positions, priceMap({ BTCUSDT: 90 })).map((e) => e.reason)).toEqual(['stopLoss'])
  })

  it('空头方向相反：价跌至止盈价触发、价涨至止损价触发', () => {
    const positions = { ETHUSDT: slots(null, pos({ direction: 'short', takeProfit: 80, stopLoss: 110 })) }
    expect(planTpSlExits(positions, priceMap({ ETHUSDT: 120 })).map((e) => e.reason)).toEqual(['stopLoss'])
    expect(stripSource(planTpSlExits(positions, priceMap({ ETHUSDT: 80 })))).toEqual([
      { symbol: 'ETHUSDT', slot: 'short', reason: 'takeProfit', price: 80, entry: 100, qty: 1, direction: 'short' },
    ])
  })

  it('价在区间内、无止盈止损、无持仓均不产出', () => {
    expect(planTpSlExits({ BTCUSDT: slots(pos()) }, priceMap({ BTCUSDT: 105 }))).toEqual([])
    expect(planTpSlExits({ BTCUSDT: slots(pos({ takeProfit: undefined, stopLoss: undefined })) }, priceMap({ BTCUSDT: 999 }))).toEqual([])
    expect(planTpSlExits({ BTCUSDT: EMPTY_POSITIONS }, priceMap({ BTCUSDT: 999 }))).toEqual([])
    expect(planTpSlExits({}, priceMap({ BTCUSDT: 999 }))).toEqual([])
  })

  it('价源缺失或非法（null / 0 / NaN）时跳过该品种', () => {
    const positions = { BTCUSDT: slots(pos()), ETHUSDT: slots(pos()) }
    expect(planTpSlExits(positions, priceMap({ BTCUSDT: 130 }))).toHaveLength(1)
    expect(planTpSlExits(positions, priceMap({ BTCUSDT: 0, ETHUSDT: NaN }))).toEqual([])
  })

  it('双向持仓同时命中 → 两条；多品种按字典序稳定输出', () => {
    const positions = {
      ETHUSDT: slots(pos()),
      BTCUSDT: slots(pos({ takeProfit: 150 }), pos({ direction: 'short', takeProfit: 50 })),
    }
    const exits = planTpSlExits(positions, priceMap({ BTCUSDT: 150, ETHUSDT: 120 }))
    expect(exits.map((e) => `${e.symbol}:${e.slot}`)).toEqual(['BTCUSDT:long', 'BTCUSDT:short', 'ETHUSDT:long'])
  })

  it('平仓价即触发时的最新价，数量/开仓价沿用持仓', () => {
    const positions = { BTCUSDT: slots(pos({ entry: 80, quantity: 2.5, takeProfit: 95, stopLoss: 70 })) }
    const [exit] = planTpSlExits(positions, priceMap({ BTCUSDT: 96 }))
    expect(exit).toMatchObject({ price: 96, entry: 80, qty: 2.5, reason: 'takeProfit' })
  })
})

describe('移动止损与平仓判定：写回后回落才平仓', () => {
  it('价格上行时只推进止损，不会因 trail 立即平仓', () => {
    const positions = { BTCUSDT: slots(pos({ takeProfit: 200, stopLoss: 90, trailPct: 2 })) }
    expect(planTpSlExits(positions, priceMap({ BTCUSDT: 150 }))).toEqual([])
    expect(planTrailMoves(positions, priceMap({ BTCUSDT: 150 }))).toHaveLength(1)
  })

  it('写回推进了的止损后，价格回落到该线即按 stopLoss 结算', () => {
    const before = { BTCUSDT: slots(pos({ takeProfit: 200, stopLoss: 90, trailPct: 2 })) }
    const ratcheted = applyMoves(before, planTrailMoves(before, priceMap({ BTCUSDT: 150 })))
    expect(ratcheted.BTCUSDT.long?.stopLoss).toBeCloseTo(147, 10)
    // 价格回落到推进后的止损线：判定只看已存止损（无需再算 trail）
    expect(stripSource(planTpSlExits(ratcheted, priceMap({ BTCUSDT: 146 })))).toEqual([
      { symbol: 'BTCUSDT', slot: 'long', reason: 'stopLoss', price: 146, entry: 100, qty: 1, direction: 'long' },
    ])
    // 若没写过回，146 距原始止损 90 很远 → 不平仓
    expect(planTpSlExits(before, priceMap({ BTCUSDT: 146 }))).toEqual([])
  })

  it('空头镜像：反弹到写回的止损线即平仓', () => {
    const before = { ETHUSDT: slots(null, pos({ direction: 'short', takeProfit: 40, stopLoss: 110, trailPct: 5 })) }
    const ratcheted = applyMoves(before, planTrailMoves(before, priceMap({ ETHUSDT: 60 })))
    expect(ratcheted.ETHUSDT.short?.stopLoss).toBeCloseTo(63, 10)
    expect(planTpSlExits(ratcheted, priceMap({ ETHUSDT: 64 })).map((e) => e.reason)).toEqual(['stopLoss'])
    expect(planTpSlExits(ratcheted, priceMap({ ETHUSDT: 62 }))).toEqual([])
  })
})

describe('planTrailMoves 止损线写回计划', () => {
  it('推进一步即产出一条；价格回落不回撤', () => {
    const positions = { BTCUSDT: slots(pos({ takeProfit: 200, stopLoss: 90, trailPct: 2 })) }
    const moves = planTrailMoves(positions, priceMap({ BTCUSDT: 150 }))
    expect(moves).toHaveLength(1)
    expect(moves[0].symbol).toBe('BTCUSDT')
    expect(moves[0].slot).toBe('long')
    expect(moves[0].stop).toBeCloseTo(147, 10)
    // 已写回到 147 后价格回落到 130：止损停在 147，不再产出
    expect(planTrailMoves({ BTCUSDT: slots(pos({ takeProfit: 200, stopLoss: 147, trailPct: 2 })) }, priceMap({ BTCUSDT: 130 }))).toEqual([])
  })

  it('未设 trail、无持仓、或价源非法时不产出', () => {
    expect(planTrailMoves({ BTCUSDT: slots(pos({ takeProfit: 200 })) }, priceMap({ BTCUSDT: 150 }))).toEqual([])
    expect(planTrailMoves({ BTCUSDT: EMPTY_POSITIONS }, priceMap({ BTCUSDT: 150 }))).toEqual([])
    expect(planTrailMoves({ BTCUSDT: slots(pos({ trailPct: 2 })) }, priceMap({ BTCUSDT: null as unknown as number }))).toEqual([])
  })

  it('双向持仓各自推进，多品种按字典序', () => {
    const positions = {
      ETHUSDT: slots(pos({ takeProfit: 200, stopLoss: 90, trailPct: 2 })),
      BTCUSDT: slots(
        pos({ takeProfit: 200, stopLoss: 90, trailPct: 2 }),
        pos({ direction: 'short', takeProfit: 40, stopLoss: 200, trailPct: 5 }),
      ),
    }
    const moves = planTrailMoves(positions, priceMap({ BTCUSDT: 150, ETHUSDT: 150 }))
    expect(moves.map((m) => `${m.symbol}:${m.slot}`)).toEqual(['BTCUSDT:long', 'BTCUSDT:short', 'ETHUSDT:long'])
  })
})
