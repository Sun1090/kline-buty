import { describe, expect, it } from 'vitest'
import { calcWR, calcOBV, calcATR, calcCCI, calcPSY, calcDMI, calcTR, calcSTOCH, calcROC, calcMOM } from '../extras'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

const candles: Candle[] = [
  c(1, 10, 12, 9, 11, 100),
  c(2, 11, 13, 10, 12, 150),
  c(3, 12, 14, 11, 13, 200),
  c(4, 13, 15, 12, 14, 250),
  c(5, 14, 16, 13, 15, 300),
]

describe('calcWR', () => {
  it('收盘贴近最高 → WR 趋近 0', () => {
    const wr = calcWR(candles, 3)
    for (const p of wr) expect(p.value).toBeLessThan(25)
  })
  it('窗口长度 = n-1 起点', () => {
    expect(calcWR(candles, 3)).toHaveLength(candles.length - 2)
  })
  it('close 触及最高 → WR = 0', () => {
    const peak = [c(1, 10, 12, 9, 12, 1), c(2, 12, 14, 11, 14, 1), c(3, 14, 16, 13, 16, 1)]
    for (const p of calcWR(peak, 3)) expect(p.value).toBe(0)
  })
})

describe('calcOBV', () => {
  it('全程上涨 → OBV 累加', () => {
    const obv = calcOBV(candles)
    expect(obv[0].value).toBe(0)
    expect(obv[4].value).toBeCloseTo(100 + 150 + 200 + 250 + 300 - 100) // 第一根不计
  })
  it('下跌累计为负', () => {
    const down = [c(1, 10, 11, 9, 10, 100), c(2, 10, 10, 8, 9, 50)]
    const obv = calcOBV(down)
    expect(obv[1].value).toBe(-50)
  })
  it('n=1（默认）与 n>1 平滑：输出长度一致、平滑后为窗口均值', () => {
    // 构造 5 根持续上涨，OBV 原始值依次 0,150,350,600,900（成交量 100/150/200/250/300）
    const up = candles.map((x) => ({ ...x }))
    const raw = calcOBV(up, 1)
    expect(raw.map((p) => p.value)).toEqual([0, 150, 350, 600, 900])
    // n=3：SMA 窗口均值，前 2 根无值
    const sm = calcOBV(up, 3)
    expect(sm).toHaveLength(raw.length - 2)
    expect(sm[0].value).toBeCloseTo((0 + 150 + 350) / 3)
    expect(sm[1].value).toBeCloseTo((150 + 350 + 600) / 3)
    expect(sm[2].value).toBeCloseTo((350 + 600 + 900) / 3)
  })
})

describe('calcATR', () => {
  it('单根波动：ATR = TR', () => {
    const atr = calcATR(candles, 3)
    // 前 3 根 TR 平均：(3 + 3 + 3)/3 = 3
    expect(atr[0].value).toBe(3)
  })
  it('窗口起点正确', () => {
    expect(calcATR(candles, 3)).toHaveLength(candles.length - 2)
  })
})

describe('calcCCI', () => {
  it('等幅波动 CCI 收敛', () => {
    const cci = calcCCI(candles, 3)
    expect(cci).toHaveLength(candles.length - 2)
    expect(Number.isFinite(cci[cci.length - 1].value)).toBe(true)
  })
})

describe('calcPSY', () => {
  it('全程上涨 → PSY = 100', () => {
    const psy = calcPSY(candles, 3)
    for (const p of psy) expect(p.value).toBe(100)
  })
})

describe('calcDMI', () => {
  it('单边上涨：+DI 高于 -DI，ADX 有限', () => {
    const dmi = calcDMI(candles, 3)
    for (const p of dmi) {
      expect(p.pdi).toBeGreaterThan(0)
      expect(p.mdi).toBe(0)
      expect(p.adx).toBeGreaterThan(0)
    }
  })
  it('窗口起点', () => {
    expect(calcDMI(candles, 3)).toHaveLength(candles.length - 2)
  })
})

describe('calcTR', () => {
  it('与收盘的跳空也计入', () => {
    const trs = calcTR([c(1, 10, 10, 10, 10, 1), c(2, 15, 16, 14, 15, 1)])
    expect(trs[1]).toBe(Math.max(2, Math.abs(16 - 10), Math.abs(14 - 10))) // 6
  })
})

describe('calcSTOCH', () => {
  // 5 根单调上涨：close 始终贴近窗口最高 → rawK=100，K=D=100
  const up = [c(1, 10, 12, 9, 11, 100), c(2, 11, 13, 10, 12, 150), c(3, 12, 14, 11, 13, 200), c(4, 13, 15, 12, 14, 250), c(5, 14, 16, 13, 15, 300)]
  it('单调上涨（high>close）→ rawK=(C-LL)/(HH-LL)=80，K/D=80', () => {
    const { k, d } = calcSTOCH(up, 3, 2, 2)
    expect(k.length).toBeGreaterThan(0)
    for (const p of k) expect(p.value).toBeCloseTo(80, 5)
    for (const p of d) expect(p.value).toBeCloseTo(80, 5)
  })
  it('收盘贴窗口最高（close=high）→ %K=100', () => {
    const peak = [c(1, 10, 12, 9, 12, 1), c(2, 12, 14, 11, 14, 1), c(3, 14, 16, 13, 16, 1)]
    const { k } = calcSTOCH(peak, 3, 1, 1)
    for (const p of k) expect(p.value).toBe(100)
  })
  it('起点正确：K 从 kPeriod+kSmooth-2 开始，D 更晚', () => {
    const { k, d } = calcSTOCH(up, 3, 2, 2)
    expect(k[0].time).toBe(up[3].time) // 3+2-2=3
    expect(d[0].time).toBe(up[4].time) // 3+2+2-3=4
  })
  it('高低区间为 0 → rawK=50', () => {
    const flat = [c(1, 10, 10, 10, 10, 1), c(2, 10, 10, 10, 10, 1), c(3, 10, 10, 10, 10, 1)]
    const { k } = calcSTOCH(flat, 3, 1, 1)
    expect(k[0].value).toBe(50)
  })
})

describe('calcROC', () => {
  it('n=1：逐根变动率', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const roc = calcROC(closes, 1)
    expect(roc.map((p) => p.value)).toEqual([10, 10]) // 110/100-1, 121/110-1
  })
  it('n=2：跨两根变动率', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const roc = calcROC(closes, 2)
    expect(roc[0].value).toBeCloseTo(21, 5)
  })
})

describe('calcMOM', () => {
  it('n=1：逐根差值', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const mom = calcMOM(closes, 1)
    expect(mom.map((p) => p.value)).toEqual([10, 11])
  })
  it('n=2：跨两根差值', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    expect(calcMOM(closes, 2)[0].value).toBe(21)
  })
})
