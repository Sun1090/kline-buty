/**
 * O11 文档站交互计算器纯函数（零依赖）
 *
 * VitePress 主题组件（docs-site/.vitepress/theme/*Calc.vue）的计算逻辑
 * 抽为纯函数模块，供 vitest 直接覆盖；组件仅做 v-model 绑定、显示与样式。
 * 输入均为可被 Number() 解析的值（组件 v-model.number 传入），负数/NaN 按组件原语义处理。
 */

/** 杠杆盈亏/爆仓（LeverageCalc）：本金 × 杠杆 × 涨跌幅 */
export interface LeverageResult {
  notional: number
  pnl: number
  pnlPct: number
  liquidated: boolean
  remaining: number
}

export function calcLeverage(capital: number, leverage: number, priceChangePct: number): LeverageResult {
  const c = Number(capital) || 0
  const lev = Number(leverage) || 1
  const chg = Number(priceChangePct) / 100
  const notional = c * lev
  const pnl = notional * chg
  const pnlPct = (pnl / c) * 100
  const liquidated = pnl <= -c
  const remaining = Math.max(0, c + pnl)
  return { notional, pnl, pnlPct, liquidated, remaining }
}

export interface MarginResult {
  notional: number
  mm: number
  liq: number
  liqMove: number
}

/** 保证金/维持保证金/强平价（MarginCalc，简化线性模型） */
export function calcMargin(capital: number, leverage: number, entry: number, mmrPct: number, side: 'long' | 'short'): MarginResult {
  const c = Number(capital) || 0
  const lev = Math.max(1, Number(leverage) || 1)
  const e = Number(entry) || 0
  const m = Number(mmrPct) / 100
  const notional = c * lev
  const mm = notional * m
  const liq = side === 'long' ? e * (1 - 1 / lev + m) : e * (1 + 1 / lev - m)
  const liqMove = e > 0 ? ((liq - e) / e) * 100 : 0
  return { notional, mm, liq, liqMove }
}

export interface ExpectancyResult {
  rr: number
  expectancy: number
  expectancyMoney: number
  kelly: number
  halfKelly: number
  viable: boolean
}

/** 期望值/凯利公式（ExpectancyCalc）：胜率 × 盈亏比 × 单次风险额 */
export function calcExpectancy(winRatePct: number, avgWinR: number, avgLossR: number, riskAmt: number): ExpectancyResult {
  const p = Math.min(100, Math.max(0, Number(winRatePct) / 100))
  const w = Math.max(0, Number(avgWinR) || 0)
  const l = Math.max(0, Number(avgLossR) || 0)
  const r = Math.max(0, Number(riskAmt) || 0)
  const rr = l > 0 ? w / l : Infinity
  const expectancy = p * w - (1 - p) * l // 单次期望，R 为单位
  const expectancyMoney = expectancy * r
  const kelly = w > 0 ? Math.max(0, p - (1 - p) * (l / w)) : 0
  const halfKelly = kelly / 2
  const viable = expectancy > 0
  return { rr, expectancy, expectancyMoney, kelly, halfKelly, viable }
}

/** Abramowitz-Stegun 7.1.26 误差函数近似（|ε| < 1.5e-7） */
export function erf(x: number): number {
  const s = Math.sign(x)
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax)
  return s * y
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export interface BsResult {
  call: number
  put: number
  deltaC: number
  deltaP: number
  gamma: number
  thetaC: number
  thetaP: number
  vega: number
  intrinsicC: number
  timeC: number
  intrinsicP: number
  timeP: number
}

/** Black-Scholes（OptionCalc）：欧式期权定价 + 希腊字母（Theta 每日 / Vega 每 1 个百分点） */
export function blackScholes(spot: number, strike: number, volPct: number, ratePct: number, days: number): BsResult {
  const S = Math.max(1e-9, Number(spot) || 0)
  const K = Math.max(1e-9, Number(strike) || 0)
  const sigma = Math.max(1e-4, Number(volPct) / 100)
  const r = Number(ratePct) / 100
  const T = Math.max(1 / 365 / 24, Number(days) / 365) // 至少留 1 小时避免 T=0 奇点

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const disc = Math.exp(-r * T)

  const call = S * normCdf(d1) - K * disc * normCdf(d2)
  const put = K * disc * normCdf(-d2) - S * normCdf(-d1)
  const deltaC = normCdf(d1)
  const deltaP = deltaC - 1
  const gamma = normPdf(d1) / (S * sigma * sqrtT)
  const thetaC = (-(S * normPdf(d1) * sigma) / (2 * sqrtT) - r * K * disc * normCdf(d2)) / 365
  const thetaP = (-(S * normPdf(d1) * sigma) / (2 * sqrtT) + r * K * disc * normCdf(-d2)) / 365
  const vega = (S * normPdf(d1) * sqrtT) / 100

  const intrinsicC = Math.max(0, S - K)
  const intrinsicP = Math.max(0, K - S)
  return {
    call,
    put,
    deltaC,
    deltaP,
    gamma,
    thetaC,
    thetaP,
    vega,
    intrinsicC,
    timeC: call - intrinsicC,
    intrinsicP,
    timeP: put - intrinsicP,
  }
}