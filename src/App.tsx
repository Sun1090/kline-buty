import { useCallback, useEffect, useRef, useState } from 'react'
import { PERIODS, PERIOD_MS, type Period } from './chart/types'
import { ChartView, type ChartType, type MainIndicatorKind, type SubIndicatorKind } from './components/ChartView'
import { ChartPair } from './components/ChartPair'
import { ChartQuad } from './components/ChartQuad'
import { IndicatorSettings } from './components/IndicatorSettings'
import { ReplayBar } from './components/ReplayBar'
import { useKlineData } from './hooks/useKlineData'
import { SYMBOL_LIST } from './hooks/useSymbolList'
import { useMarketStats } from './hooks/useMarketStats'
import { useSentiment } from './hooks/useSentiment'
import { StatsBar } from './components/StatsBar'
import { usePersistedState } from './hooks/usePersistedState'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from './indicators/params'
import { createReplay, tickReplay, seekReplay, setSpeed, cycleSpeed, type ReplayState } from './replay/engine'
import { PositionPanel } from './components/PositionPanel'
import { AlertPanel } from './components/AlertPanel'
import { usePriceAlerts } from './hooks/usePriceAlerts'
import { useDepth } from './hooks/useDepth'
import { DepthChart } from './components/DepthChart'
import { OrderBook } from './components/OrderBook'
import { QuickOrderWithDepth } from './components/QuickOrder'
import { SentimentPanel } from './components/SentimentPanel'
import { VolumeProfileChart } from './components/VolumeProfileChart'
import { OfflineBanner } from './components/OfflineBanner'
import { buildPositionFromOrder, estimateOrder, DEFAULT_SLIPPAGE_RATIO, TAKER_FEE_RATE, type OrderSide } from './trade/order'
import { calcPnl, checkHit, type Position } from './position/pnl'
import { usePaperAccount } from './hooks/usePaperAccount'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { tradesCsvFileName, tradesToCsv } from './utils/tradesCsv'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { PullToRefresh } from './components/PullToRefresh'
import {
  createDrawing,
  DEFAULT_TEXT_FONT_SIZE,
  TEXT_COLOR_OPTIONS,
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  toggleDrawingHidden,
  toggleDrawingLocked,
  type Drawing,
  type DrawingTool,
} from './drawings/logic'
import { normalizeSnapMode, type SnapMode } from './drawings/snap'
import { applyTheme, type ColorPresetId, type ThemeMode } from './theme'
import { nudgeAllCrosshairs, clearAllCrosshairs } from './chart/adapter'
import { parseDrawingsFile, serializeDrawings } from './drawings/io'
import {
  applyTemplate,
  createTemplate,
  sortTemplates,
  uniqueTemplateName,
  type DrawingTemplate,
} from './drawings/templates'
import {
  canRedo as drawingCanRedo,
  canUndo as drawingCanUndo,
  createHistory,
  pushSnapshot,
  redoSnapshot,
  undoSnapshot,
  type DrawingHistory,
} from './drawings/history'
import { MobileHeader } from './components/MobileHeader'
import { DesktopHeader } from './components/DesktopHeader'
import { MarketList } from './components/MarketList'
import { MAIN_OPTIONS, SUB_OPTIONS } from './components/headerOptions'
import { useI18n } from './i18n/useI18n'
import type { Lang, MessageKey } from './i18n/messages'
import { buildCsv, csvFileName } from './utils/csv'
import { shortcutFor, isTypingTarget, cycleValue } from './shortcuts'
import { nextBackTarget } from './chart/backNavigation'

