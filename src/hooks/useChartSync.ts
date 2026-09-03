import { useRef, useState } from 'react'

export interface Range2 {
  from: number
  to: number
}

/**
 * 多图时间轴联动：任一图表拖动 → 广播到所有其他图表。
 * 回显检测：某图回调值等于它当前接收的外部值时视为回显，不再广播。
 */
export function useChartSync(count: number) {
  const [ranges, setRanges] = useState<Record<number, Range2 | null>>(() => {
    const init: Record<number, Range2 | null> = {}
    for (let i = 0; i < count; i++) init[i] = null
    return init
  })
  const externalRef = useRef<Record<number, Range2 | null>>({})

  const broadcast = (source: number, r: Range2) => {
    const cur = externalRef.current[source]
    if (cur && cur.from === r.from && cur.to === r.to) return // 回显，忽略
    const next: Record<number, Range2 | null> = {}
    for (let i = 0; i < count; i++) {
      if (i === source) continue
      next[i] = r
    }
    externalRef.current = { ...externalRef.current, ...next }
    setRanges((prev) => ({ ...prev, ...next }))
  }

  // G8 十字光标时间联动：任一图表十字光标移动 → 广播到其他所有图表（null=移出）
  const [crosshairTimes, setCrosshairTimes] = useState<Record<number, number | null>>(() => {
    const init: Record<number, number | null> = {}
    for (let i = 0; i < count; i++) init[i] = null
    return init
  })
  const crosshairExternalRef = useRef<Record<number, number | null>>({})

  const broadcastCrosshair = (source: number, time: number | null) => {
    // 回显检测：本图上报的值等于它当前接收的外部值 → 视为同步写入的回显，不再次广播
    if (time === crosshairExternalRef.current[source]) return
    const next: Record<number, number | null> = {}
    for (let i = 0; i < count; i++) {
      if (i === source) continue
      next[i] = time
    }
    crosshairExternalRef.current = { ...crosshairExternalRef.current, ...next }
    setCrosshairTimes((prev) => ({ ...prev, ...next }))
  }

  return { ranges, broadcast, crosshairTimes, broadcastCrosshair }
}
