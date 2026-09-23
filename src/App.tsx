/* eslint-disable max-lines -- O3 治理基线：App 为应用根组件，聚合布局/行情/画线/交易等全部面板，行数已超新代码阈值；复杂度与行数上限对新文件生效，App 内新增逻辑应抽到 hooks/utils 层。 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PERIODS, PERIOD_MS, type Period } from './chart/types'
import { ChartView, type ChartType, type MainIndicatorKind, type SubIndicatorKind } from './components/ChartView'
import { ChartPair } from './components/ChartPair'
import { ChartQuad } from './components/ChartQuad'
import { IndicatorSettings } from './components/IndicatorSettings'
import { ReplayBar } from './components/ReplayBar'
import { useKlineData } from './hooks/useKlineData'
import { SYMBOL_LIST } from './hooks/useSymbolList'
import { useMarketStats } from './hooks/useMarketStats'
import { downsampleCandles } from './chart/downsample'
import { atrPercent } from './chart/volatility'
import { recommendIndicators } from './indicators/recommend'
import { suggestFromDrawings } from './drawings/semantics'
import { useSentiment } from './hooks/useSentiment'
import { StatsBar } from './components/StatsBar'
import { usePersistedState } from './hooks/usePersistedState'
import { usePrefetch } from './hooks/usePrefetch'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from './indicators/params'
import { createReplay, tickReplay, seekReplay, setSpeed, cycleSpeed, type ReplayState } from './replay/engine'
import { PositionPanel } from './components/PositionPanel'
import { AlertPanel } from './components/AlertPanel'
import { usePriceAlerts } from './hooks/usePriceAlerts'
import { useDepth } from './hooks/useDepth'
import { OrderBook } from './components/OrderBook'
import { QuickOrderWithDepth, type OrderType } from './components/QuickOrder'
import { OfflineBanner } from './components/OfflineBanner'
import { estimateOrder, feeForPrice, type OrderSide } from './trade/order'
import { calcPnl, type Position } from './position/pnl'
import { dragLevel } from './position/levels'
import { DEFAULT_SL_PCT, DEFAULT_TP_PCT, EMPTY_POSITIONS, applyOrder as applyHedgeOrder, planReduce, reverseSlot, settleSlot, type Positions } from './trade/positions'
import { usePaperAccount, type TradeRecord } from './hooks/usePaperAccount'
import { useTradeSettings } from './hooks/useTradeSettings'
import { usePendingOrders } from './hooks/usePendingOrders'
import { useSymbolPrices } from './hooks/useSymbolPrices'
import { useLimitOrderFills } from './hooks/useLimitOrderFills'
import { usePositionSettlement } from './hooks/usePositionSettlement'
import type { TpSlExit } from './trade/tpsl'
import { createPendingOrder, ORDERS_PER_SYMBOL_MAX } from './trade/pending'
import { useScheduledTheme } from './hooks/useScheduledTheme'
import { tradeStats } from './trade/stats'
import { todayRealizedPnl } from './trade/daily'
import { tradeMarkersFor } from './trade/markers'
import { locateRangeFor } from './trade/locate'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { PerfPanel } from './components/PerfPanel'
import { ChangelogModal } from './components/ChangelogModal'
import { SnapshotGallery } from './components/SnapshotGallery'
import { PinnedPanel } from './components/PinnedPanel'
import { DocsIndexModal } from './components/DocsIndexModal'
import { tradesCsvFileName, tradesToCsv } from './utils/tradesCsv'
import { equityCsvFileName, equityToCsv } from './utils/equityCsv'
import { shareTextFile } from '@shell/share'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { ShortcutsSettings } from './components/ShortcutsSettings'
import { PullToRefresh } from './components/PullToRefresh'
import {
  createDrawing,
  DEFAULT_TEXT_FONT_SIZE,
  TEXT_COLOR_OPTIONS,
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  toggleDrawingHidden,
  toggleDrawingLocked,
  toggleGroupHidden,
  toggleGroupLocked,
  type Drawing,
  type DrawingTool,
} from './drawings/logic'
import { normalizeSnapMode, type SnapMode } from './drawings/snap'
import { applyTheme, type ColorPresetId, type ScheduleThemeConfig, type ThemeMode, type ThemeSetting } from './theme'
import { nudgeAllCrosshairs, clearAllCrosshairs } from './chart/adapter'
import { volumeSurgeRatio } from './chart/volumeSurge'
import { findGaps, gapHealth } from './chart/dataHealth'
import { parseDrawingsFile, serializeDrawings } from './drawings/io'
import {
  applyTemplate,
  createTemplate,
  sortTemplates,
  uniqueTemplateName,
  type DrawingTemplate,
} from './drawings/templates'
import { mergeTemplates, parseTemplatesFile } from './drawings/templateMarket'
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
import { checkVersionUpdate, readMetaVersion } from './utils/versionCheck'
import { applySettingsSnapshot, buildSettingsSnapshot } from './utils/settingsSnapshot'
import { storageAdvisory } from './utils/storageMonitor'
import { fmtPricePrecise, fmtPriceWithPrecision } from './utils/format'
import { shortcutFor, isTypingTarget, cycleValue, type ShortcutKeyMap } from './shortcuts'
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

// N6 首屏优化：非首屏面板组件代码分割（深度图/情绪/筹码分布仅打开时加载）
const DepthChart = lazy(() => import('./components/DepthChart').then((m) => ({ default: m.DepthChart })))
const VolumeProfileChart = lazy(() => import('./components/VolumeProfileChart').then((m) => ({ default: m.VolumeProfileChart })))
const SentimentPanel = lazy(() => import('./components/SentimentPanel').then((m) => ({ default: m.SentimentPanel })))
const RecentTrades = lazy(() => import('./components/RecentTrades').then((m) => ({ default: m.RecentTrades })))

/** F16 右侧边栏面板（顺序可持久化换位） */
const PANEL_KEYS = ['depth', 'orderBook', 'tape', 'vp', 'sentiment'] as const
type PanelKey = (typeof PANEL_KEYS)[number]

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
  /** I9 画线坐标角标常显（每条线端点坐标标签） */
  const [coordBadge, setCoordBadge] = usePersistedState<boolean>('drawingCoordBadge', false)
  /** I13 画线全局透明度（0.15–1，与单条透明度相乘） */
  const [drawingGlobalOpacity, setDrawingGlobalOpacity] = usePersistedState<number>('drawingGlobalOpacity', 1)
  // T21：四图每格独立周期（会话态，默认全部跟随当前周期）
  const [quadPeriods, setQuadPeriods] = useState<[Period, Period, Period, Period] | null>(null)
  // T22：下拉刷新重挂载键
  const [reloadKey, setReloadKey] = useState(0)
  const [mainIndicator, setMainIndicator] = usePersistedState<MainIndicatorKind>('mainIndicator', 'ma')
  const [subIndicator, setSubIndicator] = usePersistedState<SubIndicatorKind>('subIndicator', 'volume')
  const [indicatorParams, setIndicatorParams] = usePersistedState<IndicatorParams>('indicatorParams', DEFAULT_INDICATOR_PARAMS)
  // H11 指标线颜色自定义：line id → 覆盖色
  const [lineColors, setLineColors] = usePersistedState<Record<string, string>>('lineColors', {})
  const [layout, setLayout] = usePersistedState<'single' | 'pair' | 'quad'>('layout', 'single')
  // L3 对比模式：单图叠加比较品种（null=关闭；pair 布局下不生效）
  const [compareSymbol, setCompareSymbol] = usePersistedState<string | null>('compareSymbol', null)
  // L3 循环切换比较品种：null → 各候选 → null
  const CYCLE_COMPARE = ['ETHUSDT', 'SOLUSDT', 'BNBUSDT']
  const cycleCompare = () => {
    setCompareSymbol((cur) => {
      if (cur === null) return CYCLE_COMPARE[0]
      const i = CYCLE_COMPARE.indexOf(cur)
      return i >= 0 && i < CYCLE_COMPARE.length - 1 ? CYCLE_COMPARE[i + 1] : null
    })
  }
  // L5 动态字号：图表内系统字号系数（0.85–1.2，步进 0.05）
  const [fontScale, setFontScale] = usePersistedState<number>('fontScale', 1)
  const FONT_SCALES = [0.85, 1, 1.15, 1.2]
  const cycleFontScale = () =>
    setFontScale((cur) => {
      const i = FONT_SCALES.indexOf(cur)
      return FONT_SCALES[i >= 0 && i < FONT_SCALES.length - 1 ? i + 1 : 0]
    })
  const [themeSetting, setThemeSetting] = usePersistedState<ThemeSetting>('theme', 'dark')

  // T5：自动档跟随系统 prefers-color-scheme（设置持久化为 auto/dark/light/schedule，图表用派生的有效模式）
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  // I9 定时主题：schedule 档按深/浅色切换时刻自动切换（持久化配置）
  const [scheduleTheme, setScheduleTheme] = usePersistedState<ScheduleThemeConfig>('scheduleTheme', { darkTime: '18:00', lightTime: '07:00' })
  const scheduled = useScheduledTheme(scheduleTheme)
  const themeMode: ThemeMode =
    themeSetting === 'auto' ? (systemDark ? 'dark' : 'light') : themeSetting === 'schedule' ? scheduled : themeSetting
  const [colorPreset, setColorPreset] = usePersistedState<ColorPresetId>('colorPreset', 'classic')
  // F7 高对比模式（更强的文本/边框对比 + 饱和强调色）
  const [highContrast, setHighContrast] = usePersistedState<boolean>('highContrast', false)
  // F15 信息条显示项开关（持久化；缺省全部显示）
  const [statsBarConfig, setStatsBarConfig] = usePersistedState<Partial<Record<string, boolean>>>('statsBarConfig', {})
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
  /** I12 画线撤销深度（可配，默认 60；1 = 只保留一步） */
  const [undoDepth, setUndoDepth] = usePersistedState<number>('drawingUndoDepth', 60)
  // I12 ref 镜像：mutateDrawings 的 useCallback 只依赖 [symbol]，深度变更经 ref 读取避免重绑
  const undoDepthRef = useRef(undoDepth)
  undoDepthRef.current = undoDepth
  const cancelDrawingRef = useRef<(() => void) | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  /** I8 深链画线 id 暂存（数据就绪前解析到此）。格式校验：非空且 ≤128 字符（对应 createDrawing 生成 id 量级） */
  const [deepLinkDrawingId, setDeepLinkDrawingId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [textFontSize, setTextFontSize] = useState(DEFAULT_TEXT_FONT_SIZE)
  const [textColor, setTextColor] = useState('')
  /** I5 文字底色（空 = 半透明主题背景） */
  const [textBg, setTextBg] = useState('')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [replay, setReplay] = useState<ReplayState | null>(null)
  // J2 多品种持仓：按 symbol 隔离，切换品种保留各自多空持仓
  const [positionsBySymbol, setPositionsBySymbol] = usePersistedState<Record<string, Positions>>('positionsBySymbol', {})
  const position: Positions = positionsBySymbol[symbol] ?? EMPTY_POSITIONS
  const setPosition = (p: Positions | ((prev: Positions) => Positions)) => {
    setPositionsBySymbol((prev) => {
      const base = prev[symbol] ?? EMPTY_POSITIONS
      const next = typeof p === 'function' ? (p as (x: Positions) => Positions)(base) : p
      return { ...prev, [symbol]: next }
    })
  }
  const [positionOpen, setPositionOpen] = useState(false)
  const [tradesOpen, setTradesOpen] = useState(false)
  // v0.5.x 流水定位：点击流水行 → 图表可视范围定位到该成交时刻（仅当前品种生效，跨品种先切）
  const [locateTrade, setLocateTrade] = useState<{ symbol: string; at: number } | null>(null)
  // T15：模拟交易账户（余额 + 成交流水）
  const paper = usePaperAccount()
  // D5/D8：吃单费率 + 市价滑点（持久化，影响下单估算与平仓计费）
  const tradeSettings = useTradeSettings()
  // D14：收益目标（USDT，持久化）——累计盈亏达目标时提示
  const [profitTarget, setProfitTarget] = usePersistedState<number>('profitTarget', 0)
  // J2 每品种上次结算快照：切换品种不互相误结算
  const prevPositionRef = useRef<Record<string, Positions>>({})
  /** TP/SL 自动结算过的持仓对象：结算写回会再触发一次结算 effect，按对象身份去重防重复记账 */
  const autoSettledRef = useRef<WeakSet<Position>>(new WeakSet())
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
    // v0.5.x 右键「挂限价单」：以光标价打开快速下单的限价模式
    const onRequestLimitOrder = (e: Event) => {
      const detail = (e as CustomEvent<{ price: number; side: OrderSide }>).detail
      if (!detail || typeof detail.price !== 'number' || (detail.side !== 'buy' && detail.side !== 'sell')) return
      setQuickOrder({ side: detail.side, price: detail.price, type: 'limit' })
    }
    window.addEventListener('chart-request-alert', onRequestAlert)
    window.addEventListener('chart-clear-drawings', onClearDrawings)
    window.addEventListener('chart-request-limit-order', onRequestLimitOrder)
    return () => {
      window.removeEventListener('chart-request-alert', onRequestAlert)
      window.removeEventListener('chart-clear-drawings', onClearDrawings)
      window.removeEventListener('chart-request-limit-order', onRequestLimitOrder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alertsApi/candles 取最新渲染闭包即可，事件监听只挂一次
  }, [])
  // J1/J2 双向持仓结算见 candles 就绪之后（同一 effect 需要最新收盘价做触价判定）
  // E4 面板折叠/展开记忆：市场数据面板状态持久化（刷新后恢复上次开合）
  const [alertsOpen, setAlertsOpen] = usePersistedState('alertsOpen', false)
  // E1 站内横幅：监听提醒触发事件（web 渠道由 usePriceAlerts dispatch），4s 自动消失
  const [alertToast, setAlertToast] = useState<{ id: number; symbol: string; direction: 'above' | 'below'; price: number; triggeredPrice: number } | null>(null)
  useEffect(() => {
    const onAlert = (e: Event) => {
      const d = (e as CustomEvent<{ symbol: string; direction: 'above' | 'below'; price: number; triggeredPrice: number }>).detail
      if (!d || typeof d.symbol !== 'string') return
      setAlertToast({ id: Date.now(), symbol: d.symbol, direction: d.direction, price: d.price, triggeredPrice: d.triggeredPrice })
      window.setTimeout(() => setAlertToast(null), 4000)
    }
    window.addEventListener('price-alert-triggered', onAlert)
    return () => window.removeEventListener('price-alert-triggered', onAlert)
  }, [])
  const [depthOpen, setDepthOpen] = usePersistedState('depthOpen', false)
  const [orderBookOpen, setOrderBookOpen] = usePersistedState('orderBookOpen', false)
  const [tapeOpen, setTapeOpen] = usePersistedState('tapeOpen', false)
  const [obHoverPrice, setObHoverPrice] = useState<number | null>(null)
  const [obMarkPrice, setObMarkPrice] = useState<number | null>(null)
  const [marketListOpen, setMarketListOpen] = usePersistedState('marketListOpen', true)
  const [marketListMobileOpen, setMarketListMobileOpen] = useState(false)
  // F14 右侧边栏宽度（持久化，桌面端可拖拽调宽；240–720px 钳制）
  const [sidePanelWidth, setSidePanelWidth] = usePersistedState<number>('sidePanelWidth', 380)
  // G15 数据量自适应：超过渲染上限时对传入图表的蜡烛降采样（0=关闭自适应）
  const [renderCandleCap, setRenderCandleCap] = usePersistedState<number>('renderCandleCap', 3000)
  // F16 侧栏面板顺序（持久化）：depth/orderBook/tape/vp/sentiment 拖拽换位
  const [panelOrder, setPanelOrder] = usePersistedState<PanelKey[]>('panelOrder', [...PANEL_KEYS])
  // 旧持久化值兼容：剔除未知键、把新增面板补到末尾（否则老用户看不到新面板）
  const orderedPanels = useMemo<PanelKey[]>(() => {
    const known = panelOrder.filter((k): k is PanelKey => (PANEL_KEYS as readonly string[]).includes(k))
    return [...known, ...PANEL_KEYS.filter((k) => !known.includes(k))]
  }, [panelOrder])
  const movePanel = (key: PanelKey, dir: -1 | 1) => {
    setPanelOrder(() => {
      const idx = orderedPanels.indexOf(key)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= orderedPanels.length) return orderedPanels
      const next = [...orderedPanels]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  // F18 面板布局方案（命名快照：图表布局 + 侧栏面板开合 + 面板宽度）
  const [layoutPresets, setLayoutPresets] = usePersistedState<Record<string, { layout: string; depthOpen: boolean; orderBookOpen: boolean; tapeOpen?: boolean; volumeProfileOpen: boolean; sentimentOpen: boolean; marketListOpen: boolean; sidePanelWidth: number }>>('layoutPresets', {})
  const saveLayoutPreset = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || layoutPresets[trimmed]) return
    setLayoutPresets((prev) => ({
      ...prev,
      [trimmed]: { layout, depthOpen, orderBookOpen, tapeOpen, volumeProfileOpen, sentimentOpen, marketListOpen, sidePanelWidth },
    }))
  }
  const applyLayoutPreset = (name: string) => {
    const p = layoutPresets[name]
    if (!p) return
    setLayout(p.layout as typeof layout)
    setDepthOpen(p.depthOpen)
    setOrderBookOpen(p.orderBookOpen)
    setTapeOpen(p.tapeOpen ?? false)
    setVolumeProfileOpen(p.volumeProfileOpen)
    setSentimentOpen(p.sentimentOpen)
    setMarketListOpen(p.marketListOpen)
    setSidePanelWidth(p.sidePanelWidth)
  }
  const deleteLayoutPreset = (name: string) => {
    setLayoutPresets((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }
  const [quickOrder, setQuickOrder] = useState<{ side: OrderSide; price: number; type?: OrderType } | null>(null)
  const [volumeProfileOpen, setVolumeProfileOpen] = usePersistedState('volumeProfileOpen', false)
  const [sentimentOpen, setSentimentOpen] = usePersistedState('sentimentOpen', false)
  // G10 卡顿诊断面板开关
  const [perfOpen, setPerfOpen] = useState(false)
  // H5 应用内版本历史
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  // H3 应用内文档索引
  const [docsOpen, setDocsOpen] = useState(false)
  // I4 自选价格实时面板（钉选品种迷你图）
  const [pinnedSymbols, setPinnedSymbols] = usePersistedState<string[]>('pinnedSymbols', [])
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const addPinned = (sym: string) => {
    const s = sym.trim().toUpperCase()
    if (!s) return
    setPinnedSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]))
  }
  const removePinned = (sym: string) => setPinnedSymbols((prev) => prev.filter((s) => s !== sym))
  const [copied, setCopied] = useState(false)
  // P4 更新提示：版本升级时显示可关闭横幅
  const [updateBanner, setUpdateBanner] = useState(false)
  // N11 localStorage 容量监控：超阈值时提示清理
  const [storageWarn, setStorageWarn] = useState(false)
  const [storageMsg, setStorageMsg] = useState('')
  const [exported, setExported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // L1 快捷键可配置：键位覆盖持久化（action → 键位列表；空对象=全用默认）
  const [shortcutKeys, setShortcutKeys] = usePersistedState<ShortcutKeyMap>('shortcutKeys', {})
  // L1 快捷键配置面板开合
  const [shortcutSettingsOpen, setShortcutSettingsOpen] = useState(false)
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
          sidePanelOpen: depthOpen || orderBookOpen || tapeOpen || volumeProfileOpen || sentimentOpen,
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
          setTapeOpen(false)
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
    tapeOpen,
    volumeProfileOpen,
    sentimentOpen,
    setDepthOpen,
    setOrderBookOpen,
    setTapeOpen,
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

  // P4 更新提示：版本升级时显示横幅（纯函数判定见 versionCheck）
  useEffect(() => {
    const current = readMetaVersion(document)
    if (current) {
      const { hasUpdate } = checkVersionUpdate(current, localStorage)
      if (hasUpdate) setUpdateBanner(true)
    }
  }, [])

  // N11 localStorage 容量监控：超阈值时提示清理（低频检查，避免每次渲染开销）
  useEffect(() => {
    const check = () => {
      const a = storageAdvisory(localStorage)
      if (a.warn) {
        setStorageWarn(true)
        setStorageMsg(a.message)
      }
    }
    check()
    const t = window.setTimeout(check, 3000) // 延迟一次，等主要持久化写入完成
    return () => window.clearTimeout(t)
  }, [])

  // Service Worker 注册（生产环境）+ 通知点击定位交易对
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    const onMsg = (e: MessageEvent) => {
      // CodeQL: 仅接受本 SW 来源（SW 消息 origin 即 SW 脚本来源，等于站点 origin）
      if (typeof e.origin === 'string' && e.origin !== window.location.origin) return
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
    applyTheme(themeMode, colorPreset, highContrast)
  }, [themeMode, colorPreset, highContrast])

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
  const { state, hasMore, loadMore, retry, loadDemo, frameStats } = useKlineData(symbol, period)
  const { candles, status, error, refill } = state
  // J1/J2 显式平仓簿记：上一帧该方向有仓、当前帧已置空 → 记一条平仓流水
  // （止盈/止损触发统一走 usePositionSettlement，多空与所有品种共用一条链路）
  const lastClosePrice = candles.length > 0 ? candles[candles.length - 1].close : null
  useEffect(() => {
    const prev = prevPositionRef.current[symbol] ?? EMPTY_POSITIONS
    const price = lastClosePrice
    if (price != null) {
      for (const slot of ['long', 'short'] as const) {
        const p = prev[slot]
        if (!p) continue
        // 已由止盈止损链路结算的持仓对象不再重复记账
        if (autoSettledRef.current.has(p)) continue
        if (position[slot] === null) {
          // D5：平仓手续费按用户配置费率计；D10 流水记录费率用于手续费拆分
          const fee = feeForPrice(p.entry, p.quantity, tradeSettings.takerFeeRate)
          const { pnl } = calcPnl(p, price)
          paper.recordClose({ symbol, side: p.direction === 'long' ? 'buy' : 'sell', price, qty: p.quantity, fee, feeRate: tradeSettings.takerFeeRate, pnl })
        }
      }
    }
    prevPositionRef.current[symbol] = position
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 持仓翻转或最新价变化时记账；paper/tradeSettings 变化不应重触发
  }, [position, symbol, lastClosePrice])
  // G15 数据量自适应：超过渲染上限时对传入图表的蜡烛降采样（0=关闭）
  const renderCandles = useMemo(() => {
    if (renderCandleCap > 0 && candles.length > renderCandleCap) return downsampleCandles(candles, renderCandleCap)
    return candles
  }, [candles, renderCandleCap])
  // L3 对比模式：叠加品种 K 线（仅单图布局使用）
  const compareData = useKlineData(compareSymbol ?? symbol, period)
  // N7 数据预取：空闲时预取相邻品种 + 当前品种更早历史到本地缓存
  usePrefetch(symbol, period)

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
  // G6 数据健康度：一次性检测缺口段数（StatsBar 徽标复用）
  const dataGaps = findGaps(candles, period)
  const alertsApi = usePriceAlerts(
    candles.length > 0 ? { symbol, price: candles[candles.length - 1].close } : null,
  )
  // I6 波动率自适应提醒：以最近 K 线 ATR% 估计波动带
  const volatilityPct = useMemo(() => atrPercent(candles, 14), [candles])
  // I10 指标智能推荐：按趋势/波动率给出主副图建议
  const indicatorRec = useMemo(() => recommendIndicators(candles), [candles])
  // I5 画线语义建议：按当前品种已画图形建议指标
  const drawingSuggestion = useMemo(
    () => suggestFromDrawings((drawingsBySymbol[symbol] ?? []).map((d) => d.type)),
    [drawingsBySymbol, symbol],
  )

  // 提醒数据同步到 SW（后台提醒尽力版）
  useEffect(() => {
    if (!import.meta.env.PROD || !navigator.serviceWorker.controller) return
    navigator.serviceWorker.controller.postMessage({ type: 'alerts', alerts: alertsApi.alerts, lang })
  }, [alertsApi.alerts, lang])
  // G12 盘口手动刷新：递增 nonce 触发 useDepth 重连拉取最新快照
  const [depthReload, setDepthReload] = useState(0)
  // ?perf 压测模式不开 WS：把合成价交给 hook 铺档位（保持「压测不联网」契约）
  const depth = useDepth(symbol, depthReload, candles[candles.length - 1]?.close ?? stats.price)
  // 只在情绪面板打开时轮询：四个端点全是合约专属数据，面板关着时这些数据没有任何消费者
  const sentiment = useSentiment(symbol, sentimentOpen)
  const drawings = drawingsBySymbol[symbol] ?? []

  // v0.5.x 限价挂单（Maker）：挂单列表 + 多品种价源 + 触价撮合，成交/撤销走站内横幅
  const pending = usePendingOrders()
  // 其他品种价源（30s 轮询）：挂单撮合与跨品种止盈止损共用一份，避免重复请求
  const otherPriceSymbols = useMemo(() => {
    const symbols = new Set<string>()
    for (const o of pending.orders) if (o.symbol !== symbol) symbols.add(o.symbol)
    for (const s of Object.keys(positionsBySymbol)) if (s !== symbol) symbols.add(s)
    return [...symbols]
  }, [pending.orders, positionsBySymbol, symbol])
  const orderPrices = useSymbolPrices(otherPriceSymbols)
  const [orderToast, setOrderToast] = useState<{ id: number; text: string } | null>(null)
  const showOrderToast = useCallback((text: string) => setOrderToast({ id: Date.now(), text }), [])
  const onOrderNotice = useCallback(
    (n: { kind: 'filled' | 'cancelled'; symbol: string; qty: number; price: number }) =>
      showOrderToast(
        n.kind === 'filled'
          ? t('trade.filledToast', { symbol: n.symbol, qty: String(n.qty), price: fmtPricePrecise(n.price) })
          : t('trade.cancelledToast', { symbol: n.symbol }),
      ),
    [showOrderToast, t],
  )
  useLimitOrderFills({
    orders: pending.orders,
    remove: pending.remove,
    balance: paper.balance,
    recordOpen: paper.recordOpen,
    setPositionsBySymbol,
    makerFeeRate: tradeSettings.makerFeeRate,
    takerFeeRate: tradeSettings.takerFeeRate,
    live: candles.length > 0 ? { symbol, price: candles[candles.length - 1].close } : null,
    prices: orderPrices,
    onNotice: onOrderNotice,
  })
  // v0.5.x 跨品种止盈止损：切走图表后其他品种的持仓仍按轮询价结算（当前品种由 K 线级结算负责）
  const onTpSlExit = useCallback(
    (exits: TpSlExit[]) => {
      const first = exits[0]
      if (!first) return
      const reason = t(first.reason === 'takeProfit' ? 'trade.tpWord' : 'trade.slWord')
      showOrderToast(
        exits.length > 1
          ? t('trade.tpslToastMulti', {
              symbol: first.symbol,
              reason,
              count: String(exits.length),
              price: fmtPricePrecise(first.price),
            })
          : t('trade.tpslToast', { symbol: first.symbol, reason, price: fmtPricePrecise(first.price) }),
      )
    },
    [showOrderToast, t],
  )
  // 当前图表品种的价源：K 线最新收盘价（tick 级）；其他品种用上面的轮询价
  const livePrice = useMemo(
    () => (lastClosePrice !== null ? { symbol, price: lastClosePrice } : null),
    [symbol, lastClosePrice],
  )
  usePositionSettlement({
    positionsBySymbol,
    live: livePrice,
    prices: orderPrices,
    takerFeeRate: tradeSettings.takerFeeRate,
    recordClose: paper.recordClose,
    setPositionsBySymbol,
    autoSettled: autoSettledRef.current,
    onExit: onTpSlExit,
  })
  useEffect(() => {
    if (!orderToast) return
    const timer = window.setTimeout(() => setOrderToast(null), 4_000)
    return () => window.clearTimeout(timer)
  }, [orderToast])

  /**
   * 统一的画线变更入口：先记录变更前快照到 undo 栈（会话内，不持久化），
   * 再应用变更。撤销栈按交易对隔离，切换品种互不污染。
   */
  const mutateDrawings = useCallback((mutator: (prev: Drawing[]) => Drawing[]) => {
    // 快照读自镜像 ref，确保异步回调（导入）场景也拿到「变更前」最新值
    const before = drawingsRef.current[symbol] ?? []
    const hist = drawingHistoryRef.current[symbol] ?? createHistory()
    drawingHistoryRef.current[symbol] = pushSnapshot(hist, before, undoDepthRef.current)
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
        d.id === editingTextId ? { ...d, text, fontSize: textFontSize, color: textColor || undefined, textBg: textBg || undefined, textAlign } : d,
      ),
    )
    setEditingTextId(null)
    setTextDraft('')
    setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
    setTextColor('')
    setTextBg('')
    setTextAlign('center')
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
    setTextAlign(d.textAlign ?? 'center')
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
  // C4 分组批量操作：组统一隐藏/锁定（key='' 为未分组）
  const setGroupHidden = (group: string, hidden: boolean) => {
    mutateDrawings((prev) => toggleGroupHidden(prev, group, hidden))
  }
  const setGroupLocked = (group: string, locked: boolean) => {
    mutateDrawings((prev) => toggleGroupLocked(prev, group, locked))
  }
  // C10 单条透明度：0.15–1 范围调节（可撤销）
  const setDrawingOpacity = (id: string, opacity: number) => {
    const v = Math.min(1, Math.max(0.15, opacity))
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, opacity: v } : d)))
  }
  // I13 全局透明度：不写回画线数据，仅渲染期相乘（持久化设置项）
  const setGlobalDrawingOpacity = (v: number) => setDrawingGlobalOpacity(Math.min(1, Math.max(0.15, v)))
  const setDrawingFollowLatest = (id: string, followLatest: boolean) => {
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, followLatest } : d)))
  }
  /** I15 画线重命名：name 空串清除自定义名 */
  const renameDrawing = (id: string, name: string) => {
    mutateDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, name: name || undefined } : d)))
  }
  const deleteDrawing = (id: string) => {
    mutateDrawings((prev) => prev.filter((d) => d.id !== id))
    if (selectedDrawingId === id) setSelectedDrawingId(null)
  }
  // I7 批量删除：多选 ids 一次性移除（单次撤销快照）
  const batchDeleteDrawings = (ids: string[]) => {
    const set = new Set(ids)
    mutateDrawings((prev) => prev.filter((d) => !set.has(d.id)))
    if (selectedDrawingId && set.has(selectedDrawingId)) setSelectedDrawingId(null)
  }
  // I7 批量显隐：多选 ids 统一隐藏/显示（单次撤销快照）
  const batchSetDrawingsHidden = (ids: string[], hidden: boolean) => {
    const set = new Set(ids)
    mutateDrawings((prev) => prev.map((d) => (set.has(d.id) ? { ...d, hidden } : d)))
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
  // I15 模板市场：解析导入的模板 JSON 并合并到本地（同名自动序号化），返回是否成功。
  // 导出由 DrawingLayers 组件侧 serializeTemplates 直接完成（与 alerts 导出同模式）。
  const importDrawingTemplatesJson = (json: string): boolean => {
    const parsed = parseTemplatesFile(json)
    if (!parsed.ok) return false
    const { merged } = mergeTemplates(drawingTemplates, parsed.templates)
    setDrawingTemplates(merged)
    return true
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

  // 分享链接：?symbol=&period= 打开时自动定位（校验白名单）；?drawing=<id> 直达某条画线（选中该画线）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('symbol')
    if (s && SYMBOL_LIST.includes(s.toUpperCase())) setSymbol(s.toUpperCase())
    const p = params.get('period')
    if (p && PERIODS.some((x) => x.value === p)) setPeriod(p as Period)
    const d = (params.get('drawing') ?? '').trim()
    if (d.length > 0 && d.length <= 128) setDeepLinkDrawingId(d)
    // v0.5.x 深链增强：?ind=&sub= 直达主图/副图指标（白名单校验，非法静默忽略）
    const ind = params.get('ind')
    if (ind && MAIN_OPTIONS.some((o) => o.value === ind)) setMainIndicator(ind as MainIndicatorKind)
    const sub = params.get('sub')
    if (sub && SUB_OPTIONS.some((o) => o.value === sub)) setSubIndicator(sub as SubIndicatorKind)
    // v0.5.x 深链增强：?tab= 直达面板（position / trades / alerts；未知值静默忽略）
    const tab = params.get('tab')
    if (tab === 'position') setPositionOpen(true)
    else if (tab === 'trades') setTradesOpen(true)
    else if (tab === 'alerts') setAlertsOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once URL 参数解析，setState 引用稳定
  }, [])

  // I8 画线深链还原：当前品种画线数据就绪后选中暂存 id（不存在→静默忽略）；仅首帧执行一次
  const deepLinkAppliedRef = useRef(false)
  useEffect(() => {
    if (deepLinkAppliedRef.current || deepLinkDrawingId === null) return
    const list = drawingsBySymbol[symbol] ?? []
    if (list.length === 0) return
    deepLinkAppliedRef.current = true
    if (list.some((x) => x.id === deepLinkDrawingId)) setSelectedDrawingId(deepLinkDrawingId)
  }, [deepLinkDrawingId, drawingsBySymbol, symbol])

  // 复制当前品种+周期（+选中画线 id + 非默认指标，直达深链）的分享链接（clipboard 失败降级 execCommand）
  const copyShareLink = async () => {
    let base = `${window.location.origin}${window.location.pathname}?symbol=${encodeURIComponent(symbol)}&period=${period}`
    if (mainIndicator !== 'ma') base += `&ind=${encodeURIComponent(mainIndicator)}`
    if (subIndicator !== 'volume') base += `&sub=${encodeURIComponent(subIndicator)}`
    const url = selectedDrawingId ? `${base}&drawing=${encodeURIComponent(selectedDrawingId)}` : base
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

  // I13 导出范围：最近 N 根（0=全部；持久化）
  const [exportBarRange, setExportBarRange] = usePersistedState<number>('exportBarRange', 0)
  // 导出当前品种/周期的 K 线 CSV（含当前主/副图指标列），BOM + <a download> 触发下载
  const exportCsv = () => {
    if (candles.length === 0) return
    const src = exportBarRange > 0 ? candles.slice(-exportBarRange) : candles
    const csv = buildCsv(src, { symbol, period, mainIndicator, subIndicator, params: indicatorParams })
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
  // D10 文本导出：先尝试原生分享（壳内 Capacitor Share），未分享则回退下载。
  // CSV 补 BOM（Excel 中文乱码防护）；JSON 不加（BOM 会破坏 JSON.parse 回导）。
  const exportTextFile = async (fileName: string, content: string, mime: string, bom: boolean) => {
    const shared = await shareTextFile(fileName, content)
    if (shared === 'shared') return
    const blob = new Blob([bom ? '﻿' + content : content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const exportTradesCsv = (subset?: TradeRecord[]) => {
    const data = subset ?? paper.trades
    if (data.length === 0) return
    void exportTextFile(tradesCsvFileName(), tradesToCsv(data), 'text/csv;charset=utf-8', true)
  }
  // J6 导出权益曲线 CSV（由流水推导的权益时间序列）
  const exportEquityCsv = () => {
    if (paper.trades.length === 0) return
    void exportTextFile(equityCsvFileName(), equityToCsv(paper.trades), 'text/csv;charset=utf-8', true)
  }
  // D15 导出模拟账户 JSON（余额+流水）：先分享，回退 Blob + <a download>
  const exportAccountJson = (json: string) => {
    if (!json) return
    void exportTextFile('paper-account.json', json, 'application/json;charset=utf-8', false)
  }
  // H7/H8 设置快照导出/导入：逐键搬运全部 kline-buty:* 持久化设置（编码约定见 utils/settingsSnapshot）
  const exportSettingsJson = () => {
    void exportTextFile('kline-buty-settings.json', buildSettingsSnapshot(window.localStorage), 'application/json;charset=utf-8', false)
  }
  const importSettingsJson = (text: string): boolean => {
    const ok = applySettingsSnapshot(text, window.localStorage)
    if (ok) window.location.reload()
    return ok
  }

  // 键盘快捷键（纯逻辑见 src/shortcuts.ts）：[ ] 周期、Space 回放、Delete 删画线、Esc 取消、
  // ⌘K / 打开搜索、F 全屏、1/2/3 布局、M/N 循环指标、? 帮助
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutFor(e, isTypingTarget(e.target as HTMLElement | null), shortcutKeys)
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
        case 'cycle-lang':
          // M12 语言切换快捷键：循环切换 UI 语言
          e.preventDefault()
          setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])
          break
        case 'toggle-alerts':
          // E13 提醒快捷键：快速打开/关闭提醒面板
          e.preventDefault()
          setAlertsOpen((v) => !v)
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
    shortcutKeys,
    lang,
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
  const sidePanelOpen = depthOpen || orderBookOpen || tapeOpen || volumeProfileOpen || sentimentOpen
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', ['--header-h' as string]: `${headerH}px`, ['--side-panel-w' as string]: sidePanelOpen && !isMobile ? `min(${sidePanelWidth}px, 88vw)` : '0px' }}>
      {/* P4 更新提示横幅：版本升级时提示刷新 */}
      {updateBanner && (
        <div
          data-testid="update-banner"
          role="status"
          style={{
            position: 'fixed',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            fontSize: 12,
          }}
        >
          <span>{t('update.banner')}</span>
          <button
            data-testid="update-reload"
            onClick={() => window.location.reload()}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
          >
            {t('update.reload')}
          </button>
          <button
            data-testid="update-dismiss"
            onClick={() => setUpdateBanner(false)}
            aria-label={t('common.close')}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
      {/* E1 站内横幅：提醒触发时底部居中 toast（web/both 渠道触发，4s 自动消失） */}
      {alertToast && (
        <div
          data-testid="alert-toast"
          role="status"
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            background: 'var(--panel)',
            border: '1px solid var(--accent)',
            color: 'var(--text)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            fontSize: 12,
            maxWidth: 'min(92vw, 420px)',
          }}
        >
          <span>🔔</span>
          <span>
            <b>{alertToast.symbol.replace('USDT', '/USDT')}</b> {alertToast.direction === 'above' ? '≥' : '≤'} {fmtPriceWithPrecision(alertToast.price)} →{' '}
            {fmtPricePrecise(alertToast.triggeredPrice)}
          </span>
          <button
            data-testid="alert-toast-dismiss"
            onClick={() => setAlertToast(null)}
            aria-label={t('common.close')}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
      {/* v0.5.x 限价挂单撮合横幅：成交 / 余额不足撤销 */}
      {orderToast && (
        <div
          data-testid="order-toast"
          role="status"
          style={{
            position: 'fixed',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            padding: '8px 14px',
            background: 'var(--panel)',
            border: '1px solid var(--accent)',
            color: 'var(--text)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            fontSize: 12,
            maxWidth: 'min(92vw, 420px)',
          }}
        >
          {orderToast.text}
        </div>
      )}
      {/* N11 存储容量提示：localStorage 高水位时提醒清理 */}
      {storageWarn && (
        <div
          data-testid="storage-banner"
          role="status"
          style={{
            position: 'fixed',
            top: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            background: 'var(--yellow)',
            color: '#1e222d',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            fontSize: 12,
          }}
        >
          <span>{t('storage.warn', { size: storageMsg })}</span>
          <button
            data-testid="storage-dismiss"
            onClick={() => setStorageWarn(false)}
            aria-label={t('common.close')}
            style={{ background: 'none', border: 'none', color: '#1e222d', cursor: 'pointer', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
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
          onSetDrawingFollowLatest={setDrawingFollowLatest}
          onRenameDrawing={renameDrawing}
          undoDepth={undoDepth}
          onUndoDepthChange={setUndoDepth}
          onGroupHidden={setGroupHidden}
          onGroupLocked={setGroupLocked}
          onDeleteDrawing={deleteDrawing}
          onClearDrawings={clearDrawings}
          onSetAllDrawingsHidden={setAllDrawingsHidden}
          drawingSnap={drawingSnap}
          onToggleDrawingSnap={() => setDrawingSnap(drawingSnap === 'off' ? 'time' : drawingSnap === 'time' ? 'ohlc' : drawingSnap === 'ohlc' ? 'grid' : 'off')}
          notesHidden={notesHidden}
          onToggleNotesHidden={() => setNotesHidden((v) => !v)}
          coordBadge={coordBadge}
          onToggleCoordBadge={() => setCoordBadge((v) => !v)}
          globalOpacity={drawingGlobalOpacity}
          onGlobalOpacityChange={setGlobalDrawingOpacity}
          onBatchDelete={batchDeleteDrawings}
          onBatchSetHidden={batchSetDrawingsHidden}
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
          onImportDrawingTemplates={importDrawingTemplatesJson}

          drawingCanPaste={hasClipboardDrawing}
          onCopyDrawing={copySelectedDrawing}
          onPasteDrawing={pasteClipboardDrawing}
          layout={layout}
          onCycleLayout={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          compareSymbol={compareSymbol}
          onCycleCompare={cycleCompare}
          fontScale={fontScale}
          layoutPresets={Object.keys(layoutPresets)}
          onSaveLayoutPreset={saveLayoutPreset}
          onApplyLayoutPreset={applyLayoutPreset}
          onDeleteLayoutPreset={deleteLayoutPreset}
          panelOrder={orderedPanels}
          onMovePanel={(k, dir) => movePanel(k as PanelKey, dir)}
          renderCandleCap={renderCandleCap}
          onCycleRenderCandleCap={() => setRenderCandleCap(renderCandleCap === 0 ? 2000 : renderCandleCap === 2000 ? 3000 : renderCandleCap === 3000 ? 5000 : 0)}
          perfActive={perfOpen}
          onTogglePerf={() => setPerfOpen((v) => !v)}
          onExportSettings={exportSettingsJson}
          onImportSettings={importSettingsJson}
          changelogActive={changelogOpen}
          onToggleChangelog={() => setChangelogOpen((v) => !v)}
          galleryActive={galleryOpen}
          onToggleGallery={() => setGalleryOpen((v) => !v)}
          pinnedActive={pinnedOpen}
          onTogglePinned={() => setPinnedOpen((v) => !v)}
          exportBarRange={exportBarRange}
          onSetExportBarRange={setExportBarRange}
          docsActive={docsOpen}
          onToggleDocs={() => setDocsOpen((v) => !v)}
          onCycleFontScale={cycleFontScale}
          themeMode={themeMode}
          onToggleTheme={() => setThemeSetting(themeSetting === 'dark' ? 'light' : themeSetting === 'light' ? 'auto' : themeSetting === 'auto' ? 'schedule' : 'dark')}
          scheduleTheme={scheduleTheme}
          onScheduleThemeChange={setScheduleTheme}
          colorPreset={colorPreset}
          onColorPreset={setColorPreset}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          showWatermark={showWatermark}
          onToggleWatermark={() => setShowWatermark((v) => !v)}
          positionActive={positionOpen || position.long !== null || position.short !== null}
          onTogglePosition={() => setPositionOpen((v) => {
            if (!v) setTradesOpen(false)
            return !v
          })}
          alertsActive={alertsOpen}
          onToggleAlerts={() => setAlertsOpen((v) => !v)}
          alertsPending={alertsApi.pendingCount}
          depthActive={depthOpen}
          onToggleDepth={() => setDepthOpen((v) => !v)}
          orderBookActive={orderBookOpen}
          onToggleOrderBook={() => setOrderBookOpen((v) => !v)}
          tapeActive={tapeOpen}
          onToggleTape={() => setTapeOpen((v) => !v)}
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
          onSetDrawingFollowLatest={setDrawingFollowLatest}
          onRenameDrawing={renameDrawing}
          undoDepth={undoDepth}
          onUndoDepthChange={setUndoDepth}
          onGroupHidden={setGroupHidden}
          onGroupLocked={setGroupLocked}
          onDeleteDrawing={deleteDrawing}
          onClearDrawings={clearDrawings}
          onSetAllDrawingsHidden={setAllDrawingsHidden}
          drawingSnap={drawingSnap}
          onToggleDrawingSnap={() => setDrawingSnap(drawingSnap === 'off' ? 'time' : drawingSnap === 'time' ? 'ohlc' : drawingSnap === 'ohlc' ? 'grid' : 'off')}
          notesHidden={notesHidden}
          onToggleNotesHidden={() => setNotesHidden((v) => !v)}
          coordBadge={coordBadge}
          onToggleCoordBadge={() => setCoordBadge((v) => !v)}
          globalOpacity={drawingGlobalOpacity}
          onGlobalOpacityChange={setGlobalDrawingOpacity}
          onBatchDelete={batchDeleteDrawings}
          onBatchSetHidden={batchSetDrawingsHidden}
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
          onImportDrawingTemplates={importDrawingTemplatesJson}

          onDeleteDrawingTemplate={deleteDrawingTemplate}
          drawingCanPaste={hasClipboardDrawing}
          onCopyDrawing={copySelectedDrawing}
          onPasteDrawing={pasteClipboardDrawing}
          layout={layout}
          onCycleLayout={() => setLayout(layout === 'single' ? 'pair' : layout === 'pair' ? 'quad' : 'single')}
          compareSymbol={compareSymbol}
          onCycleCompare={cycleCompare}
          fontScale={fontScale}
          layoutPresets={Object.keys(layoutPresets)}
          onSaveLayoutPreset={saveLayoutPreset}
          onApplyLayoutPreset={applyLayoutPreset}
          onDeleteLayoutPreset={deleteLayoutPreset}
          panelOrder={orderedPanels}
          onMovePanel={(k, dir) => movePanel(k as PanelKey, dir)}
          renderCandleCap={renderCandleCap}
          onCycleRenderCandleCap={() => setRenderCandleCap(renderCandleCap === 0 ? 2000 : renderCandleCap === 2000 ? 3000 : renderCandleCap === 3000 ? 5000 : 0)}
          perfActive={perfOpen}
          onTogglePerf={() => setPerfOpen((v) => !v)}
          onExportSettings={exportSettingsJson}
          onImportSettings={importSettingsJson}
          changelogActive={changelogOpen}
          onToggleChangelog={() => setChangelogOpen((v) => !v)}
          galleryActive={galleryOpen}
          onToggleGallery={() => setGalleryOpen((v) => !v)}
          pinnedActive={pinnedOpen}
          onTogglePinned={() => setPinnedOpen((v) => !v)}
          exportBarRange={exportBarRange}
          onSetExportBarRange={setExportBarRange}
          docsActive={docsOpen}
          onToggleDocs={() => setDocsOpen((v) => !v)}
          onCycleFontScale={cycleFontScale}
          themeMode={themeMode}
          onToggleTheme={() => setThemeSetting(themeSetting === 'dark' ? 'light' : themeSetting === 'light' ? 'auto' : themeSetting === 'auto' ? 'schedule' : 'dark')}
          scheduleTheme={scheduleTheme}
          onScheduleThemeChange={setScheduleTheme}
          colorPreset={colorPreset}
          onColorPreset={setColorPreset}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          showWatermark={showWatermark}
          onToggleWatermark={() => setShowWatermark((v) => !v)}
          positionActive={positionOpen || position.long !== null || position.short !== null}
          onTogglePosition={() => setPositionOpen((v) => {
            if (!v) setTradesOpen(false)
            return !v
          })}
          alertsActive={alertsOpen}
          onToggleAlerts={() => setAlertsOpen((v) => !v)}
          alertsPending={alertsApi.pendingCount}
          depthActive={depthOpen}
          onToggleDepth={() => setDepthOpen((v) => !v)}
          orderBookActive={orderBookOpen}
          onToggleOrderBook={() => setOrderBookOpen((v) => !v)}
          tapeActive={tapeOpen}
          onToggleTape={() => setTapeOpen((v) => !v)}
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
          textBg={textBg}
          onTextDraftChange={setTextDraft}
          onTextFontSizeChange={setTextFontSize}
          onTextColorChange={setTextColor}
          onTextBgChange={setTextBg}
          onConfirmText={confirmTextDrawing}
          onCancelText={() => {
            setEditingTextId(null)
            setTextDraft('')
            setTextFontSize(DEFAULT_TEXT_FONT_SIZE)
            setTextColor('')
          }}
        />
      )}
      {/* A3 断线补洞进度：重连期间分段 REST 回补缺失区间，显示 done/total */}
      {refill && (
        <div
          data-testid="refill-indicator"
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 40,
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 11,
            background: 'var(--accent)',
            color: '#fff',
            pointerEvents: 'none',
          }}
        >
          {t('status.refilling' as MessageKey, { done: refill.done, total: refill.total })}
        </div>
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
          <StatsBar
            stats={stats}
            live={state.live}
            period={period}
            lastCandleTime={state.candles.length ? state.candles[state.candles.length - 1].time : null}
            volumeSurge={volumeSurgeRatio(state.candles, 20)}
            gapHealth={gapHealth(dataGaps)}
            gapCount={dataGaps.length}
            config={statsBarConfig}
            onToggleItem={(k) => setStatsBarConfig((prev) => ({ ...prev, [k]: prev[k] === false }))}
          />
      <OfflineBanner />
      {quickOrder && (
        <QuickOrderWithDepth
          key={`${quickOrder.side}-${quickOrder.price}-${quickOrder.type ?? 'market'}`}
          symbol={symbol}
          side={quickOrder.side}
          price={quickOrder.price}
          balance={paper.balance}
          takerFeeRate={tradeSettings.takerFeeRate}
          makerFeeRate={tradeSettings.makerFeeRate}
          initialType={quickOrder.type ?? 'market'}
          onClose={() => setQuickOrder(null)}
          onConfirm={(order) => {
            if (order.type === 'limit') {
              // 限价挂单：先入队，由 useLimitOrderFills 在价格触达时按挂单价成交；
              // 下单时的最新价决定这单是等价的挂单（Maker）还是已经在吃单（Taker）
              const created = createPendingOrder({
                symbol,
                side: order.side,
                price: order.price,
                qty: order.qty,
                marketPrice: candles[candles.length - 1]?.close ?? stats.price,
                takeProfit: order.takeProfit,
                stopLoss: order.stopLoss,
                leverage: order.leverage,
              })
              // 面板已把过关，这里再挡一次：随单价位不成立不该被误报成「挂单已达上限」
              if (!created) {
                showOrderToast(t('quickOrder.attachErr'))
                return
              }
              if (!pending.add(created)) {
                showOrderToast(t('trade.tooManyOrders', { max: String(ORDERS_PER_SYMBOL_MAX) }))
                return
              }
              setQuickOrder(null)
              return
            }
            // D8 市价单含模拟滑点（可配置）：成交价相对盘口小幅偏移；D5 费率可配置
            const est = estimateOrder(order.price, order.qty, order.side, tradeSettings.slippageRatio, tradeSettings.takerFeeRate)
            if (!paper.canOpen(est.notional, est.fee)) return
            paper.recordOpen({ symbol, side: order.side, price: est.fillPrice, qty: order.qty, fee: est.fee, feeRate: tradeSettings.takerFeeRate })
            // J1 双向持仓（hedge）：buy 只影响 long 槽、sell 只影响 short 槽
            setPosition((prev) => applyHedgeOrder(prev, order.side, est.fillPrice, order.qty, DEFAULT_TP_PCT, DEFAULT_SL_PCT, { leverage: order.leverage }))
            setPositionOpen(true)
            setTradesOpen(false)
            setQuickOrder(null)
          }}
        />
      )}
      {tradesOpen && (
        <TradeHistoryPanel
          trades={paper.trades}
          stats={tradeStats(paper.trades)}
          takerFeeRatePct={tradeSettings.takerFeeRate * 100}
          slippagePct={tradeSettings.slippageRatio * 100}
          makerFeeRatePct={tradeSettings.makerFeeRate * 100}
          onTakerFeeRatePctChange={(pct) => tradeSettings.setTakerFeeRate(pct / 100)}
          onSlippagePctChange={(pct) => tradeSettings.setSlippageRatio(pct / 100)}
          onMakerFeeRatePctChange={(pct) => tradeSettings.setMakerFeeRate(pct / 100)}
          onClose={() => setTradesOpen(false)}
          onClear={paper.clearTrades}
          onSwitchSymbol={(s) => {
            // v0.5 按品种汇总点击行 → 切主图品种并关闭流水面板
            setSymbol(s)
            setTradesOpen(false)
          }}
          onLocateTrade={(locSymbol, at) => {
            // v0.5.x 流水行点击 → 定位图表到该时刻（跨品种先切品种，关闭流水面板）
            setLocateTrade({ symbol: locSymbol, at })
            if (locSymbol !== symbol) setSymbol(locSymbol)
            setTradesOpen(false)
          }}
          onExport={exportTradesCsv}
          onExportEquity={exportEquityCsv}
          onReset={paper.reset}
          profitTarget={profitTarget}
          onProfitTargetChange={setProfitTarget}
          snapshots={paper.snapshots}
          onSaveSnapshot={(name) => paper.saveSnapshot(name)}
          onLoadSnapshot={(name) => paper.loadSnapshot(name)}
          onDeleteSnapshot={(name) => paper.deleteSnapshot(name)}
          onExportJson={() => exportAccountJson(paper.exportAccountJson())}
          onImportJson={paper.importAccountJson}
        />
      )}
      {positionOpen && (
        <PositionPanel
          positions={position}
          symbol={symbol}
          pendingOrders={pending.orders}
          onCancelOrder={(id) => pending.remove([id])}
          onEditOrder={(id, patch, marketPrice) => pending.edit(id, patch, marketPrice)}
          currentPrice={candles[candles.length - 1]?.close ?? stats.price}
          balance={paper.balance}
          todayPnl={todayRealizedPnl(paper.trades)}
          onChange={setPosition}
          otherSymbols={Object.fromEntries(Object.entries(positionsBySymbol).filter(([s]) => s !== symbol))}
          onSwitchSymbol={(s) => {
            setSymbol(s)
            setPositionOpen(true)
          }}
          onSettleSymbol={(s) => {
            // D7 一键平仓（含其他品种）：切换到该品种后置空 → 结算 effect 按其最新价记账平仓（含 PnL/手续费）
            if (s !== symbol) setSymbol(s)
            setPositionsBySymbol((prev) => ({ ...prev, [s]: EMPTY_POSITIONS }))
          }}
          onReverse={(slot) => {
            // v0.5.x 反手：以现价同量开反向仓（含滑点/手续费记账）；旧方向平仓由结算 effect 记账
            const p = position[slot]
            const price = candles[candles.length - 1]?.close ?? stats.price
            if (!p || price == null) return
            const side = slot === 'long' ? 'sell' : 'buy'
            const est = estimateOrder(price, p.quantity, side, tradeSettings.slippageRatio, tradeSettings.takerFeeRate)
            if (!paper.canOpen(est.notional, est.fee)) return
            paper.recordOpen({ symbol, side, price: est.fillPrice, qty: p.quantity, fee: est.fee, feeRate: tradeSettings.takerFeeRate })
            setPosition((cur) => reverseSlot(cur, slot, est.fillPrice).next)
          }}
          onReduce={(slot, qty) => {
            // v0.5.x 部分平仓：按现价结算减掉的那一份，剩余仓位保留开仓价与价位线
            const p = position[slot]
            const price = candles[candles.length - 1]?.close ?? stats.price
            if (!p || price == null) return
            const plan = planReduce(p, qty)
            if (!plan) return
            if (plan.remaining === null) {
              // 减到空等价于全平：走既有的显式平仓簿记，避免这里再记一次
              setPosition((cur) => settleSlot(cur, slot).next)
              return
            }
            const fee = feeForPrice(p.entry, plan.qty, tradeSettings.takerFeeRate)
            const { pnl } = calcPnl({ ...p, quantity: plan.qty }, price)
            paper.recordClose({
              symbol,
              // 平仓流水的 side 记被平掉的方向（流水面板据此显示多/空）
              side: p.direction === 'long' ? 'buy' : 'sell',
              price,
              qty: plan.qty,
              fee,
              feeRate: tradeSettings.takerFeeRate,
              pnl,
            })
            setPosition((cur) => ({ ...cur, [slot]: plan.remaining }))
          }}
        />
      )}
      {alertsOpen && (
        <AlertPanel
          symbol={symbol}
          currentPrice={candles[candles.length - 1]?.close ?? null}
          alertsApi={alertsApi}
          volatilityPct={volatilityPct}
        />
      )}
      {perfOpen && (
        <PerfPanel frameStats={frameStats} onClose={() => setPerfOpen(false)} />
      )}
      {changelogOpen && (
        <ChangelogModal onClose={() => setChangelogOpen(false)} />
      )}
      {galleryOpen && (
        <SnapshotGallery onClose={() => setGalleryOpen(false)} />
      )}
      {docsOpen && (
        <DocsIndexModal onClose={() => setDocsOpen(false)} />
      )}
      {pinnedOpen && (
        <PinnedPanel
          symbols={pinnedSymbols}
          activeSymbol={symbol}
          onSelect={(s) => {
            setSymbol(s)
            setPinnedOpen(false)
          }}
          onAdd={addPinned}
          onRemove={removePinned}
          onClose={() => setPinnedOpen(false)}
        />
      )}
      {settingsOpen && (
        <IndicatorSettings
          params={indicatorParams}
          mainIndicator={mainIndicator}
          subIndicator={subIndicator}
          onChange={setIndicatorParams}
          onClose={() => setSettingsOpen(false)}
          lineColors={lineColors}
          recommendation={indicatorRec}
          onApplyRecommendation={() => {
            setMainIndicator(indicatorRec.main)
            setSubIndicator(indicatorRec.sub)
          }}
          drawingSuggestion={drawingSuggestion ?? undefined}
          onApplyDrawingSuggestion={() => {
            if (drawingSuggestion?.main) setMainIndicator(drawingSuggestion.main)
            if (drawingSuggestion?.sub) setSubIndicator(drawingSuggestion.sub)
          }}
          onLineColorChange={(id, color) =>
            setLineColors((prev) => {
              const next = { ...prev }
              if (color) next[id] = color
              else delete next[id]
              return next
            })
          }
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
          coordBadge={coordBadge}
          drawingGlobalOpacity={drawingGlobalOpacity}
          fontScale={fontScale}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
            lineColors={lineColors}
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
          coordBadge={coordBadge}
          drawingGlobalOpacity={drawingGlobalOpacity}
          fontScale={fontScale}
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
            candles={renderCandles}
            status={status}
            onRetry={retry}
            themeMode={themeMode}
            colorPreset={colorPreset}
            showWatermark={showWatermark}
            chartType={chartType}
            priceScaleMode={priceScaleMode}
          timezoneMode={timezoneMode}
          drawingSnap={drawingSnap}
          notesHidden={notesHidden}
          coordBadge={coordBadge}
          drawingGlobalOpacity={drawingGlobalOpacity}
          fontScale={fontScale}
            mainIndicator={mainIndicator}
            subIndicator={subIndicator}
            indicatorParams={indicatorParams}
            lineColors={lineColors}
            replay={replay}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onLoadDemo={loadDemo}
            frameStats={frameStats}
            positionLines={position.long ?? position.short}
            referencePrice={obHoverPrice}
            markerPrice={obMarkPrice}
            tradeMarkers={tradeMarkersFor(paper.trades, symbol)}
            externalRange={
              locateTrade && locateTrade.symbol === symbol && renderCandles.length > 0
                ? locateRangeFor(renderCandles, Math.floor(locateTrade.at / 1000))
                : null
            }
            compareSeries={compareSymbol && layout === 'single' ? { symbol: compareSymbol, candles: compareData.state.candles } : null}
            onPositionDrag={(key, price) => {
              // 图上拖动价位线：与仓位面板行内编辑共用一套校验，越界即停在原位
              const slot: 'long' | 'short' | null = position.long ? 'long' : position.short ? 'short' : null
              const target = slot ? position[slot] : null
              if (!slot || !target) return null
              if (key === 'entry') {
                setPosition({ ...position, [slot]: { ...target, entry: price } })
                return price
              }
              const next = dragLevel(target, key, price, lastClosePrice)
              if (!next) return null
              setPosition({ ...position, [slot]: next })
              return next[key] ?? price
            }}
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
          {/* F14 右侧边栏拖拽调宽：左缘细手柄（桌面端），pointer 事件全局跟踪 */}
          {!isMobile && (
            <div
              data-testid="side-panel-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label={t('panel.resizeTitle')}
              title={t('panel.resizeTitle')}
              onPointerDown={(e) => {
                e.preventDefault()
                const startX = e.clientX
                const startW = sidePanelWidth
                const onMove = (ev: PointerEvent) => {
                  const next = Math.min(720, Math.max(240, startW - (ev.clientX - startX)))
                  setSidePanelWidth(next)
                }
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                }
                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
              }}
              style={{
                position: 'absolute',
                left: -4,
                top: 0,
                bottom: 0,
                width: 8,
                cursor: 'col-resize',
                zIndex: 5,
                background: 'transparent',
                touchAction: 'none',
              }}
            />
          )}
          {/* F16 按持久化顺序渲染已开启的侧栏面板 */}
          {orderedPanels.map((k) => {
            if (k === 'depth' && depthOpen) {
              return (
                <Suspense key="depth" fallback={<div style={{ padding: 12, color: 'var(--text-faint)', fontSize: 11 }}>{t('panelState.loading')}</div>}>
                  <DepthChart symbol={symbol} depth={depth} />
                </Suspense>
              )
            }
            if (k === 'orderBook' && orderBookOpen) {
              return (
                <OrderBook key="orderBook" symbol={symbol} depth={depth} onHoverPrice={setObHoverPrice} onMarkPrice={(price) => setObMarkPrice((prev) => (prev === price ? null : price))}
                  onQuickOrder={(price, side) => setQuickOrder({ side, price })} onRefresh={() => setDepthReload((n) => n + 1)} />
              )
            }
            if (k === 'tape' && tapeOpen) {
              return (
                <Suspense key="tape" fallback={<div style={{ padding: 12, color: 'var(--text-faint)', fontSize: 11 }}>{t('panelState.loading')}</div>}>
                  <RecentTrades symbol={symbol} onMarkPrice={(price) => setObMarkPrice((prev) => (prev === price ? null : price))} />
                </Suspense>
              )
            }
            if (k === 'vp' && volumeProfileOpen) {
              return (
                <Suspense key="vp" fallback={<div style={{ padding: 12, color: 'var(--text-faint)', fontSize: 11 }}>{t('panelState.loading')}</div>}>
                  <VolumeProfileChart symbol={symbol} candles={candles} />
                </Suspense>
              )
            }
            if (k === 'sentiment' && sentimentOpen) {
              return (
                <Suspense key="sentiment" fallback={<div style={{ padding: 12, color: 'var(--text-faint)', fontSize: 11 }}>{t('panelState.loading')}</div>}>
                  <SentimentPanel data={sentiment} />
                </Suspense>
              )
            }
            return null
          })}
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
      {shortcutsOpen && <ShortcutsHelp onConfigure={() => setShortcutSettingsOpen((v) => !v)} configuring={shortcutSettingsOpen} />}
      {shortcutSettingsOpen && <ShortcutsSettings keys={shortcutKeys} onChange={setShortcutKeys} onClose={() => setShortcutSettingsOpen(false)} />}
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
            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{t('drawing.align')}</span>
            {(['left', 'center', 'right'] as const).map((al) => (
              <button
                key={al}
                data-testid={`mobile-text-align-${al}`}
                aria-label={t(`drawing.align${al[0].toUpperCase()}${al.slice(1)}` as never)}
                aria-pressed={textAlign === al}
                onClick={() => setTextAlign(al)}
                style={{
                  padding: '2px 7px',
                  fontSize: 12,
                  border: textAlign === al ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: textAlign === al ? 'var(--accent)' : 'transparent',
                  color: textAlign === al ? '#fff' : 'var(--text)',
                }}
              >
                {al === 'left' ? '⬅' : al === 'center' ? '↔' : '➡'}
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
