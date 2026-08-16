import { useEffect, useRef, useState } from 'react'
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
import { SYMBOL_LIST } from './hooks/useSymbolList'
import { useMarketStats } from './hooks/useMarketStats'
import { useSentiment } from './hooks/useSentiment'
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
import { OrderBook } from './components/OrderBook'
import { QuickOrder } from './components/QuickOrder'
import { SentimentPanel } from './components/SentimentPanel'
import { VolumeProfileChart } from './components/VolumeProfileChart'
import { OfflineBanner } from './components/OfflineBanner'
import type { Position } from './position/pnl'
import { buildPositionFromOrder, type OrderSide } from './trade/order'
import type { Drawing, DrawingTool } from './drawings/logic'
import { createDrawing } from './drawings/logic'
import { applyTheme, type ColorPresetId, type ThemeMode } from './theme'
import { ThemePicker } from './components/ThemePicker'
import { MobileHeader } from './components/MobileHeader'
import { MAIN_OPTIONS, SUB_OPTIONS, TYPE_OPTIONS, optionLabel } from './components/headerOptions'
import { useI18n, type Lang, type MessageKey } from './i18n'
import { buildCsv, csvFileName } from './utils/csv'
import { shortcutFor, isTypingTarget, cycleValue } from './shortcuts'

const STATUS_TEXT: Record<string, MessageKey> = {
  loading: 'status.loading',
  connecting: 'status.connecting',
  live: 'status.live',
  reconnecting: 'status.reconnecting',
  closed: 'status.closed',
  error: 'status.error',
}

