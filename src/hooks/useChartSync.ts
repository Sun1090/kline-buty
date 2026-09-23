import { useRef, useState } from 'react'

/** 可视时间区间（K 线秒）。按时间而不是逻辑索引广播：各图周期可以不同 */
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
  /** 各格最近一次**自己上报**的值：把它原样报回来就是回声，不必再写回那一格 */
  const crosshairReportedRef = useRef<Record<number, number | null>>({})

  const broadcastCrosshair = (source: number, time: number | null) => {
    crosshairReportedRef.current[source] = time
    // 去重只能**按格**判：这一格已经是这个值才不必再写。发起格自己的槽位从来不被自己的广播
    // 更新，拿它当整条广播的开关，会让「第二格移出」的那条 null 被整条丢弃（其余格永远停在
    // 上一格的转发值上）—— 单元测试里那条 `expected 222 to be null` 就是这个。
    const next: Record<number, number | null> = {}
    for (let i = 0; i < count; i++) {
      if (i === source) continue
      if (crosshairExternalRef.current[i] === time) continue
      // null 是「撤销」，永远要传下去：某一格很久以前报过 null，不代表它现在没什么要清的
      if (time !== null && crosshairReportedRef.current[i] === time) continue
      next[i] = time
    }
    if (Object.keys(next).length === 0) return
    crosshairExternalRef.current = { ...crosshairExternalRef.current, ...next }
    setCrosshairTimes((prev) => ({ ...prev, ...next }))
  }

  return { ranges, broadcast, crosshairTimes, broadcastCrosshair }
}
