import { useRef, useState } from 'react'
import { ChartView, type MainIndicatorKind, type SubIndicatorKind } from './ChartView'
import type { Period } from '../chart/types'
import type { ChartType } from '../chart/adapter'
import type { IndicatorParams } from '../indicators/params'
import type { ColorPresetId } from '../theme'
import { useKlineData } from '../hooks/useKlineData'

export interface Range2 {
  from: number
  to: number
}

interface CellProps {
  symbol: string
  period: Period
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  colorPreset: ColorPresetId
  externalRange: Range2 | null
  onViewRangeChange: (r: Range2) => void
}

function QuadCell({ symbol, period, chartType, priceScaleMode = 'linear', mainIndicator, subIndicator, indicatorParams, colorPreset, externalRange, onViewRangeChange }: CellProps) {
  const data = useKlineData(symbol, period)
  return (
    <ChartView
      symbol={symbol}
      period={period}
      candles={data.state.candles}
      chartType={chartType}
      priceScaleMode={priceScaleMode}
      mainIndicator={mainIndicator}
      subIndicator={subIndicator}
      indicatorParams={indicatorParams}
      colorPreset={colorPreset}
      replay={null}
      hasMore={data.hasMore}
      onLoadMore={data.loadMore}
      onViewRangeChange={onViewRangeChange}
      externalRange={externalRange}
    />
  )
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

  return { ranges, broadcast }
}

interface QuadChartProps {
  symbols: string[]
  period: Period
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  themeMode?: 'dark' | 'light'
  colorPreset?: ColorPresetId
}

/** 四图联动：2×2 网格，时间轴全联动 */
export function ChartQuad({ symbols, period, chartType, priceScaleMode = 'linear', mainIndicator, subIndicator, indicatorParams, themeMode = 'dark', colorPreset = 'classic' }: QuadChartProps) {
  const { ranges, broadcast } = useChartSync(4)
  const base = { period, chartType, priceScaleMode, mainIndicator, subIndicator, indicatorParams, themeMode, colorPreset }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%' }}>
      {symbols.map((symbol, i) => (
        <div
          key={symbol}
          style={{
            minHeight: 0,
            borderRight: i % 2 === 0 ? '1px solid #2a2e39' : 'none',
            borderBottom: i < 2 ? '1px solid #2a2e39' : 'none',
          }}
        >
          <QuadCell
            {...base}
            symbol={symbol}
            externalRange={ranges[i]}
            onViewRangeChange={(r) => broadcast(i, r)}
          />
        </div>
      ))}
    </div>
  )
}