export function App() {
  const { t, lang, setLang } = useI18n()
  // 语言循环切换：中文 → EN → 日本語 → 한국어 → Español
  const LANGS: Lang[] = ['zh-CN', 'en', 'ja', 'ko', 'es']
  const LANG_LABELS: Record<Lang, string> = { 'zh-CN': '中文', en: 'EN', ja: '日本語', ko: '한국어', es: 'ES' }
  const [symbol, setSymbol] = usePersistedState('symbol', 'BTCUSDT')
  const [period, setPeriod] = usePersistedState<Period>('period', '1m')
  const [chartType, setChartType] = usePersistedState<ChartType>('chartType', 'candlestick')
  const [priceScaleMode, setPriceScaleMode] = usePersistedState<'linear' | 'log'>('priceScale', 'linear')
  const [mainIndicator, setMainIndicator] = usePersistedState<MainIndicatorKind>('mainIndicator', 'ma')
  const [subIndicator, setSubIndicator] = usePersistedState<SubIndicatorKind>('subIndicator', 'volume')
  const [indicatorParams, setIndicatorParams] = usePersistedState<IndicatorParams>('indicatorParams', DEFAULT_INDICATOR_PARAMS)
  const [layout, setLayout] = usePersistedState<'single' | 'pair' | 'quad'>('layout', 'single')
  const [themeMode, setThemeMode] = usePersistedState<ThemeMode>('theme', 'dark')
  const [colorPreset, setColorPreset] = usePersistedState<ColorPresetId>('colorPreset', 'classic')
  const [drawingsBySymbol, setDrawingsBySymbol] = usePersistedState<Record<string, Drawing[]>>('drawings', {})
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none')
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [replay, setReplay] = useState<ReplayState | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [positionOpen, setPositionOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [depthOpen, setDepthOpen] = useState(false)
  const [orderBookOpen, setOrderBookOpen] = useState(false)
  const [obHoverPrice, setObHoverPrice] = useState<number | null>(null)
  const [obMarkPrice, setObMarkPrice] = useState<number | null>(null)
  const [quickOrder, setQuickOrder] = useState<{ side: OrderSide; price: number } | null>(null)
  const [volumeProfileOpen, setVolumeProfileOpen] = useState(false)
  const [sentimentOpen, setSentimentOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const [headerH, setHeaderH] = useState(0)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // 测量 header 实际高度（工具栏换行时变化）+ 窄屏检测：右侧面板抽屉定位依赖
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight))
    ro.observe(el)
    setHeaderH(el.offsetHeight)
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

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

  // 主题应用（模式 + 色预设 → CSS 变量 + meta）
  useEffect(() => {
    applyTheme(themeMode, colorPreset)
  }, [themeMode, colorPreset])

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
    navigator.serviceWorker.controller.postMessage({ type: 'alerts', alerts: alertsApi.alerts, lang })
  }, [alertsApi.alerts, lang])
  const depth = useDepth(symbol)
  const sentiment = useSentiment(symbol)
  const drawings = drawingsBySymbol[symbol] ?? []

  const commitDrawing = (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => {
    const created = createDrawing(d.type, d.points)
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: [...(prev[symbol] ?? []), created],
    }))
    setSelectedDrawingId(created.id)
    if (d.type === 'text') {
      setTextDraft('')
      setEditingTextId(created.id)
    }
  }
  const confirmTextDrawing = () => {
    if (!editingTextId) return
    const text = textDraft.trim()
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] ?? []).map((d) => (d.id === editingTextId ? { ...d, text } : d)),
    }))
    setEditingTextId(null)
    setTextDraft('')
  }
  const updateDrawing = (id: string, points: { time: number; price: number }[]) => {
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] ?? []).map((d) => (d.id === id ? { ...d, points } : d)),
    }))
  }
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId)
  const startEditingSelectedText = () => {
    if (selectedDrawing?.type !== 'text') return
    setTextDraft(selectedDrawing.text ?? '')
    setEditingTextId(selectedDrawing.id)
  }
  const deleteSelectedDrawing = () => {
    if (!selectedDrawingId) return
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] ?? []).filter((d) => d.id !== selectedDrawingId),
    }))
    setSelectedDrawingId(null)
  }

  // 分享链接：?symbol=&period= 打开时自动定位（校验白名单）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('symbol')
    if (s && SYMBOL_LIST.includes(s.toUpperCase())) setSymbol(s.toUpperCase())
    const p = params.get('period')
    if (p && PERIODS.some((x) => x.value === p)) setPeriod(p as Period)
  }, [])

  // 复制当前品种+周期的分享链接（clipboard 失败降级 execCommand）
  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?symbol=${encodeURIComponent(symbol)}&period=${period}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  // 导出当前品种/周期的 K 线 CSV（含当前主/副图指标列），BOM + <a download> 触发下载
  const exportCsv = () => {
    if (candles.length === 0) return
    const csv = buildCsv(candles, { symbol, period, mainIndicator, subIndicator, params: indicatorParams })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvFileName(symbol, period)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExported(true)
    window.setTimeout(() => setExported(false), 1500)
  }

  // 键盘快捷键（纯逻辑见 src/shortcuts.ts）：[ ] 周期、Space 回放、Delete 删画线、Esc 取消、
  // ⌘K / 打开搜索、F 全屏、1/2/3 布局、M/N 循环指标、? 帮助
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutFor(e, isTypingTarget(e.target as HTMLElement | null))
      switch (action.type) {
        case 'none':
          return
        case 'period-prev':
        case 'period-next': {
          const idx = PERIODS.findIndex((p) => p.value === period)
          const next = PERIODS[Math.max(0, Math.min(PERIODS.length - 1, idx + (action.type === 'period-next' ? 1 : -1)))]
          if (next) setPeriod(next.value)
          break
        }
        case 'replay-toggle':
          e.preventDefault()
          setReplay((r) => (r ? { ...r, playing: !r.playing } : r))
          break
        case 'delete-drawing':
          if (selectedDrawingId) deleteSelectedDrawing()
          break
        case 'open-search':
          e.preventDefault()
          window.dispatchEvent(new Event('open-symbol-picker'))
          break
        case 'toggle-fullscreen':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'set-layout':
          setLayout(action.layout)
          break
        case 'cycle-main':
          setMainIndicator(cycleValue(MAIN_OPTIONS.map((o) => o.value as MainIndicatorKind), mainIndicator, action.dir))
          break
        case 'cycle-sub':
          setSubIndicator(cycleValue(SUB_OPTIONS.map((o) => o.value as SubIndicatorKind), subIndicator, action.dir))
          break
        case 'toggle-shortcuts':
          e.preventDefault()
          setShortcutsOpen((v) => !v)
          break
        case 'escape':
          // Esc：关闭快捷键浮层 → 退出文本编辑 → 取消选中画线
          if (shortcutsOpen) setShortcutsOpen(false)
          else if (editingTextId) {
            setEditingTextId(null)
            setTextDraft('')
          } else if (selectedDrawingId) {
            setSelectedDrawingId(null)
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    period,
    selectedDrawingId,
    editingTextId,
    textDraft,
    shortcutsOpen,
    mainIndicator,
    subIndicator,
    deleteSelectedDrawing,
  ])

  const statusColor =
    status === 'live' ? 'var(--up)' : status === 'error' ? 'var(--down)' : 'var(--yellow)'
  const sidePanelOpen = depthOpen || orderBookOpen || volumeProfileOpen || sentimentOpen
  const statusText = error ?? (STATUS_TEXT[status] ? t(STATUS_TEXT[status]) : status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', ['--header-h' as string]: `${headerH}px`, ['--side-panel-w' as string]: sidePanelOpen && !isMobile ? 'min(380px, 88vw)' : '0px' }}>
      {isMobile ? (
        <MobileHeader
          headerRef={headerRef}
          symbol={symbol}
          onSymbol={setSymbol}
          statusText={statusText}
          statusColor={statusColor}
          period={period}
          onPeriod={setPeriod}
          chartType={chartType}
          onChartType={setChartType}
          priceScaleMode={priceScaleMode}
          onToggleScale={() => setPriceScaleMode((m) => (m === 'log' ? 'linear' : 'log'))}
          mainIndicator={mainIndicator}
          onMainIndicator={setMainIndicator}
          subIndicator={subIndicator}
          onSubIndicator={setSubIndicator}
          drawingTool={drawingTool}
          onDrawingTool={setDrawingTool}
          drawingSelected={selectedDrawingId !== null}
          onDeleteSelectedDrawing={deleteSelectedDrawing}
          onEditSelectedText={selectedDrawing?.type === 'text' ? startEditingSelectedText : undefined}
          layout={layout}
          onCycleLayout={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          themeMode={themeMode}
          onToggleTheme={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          colorPreset={colorPreset}
          onColorPreset={setColorPreset}
          positionActive={positionOpen || position !== null}
          onTogglePosition={() => setPositionOpen((v) => !v)}
          alertsActive={alertsOpen}
          onToggleAlerts={() => setAlertsOpen((v) => !v)}
          depthActive={depthOpen}
          onToggleDepth={() => setDepthOpen((v) => !v)}
          orderBookActive={orderBookOpen}
          onToggleOrderBook={() => setOrderBookOpen((v) => !v)}
          vpActive={volumeProfileOpen}
          onToggleVp={() => setVolumeProfileOpen((v) => !v)}
          sentimentActive={sentimentOpen}
          onToggleSentiment={() => setSentimentOpen((v) => !v)}
          replayActive={replay !== null}
          replayDisabled={candles.length < 30}
          onReplay={() => setReplay((r) => r ?? createReplay(candles.length, Math.max(0, candles.length - 300)))}
          settingsActive={settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          shortcutsActive={shortcutsOpen}
          onToggleShortcuts={() => setShortcutsOpen((v) => !v)}
          langLabel={LANG_LABELS[lang]}
          onCycleLang={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
          copied={copied}
          onShare={copyShareLink}
          exported={exported}
          onExport={exportCsv}
        />
      ) : (
      <header
        ref={headerRef}
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
          group={t('group.type')}
          options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: optionLabel(o, t) }))}
          value={chartType}
          onChange={(v) => setChartType(v as ChartType)}
        />
        <button
          onClick={() => setPriceScaleMode((m) => (m === 'log' ? 'linear' : 'log'))}
          data-testid="scale-toggle"
          title={t('scale.title')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: priceScaleMode === 'log' ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: priceScaleMode === 'log' ? '#4e9cf5' : 'var(--text-dim)',
          }}
        >
          {priceScaleMode === 'log' ? t('scale.log') : t('scale.linear')}
        </button>
        <IndicatorBar
          group={t('group.main')}
          options={MAIN_OPTIONS.map((o) => ({ value: o.value, label: optionLabel(o, t) }))}
          value={mainIndicator}
          onChange={(v) => setMainIndicator(v as MainIndicatorKind)}
        />
        <IndicatorBar
          group={t('group.sub')}
          options={SUB_OPTIONS.map((o) => ({ value: o.value, label: optionLabel(o, t) }))}
          value={subIndicator}
          onChange={(v) => setSubIndicator(v as SubIndicatorKind)}
        />
        <DrawingToolbar
          tool={drawingTool}
          onChange={setDrawingTool}
          selected={selectedDrawingId !== null}
          selectedText={selectedDrawing?.type === 'text' ? selectedDrawing.text : undefined}
          onDeleteSelected={deleteSelectedDrawing}
          onEditSelectedText={selectedDrawing?.type === 'text' ? startEditingSelectedText : undefined}
        />
        {editingTextId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmTextDrawing()
                if (e.key === 'Escape') setEditingTextId(null)
              }}
              placeholder={t('drawing.textPlaceholder')}
              autoFocus
              style={{
                width: 120,
                fontSize: 11,
                padding: '3px 6px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--panel)',
                color: 'var(--text)',
              }}
            />
            <button
              onClick={confirmTextDrawing}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              {t('common.confirm')}
            </button>
            <button
              onClick={() => setEditingTextId(null)}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-dim)',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
        <button
          data-testid="layout-toggle"
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
          title={t('layout.switchTitle')}
        >
          {layout === 'single' ? t('layout.single') : layout === 'pair' ? t('layout.pair') : t('layout.quad')}
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
          title={t('theme.switchTitle')}
        >
          {themeMode === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        </button>
        <ThemePicker value={colorPreset} onChange={setColorPreset} />
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
          title={t('panel.positionTitle')}
        >
          {t('panel.position')}
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
          title={t('panel.alertsTitle')}
        >
          {t('panel.alerts')}
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
          title={t('panel.depthTitle')}
        >
          {t('panel.depth')}
        </button>
        <button
          onClick={() => setOrderBookOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: orderBookOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: orderBookOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title={t('panel.orderBookTitle')}
        >
          {t('panel.orderBook')}
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
          title={t('panel.vpTitle')}
        >
          {t('panel.vp')}
        </button>
        <button
          onClick={() => setSentimentOpen((v) => !v)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: sentimentOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: sentimentOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
          title={t('panel.sentimentTitle')}
        >
          {t('panel.sentiment')}
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
          title={candles.length < 30 ? t('status.replayNotEnough') : t('replay.title')}
        >
          {t('replay.start')}
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
          {t('panel.settings')}
        </button>
        <span style={{ marginLeft: 'auto' }} />
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
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
          {isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
        </button>
        <button
          onClick={() => setShortcutsOpen((v) => !v)}
          title={t('shortcuts.hint')}
          data-testid="shortcuts-toggle"
          style={{
            padding: '3px 10px',
            fontSize: 11,
            border: '1px solid #2a2e39',
            borderRadius: 4,
            cursor: 'pointer',
            background: shortcutsOpen ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: shortcutsOpen ? '#4e9cf5' : 'var(--text-dim)',
          }}
        >
          ?
        </button>
        <button
          onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
          title={t('lang.switchTo')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-dim)',
          }}
        >
          {LANG_LABELS[lang]}
        </button>
        <button
          onClick={copyShareLink}
          title={t('share.title')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: copied ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: copied ? '#4e9cf5' : 'var(--text-dim)',
          }}
        >
          {copied ? t('share.copied') : t('share.copy')}
        </button>
        <button
          onClick={exportCsv}
          title={t('share.exportTitle')}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: exported ? 'rgba(41,98,255,0.25)' : 'transparent',
            color: exported ? '#4e9cf5' : 'var(--text-dim)',
          }}
        >
          {exported ? t('share.exported') : t('share.export')}
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
          {error ?? (STATUS_TEXT[status] ? t(STATUS_TEXT[status]) : status)}
        </span>
      </header>
      )}
      <StatsBar stats={stats} />
      <OfflineBanner />
      {quickOrder && (
        <QuickOrder
          symbol={symbol}
          side={quickOrder.side}
          price={quickOrder.price}
          onClose={() => setQuickOrder(null)}
          onConfirm={(order) => {
            setPosition(buildPositionFromOrder(order.side, order.price, order.qty))
            setPositionOpen(true)
            setQuickOrder(null)
          }}
        />
      )}
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
      <main style={{ flex: 1, minHeight: 0, marginRight: 'var(--side-panel-w)' }}>
        {layout === 'pair' ? (
          <ChartPair
            symbol={symbol}
            secondSymbol="ETHUSDT"
            themeMode={themeMode}
            colorPreset={colorPreset}
            period={period}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
            referencePrice={obHoverPrice}
            markerPrice={obMarkPrice}
          />
        ) : layout === 'quad' ? (
          <ChartQuad
            symbols={['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']}
            themeMode={themeMode}
            colorPreset={colorPreset}
            period={period}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
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
            colorPreset={colorPreset}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
            replay={replay}
            hasMore={hasMore}
            onLoadMore={loadMore}
            positionLines={position}
            referencePrice={obHoverPrice}
            markerPrice={obMarkPrice}
            onPositionDrag={(key, price) =>
              setPosition((prev) => (prev ? { ...prev, [key]: price } : prev))
            }
            drawings={drawings}
            drawingTool={drawingTool}
            selectedDrawingId={selectedDrawingId}
            onDrawingCommit={commitDrawing}
            onDrawingSelect={setSelectedDrawingId}
            onDrawingUpdate={updateDrawing}
          />
        )}
      </main>
      {sidePanelOpen && (
        <div
          data-testid="side-panels"
          style={{
            position: 'fixed',
            top: 'var(--header-h)',
            right: 0,
            bottom: 0,
            width: isMobile ? '100%' : 'var(--side-panel-w)',
            boxSizing: 'border-box',
            zIndex: 90,
            background: 'var(--panel)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.35)',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {depthOpen && <DepthChart symbol={symbol} depth={depth} />}
          {orderBookOpen && <OrderBook symbol={symbol} depth={depth} onHoverPrice={setObHoverPrice} onMarkPrice={(price) => setObMarkPrice((prev) => (prev === price ? null : price))}
            onQuickOrder={(price, side) => setQuickOrder({ side, price })} />}
          {volumeProfileOpen && <VolumeProfileChart symbol={symbol} candles={candles} />}
          {sentimentOpen && <SentimentPanel data={sentiment} />}
        </div>
      )}
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
      {shortcutsOpen && (
        <div
          data-testid="shortcuts-help"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 64,
            zIndex: 999,
            minWidth: 280,
            padding: '12px 16px',
            background: 'var(--panel)',
            border: '1px solid #2a2e39',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: 12,
            lineHeight: 1.9,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            {t('shortcuts.title')}
          </div>
          <div style={{ color: 'var(--text-dim)' }}>
            <div>{t('shortcuts.openSearch', { key: /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K' })}</div>
            <div>{t('shortcuts.period')}</div>
            <div>{t('shortcuts.layout')}</div>
            <div>{t('shortcuts.cycleMain')}</div>
            <div>{t('shortcuts.cycleSub')}</div>
            <div>{t('shortcuts.fullscreen')}</div>
            <div>{t('shortcuts.replay')}</div>
            <div>{t('shortcuts.deleteDrawing')}</div>
            <div>{t('shortcuts.escape')}</div>
            <div>{t('shortcuts.hint')}</div>
          </div>
        </div>
      )}
      {editingTextId && isMobile && (
        <div
          data-testid="mobile-text-editor"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 10px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <input
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmTextDrawing()
              if (e.key === 'Escape') setEditingTextId(null)
            }}
            placeholder={t('drawing.textPlaceholder')}
            autoFocus
            data-testid="mobile-text-input"
            style={{
              width: 170,
              fontSize: 13,
              padding: '6px 8px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--panel)',
              color: 'var(--text)',
            }}
          />
          <button
            onClick={confirmTextDrawing}
            data-testid="mobile-text-confirm"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            {t('common.confirm')}
          </button>
          <button
            onClick={() => setEditingTextId(null)}
            data-testid="mobile-text-cancel"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-dim)',
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
    </div>
  )
}
