import { useEffect, useState } from 'react'
import { PERIODS, type Period } from './chart/types'
import { ChartView, type ChartType, type MainIndicatorKind, type SubIndicatorKind } from './components/ChartView'
import { ChartPair } from './components/ChartPair'
import { ChartQuad } from './components/ChartQuad'
import { PeriodBar } from './components/PeriodBar'
import { SymbolPicker } from './components/SymbolPicker'
import { IndicatorBar } from './components/IndicatorBar'
import { IndicatorSettings } from './components/IndicatorSettings'
import { ReplayBar } from './components/ReplayBar'
import { useKlineData } from './hooks/useKlineData'
import { useMarketStats } from './hooks/useMarketStats'
import { StatsBar } from './components/StatsBar'
import { usePersistedState } from './hooks/usePersistedState'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from './indicators/params'
import { createReplay, tickReplay, seekReplay, setSpeed, type ReplayState } from './replay/engine'
import { PositionPanel } from './components/PositionPanel'
import { AlertPanel } from './components/AlertPanel'
import { DrawingToolbar } from './components/DrawingToolbar'
import { usePriceAlerts } from './hooks/usePriceAlerts'
import { useDepth } from './hooks/useDepth'
import { DepthChart } from './components/DepthChart'
import { VolumeProfileChart } from './components/VolumeProfileChart'
import { OfflineBanner } from './components/OfflineBanner'
import type { Position } from './position/pnl'
import type { Drawing, DrawingTool } from './drawings/logic'
import { createDrawing } from './drawings/logic'
import { applyTheme, type ThemeMode } from './theme'

const STATUS_TEXT: Record<string, string> = {
  loading: '加载历史数据…',
  connecting: '连接实时行情…',
  live: '实时',
  reconnecting: '重连中…',
  closed: '连接断开',
  error: '加载失败',
}

const MAIN_OPTIONS = [
  { value: 'ma', label: 'MA' },
  { value: 'ema', label: 'EMA' },
  { value: 'boll', label: 'BOLL' },
  { value: 'vwap', label: 'VWAP' },
  { value: 'none', label: '无' },
]

const SUB_OPTIONS = [
  { value: 'volume', label: 'VOL' },
  { value: 'macd', label: 'MACD' },
  { value: 'kdj', label: 'KDJ' },
  { value: 'rsi', label: 'RSI' },
  { value: 'wr', label: 'WR' },
  { value: 'obv', label: 'OBV' },
  { value: 'atr', label: 'ATR' },
  { value: 'dmi', label: 'DMI' },
  { value: 'cci', label: 'CCI' },
  { value: 'psy', label: 'PSY' },
  { value: 'none', label: '无' },
]

const TYPE_OPTIONS = [
  { value: 'candlestick', label: '蜡烛' },
  { value: 'line', label: '折线' },
  { value: 'area', label: '面积' },
]

