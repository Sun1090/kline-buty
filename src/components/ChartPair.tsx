import { useRef, useState } from 'react'
import type { Period } from '../chart/types'
import type { ChartType } from '../chart/adapter'
import { ChartView, type MainIndicatorKind, type SubIndicatorKind } from './ChartView'
import type { SnapMode } from '../drawings/snap'
import type { ColorPresetId } from '../theme'
import { useKlineData } from '../hooks/useKlineData'
import type { IndicatorParams } from '../indicators/params'

interface ChartPairProps {
  symbol: string
  secondSymbol: string
  period: Period
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  timezoneMode?: 'utc' | 'local'
  drawingSnap?: SnapMode
  /** C12 便签全局显隐（透传给内部 ChartView） */
  notesHidden?: boolean
  /** I9 画线坐标角标常显 */
  coordBadge?: boolean
  /** I13 画线全局透明度 */
  drawingGlobalOpacity?: number
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  /** H11 指标线颜色自定义（透传给内部 ChartView） */
  lineColors?: Record<string, string>
  themeMode?: 'dark' | 'light'
  colorPreset?: ColorPresetId
  showWatermark?: boolean
  /** 外部参考价格线（仅主图 symbol） */
  referencePrice?: number | null
  /** 限价标记线（仅主图 symbol） */
  markerPrice?: number | null
}

/** 双图联动：时间轴同步（A 拖动 → B 跟随），数据/指标配置共享 */
export function ChartPair({ symbol, secondSymbol, period, chartType, priceScaleMode = 'linear', timezoneMode = 'utc', drawingSnap = 'ohlc', notesHidden = false, coordBadge = false, drawingGlobalOpacity = 1, mainIndicator, subIndicator, indicatorParams, lineColors = {}, themeMode = 'dark', colorPreset = 'classic', showWatermark = true, referencePrice, markerPrice }: ChartPairProps) {
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

  // G8 十字光标时间联动：A 上报 → 写 B；B 上报 → 写 A；回显跳过（值相等即忽略）
  const [crossA, setCrossA] = useState<number | null>(null)
  const [crossB, setCrossB] = useState<number | null>(null)
  const lastSeenCrossA = useRef<number | null>(null)
  const lastSeenCrossB = useRef<number | null>(null)

  const fromCrossA = (t: number | null) => {
    const seen = lastSeenCrossA.current === t || lastSeenCrossB.current === t
    lastSeenCrossA.current = t
    if (seen) return
    setCrossB(t)
  }
  const fromCrossB = (t: number | null) => {
    const seen = lastSeenCrossA.current === t || lastSeenCrossB.current === t
    lastSeenCrossB.current = t
    if (seen) return
    setCrossA(t)
  }

  const base = { period, chartType, priceScaleMode, timezoneMode, drawingSnap, notesHidden, coordBadge, drawingGlobalOpacity, mainIndicator, subIndicator, indicatorParams, lineColors, replay: null, themeMode, colorPreset, showWatermark }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid #2a2e39' }}>
        <ChartView {...base} symbol={symbol} candles={a.state.candles} hasMore={a.hasMore} onLoadMore={a.loadMore} onViewRangeChange={fromA} externalRange={rangeA} onCrosshairChange={fromCrossA} externalCrosshairTime={crossB} referencePrice={referencePrice} markerPrice={markerPrice} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChartView {...base} symbol={secondSymbol} candles={b.state.candles} hasMore={b.hasMore} onLoadMore={b.loadMore} onViewRangeChange={fromB} externalRange={rangeB} onCrosshairChange={fromCrossB} externalCrosshairTime={crossA} />
      </div>
    </div>
  )
}
