/// <reference types="vite/client" />

/** A1 压测模式数据钩子：仅 `?perf=N` 时由 useKlineData 暴露，供 E2E 断言周期边界对齐/间隔稳定 */
interface Window {
  __klineButyPerf?: {
    period: string
    candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]
  }
}
