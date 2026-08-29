import { ChartView, type MainIndicatorKind, type SubIndicatorKind } from './ChartView'
import type { Period } from '../chart/types'
import type { ChartType } from '../chart/adapter'
import type { IndicatorParams } from '../indicators/params'
import type { ColorPresetId } from '../theme'
import { useKlineData } from '../hooks/useKlineData'
import { useChartSync, type Range2 } from '../hooks/useChartSync'

interface CellProps {
  symbol: string
  period: Period
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  colorPreset: ColorPresetId
  showWatermark: boolean
  externalRange: Range2 | null
  onViewRangeChange: (r: Range2) => void
}

function QuadCell({ symbol, period, chartType, priceScaleMode = 'linear', mainIndicator, subIndicator, indicatorParams, colorPreset, showWatermark, externalRange, onViewRangeChange }: CellProps) {
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
      showWatermark={showWatermark}
      externalRange={externalRange}
    />
  )
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
  showWatermark?: boolean
}

/** 四图联动：2×2 网格，时间轴全联动 */
export function ChartQuad({ symbols, period, chartType, priceScaleMode = 'linear', mainIndicator, subIndicator, indicatorParams, themeMode = 'dark', colorPreset = 'classic', showWatermark = true }: QuadChartProps) {
  const { ranges, broadcast } = useChartSync(4)
  const base = { period, chartType, priceScaleMode, mainIndicator, subIndicator, indicatorParams, themeMode, colorPreset, showWatermark }

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
