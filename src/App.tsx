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
import { QuickOrderWithDepth } from './components/QuickOrder'
import { OfflineBanner } from './components/OfflineBanner'
import { estimateOrder, feeForPrice, type OrderSide } from './trade/order'
import { calcPnl, checkHit } from './position/pnl'
import { EMPTY_POSITIONS, applyOrder as applyHedgeOrder, settleSlot, type Positions } from './trade/positions'
import { usePaperAccount } from './hooks/usePaperAccount'
import { useTradeSettings } from './hooks/useTradeSettings'
import { tradeStats } from './trade/stats'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { PerfPanel } from './components/PerfPanel'
import { ChangelogModal } from './components/ChangelogModal'
import { SnapshotGallery } from './components/SnapshotGallery'
import { PinnedPanel } from './components/PinnedPanel'
import { DocsIndexModal } from './components/DocsIndexModal'
import { tradesCsvFileName, tradesToCsv } from './utils/tradesCsv'
import { equityCsvFileName, equityToCsv } from './utils/equityCsv'
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
import { applyTheme, type ColorPresetId, type ThemeMode } from './theme'
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
import { storageAdvisory } from './utils/storageMonitor'
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
  // T15：模拟交易账户（余额 + 成交流水）
  const paper = usePaperAccount()
  // D5/D8：吃单费率 + 市价滑点（持久化，影响下单估算与平仓计费）
  const tradeSettings = useTradeSettings()
  // D14：收益目标（USDT，持久化）——累计盈亏达目标时提示
  const [profitTarget, setProfitTarget] = usePersistedState<number>('profitTarget', 0)
  // J2 每品种上次结算快照：切换品种不互相误结算
  const prevPositionRef = useRef<Record<string, Positions>>({})
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
  // J1/J2 双向持仓结算：多空独立——各方向各自检查 TP/SL 触发与显式平仓；按 symbol 隔离
  useEffect(() => {
    const prev = prevPositionRef.current[symbol] ?? EMPTY_POSITIONS
    const price = candles[candles.length - 1]?.close ?? null
    if (price != null) {
      // TP/SL 触发：任一方向最新价触达 → 独立结算该方向并清空槽位
      for (const slot of ['long', 'short'] as const) {
        const p = prev[slot]
        if (!p) continue
        const hit = checkHit(p, price)
        if (hit) {
          // D5：平仓手续费按用户配置费率计；D10 流水记录费率用于手续费拆分
          const fee = feeForPrice(p.entry, p.quantity, tradeSettings.takerFeeRate)
          const { pnl } = calcPnl(p, price)
          paper.recordClose({ symbol, side: p.direction === 'long' ? 'buy' : 'sell', price, qty: p.quantity, fee, feeRate: tradeSettings.takerFeeRate, pnl })
          setPosition((cur) => settleSlot(cur, slot).next)
          continue
        }
        // 显式平仓：上一帧该方向有仓、当前帧已置空 → 结算
        if (position[slot] === null) {
          const fee = feeForPrice(p.entry, p.quantity, tradeSettings.takerFeeRate)
          const { pnl } = calcPnl(p, price)
          paper.recordClose({ symbol, side: p.direction === 'long' ? 'buy' : 'sell', price, qty: p.quantity, fee, feeRate: tradeSettings.takerFeeRate, pnl })
        }
      }
    }
    prevPositionRef.current[symbol] = position
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 position 翻转时结算；paper/candles 变化不应重触发
  }, [position, symbol])
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
  const [obHoverPrice, setObHoverPrice] = useState<number | null>(null)
  const [obMarkPrice, setObMarkPrice] = useState<number | null>(null)
  const [marketListOpen, setMarketListOpen] = usePersistedState('marketListOpen', true)
  const [marketListMobileOpen, setMarketListMobileOpen] = useState(false)
  // F14 右侧边栏宽度（持久化，桌面端可拖拽调宽；240–720px 钳制）
  const [sidePanelWidth, setSidePanelWidth] = usePersistedState<number>('sidePanelWidth', 380)
  // G15 数据量自适应：超过渲染上限时对传入图表的蜡烛降采样（0=关闭自适应）
  const [renderCandleCap, setRenderCandleCap] = usePersistedState<number>('renderCandleCap', 3000)
  // F16 侧栏面板顺序（持久化）：depth/orderBook/vp/sentiment 拖拽换位
  const [panelOrder, setPanelOrder] = usePersistedState<('depth' | 'orderBook' | 'vp' | 'sentiment')[]>('panelOrder', ['depth', 'orderBook', 'vp', 'sentiment'])
  const movePanel = (key: 'depth' | 'orderBook' | 'vp' | 'sentiment', dir: -1 | 1) => {
    setPanelOrder((prev) => {
      const idx = prev.indexOf(key)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  // F18 面板布局方案（命名快照：图表布局 + 侧栏面板开合 + 面板宽度）
  const [layoutPresets, setLayoutPresets] = usePersistedState<Record<string, { layout: string; depthOpen: boolean; orderBookOpen: boolean; volumeProfileOpen: boolean; sentimentOpen: boolean; marketListOpen: boolean; sidePanelWidth: number }>>('layoutPresets', {})
  const saveLayoutPreset = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || layoutPresets[trimmed]) return
    setLayoutPresets((prev) => ({
      ...prev,
      [trimmed]: { layout, depthOpen, orderBookOpen, volumeProfileOpen, sentimentOpen, marketListOpen, sidePanelWidth },
    }))
  }
  const applyLayoutPreset = (name: string) => {
    const p = layoutPresets[name]
    if (!p) return
    setLayout(p.layout as typeof layout)
    setDepthOpen(p.depthOpen)
    setOrderBookOpen(p.orderBookOpen)
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
  const [quickOrder, setQuickOrder] = useState<{ side: OrderSide; price: number } | null>(null)
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
  const depth = useDepth(symbol, depthReload)
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

  // 复制当前品种+周期（+选中画线 id，直达深链）的分享链接（clipboard 失败降级 execCommand）
  const copyShareLink = async () => {
    const base = `${window.location.origin}${window.location.pathname}?symbol=${encodeURIComponent(symbol)}&period=${period}`
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
  // J6 导出权益曲线 CSV（由流水推导的权益时间序列）
  const exportEquityCsv = () => {
    if (paper.trades.length === 0) return
    const csv = equityToCsv(paper.trades)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = equityCsvFileName()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  // D15 导出模拟账户 JSON（余额+流水）：Blob + <a download> 触发下载
  const exportAccountJson = (json: string) => {
    if (!json) return
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paper-account.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  // H7/H8 设置快照导出：收集全部 kline-buty:* 持久化键 → JSON 文件（主题/自选/画线/账户等一次迁移）
  const exportSettingsJson = () => {
    const settings: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('kline-buty:')) continue
      const raw = localStorage.getItem(key)
      if (raw !== null) settings[key] = JSON.parse(raw)
    }
    const json = JSON.stringify({ version: 1, settings, savedAt: Date.now() }, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kline-buty-settings.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  // H7/H8 设置快照导入：校验 shape 后逐键恢复并重载（失败返回 false）
  const importSettingsJson = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text) as { version?: number; settings?: Record<string, unknown> }
      if (parsed.version !== 1 || !parsed.settings || typeof parsed.settings !== 'object') return false
      for (const [key, value] of Object.entries(parsed.settings)) {
        if (!key.startsWith('kline-buty:')) continue
        localStorage.setItem(key, JSON.stringify(value))
      }
      window.location.reload()
      return true
    } catch {
      return false
    }
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
            <b>{alertToast.symbol.replace('USDT', '/USDT')}</b> {alertToast.direction === 'above' ? '≥' : '≤'} {alertToast.price.toFixed(2)} →{' '}
            {alertToast.triggeredPrice.toFixed(2)}
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
          panelOrder={panelOrder}
          onMovePanel={(k, dir) => movePanel(k as 'depth' | 'orderBook' | 'vp' | 'sentiment', dir)}
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
          onToggleTheme={() => setThemeSetting(themeSetting === 'auto' ? 'dark' : themeSetting === 'dark' ? 'light' : 'auto')}
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
          panelOrder={panelOrder}
          onMovePanel={(k, dir) => movePanel(k as 'depth' | 'orderBook' | 'vp' | 'sentiment', dir)}
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
          onToggleTheme={() => setThemeSetting(themeSetting === 'auto' ? 'dark' : themeSetting === 'dark' ? 'light' : 'auto')}
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
          symbol={symbol}
          side={quickOrder.side}
          price={quickOrder.price}
          balance={paper.balance}
          onClose={() => setQuickOrder(null)}
          onConfirm={(order) => {
            // D8 市价单含模拟滑点（可配置）：成交价相对盘口小幅偏移；D5 费率可配置
            const est = estimateOrder(order.price, order.qty, order.side, tradeSettings.slippageRatio, tradeSettings.takerFeeRate)
            if (!paper.canOpen(est.notional, est.fee)) return
            paper.recordOpen({ symbol, side: order.side, price: est.fillPrice, qty: order.qty, fee: est.fee, feeRate: tradeSettings.takerFeeRate })
            // J1 双向持仓（hedge）：buy 只影响 long 槽、sell 只影响 short 槽
            setPosition((prev) => applyHedgeOrder(prev, order.side, est.fillPrice, order.qty))
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
          onTakerFeeRatePctChange={(pct) => tradeSettings.setTakerFeeRate(pct / 100)}
          onSlippagePctChange={(pct) => tradeSettings.setSlippageRatio(pct / 100)}
          onClose={() => setTradesOpen(false)}
          onClear={paper.clearTrades}
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
          currentPrice={candles[candles.length - 1]?.close ?? stats.price}
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
            compareSeries={compareSymbol && layout === 'single' ? { symbol: compareSymbol, candles: compareData.state.candles } : null}
            onPositionDrag={(key, price) =>
              setPosition((prev) => {
                const target = prev.long ?? prev.short
                if (!target) return prev
                const slot = prev.long ? 'long' : 'short'
                return { ...prev, [slot]: { ...target, [key]: price } }
              })
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
          {panelOrder.map((k) => {
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
