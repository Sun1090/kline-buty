import type { TradeRecord } from '../hooks/usePaperAccount'
import type { EquityPoint } from '../utils/equity'

/**
 * v0.5 交易绩效纯函数：最大回撤 / 当前回撤 / 权益曲线缩放。
 * 输入为 `equitySeries(trades)` 产出的权益点（时间升序），全部为纯函数便于单测。
 * 回撤口径：峰值含「初始权益」基准（传 initialBalance>0 时以初始资金为峰值起点），
 * 与「起始资金为参考」的标准回撤定义一致。
 */

/** 历史峰值回撤（peak-to-trough）比例，0–1；空 → 0。initialBalance>0 时以它为初始峰值参考。 */
export function maxDrawdown(points: EquityPoint[], initialBalance = 0): number {
  let peak = Math.max(initialBalance, -Infinity)
  let maxDd = 0
  for (const p of points) {
    if (p.equity > peak) peak = p.equity
    if (peak > 0) {
      const dd = (peak - p.equity) / peak
      if (dd > maxDd) maxDd = dd
    }
  }
  return maxDd
}

/** 当前回撤：最新权益相对历史峰值回落的比例（0–1；位于新高 → 0）。空 → 0。initialBalance 同上。 */
export function currentDrawdown(points: EquityPoint[], initialBalance = 0): number {
  if (points.length === 0) return 0
  let peak = Math.max(initialBalance, -Infinity)
  for (const p of points) if (p.equity > peak) peak = p.equity
  const last = points[points.length - 1].equity
  if (peak <= 0) return 0
  return Math.max(0, (peak - last) / peak)
}

/** 峰谷间最大绝对回撤（USDT）。空 → 0。 */
export function maxDrawdownAmount(points: EquityPoint[]): number {
  let peak = -Infinity
  let maxAmt = 0
  for (const p of points) {
    if (p.equity > peak) peak = p.equity
    const amt = peak - p.equity
    if (amt > maxAmt) maxAmt = amt
  }
  return maxAmt
}

export interface ScaledCurve {
  xs: number[]
  ys: number[]
  path: string
  area: string
  min: number
  max: number
}

/**
 * 将权益点缩放到 w×h 逻辑绘图区（上下各 padY 内边距）。
 * 空 → 空路径；单点 → 居中单个点；全平（min==max）→ 中线避免除零。
 * 返回折线/面积路径与坐标数组，供 EquityCurve 组件渲染与命中定位。
 */
export function scaleEquity(points: EquityPoint[], w: number, h: number, padY = 10): ScaledCurve {
  const n = points.length
  if (n === 0) return { xs: [], ys: [], path: '', area: '', min: 0, max: 0 }
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p.equity < min) min = p.equity
    if (p.equity > max) max = p.equity
  }
  const span = max - min
  const inner = h - padY * 2
  const xStep = n === 1 ? 0 : w / (n - 1)
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    xs.push(n === 1 ? w / 2 : i * xStep)
    // 全平/单点（span=0）→ 水平居中，避免贴底
    ys.push(span === 0 ? h / 2 : h - padY - ((points[i].equity - min) / span) * inner)
  }
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')
  const area =
    n > 1
      ? `${path} L${xs[n - 1].toFixed(1)} ${h.toFixed(1)} L${xs[0].toFixed(1)} ${h.toFixed(1)} Z`
      : ''
  return { xs, ys, path, area, min, max }
}

export interface PnlBarDatum {
  /** 平仓时间戳（ms） */
  at: number
  /** 净盈亏（USDT，已含手续费） */
  pnl: number
  /** 平仓方向（buy=平多 / sell=平空） */
  side: 'buy' | 'sell'
}

/**
 * 逐笔盈亏序列：从成交流水中提取所有已平仓记录的盈亏（新在前 → 反转为时间升序）。
 * 用于逐笔盈亏条形图；无平仓 → 空数组。
 */
export function pnlBars(trades: TradeRecord[]): PnlBarDatum[] {
  const out: PnlBarDatum[] = []
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i]
    if (t.kind === 'close' && t.pnl !== undefined) {
      out.push({ at: t.at, pnl: t.pnl, side: t.side })
    }
  }
  return out
}
