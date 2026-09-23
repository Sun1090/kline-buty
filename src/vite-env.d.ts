/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 构建期声明产物跑在无同源代理的静态托管上（'direct' 时跳过 /api/v3/ping 探测），见 data/binance/endpoints.ts */
  readonly VITE_ENDPOINT_MODE?: string
}

/** A1 压测模式数据钩子：仅 `?perf=N` 时由 useKlineData 暴露，供 E2E 断言周期边界对齐/间隔稳定 */
interface Window {
  __klineButyPerf?: {
    period: string
    candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]
  }
}
