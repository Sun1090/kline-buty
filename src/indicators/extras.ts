import type { Candle } from '../chart/types'
import { calcSMA, type ValuePoint } from './sma'

/** 威廉指标 WR(n)：超买 <20，超卖 >80（(HHV-C)/(HHV-LLV)×100） */
export function calcWR(candles: Candle[], n = 14): ValuePoint[] {
  const out: ValuePoint[] = []
  for (let i = n - 1; i < candles.length; i++) {
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - n + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high
      if (candles[j].low < ll) ll = candles[j].low
    }
    const r = hh - ll
    out.push({ time: candles[i].time, value: r === 0 ? 50 : ((hh - candles[i].close) / r) * 100 })
  }
  return out
}

/** 能量潮 OBV：收盘价变化方向累计成交量；n > 1 时对 OBV 做 SMA 平滑（TradingView 的 OBV MA） */
export function calcOBV(candles: Candle[], n = 1): ValuePoint[] {
  const out: ValuePoint[] = []
  let obv = 0
  for (let i = 0; i < candles.length; i++) {
    if (i > 0) {
      const ch = candles[i].close - candles[i - 1].close
      if (ch > 0) obv += candles[i].volume
      else if (ch < 0) obv -= candles[i].volume
    }
    out.push({ time: candles[i].time, value: obv })
  }
  if (n > 1) return calcSMA(out, n)
  return out
}

/** 真实波幅 TR */
export function calcTR(candles: Candle[]): number[] {
  const out: number[] = []
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const pc = i > 0 ? candles[i - 1].close : c.close
    out.push(Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc)))
  }
  return out
}

/** 平均真实波幅 ATR(n)：种子为前 n 根 TR 均值，之后 Wilder 平滑 */
export function calcATR(candles: Candle[], n = 14): ValuePoint[] {
  const trs = calcTR(candles)
  const out: ValuePoint[] = []
  let atr = 0
  for (let i = 0; i < trs.length; i++) {
    if (i < n - 1) continue
    if (i === n - 1) {
      let sum = 0
      for (let j = 0; j < n; j++) sum += trs[j]
      atr = sum / n
    } else {
      atr = (atr * (n - 1) + trs[i]) / n
    }
    out.push({ time: candles[i].time, value: atr })
  }
  return out
}

/** 顺势指标 CCI(n)：TP 相对 SMA 的偏离度，±100 为超买超卖参考 */
export function calcCCI(candles: Candle[], n = 20): ValuePoint[] {
  const out: ValuePoint[] = []
  for (let i = n - 1; i < candles.length; i++) {
    let sum = 0
    const tps: number[] = []
    for (let j = i - n + 1; j <= i; j++) {
      const tp = (candles[j].high + candles[j].low + candles[j].close) / 3
      tps.push(tp)
      sum += tp
    }
    const sma = sum / n
    let md = 0
    for (const tp of tps) md += Math.abs(tp - sma)
    md /= n
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    out.push({ time: candles[i].time, value: md === 0 ? 0 : (tp - sma) / (0.015 * md) })
  }
  return out
}

/** 心理线 PSY(n)：上涨天数占比 × 100 */
export function calcPSY(candles: Candle[], n = 12): ValuePoint[] {
  const out: ValuePoint[] = []
  for (let i = n; i < candles.length; i++) {
    let up = 0
    for (let j = i - n + 1; j <= i; j++) {
      if (candles[j].close > candles[j - 1].close) up++
    }
    out.push({ time: candles[i].time, value: (up / n) * 100 })
  }
  return out
}

export interface DmiPoint {
  time: number
  pdi: number
  mdi: number
  adx: number
}

/** 趋向指标 DMI/ADX(n)：+DI/-DI/ADX 三线（Wilder 平滑） */
export function calcDMI(candles: Candle[], n = 14): DmiPoint[] {
  const trs = calcTR(candles)
  const pdm: number[] = []
  const mdm: number[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      pdm.push(0)
      mdm.push(0)
      continue
    }
    const up = candles[i].high - candles[i - 1].high
    const down = candles[i - 1].low - candles[i].low
    pdm.push(up > down && up > 0 ? up : 0)
    mdm.push(down > up && down > 0 ? down : 0)
  }

  // Wilder 平滑累计（前 n 根种子，之后递减式滚动）
  let sp = 0
  let sm = 0
  let satr = 0
  for (let i = 0; i < candles.length; i++) {
    if (i === n - 1) {
      for (let j = 0; j < n; j++) {
        sp += pdm[j]
        sm += mdm[j]
        satr += trs[j]
      }
    } else if (i > n - 1) {
      sp = sp - sp / n + pdm[i]
      sm = sm - sm / n + mdm[i]
      satr = satr - satr / n + trs[i]
    }
  }

  const out: DmiPoint[] = []
  let prevAdx = 0
  for (let i = n - 1; i < candles.length; i++) {
    const pdi = satr === 0 ? 0 : (sp / satr) * 100
    const mdi = satr === 0 ? 0 : (sm / satr) * 100
    const dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100
    prevAdx = i === n - 1 ? dx : (prevAdx * (n - 1) + dx) / n
    out.push({ time: candles[i].time, pdi, mdi, adx: prevAdx })
  }
  return out
}

export interface StochResult {
  /** 随机指标 %K（SMA(rawK, kSmooth)） */
  k: ValuePoint[]
  /** 随机指标 %D（SMA(K, dPeriod)） */
  d: ValuePoint[]
}

/**
 * 随机指标 STOCH：rawK = (C − LLV(low,n)) / (HHV(high,n) − LLV(low,n)) × 100，
 * K = SMA(rawK, kSmooth)，D = SMA(K, dPeriod)。标准默认 14/3/3。
 */
export function calcSTOCH(candles: Candle[], kPeriod = 14, kSmooth = 3, dPeriod = 3): StochResult {
  const rawK: ValuePoint[] = []
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high
      if (candles[j].low < ll) ll = candles[j].low
    }
    rawK.push({ time: candles[i].time, value: hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100 })
  }
  const k = calcSMA(rawK, kSmooth)
  const d = calcSMA(k, dPeriod)
  return { k, d }
}

/** 变动率 ROC(n)：((C − C[n]) / C[n]) × 100 */
export function calcROC(candles: Candle[], n = 12): ValuePoint[] {
  const out: ValuePoint[] = []
  for (let i = n; i < candles.length; i++) {
    const prev = candles[i - n].close
    out.push({ time: candles[i].time, value: prev === 0 ? 0 : ((candles[i].close - prev) / prev) * 100 })
  }
  return out
}

/** 动量 MOM(n)：C − C[n] */
export function calcMOM(candles: Candle[], n = 10): ValuePoint[] {
  const out: ValuePoint[] = []
  for (let i = n; i < candles.length; i++) {
    out.push({ time: candles[i].time, value: candles[i].close - candles[i - n].close })
  }
  return out
}
