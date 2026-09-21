import { describe, expect, it } from 'vitest'
import { planTpSlExits } from '../tpsl'
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
