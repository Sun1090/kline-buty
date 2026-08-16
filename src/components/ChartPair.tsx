import { useRef, useState } from 'react'
import type { Period } from '../chart/types'
import type { ChartType } from '../chart/adapter'
import { ChartView, type MainIndicatorKind, type SubIndicatorKind } from './ChartView'
import type { ColorPresetId } from '../theme'
import { useKlineData } from '../hooks/useKlineData'
import type { IndicatorParams } from '../indicators/params'

interface ChartPairProps {
  symbol: string
  secondSymbol: string
  period: Period
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  themeMode?: 'dark' | 'light'
  colorPreset?: ColorPresetId
  /** 外部参考价格线（仅主图 symbol） */
  referencePrice?: number | null
  /** 限价标记线（仅主图 symbol） */
  markerPrice?: number | null
}

/** 双图联动：时间轴同步（A 拖动 → B 跟随），数据/指标配置共享 */
export function ChartPair({ symbol, secondSymbol, period, chartType, priceScaleMode = 'linear', mainIndicator, subIndicator, indicatorParams, themeMode = 'dark', colorPreset = 'classic', referencePrice, markerPrice }: ChartPairProps) {
  const a = useKlineData(symbol, period)
  const b = useKlineData(secondSymbol, period)

  // 各自收到的"外部"区间（来自对方），用签名防回环
  const [rangeA, setRangeA] = useState<{ from: number; to: number } | null>(null)
  const [rangeB, setRangeB] = useState<{ from: number; to: number } | null>(null)
  const lastSeenA = useRef('')
  const lastSeenB = useRef('')

  const fromA = (r: { from: number; to: number }) => {
    const sig = `${r.from}:${r.to}`
    // 该值若已由 B 上报（B 拖动引发的回显），跳过，避免回环写入
    if (sig === lastSeenA.current || sig === lastSeenB.current) return
    lastSeenA.current = sig
    setRangeB(r)
  }
  const fromB = (r: { from: number; to: number }) => {
    const sig = `${r.from}:${r.to}`
    // 该值若已由 A 上报（A 拖动引发的回显），跳过，避免回环写入
    if (sig === lastSeenB.current || sig === lastSeenA.current) return
    lastSeenB.current = sig
    setRangeA(r)
  }

  const base = { period, chartType, priceScaleMode, mainIndicator, subIndicator, indicatorParams, replay: null, themeMode, colorPreset }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid #2a2e39' }}>
        <ChartView {...base} symbol={symbol} candles={a.state.candles} hasMore={a.hasMore} onLoadMore={a.loadMore} onViewRangeChange={fromA} externalRange={rangeA} referencePrice={referencePrice} markerPrice={markerPrice} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChartView {...base} symbol={secondSymbol} candles={b.state.candles} hasMore={b.hasMore} onLoadMore={b.loadMore} onViewRangeChange={fromB} externalRange={rangeB} />
      </div>
    </div>
  )
}