// 壳内启用原生状态栏与启动屏；浏览器环境动态 import 会立即返回，不影响普通 Web 使用。
void Promise.all([import('@capacitor/status-bar'), import('@capacitor/splash-screen')]).then(async ([{ StatusBar }, { SplashScreen }]) => {
  const style = await StatusBar.getStyle()
  await StatusBar.setStyle({ style: style.style === 'Dark' ? 'Light' : 'Dark' })
  await StatusBar.setBackgroundColor({ color: '#0b0e14' })
  await SplashScreen.hide()
}).catch(() => undefined)

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
  const [timezoneMode, setTimezoneMode] = usePersistedState<'utc' | 'local'>('timezone', 'utc')
  // C3 吸附对齐模式（三态：off/time/ohlc）；持久化值兼容旧 boolean（true→ohlc/false→off），
  // 用 unknown 读取 + normalizeSnapMode 归一，setter 直接写新枚举值
  const [drawingSnapRaw, setDrawingSnapRaw] = usePersistedState<unknown>('drawingSnap', 'ohlc')
  const drawingSnap = normalizeSnapMode(drawingSnapRaw)
  const setDrawingSnap = (v: SnapMode) => setDrawingSnapRaw(v)
  // C12 便签全局显隐（持久化；隐藏不渲染 note，数据保留）
  const [notesHidden, setNotesHidden] = usePersistedState<boolean>('notesHidden', false)
  // T21：四图每格独立周期（会话态，默认全部跟随当前周期）
  const [quadPeriods, setQuadPeriods] = useState<[Period, Period, Period, Period] | null>(null)
  // T22：下拉刷新重挂载键
  const [reloadKey, setReloadKey] = useState(0)
  const [mainIndicator, setMainIndicator] = usePersistedState<MainIndicatorKind>('mainIndicator', 'ma')
  const [subIndicator, setSubIndicator] = usePersistedState<SubIndicatorKind>('subIndicator', 'volume')
  const [indicatorParams, setIndicatorParams] = usePersistedState<IndicatorParams>('indicatorParams', DEFAULT_INDICATOR_PARAMS)
  const [layout, setLayout] = usePersistedState<'single' | 'pair' | 'quad'>('layout', 'single')
  const [themeSetting, setThemeSetting] = usePersistedState<ThemeMode | 'auto'>('theme', 'dark')

  // T5：自动档跟随系统 prefers-color-scheme（设置持久化为 auto/dark/light，图表用派生的有效模式）
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const themeMode: ThemeMode = themeSetting === 'auto' ? (systemDark ? 'dark' : 'light') : themeSetting
  const [colorPreset, setColorPreset] = usePersistedState<ColorPresetId>('colorPreset', 'classic')
  const [showWatermark, setShowWatermark] = usePersistedState('watermark', true)
  const [drawingsBySymbol, setDrawingsBySymbol] = usePersistedState<Record<string, Drawing[]>>('drawings', {})
  /** 撤销/重做：按交易对隔离的会话内历史栈（不持久化）；按钮态在渲染期由 canUndo/canRedo 派生 */
  const drawingHistoryRef = useRef<Record<string, DrawingHistory>>({})
  /** C7 画线复制剪贴板：保存被复制的画线，跨品种/跨面板粘贴；state 驱动粘贴按钮可用态 */
  const clipboardDrawingRef = useRef<Drawing | null>(null)
  const [hasClipboardDrawing, setHasClipboardDrawing] = useState(false)
  /** 最新快照镜像：供异步回调（导入画线 JSON）读取变更前状态 */
  const drawingsRef = useRef(drawingsBySymbol)
  drawingsRef.current = drawingsBySymbol
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none')
  /** 新建画线默认颜色偏好（'' = 跟随主题），跨会话持久化 */
  const [drawingColor, setDrawingColor] = usePersistedState<string>('drawingColor', '')
  /** 画线模板（C6）：命名保存常用组合，跨品种一键套用；持久化，按名索引 */
  const [drawingTemplates, setDrawingTemplates] = usePersistedState<Record<string, DrawingTemplate>>('drawingTemplates', {})
  const cancelDrawingRef = useRef<(() => void) | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [textFontSize, setTextFontSize] = useState(DEFAULT_TEXT_FONT_SIZE)
  const [textColor, setTextColor] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [replay, setReplay] = useState<ReplayState | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [positionOpen, setPositionOpen] = useState(false)
  const [tradesOpen, setTradesOpen] = useState(false)
  // T15：模拟交易账户（余额 + 成交流水）
  const paper = usePaperAccount()
  const prevPositionRef = useRef<Position | null>(null)
  // T27：图表右键菜单动作（提醒/清空画线）
  useEffect(() => {
    const onRequestAlert = (e: Event) => {
      const detail = (e as CustomEvent<{ symbol: string; price: number }>).detail
      if (!detail || typeof detail.price !== 'number') return
      const ref = candles[candles.length - 1]?.close ?? null
      const direction = ref != null && detail.price < ref ? 'below' : 'above'
      alertsApi.addAlert(detail.symbol ?? symbol, direction, detail.price)
      setAlertsOpen(true)
    }
    const onClearDrawings = () => clearDrawings()
    window.addEventListener('chart-request-alert', onRequestAlert)
    window.addEventListener('chart-clear-drawings', onClearDrawings)
    return () => {
      window.removeEventListener('chart-request-alert', onRequestAlert)
      window.removeEventListener('chart-clear-drawings', onClearDrawings)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alertsApi/candles 取最新渲染闭包即可，事件监听只挂一次
  }, [])
  useEffect(() => {
    const prev = prevPositionRef.current
    const price = candles[candles.length - 1]?.close ?? null
    if (prev && price != null) {
      // D5 止盈/止损单模拟触发：最新价触达 TP/SL → 立即在本次记账平仓并重置仓位
      const hit = checkHit(prev, price)
      if (hit) {
        const fee = prev.entry * prev.quantity * TAKER_FEE_RATE
        const { pnl } = calcPnl(prev, price)
        paper.recordClose({
          symbol,
          side: prev.direction === 'long' ? 'buy' : 'sell',
          price,
          qty: prev.quantity,
          fee,
          pnl,
        })
        setPosition(null)
        prevPositionRef.current = null
        return
      }
    }
    if (prev && position === null && price != null) {
      const fee = prev.entry * prev.quantity * TAKER_FEE_RATE
      const { pnl } = calcPnl(prev, price)
      paper.recordClose({
        symbol,
        side: prev.direction === 'long' ? 'buy' : 'sell',
        price,
        qty: prev.quantity,
        fee,
        pnl,
      })
    }
    prevPositionRef.current = position
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 position 翻转时结算；paper/candles 变化不应重触发
  }, [position])
  // E4 面板折叠/展开记忆：市场数据面板状态持久化（刷新后恢复上次开合）
  const [alertsOpen, setAlertsOpen] = usePersistedState('alertsOpen', false)
  const [depthOpen, setDepthOpen] = usePersistedState('depthOpen', false)
  const [orderBookOpen, setOrderBookOpen] = usePersistedState('orderBookOpen', false)
  const [obHoverPrice, setObHoverPrice] = useState<number | null>(null)
  const [obMarkPrice, setObMarkPrice] = useState<number | null>(null)
  const [marketListOpen, setMarketListOpen] = usePersistedState('marketListOpen', true)
  const [marketListMobileOpen, setMarketListMobileOpen] = useState(false)
  const [quickOrder, setQuickOrder] = useState<{ side: OrderSide; price: number } | null>(null)
  const [volumeProfileOpen, setVolumeProfileOpen] = usePersistedState('volumeProfileOpen', false)
  const [sentimentOpen, setSentimentOpen] = usePersistedState('sentimentOpen', false)
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const [headerH, setHeaderH] = useState(0)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // Android 返回键：优先逐层关闭浮层；无可关闭状态时交还系统默认退出行为。
  useEffect(() => {
    let disposed = false
    let handle: { remove: () => Promise<void> } | null = null
    void import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => {
        const target = nextBackTarget({
          textEditing: Boolean(editingTextId),
          quickOrderOpen: quickOrder !== null,
          shortcutsOpen,
          settingsOpen,
          marketListMobileOpen,
          sidePanelOpen: depthOpen || orderBookOpen || volumeProfileOpen || sentimentOpen,
          replayActive: replay !== null,
          selectedDrawing: selectedDrawingId !== null,
        })
        if (!target) return
        if (target === 'text-editor') {
          setEditingTextId(null)
          setTextDraft('')
          setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
          setTextColor('')
          return
        }
        if (target === 'quick-order') setQuickOrder(null)
        if (target === 'shortcuts') setShortcutsOpen(false)
        if (target === 'indicator-settings') setSettingsOpen(false)
        if (target === 'market-list') setMarketListMobileOpen(false)
        if (target === 'side-panel') {
          setDepthOpen(false)
          setOrderBookOpen(false)
          setVolumeProfileOpen(false)
          setSentimentOpen(false)
        }
        if (target === 'replay') setReplay(null)
        if (target === 'selected-drawing') setSelectedDrawingId(null)
      }))
      .then((subscription) => {
        if (disposed) void subscription?.remove()
        else handle = subscription ?? null
      })
      .catch(() => undefined)
    return () => {
      disposed = true
      void handle?.remove()
    }
  }, [
    editingTextId,
    quickOrder,
    shortcutsOpen,
    settingsOpen,
    marketListMobileOpen,
    depthOpen,
    orderBookOpen,
    volumeProfileOpen,
    sentimentOpen,
    setDepthOpen,
    setOrderBookOpen,
    setVolumeProfileOpen,
    setSentimentOpen,
    replay,
    selectedDrawingId,
  ])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once 订阅，setSymbol 引用稳定
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

  /**
   * 统一的画线变更入口：先记录变更前快照到 undo 栈（会话内，不持久化），
   * 再应用变更。撤销栈按交易对隔离，切换品种互不污染。
   */
  const mutateDrawings = useCallback((mutator: (prev: Drawing[]) => Drawing[]) => {
    // 快照读自镜像 ref，确保异步回调（导入）场景也拿到「变更前」最新值
    const before = drawingsRef.current[symbol] ?? []
    const hist = drawingHistoryRef.current[symbol] ?? createHistory()
    drawingHistoryRef.current[symbol] = pushSnapshot(hist, before)
    setDrawingsBySymbol((prev) => ({ ...prev, [symbol]: mutator(prev[symbol] ?? []) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setter 引用稳定，加入会破坏回调稳定性
  }, [symbol])

  /** 撤销画线编辑：恢复历史快照，当前状态入 redo 栈 */
  const undoDrawings = useCallback(() => {
    const hist = drawingHistoryRef.current[symbol] ?? createHistory()
    if (!drawingCanUndo(hist)) return
    const { history, state } = undoSnapshot(hist, drawingsBySymbol[symbol] ?? [])
    drawingHistoryRef.current[symbol] = history
    setDrawingsBySymbol((prev) => ({ ...prev, [symbol]: state }))
    setSelectedDrawingId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setter 引用稳定，加入会破坏回调稳定性
  }, [symbol, drawingsBySymbol])

  /** 重做画线编辑：从 redo 栈恢复，当前状态入 undo 栈 */
  const redoDrawings = useCallback(() => {
    const hist = drawingHistoryRef.current[symbol] ?? createHistory()
    if (!drawingCanRedo(hist)) return
    const { history, state } = redoSnapshot(hist, drawingsBySymbol[symbol] ?? [])
    drawingHistoryRef.current[symbol] = history
    setDrawingsBySymbol((prev) => ({ ...prev, [symbol]: state }))
    setSelectedDrawingId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setter 引用稳定，加入会破坏回调稳定性
  }, [symbol, drawingsBySymbol])

  const canUndoDrawings = drawingCanUndo(drawingHistoryRef.current[symbol] ?? createHistory())
  const canRedoDrawings = drawingCanRedo(drawingHistoryRef.current[symbol] ?? createHistory())

  /** 取消进行中的多锚点画线进度（由 ChartView 转发到 adapter） */
  const cancelDrawingProgress = useCallback(() => {
    cancelDrawingRef.current?.()
  }, [])

  const commitDrawing = (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => {
    const created = { ...createDrawing(d.type, d.points), color: drawingColor || undefined }
    mutateDrawings((prev) => [...prev, created])
    setSelectedDrawingId(created.id)
    // 移动端画线完成自动切回「鼠标」只读模式：避免再次轻点误建画线，
    // 且可直接触屏拖拽编辑（桌面端保持工具不切，连续画线）
    if (isMobile) setDrawingTool('none')
    if (d.type === 'text' || d.type === 'note') {
      setTextDraft('')
      setEditingTextId(created.id)
    }
  }
  const confirmTextDrawing = () => {
    if (!editingTextId) return
    const text = textDraft.trim()
    mutateDrawings((prev) =>
      prev.map((d) =>
        d.id === editingTextId ? { ...d, text, fontSize: textFontSize, color: textColor || undefined } : d,
      ),
    )
    setEditingTextId(null)
    setTextDraft('')
    setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
    setTextColor('')
  }
  const updateDrawing = (id: string, points: { time: number; price: number }[]) => {
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, points } : d)))
  }
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId)
  const startEditingText = (id: string) => {
    const d = drawings.find((x) => x.id === id)
    if (!d || (d.type !== 'text' && d.type !== 'note')) return
    setSelectedDrawingId(id)
    setTextDraft(d.text ?? '')
    setTextFontSize(d.fontSize ?? DEFAULT_TEXT_FONT_SIZE)
    setTextColor(d.color ?? '')
    setEditingTextId(id)
  }
  const startEditingSelectedText = () => {
    if (selectedDrawing?.type === 'text' || selectedDrawing?.type === 'note') startEditingText(selectedDrawing.id)
  }
  const deleteSelectedDrawing = () => {
    if (!selectedDrawingId) return
    mutateDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId))
    setSelectedDrawingId(null)
  }

  // 图层管理：按 id 切换隐藏/锁定、删除单条、清空当前交易对全部画线
  // T19：画线 JSON 导出/导入
  const [drawingImportError, setDrawingImportError] = useState<string | null>(null)
  const exportDrawings = () => {
    const list = drawingsBySymbol[symbol] ?? []
    if (list.length === 0) return
    const blob = new Blob([serializeDrawings(symbol, list)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${symbol}-drawings.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const importDrawings = (file: File) => {
    const mismatchMsg = t('layers.importSymbolMismatch')
    const badMsg = t('layers.importBad')
    void file.text().then((text) => {
      const existing = new Set((drawingsBySymbol[symbol] ?? []).map((d) => d.id))
      const r = parseDrawingsFile(text, symbol, existing)
      if (!r.ok) {
        setDrawingImportError(r.error === 'symbol' ? mismatchMsg : badMsg)
        window.setTimeout(() => setDrawingImportError(null), 3000)
        return
      }
      if (r.imported > 0) {
        mutateDrawings((prev) => [...prev, ...r.drawings])
      }
    })
  }
  const setAllDrawingsHidden = (hidden: boolean) => {
    mutateDrawings((prev) => prev.map((d) => ({ ...d, hidden })))
  }
  const toggleHidden = (id: string) => {
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? toggleDrawingHidden(d) : d)))
  }
  const toggleLocked = (id: string) => {
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? toggleDrawingLocked(d) : d)))
  }
  // C10 单条透明度：0.15–1 范围调节（可撤销）
  const setDrawingOpacity = (id: string, opacity: number) => {
    const v = Math.min(1, Math.max(0.15, opacity))
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, opacity: v } : d)))
  }
  const deleteDrawing = (id: string) => {
    mutateDrawings((prev) => prev.filter((d) => d.id !== id))
    if (selectedDrawingId === id) setSelectedDrawingId(null)
  }
  const clearDrawings = () => {
    mutateDrawings(() => [])
    setSelectedDrawingId(null)
  }

  // 画线模板（C6）：保存当前组合为命名模板、一键套用、删除模板
  const saveDrawingTemplate = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || drawings.length === 0) return
    const unique = uniqueTemplateName(trimmed, new Set(Object.keys(drawingTemplates)))
    setDrawingTemplates((prev) => ({ ...prev, [unique]: createTemplate(unique, drawings) }))
  }
  const applyDrawingTemplate = (name: string) => {
    const tmpl = drawingTemplates[name]
    if (!tmpl) return
    mutateDrawings((prev) => applyTemplate(prev, tmpl))
  }
  const deleteDrawingTemplate = (name: string) => {
    setDrawingTemplates((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  // C7 画线复制/粘贴：复制选中画线到剪贴板，粘贴生成新 id 并按一个周期柱距右移（避免与原件重叠不可见）
  const copySelectedDrawing = () => {
    const sel = drawings.find((d) => d.id === selectedDrawingId)
    if (sel) {
      clipboardDrawingRef.current = sel
      setHasClipboardDrawing(true)
    }
  }
  const pasteClipboardDrawing = () => {
    const src = clipboardDrawingRef.current
    if (!src) return
    const shift = PERIOD_MS[period] / 1000 || 60 // 秒级偏移，默认 1m
    mutateDrawings((prev) => [
      ...prev,
      {
        ...src,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        points: src.points.map((p) => ({ time: p.time + shift, price: p.price })),
      },
    ])
    setSelectedDrawingId(null)
  }

  // 分享链接：?symbol=&period= 打开时自动定位（校验白名单）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('symbol')
    if (s && SYMBOL_LIST.includes(s.toUpperCase())) setSymbol(s.toUpperCase())
    const p = params.get('period')
    if (p && PERIODS.some((x) => x.value === p)) setPeriod(p as Period)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once URL 参数解析，setState 引用稳定
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

  // D14 导出交易流水 CSV（纯函数生成文本，BOM + <a download> 触发下载）
  const exportTradesCsv = () => {
    if (paper.trades.length === 0) return
    const csv = tradesToCsv(paper.trades)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = tradesCsvFileName()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        case 'replay-step':
          // 回放中：步进回放；非回放：键盘微移十字光标
          if (replay) setReplay((r) => (r ? seekReplay(r, r.cursor + action.dir) : r))
          else nudgeAllCrosshairs(action.dir)
          break
        case 'replay-speed':
          setReplay((r) => (r ? cycleSpeed(r, action.dir) : r))
          break
        case 'delete-drawing':
          if (selectedDrawingId) deleteSelectedDrawing()
          break
        case 'copy-drawing':
          e.preventDefault()
          copySelectedDrawing()
          break
        case 'paste-drawing':
          e.preventDefault()
          pasteClipboardDrawing()
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
          // Esc：关闭模态/侧栏面板 → 关闭快捷键浮层 → 退出文本编辑 → 取消画线进度 → 取消选中画线
          if (settingsOpen) setSettingsOpen(false)
          else if (alertsOpen) setAlertsOpen(false)
          else if (positionOpen) setPositionOpen(false)
          else if (shortcutsOpen) setShortcutsOpen(false)
          else if (editingTextId) {
            setEditingTextId(null)
            setTextDraft('')
            setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
            setTextColor('')
          } else if (drawingTool !== 'none') {
            cancelDrawingProgress()
            setDrawingTool('none')
          } else if (selectedDrawingId) {
            setSelectedDrawingId(null)
          } else if (replay) {
            setReplay(null)
          } else {
            clearAllCrosshairs()
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setLayout/setMainIndicator/setPeriod/setSubIndicator 为 stable setState，无需列入
  }, [
    period,
    selectedDrawingId,
    editingTextId,
    textDraft,
    shortcutsOpen,
    settingsOpen,
    alertsOpen,
    positionOpen,
    drawingTool,
    cancelDrawingProgress,
    mainIndicator,
    subIndicator,
    deleteSelectedDrawing,
    replay,
  ])

  const statusColor =
    status === 'live' ? 'var(--up)' : status === 'error' ? 'var(--down)' : 'var(--yellow)'
  const sidePanelOpen = depthOpen || orderBookOpen || volumeProfileOpen || sentimentOpen
  const statusText = error ?? (STATUS_TEXT[status] ? t(STATUS_TEXT[status]) : status)
  // 全局 Esc 链路上存在比顶栏弹层更高的层（与 keydown 'escape' 分支优先级一致）：此时顶栏不劫持 Esc
  const escChainActive =
    settingsOpen ||
    alertsOpen ||
    positionOpen ||
    shortcutsOpen ||
    editingTextId !== null ||
    drawingTool !== 'none' ||
    selectedDrawingId !== null ||
    replay !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', ['--header-h' as string]: `${headerH}px`, ['--side-panel-w' as string]: sidePanelOpen && !isMobile ? 'min(380px, 88vw)' : '0px' }}>
      {isMobile ? (
        <MobileHeader
          headerRef={headerRef}
          escChainActive={escChainActive}
          themeSetting={themeSetting}
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
          timezoneMode={timezoneMode}
          onToggleTimezone={() => setTimezoneMode((m) => (m === 'utc' ? 'local' : 'utc'))}
          mainIndicator={mainIndicator}
          onMainIndicator={setMainIndicator}
          subIndicator={subIndicator}
          onSubIndicator={setSubIndicator}
          drawingTool={drawingTool}
          drawingColor={drawingColor}
          onDrawingColor={setDrawingColor}
          onDrawingTool={setDrawingTool}
          drawingSelected={selectedDrawingId !== null}
          onDeleteSelectedDrawing={deleteSelectedDrawing}
          onEditSelectedText={selectedDrawing?.type === 'text' || selectedDrawing?.type === 'note' ? startEditingSelectedText : undefined}
          drawings={drawings}
          selectedDrawingId={selectedDrawingId}
          onSelectDrawing={setSelectedDrawingId}
          onToggleDrawingHidden={toggleHidden}
          onToggleDrawingLocked={toggleLocked}
          onSetDrawingOpacity={setDrawingOpacity}
          onDeleteDrawing={deleteDrawing}
          onClearDrawings={clearDrawings}
          onSetAllDrawingsHidden={setAllDrawingsHidden}
          drawingSnap={drawingSnap}
          onToggleDrawingSnap={() => setDrawingSnap(drawingSnap === 'off' ? 'time' : drawingSnap === 'time' ? 'ohlc' : 'off')}
          notesHidden={notesHidden}
          onToggleNotesHidden={() => setNotesHidden((v) => !v)}
          tradesActive={tradesOpen}
          onToggleTrades={() => setTradesOpen((v) => {
            if (!v) setPositionOpen(false)
            return !v
          })}
          onExportDrawings={exportDrawings}
          onImportDrawings={importDrawings}
          drawingImportError={drawingImportError}
          drawingCanUndo={canUndoDrawings}
          drawingCanRedo={canRedoDrawings}
          onUndoDrawing={undoDrawings}
          onRedoDrawing={redoDrawings}
          drawingTemplates={sortTemplates(drawingTemplates)}
          onSaveDrawingTemplate={saveDrawingTemplate}
          onApplyDrawingTemplate={applyDrawingTemplate}
          onDeleteDrawingTemplate={deleteDrawingTemplate}
          drawingCanPaste={hasClipboardDrawing}
          onCopyDrawing={copySelectedDrawing}
          onPasteDrawing={pasteClipboardDrawing}
          layout={layout}
          onCycleLayout={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          themeMode={themeMode}
          onToggleTheme={() => setThemeSetting(themeSetting === 'auto' ? 'dark' : themeSetting === 'dark' ? 'light' : 'auto')}
          colorPreset={colorPreset}
          onColorPreset={setColorPreset}
          showWatermark={showWatermark}
          onToggleWatermark={() => setShowWatermark((v) => !v)}
          positionActive={positionOpen || position !== null}
          onTogglePosition={() => setPositionOpen((v) => {
            if (!v) setTradesOpen(false)
            return !v
          })}
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
          marketListActive={marketListMobileOpen}
          onToggleMarketList={() => setMarketListMobileOpen((v) => !v)}
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
        <DesktopHeader
          headerRef={headerRef}
          escChainActive={escChainActive}
          themeSetting={themeSetting}
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
          timezoneMode={timezoneMode}
          onToggleTimezone={() => setTimezoneMode((m) => (m === 'utc' ? 'local' : 'utc'))}
          mainIndicator={mainIndicator}
          onMainIndicator={setMainIndicator}
          subIndicator={subIndicator}
          onSubIndicator={setSubIndicator}
          drawingTool={drawingTool}
          drawingColor={drawingColor}
          onDrawingColor={setDrawingColor}
          onDrawingTool={setDrawingTool}
          drawingSelected={selectedDrawingId !== null}
          onDeleteSelectedDrawing={deleteSelectedDrawing}
          onEditSelectedText={selectedDrawing?.type === 'text' || selectedDrawing?.type === 'note' ? startEditingSelectedText : undefined}
          drawings={drawings}
          selectedDrawingId={selectedDrawingId}
          onSelectDrawing={setSelectedDrawingId}
          onToggleDrawingHidden={toggleHidden}
          onToggleDrawingLocked={toggleLocked}
          onSetDrawingOpacity={setDrawingOpacity}
          onDeleteDrawing={deleteDrawing}
          onClearDrawings={clearDrawings}
          onSetAllDrawingsHidden={setAllDrawingsHidden}
          drawingSnap={drawingSnap}
          onToggleDrawingSnap={() => setDrawingSnap(drawingSnap === 'off' ? 'time' : drawingSnap === 'time' ? 'ohlc' : 'off')}
          notesHidden={notesHidden}
          onToggleNotesHidden={() => setNotesHidden((v) => !v)}
          tradesActive={tradesOpen}
          onToggleTrades={() => setTradesOpen((v) => {
            if (!v) setPositionOpen(false)
            return !v
          })}
          onExportDrawings={exportDrawings}
          onImportDrawings={importDrawings}
          drawingImportError={drawingImportError}
          drawingCanUndo={canUndoDrawings}
          drawingCanRedo={canRedoDrawings}
          onUndoDrawing={undoDrawings}
          onRedoDrawing={redoDrawings}
          drawingTemplates={sortTemplates(drawingTemplates)}
          onSaveDrawingTemplate={saveDrawingTemplate}
          onApplyDrawingTemplate={applyDrawingTemplate}
          onDeleteDrawingTemplate={deleteDrawingTemplate}
          drawingCanPaste={hasClipboardDrawing}
          onCopyDrawing={copySelectedDrawing}
          onPasteDrawing={pasteClipboardDrawing}
          layout={layout}
          onCycleLayout={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          themeMode={themeMode}
          onToggleTheme={() => setThemeSetting(themeSetting === 'auto' ? 'dark' : themeSetting === 'dark' ? 'light' : 'auto')}
          colorPreset={colorPreset}
          onColorPreset={setColorPreset}
          showWatermark={showWatermark}
          onToggleWatermark={() => setShowWatermark((v) => !v)}
          positionActive={positionOpen || position !== null}
          onTogglePosition={() => setPositionOpen((v) => {
            if (!v) setTradesOpen(false)
            return !v
          })}
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
          editingTextId={editingTextId}
          textDraft={textDraft}
          textFontSize={textFontSize}
          textColor={textColor}
          onTextDraftChange={setTextDraft}
          onTextFontSizeChange={setTextFontSize}
          onTextColorChange={setTextColor}
          onConfirmText={confirmTextDrawing}
          onCancelText={() => {
            setEditingTextId(null)
            setTextDraft('')
            setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
            setTextColor('')
          }}
        />
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isMobile && (
          <MarketList
            symbol={symbol}
            onSelectSymbol={setSymbol}
            open={marketListOpen}
            onToggle={() => setMarketListOpen((v) => !v)}
          />
        )}
        {isMobile && marketListMobileOpen && (
          <div
            data-testid="market-list-overlay"
            style={{
              position: 'fixed',
              top: 'var(--header-h)',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 88,
              background: 'var(--panel)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <MarketList
              symbol={symbol}
              onSelectSymbol={(sel) => {
                setSymbol(sel)
                setMarketListMobileOpen(false)
              }}
              open
              overlay
              onToggle={() => setMarketListMobileOpen(false)}
            />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <StatsBar stats={stats} live={state.live} period={period} lastCandleTime={state.candles.length ? state.candles[state.candles.length - 1].time : null} />
      <OfflineBanner />
      {quickOrder && (
        <QuickOrderWithDepth
          symbol={symbol}
          side={quickOrder.side}
          price={quickOrder.price}
          balance={paper.balance}
          onClose={() => setQuickOrder(null)}
          onConfirm={(order) => {
            // 市价单含模拟滑点：成交价相对盘口小幅偏移
            const est = estimateOrder(order.price, order.qty, order.side, DEFAULT_SLIPPAGE_RATIO)
            if (!paper.canOpen(est.notional, est.fee)) return
            paper.recordOpen({ symbol, side: order.side, price: est.fillPrice, qty: order.qty, fee: est.fee })
            setPosition(buildPositionFromOrder(order.side, est.fillPrice, order.qty))
            setPositionOpen(true)
            setTradesOpen(false)
            setQuickOrder(null)
          }}
        />
      )}
      {tradesOpen && (
        <TradeHistoryPanel
          trades={paper.trades}
          onClose={() => setTradesOpen(false)}
          onClear={paper.clearTrades}
          onExport={exportTradesCsv}
          onReset={paper.reset}
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
      <main key={`chart-${reloadKey}`} style={{ flex: 1, minHeight: 0, marginRight: 'var(--side-panel-w)' }}>
        <PullToRefresh enabled={isMobile} onRefresh={() => setReloadKey((k) => k + 1)}>
        {layout === 'pair' ? (
          <ChartPair
            symbol={symbol}
            secondSymbol="ETHUSDT"
            themeMode={themeMode}
            colorPreset={colorPreset}
            showWatermark={showWatermark}
            period={period}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
          timezoneMode={timezoneMode}
          drawingSnap={drawingSnap}
          notesHidden={notesHidden}
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
            showWatermark={showWatermark}
            period={period}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
          timezoneMode={timezoneMode}
          drawingSnap={drawingSnap}
          notesHidden={notesHidden}
          periods={quadPeriods ?? undefined}
          onCellPeriod={(i, p) => setQuadPeriods((prev) => { const next = (prev ?? [period, period, period, period]) as [Period, Period, Period, Period]; next[i] = p; return [...next] })}
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
            showWatermark={showWatermark}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
          timezoneMode={timezoneMode}
          drawingSnap={drawingSnap}
          notesHidden={notesHidden}
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
            onEditText={startEditingText}
            onCancelDrawingProgress={cancelDrawingProgress}
            onCancelDrawingProgressRef={cancelDrawingRef}
          />
        )}
          </PullToRefresh>
      </main>
        </div>
      </div>
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
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
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
      {shortcutsOpen && <ShortcutsHelp />}
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
            flexDirection: 'column',
            gap: 6,
            padding: '8px 10px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmTextDrawing()
                if (e.key === 'Escape') setEditingTextId(null)
              }}
              placeholder={t('drawing.textPlaceholder')}
              autoFocus
              rows={2}
              data-testid="mobile-text-input"
              style={{
                width: 170,
                minHeight: 44,
                fontSize: 13,
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--panel)',
                color: 'var(--text)',
                resize: 'vertical',
                lineHeight: 1.4,
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
          <div
            data-testid="mobile-text-options"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('drawing.fontSize')}</span>
            <button
              onClick={() => setTextFontSize(Math.max(TEXT_FONT_SIZE_MIN, textFontSize - 2))}
              data-testid="mobile-text-font-dec"
              aria-label={`${t('drawing.fontSize')} -`}
              style={{
                padding: '2px 8px',
                fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text)',
              }}
            >
              A−
            </button>
            <span data-testid="mobile-text-font-value" style={{ fontSize: 12, color: 'var(--text)', minWidth: 22, textAlign: 'center' }}>
              {textFontSize}
            </span>
            <button
              onClick={() => setTextFontSize(Math.min(TEXT_FONT_SIZE_MAX, textFontSize + 2))}
              data-testid="mobile-text-font-inc"
              aria-label={`${t('drawing.fontSize')} +`}
              style={{
                padding: '2px 8px',
                fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text)',
              }}
            >
              A+
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{t('drawing.color')}</span>
            {TEXT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                data-testid={`mobile-text-color-${opt.id}`}
                aria-label={`${t('drawing.color')} ${opt.id}`}
                aria-pressed={textColor === opt.color}
                onClick={() => setTextColor(opt.color)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: textColor === opt.color ? '2px solid #fff' : '1px solid var(--border)',
                  cursor: 'pointer',
                  background: opt.color || 'transparent',
                  ...(opt.color
                    ? {}
                    : {
                        background: 'transparent',
                        border: '1px dashed var(--border)',
                        color: 'var(--text)',
                        fontSize: 11,
                        lineHeight: '18px',
                      }),
                }}
              >
                {opt.color ? '' : 'A'}
              </button>
            ))}
          </div>
        </div>
      )}
      <footer
        data-testid="disclaimer"
        style={{
          flexShrink: 0,
          padding: '3px 16px',
          fontSize: 11,
          color: 'var(--text-faint)',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {t('disclaimer.text')}
      </footer>
    </div>
  )
}
