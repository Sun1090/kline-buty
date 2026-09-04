import type { ValuePoint } from './sma'

/** H3 信号点：快线上穿慢线 → 金叉（golden）；下穿 → 死叉（death）。 */
export interface CrossoverPoint {
  time: number
  /** 交叉时慢线值（渲染标记用） */
  price: number
  kind: 'golden' | 'death'
}

/**
 * H3 金叉/死叉检测：两条按时间对齐的线，在快线从慢线一侧翻转到另一侧处打点。
 *
 * 逐根比较 (fast[i] - slow[i]) 符号：负→正 为金叉，正→负 为死叉。
 * 快线/慢线任一缺值（时间不匹配）跳过该根；返回按时间升序的信号列表。
 */
export function findCrossovers(fast: ValuePoint[], slow: ValuePoint[]): CrossoverPoint[] {
  const slowByTime = new Map<number, number>()
  for (const p of slow) slowByTime.set(p.time, p.value)

  const out: CrossoverPoint[] = []
  let prevDiff: number | null = null
  for (const p of fast) {
    const sv = slowByTime.get(p.time)
    if (sv === undefined) {
      prevDiff = null
      continue
    }
    const diff = p.value - sv
    if (prevDiff !== null) {
      if (prevDiff <= 0 && diff > 0) out.push({ time: p.time, price: sv, kind: 'golden' })
      else if (prevDiff >= 0 && diff < 0) out.push({ time: p.time, price: sv, kind: 'death' })
    }
    prevDiff = diff
  }
  return out
}

/** H14 回测标注：交叉信号 → 带买卖标签的标注点（B=金叉做多 / S=死叉做空） */
export interface SignalAnnotation {
  time: number
  price: number
  kind: 'golden' | 'death'
  /** 展示标签：金叉 'B'，死叉 'S' */
  label: string
}

/**
 * H14 把交叉信号转换为带标签的买卖标注（逐点，金叉 B / 死叉 S）。
 * 保留原始 kind/price，追加 label 供渲染；输入空 → 空数组。
 */
export function annotateCrossovers(signals: CrossoverPoint[]): SignalAnnotation[] {
  return signals.map((s) => ({
    time: s.time,
    price: s.price,
    kind: s.kind,
    label: s.kind === 'golden' ? 'B' : 'S',
  }))
}