export function App() {
  const [symbol, setSymbol] = usePersistedState('symbol', 'BTCUSDT')
  const [period, setPeriod] = usePersistedState<Period>('period', '1m')
  const [chartType, setChartType] = usePersistedState<ChartType>('chartType', 'candlestick')
  const [mainIndicator, setMainIndicator] = usePersistedState<MainIndicatorKind>('mainIndicator', 'ma')
  const [subIndicator, setSubIndicator] = usePersistedState<SubIndicatorKind>('subIndicator', 'volume')
  const [indicatorParams, setIndicatorParams] = usePersistedState<IndicatorParams>('indicatorParams', DEFAULT_INDICATOR_PARAMS)
  const [layout, setLayout] = usePersistedState<'single' | 'pair' | 'quad'>('layout', 'single')
  const [themeMode, setThemeMode] = usePersistedState<ThemeMode>('theme', 'dark')
  const [drawingsBySymbol, setDrawingsBySymbol] = usePersistedState<Record<string, Drawing[]>>('drawings', {})
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none')
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [replay, setReplay] = useState<ReplayState | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [positionOpen, setPositionOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [depthOpen, setDepthOpen] = useState(false)
  const [volumeProfileOpen, setVolumeProfileOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Service Worker 注册（生产环境）+ 通知点击定位交易对
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'focus-symbol' && typeof e.data.symbol === 'string') {
        setSymbol(e.data.symbol)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])

  // 多图模式不支持回放（时间轴同步与游标冲突）
  useEffect(() => {
    if (layout !== 'single') setReplay(null)
  }, [layout])

  // 主题应用（CSS 变量 + meta）
  useEffect(() => {
    applyTheme(themeMode)
  }, [themeMode])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }
  const { state, hasMore, loadMore } = useKlineData(symbol, period)
  const { candles, status, error } = state

  // 回放播放器：每 500ms 按速度推进；接近开头时自动加载更早历史
  useEffect(() => {
    if (!replay?.playing) return
    const timer = window.setInterval(() => {
      setReplay((r) => {
        if (!r) return r
        if (r.cursor < 50) void loadMore()
        return tickReplay(r, r.speed)
      })
    }, 500)
    return () => window.clearInterval(timer)
  }, [replay?.playing, loadMore])
  const stats = useMarketStats(symbol)
  const alertsApi = usePriceAlerts(
    candles.length > 0 ? { symbol, price: candles[candles.length - 1].close } : null,
  )

  // 提醒数据同步到 SW（后台提醒尽力版）
  useEffect(() => {
    if (!import.meta.env.PROD || !navigator.serviceWorker.controller) return
    navigator.serviceWorker.controller.postMessage({ type: 'alerts', alerts: alertsApi.alerts })
  }, [alertsApi.alerts])
  const depth = useDepth(symbol)
  const drawings = drawingsBySymbol[symbol] ?? []

  const commitDrawing = (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => {
    const created = createDrawing(d.type, d.points)
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: [...(prev[symbol] ?? []), created],
    }))
    setSelectedDrawingId(created.id)
  }
  const deleteSelectedDrawing = () => {
    if (!selectedDrawingId) return
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] ?? []).filter((d) => d.id !== selectedDrawingId),
    }))
    setSelectedDrawingId(null)
  }

  // 键盘快捷键：[ ] 切周期，Space 回放播放/暂停，Delete 删除选中画线
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return
      if (e.key === '[' || e.key === ']') {
        const idx = PERIODS.findIndex((p) => p.value === period)
        const next = PERIODS[Math.max(0, Math.min(PERIODS.length - 1, idx + (e.key === ']' ? 1 : -1)))]
        if (next) setPeriod(next.value)
      } else if (e.key === ' ') {
        e.preventDefault()
        setReplay((r) => (r ? { ...r, playing: !r.playing } : r))
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        deleteSelectedDrawing()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [period, selectedDrawingId, deleteSelectedDrawing])

  const statusColor =
    status === 'live' ? 'var(--up)' : status === 'error' ? 'var(--down)' : 'var(--yellow)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #2a2e39',
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {symbol.replace('USDT', '/USDT')}
        </span>
        <PeriodBar value={period} onChange={setPeriod} />
        <IndicatorBar
          group="类型"
          options={TYPE_OPTIONS}
          value={chartType}
          onChange={(v) => setChartType(v as ChartType)}
        />
        <IndicatorBar
          group="主图"
          options={MAIN_OPTIONS}
          value={mainIndicator}
          onChange={(v) => setMainIndicator(v as MainIndicatorKind)}
        />
        <IndicatorBar
          group="副图"
          options={SUB_OPTIONS}
          value={subIndicator}
          onChange={(v) => setSubIndicator(v as SubIndicatorKind)}
        />
        <DrawingToolbar
          tool={drawingTool}
          onChange={setDrawingTool}
          selected={selectedDrawingId !== null}
          onDeleteSelected={deleteSelectedDrawing}
        />
        <button
          onClick={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: layout !== 'single' ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: layout !== 'single' ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title="布局切换（单图/双图/四图）"
        >
          {layout === 'single' ? '单图' : layout === 'pair' ? '双图' : '四图'}
        </button>
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-dim)',
          }}
          title="切换主题"
        >
          {themeMode === 'dark' ? '浅色' : '深色'}
        </button>
        <button
          onClick={() => setPositionOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: positionOpen || position ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: positionOpen || position ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title="模拟仓位（开仓/止盈/止损线）"
        >
          仓位
        </button>
        <button
          onClick={() => setAlertsOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: alertsOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: alertsOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title="价格提醒"
        >
          提醒
        </button>
        <button
          onClick={() => setDepthOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: depthOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: depthOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title="盘口深度图"
        >
          深度
        </button>
        <button
          onClick={() => setVolumeProfileOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: volumeProfileOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: volumeProfileOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title="筹码分布（成交量分布 VPVR）"
        >
          筹码
        </button>
        <button
          onClick={() =>
            setReplay((r) => r ?? createReplay(candles.length, Math.max(0, candles.length - 300)))
          }
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: replay ? 'rgba(245,192,47,0.15)' : 'transparent',
            color: replay ? 'var(--yellow)' : 'var(--text-dim)',
          }}
          disabled={candles.length < 30}
          title={candles.length < 30 ? '数据不足（需 ≥30 根）' : '历史逐根回放'}
        >
          回放
        </button>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-dim)',
          }}
        >
          参数
        </button>
        <span style={{ marginLeft: 'auto' }} />
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? '退出全屏' : '全屏'}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-dim)',
          }}
        >
          {isFullscreen ? '退出全屏' : '全屏'}
        </button>
        <SymbolPicker value={symbol} onChange={setSymbol} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColor }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
            }}
          />
          {error ?? STATUS_TEXT[status] ?? status}
        </span>
      </header>
      <StatsBar stats={stats} />
      <OfflineBanner />
      {positionOpen && (
        <PositionPanel
          position={position}
          currentPrice={candles[candles.length - 1]?.close ?? stats.price}
          onChange={setPosition}
        />
      )}
      {alertsOpen && (
        <AlertPanel
          symbol={symbol}
          currentPrice={candles[candles.length - 1]?.close ?? null}
          alertsApi={alertsApi}
        />
      )}
      {settingsOpen && (
        <IndicatorSettings
          params={indicatorParams}
          mainIndicator={mainIndicator}
          subIndicator={subIndicator}
          onChange={setIndicatorParams}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {depthOpen && <DepthChart symbol={symbol} depth={depth} />}
      {volumeProfileOpen && <VolumeProfileChart symbol={symbol} candles={candles} />}
      <main style={{ flex: 1, minHeight: 0 }}>
        {layout === 'pair' ? (
          <ChartPair
            symbol={symbol}
            secondSymbol="ETHUSDT"
            themeMode={themeMode}
            period={period}
            chartType={chartType}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
          />
        ) : layout === 'quad' ? (
          <ChartQuad
            symbols={['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']}
            themeMode={themeMode}
            period={period}
            chartType={chartType}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
          />
        ) : (
          <ChartView
            symbol={symbol}
            period={period}
            candles={candles}
            status={status}
            themeMode={themeMode}
            chartType={chartType}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
            replay={replay}
            hasMore={hasMore}
            onLoadMore={loadMore}
            positionLines={position}
            onPositionDrag={(key, price) =>
              setPosition((prev) => (prev ? { ...prev, [key]: price } : prev))
            }
            drawings={drawings}
            drawingTool={drawingTool}
            onDrawingCommit={commitDrawing}
            onDrawingSelect={setSelectedDrawingId}
          />
        )}
      </main>
      {replay && (
        <ReplayBar
          replay={replay}
          cursorTime={candles[replay.cursor]?.time ?? null}
          onToggle={() => setReplay((r) => (r ? { ...r, playing: !r.playing } : r))}
          onSpeed={(s) => setReplay((r) => (r ? setSpeed(r, s) : r))}
          onSeek={(cursor) => setReplay((r) => (r ? seekReplay(r, cursor) : r))}
          onExit={() => setReplay(null)}
        />
      )}
    </div>
  )
}
