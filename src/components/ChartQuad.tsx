import { ChartView, type MainIndicatorKind, type SubIndicatorKind } from './ChartView'
import type { SnapMode } from '../drawings/snap'
import { PERIODS, type Period } from '../chart/types'
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
  timezoneMode?: 'utc' | 'local'
  drawingSnap?: SnapMode
  notesHidden?: boolean
  coordBadge?: boolean
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  lineColors?: Record<string, string>
  colorPreset: ColorPresetId
  showWatermark: boolean
  externalRange: Range2 | null
  onViewRangeChange: (r: Range2) => void
  /** G8 十字光标时间联动 */
  onCrosshairChange: (time: number | null) => void
  externalCrosshairTime: number | null
  onCellPeriod: (p: Period) => void
}

function QuadCell({ symbol, period, chartType, priceScaleMode = 'linear', timezoneMode = 'utc', drawingSnap = 'ohlc', notesHidden = false, coordBadge = false, mainIndicator, subIndicator, indicatorParams, lineColors = {}, colorPreset, showWatermark, externalRange, onViewRangeChange, onCrosshairChange, externalCrosshairTime, onCellPeriod }: CellProps) {
  const data = useKlineData(symbol, period)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ChartView
        symbol={symbol}
        period={period}
        candles={data.state.candles}
        chartType={chartType}
        priceScaleMode={priceScaleMode}
        timezoneMode={timezoneMode}
        drawingSnap={drawingSnap}
        notesHidden={notesHidden}
        coordBadge={coordBadge}
        mainIndicator={mainIndicator}
        subIndicator={subIndicator}
        indicatorParams={indicatorParams}
        lineColors={lineColors}
        colorPreset={colorPreset}
        replay={null}
        hasMore={data.hasMore}
        onLoadMore={data.loadMore}
        onViewRangeChange={onViewRangeChange}
        onCrosshairChange={onCrosshairChange}
        externalCrosshairTime={externalCrosshairTime}
        showWatermark={showWatermark}
        externalRange={externalRange}
      />
      <select
        data-testid={`quad-period-${symbol}`}
        aria-label={`period: ${symbol}`}
        value={period}
        onChange={(e) => onCellPeriod(e.target.value as Period)}
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          zIndex: 6,
          padding: '1px 4px',
          fontSize: 11,
          border: '1px solid var(--border)',
          borderRadius: 4,
          background: 'var(--panel)',
          color: 'var(--text-dim)',
          cursor: 'pointer',
        }}
      >
        {PERIODS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value}
          </option>
        ))}
      </select>
    </div>
  )
}

interface QuadChartProps {
  symbols: string[]
  period: Period
  /** 每格独立周期（长度 4，缺省全部用 period） */
  periods?: Period[]
  onCellPeriod?: (index: number, period: Period) => void
  chartType: ChartType
  priceScaleMode?: 'linear' | 'log'
  timezoneMode?: 'utc' | 'local'
  drawingSnap?: SnapMode
  notesHidden?: boolean
  coordBadge?: boolean
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  /** H11 指标线颜色自定义（透传给内部 ChartView） */
  lineColors?: Record<string, string>
  themeMode?: 'dark' | 'light'
  colorPreset?: ColorPresetId
  showWatermark?: boolean
}

/** 四图联动：2×2 网格，时间轴全联动；每格可独立切换周期（T21） */
export function ChartQuad({ symbols, period, periods, onCellPeriod, chartType, priceScaleMode = 'linear', timezoneMode = 'utc', drawingSnap = 'ohlc', notesHidden = false, coordBadge = false, mainIndicator, subIndicator, indicatorParams, lineColors = {}, themeMode = 'dark', colorPreset = 'classic', showWatermark = true }: QuadChartProps) {
  const { ranges, broadcast, crosshairTimes, broadcastCrosshair } = useChartSync(4)
  const cellPeriods = periods ?? [period, period, period, period]
  const base = { chartType, priceScaleMode, timezoneMode, drawingSnap, notesHidden, coordBadge, mainIndicator, subIndicator, indicatorParams, lineColors, themeMode, colorPreset, showWatermark }

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
            period={cellPeriods[i] ?? period}
            onCellPeriod={(p) => onCellPeriod?.(i, p)}
            externalRange={ranges[i]}
            onViewRangeChange={(r) => broadcast(i, r)}
            onCrosshairChange={(t) => broadcastCrosshair(i, t)}
            externalCrosshairTime={crosshairTimes[i] ?? null}
          />
        </div>
      ))}
    </div>
  )
}
