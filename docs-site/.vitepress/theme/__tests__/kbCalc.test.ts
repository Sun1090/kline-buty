import { describe, expect, it } from 'vitest'
import {
  blackScholes,
  calcExpectancy,
  calcLeverage,
  calcMargin,
  erf,
  normCdf,
} from '../kbCalc'

describe('calcLeverage（杠杆盈亏/爆仓）', () => {
  it('常规：本金 10000 × 10x × +10% → 名义 100000、盈亏 +10000', () => {
    const r = calcLeverage(10000, 10, 10)
    expect(r.notional).toBe(100000)
    expect(r.pnl).toBe(10000)
    expect(r.pnlPct).toBe(100)
    expect(r.liquidated).toBe(false)
    expect(r.remaining).toBe(20000)
  })

  it('爆仓：10x 反向 10% → 盈亏 -10000 达到本金 → liquidated、剩余 0', () => {
    const r = calcLeverage(10000, 10, -10)
    expect(r.pnl).toBe(-10000)
    expect(r.liquidated).toBe(true)
    expect(r.remaining).toBe(0)
  })

  it('深亏（倒欠）→ remaining 钳到 0 不出现负数', () => {
    const r = calcLeverage(10000, 100, -50) // 名义 100w × -50% = -50w
    expect(r.liquidated).toBe(true)
    expect(r.remaining).toBe(0)
  })

  it('零/非法输入 → 按 0 本金近似，不崩溃', () => {
    const r = calcLeverage(0, 0, 0)
    expect(r.notional).toBe(0)
    expect(Number.isFinite(r.pnl)).toBe(true)
  })
})

describe('calcMargin（保证金/强平价）', () => {
  it('做多：强平价 = 开仓价 ×(1 − 1/x + 维持率)', () => {
    const r = calcMargin(10000, 20, 60000, 0.5, 'long')
    expect(r.notional).toBe(200000)
    expect(r.mm).toBe(1000) // 20w × 0.005
    expect(r.liq).toBeCloseTo(60000 * (1 - 1 / 20 + 0.005))
    expect(r.liqMove).toBeCloseTo(((60000 * (1 - 1 / 20 + 0.005) - 60000) / 60000) * 100)
  })

  it('做空：强平价 = 开仓价 ×(1 + 1/x − 维持率)', () => {
    const r = calcMargin(10000, 20, 60000, 0.5, 'short')
    expect(r.liq).toBeCloseTo(60000 * (1 + 1 / 20 - 0.005))
  })

  it('杠杆 <1 被钳到 1；开仓价 0 → liqMove 0', () => {
    const r = calcMargin(10000, 0, 0, 0.5, 'long')
    expect(r.notional).toBe(10000) // lev 钳 1
    expect(r.liqMove).toBe(0) // e=0 不除零
  })
})

describe('calcExpectancy（期望值/凯利）', () => {
  it('40% 胜率、2R/1R、风险 1000 → 期望 0.2R、凯利 10%', () => {
    const r = calcExpectancy(40, 2, 1, 1000)
    expect(r.rr).toBe(2)
    expect(r.expectancy).toBeCloseTo(0.2) // 0.4×2 − 0.6×1
    expect(r.expectancyMoney).toBeCloseTo(200)
    expect(r.kelly).toBeCloseTo(0.1) // p − (1−p)/rr = 0.4 − 0.3
    expect(r.halfKelly).toBeCloseTo(0.05)
    expect(r.viable).toBe(true)
  })

  it('负期望系统 → viable=false，凯利钳 0', () => {
    const r = calcExpectancy(30, 1, 2, 1000) // 0.3×1 − 0.7×2 = −1.1
    expect(r.expectancy).toBeCloseTo(-1.1)
    expect(r.viable).toBe(false)
    expect(r.kelly).toBe(0)
  })

  it('avgLoss=0 → rr=Infinity；胜率越界按原语义（组件 range 限 1–99，越界仅防崩溃）', () => {
    const r = calcExpectancy(120, 2, 0, 1000)
    expect(r.rr).toBe(Infinity)
    expect(r.expectancy).toBeCloseTo(2.4) // p = min(100, max(0,1.2)) = 1.2
    expect(r.kelly).toBeCloseTo(1.2)
    const under = calcExpectancy(0, 2, 1, 1000) // 胜率 0 → 期望为负 → 凯利钳 0
    expect(under.kelly).toBe(0)
    expect(under.viable).toBe(false)
  })
})

describe('erf / normCdf（数学工具）', () => {
  it('erf 对称性：erf(-x) = -erf(x)，erf(0) = 0，erf(∞)→1', () => {
    expect(erf(0)).toBeCloseTo(0)
    expect(erf(1)).toBeCloseTo(0.8427008, 5)
    expect(erf(-1)).toBeCloseTo(-0.8427008, 5)
  })

  it('normCdf：0→0.5、1.96≈0.975、-1.96≈0.025', () => {
    expect(normCdf(0)).toBeCloseTo(0.5)
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 3)
  })
})

describe('blackScholes（BS 定价 + 希腊字母）', () => {
  it('平值看涨：r>0 下 delta 略大于 0.5，时间价值 > 0', () => {
    const r = blackScholes(100, 100, 20, 5, 30)
    expect(r.deltaC).toBeCloseTo(0.5399, 2) // d1 = (r+σ²/2)T/(σ√T) > 0
    expect(r.call).toBeGreaterThan(r.put) // r>0 时 call ≈ put + S − K·e^(−rT)
    expect(r.call).toBeGreaterThan(r.intrinsicC) // S=K → 时间价值 > 0
    expect(r.timeC).toBeGreaterThan(0)
  })

  it('实值看涨：内在价值 = S−K > 0，时间价值 > 0', () => {
    const r = blackScholes(110, 100, 30, 3, 60)
    expect(r.intrinsicC).toBeCloseTo(10)
    expect(r.call).toBeGreaterThan(10)
    expect(r.timeC).toBeCloseTo(r.call - 10)
  })

  it('零/负参数被钳制不崩溃（S/K ≥1e-9、σ≥1e-4、T 至少 1h）', () => {
    const r = blackScholes(0, 0, 0, 0, 0)
    expect(Number.isFinite(r.call)).toBe(true)
    expect(Number.isFinite(r.put)).toBe(true)
    expect(r.gamma).toBeGreaterThan(0)
  })

  it('到期时间趋近 0 → 价格逼近内在价值', () => {
    const r = blackScholes(105, 100, 30, 3, 1 / 24) // T 被钳到 1h
    expect(r.call).toBeGreaterThan(5 - 1e-6)
  })
})