import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type SeriesType,
  type IRange,
} from 'lightweight-charts'
import { zoomRangeAround } from './pinchZoom'
import { PinchLingeringTracker, TouchDrawingGestureLock, TouchTapTracker } from './touchGestures'
import {
  TouchInertiaTracker,
  decayInertiaVelocity,
  horizontalInertiaBars,
  inertiaSettled,
  shouldStartHorizontalInertia,
} from './inertiaScroll'
import type { Candle } from './types'
import type { ValuePoint } from '../indicators/sma'
import { detectHover, resolveDragPrice, type PositionLineKey } from './dragState'
import {
  channelLine,
  DEFAULT_TEXT_FONT_SIZE,
  fibExtPrices,
  fibFanRays,
  fibPrices,
  fibTimeXs,
  gannBoxRect,
  gannBoxSegments,
  gannFanRays,
  cycleLines,
  cubicBezierPoints,
  fibTimeZones,
  fibChannelLevels,
  hitTestDrawings,
  timeRangeXs,
  priceBandYs,
  priceRangeInfo,
  riskRewardRatio,
  trendAngleDeg,
  measureInfo,
  moveAnchor,
  followLatestEntry,
  textBoxX,
  parallelRaySpec,
  pitchforkRays,
  widthChannelSpec,
  moveDrawing,
  nearestAnchor,
  normalizePoints,
  regressionSegments,
  requiredPoints,
  TOUCH_ANCHOR_THRESHOLD_PX,
  speedLines,
  type Drawing,
  type DrawingTool,
  type Point,
  type SegmentLine,
} from '../drawings/logic'
import { snapToCandle, type SnapMode } from '../drawings/snap'
import { themeFor, THEMES, type ChartTheme, type ColorPresetId, type ThemeMode } from '../theme'
import { chartLabelsFor, DEFAULT_LANG, type ChartLabels, type Lang } from '../i18n/messages'
import { fmtAxisPrice } from '../utils/format'

export type ChartType = 'candlestick' | 'line' | 'area'

/** 画线回调 */
export interface DrawingCallbacks {
  onCommit: (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => void
  onSelect: (id: string | null) => void
  /** 画线编辑提交（拖拽整线/锚点后） */
  onUpdate?: (id: string, points: { time: number; price: number }[]) => void
  /** 文本标注快捷编辑（桌面双击 / 移动端长按命中文本时触发） */
  onEditText?: (id: string) => void
}

/** 副图指标数据（UI 层计算，本层渲染） */
export interface SubIndicatorData {
  kind: 'volume' | 'macd' | 'kdj' | 'rsi' | 'wr' | 'obv' | 'atr' | 'dmi' | 'cci' | 'psy' | 'stoch' | 'roc' | 'mom' | 'bbw' | 'mfi' | 'ao' | 'cmf' | 'donchian' | 'aroon' | 'trix' | 'dpo' | 'vortex'
  hist?: { time: number; value: number; color?: string }[]
  lines?: { id: string; points: ValuePoint[] }[]
  markers?: { price: number; color: string }[]
  /** H2 阈值区间背景（超买/超卖带）：副图 overlay 半透明填充 [from, to] */
  zones?: { from: number; to: number; color: string }[]
}

/** 主图指标数据（UI 层计算，本层渲染） */
export interface MainIndicatorData {
  lines: { id: string; points: ValuePoint[]; color?: string }[]
  /** Ichimoku 云带：spanA/spanB 之间按点着色填充（颜色由 UI 层按涨跌给 rgba） */
  cloud?: { time: number; top: number; bottom: number; color: string }[]
  /** SAR 圆点（每点独立颜色：多头/空头） */
  markers?: { time: number; price: number; color: string }[]
}

/** 仓位线（模拟订单叠加）：开仓/止盈/止损三条价格线 */
export interface PositionLines {
  entry: number
  takeProfit?: number
  stopLoss?: number
}

/** 区域截图：框选矩形（CSS 像素，相对图表容器） */
export interface RegionRect {
  x: number
  y: number
  w: number
  h: number
}

/** 归一化框选矩形：任意两点 → 左上角 + 宽高 */
export function normalizeRegionRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): RegionRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

/**
 * 图表水印锚点（overlay 坐标系，CSS px）：主图区约占容器上部
 * （副图 + 时间轴在底部），取 42% 高度居中。
 */
export function watermarkAnchor(w: number, h: number): { x: number; y: number } {
  return { x: w / 2, y: h * 0.42 }
}

/**
 * 水印字号自适应：按字符数估算宽度，保证总宽 ≤ 容器 82%（min 12px）。
 * 平均字符宽按 0.62em 估算，适合中英文混合文案。
 */
export function watermarkFitSize(
  containerWidth: number,
  textLength: number,
  base = 26,
  min = 12,
): number {
  const avgCharEm = 0.62
  const usable = containerWidth * 0.82
  const est = base * avgCharEm * textLength
  if (est <= usable) return base
  return Math.max(min, Math.floor(usable / (avgCharEm * textLength)))
}

/**
 * 水平射线方向解析：第二点只提供创建方向，渲染始终从第一锚点向右延伸。
 * 返回 0/1，供单元测试锁定“方向点不改变终点”的交互约定。
 */
export function horizontalRayDirection(): 0 | 1 {
  return 1
}

/**
 * 垂直射线方向解析：第二点决定向上或向下延伸；
 * 与水平射线一样，方向点本身不成为可拖拽终点。
 */
export function verticalRayDirection(
  a: { y: number },
  b: { y: number },
): 'up' | 'down' {
  return b.y >= a.y ? 'down' : 'up'
}

/**
 * 渲染层隔离接口：UI/数据层只依赖它，不直接触碰具体图表库。
 * 将来替换渲染引擎（自研 Canvas / klinecharts）时仅需新实现本接口。
 */
export interface ChartApi {
  /** 全量装载（首屏 / 周期切换 / 补数乱序时使用） */
  setCandles(candles: Candle[]): void
  /** 增量更新（WS 实时：追加新 K 线或替换最后一根） */
  updateCandle(candle: Candle): void
  /** 键盘微移十字光标：dir=1 下一根 K 线 / -1 上一根（无光标时从最新 K 线开始） */
  nudgeCrosshair(dir: 1 | -1): void
  /** 屏幕坐标 → 图表 (time, price)；越界/映射失败返回 null（右键菜单用） */
  priceAt(clientX: number, clientY: number): { time: number; price: number } | null
  /** G8 多格十字光标同步：按时间戳在本地数据上定位十字光标（null 清除） */
  setCrosshairTime(time: number | null): void
  /** 清除十字光标 */
  clearCrosshair(): void
  /** 切换图表类型（蜡烛/折线/面积），保留副图与视图位置 */
  setChartType(type: ChartType): void
  /** 视图适配全部数据 */
  fitContent(): void
  /** 时间轴滚动到最新（回放播放跟随用） */
  scrollToRealTime(): void
  /** 主图指标（ma/ema/boll/sar/ichimoku），id 由 UI 层传入，颜色本层分配 */
  setMainIndicator(data: MainIndicatorData): void
  /** 副图指标（VOL/MACD/KDJ/RSI） */
  setSubIndicator(data: SubIndicatorData): void
  /** 仓位线（开仓/止盈/止损），null 清除 */
  setPositionLines(lines: PositionLines | null): void
  /** 外部参考价格线（盘口档位 hover 联动），null 清除 */
  setReferencePrice(price: number | null): void
  /** 限价标记线（盘口档位点击联动，accent 实线），null 清除 */
  setMarkerPrice(price: number | null): void
  /** 仓位线拖拽回调（拖动中实时触发，UI 层同步状态） */
  setPositionDragHandler(cb: ((key: PositionLineKey, price: number) => void) | null): void
  /** 画线数据全量渲染 */
  setDrawings(drawings: Drawing[]): void
  /** C12 便签全局显隐（隐藏时不渲染 note，数据保留） */
  setNotesHidden(hidden: boolean): void
  /** 画线工具模式（none 为只读/选中） */
  setDrawingTool(tool: DrawingTool): void
  /** 同步外部选中画线（用于只读模式拖拽判定） */
  setSelectedDrawing?(id: string | null): void
  /** 画线回调（创建完成/选中变化） */
  setDrawingCallbacks(cb: DrawingCallbacks | null): void
  /** 取消进行中的多锚点画线（清空进度并恢复手势） */
  cancelDrawing(): void
  /** 截图：主图 + 画线图层合成 PNG dataURL；传 rect 时裁剪该区域（CSS 像素） */
  takeScreenshot(rect?: RegionRect): string | null
  /** 进入框选截图模式（拖拽出矩形，松开回调 onRegionCapture） */
  startRegionSelect(): void
  /** 取消框选截图模式 */
  cancelRegionSelect(): void
  /** 框选完成回调（松开鼠标/手指时触发，rect 为 CSS 像素） */
  onRegionCapture(cb: ((rect: RegionRect) => void) | null): void
  /** 切换图表主题 */
  setTheme(theme: ThemeMode, presetId?: ColorPresetId): void
  /** 切换界面语言（文本标注默认文案 / 仓位线标签随语言更新） */
  setLocale(lang: Lang): void
  /** 显示/隐藏免责声明水印 */
  setWatermark(show: boolean): void
  /** 设置 K 线周期秒数（量度工具标签计算根数用） */
  setPeriodSeconds(sec: number): void
  /** 价格坐标轴模式：线性 / 对数（对标 TradingView/币安） */
  setPriceScaleMode(mode: 'linear' | 'log'): void
  /** 时间轴时区：utc（默认，交易所基准）或 local（浏览器本地） */
  setTimezoneMode(mode: 'utc' | 'local'): void
  /** 画线锚点吸附模式（off/time/ohlc，C3） */
  setSnapMode(mode: SnapMode): void
  /** 十字光标移动回调（离开图表区域时 time 为 null） */
  subscribeCrosshairMove(cb: (time: number | null, x: number | null, y: number | null) => void): () => void
  /** 可见区间变化回调（逻辑索引 from/to），用于向左滚动分页 */
  subscribeVisibleRange(cb: (from: number, to: number) => void): () => void
  /** 外部设置可见区间（多图时间轴同步用） */
  setVisibleRange(range: { from: number; to: number }): void
  destroy(): void
}

/** 主图指标线配色 */
/** 时区感知的刻度/悬浮时间文本：整点归日显示 MM-DD，其余 HH:MM */
function formatTickTime(timeSec: number, mode: 'utc' | 'local'): string {
  const d = new Date(timeSec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = mode === 'utc' ? d.getUTCFullYear() : d.getFullYear()
  const mo = mode === 'utc' ? d.getUTCMonth() : d.getMonth()
  const day = mode === 'utc' ? d.getUTCDate() : d.getDate()
  const h = mode === 'utc' ? d.getUTCHours() : d.getHours()
  const mi = mode === 'utc' ? d.getUTCMinutes() : d.getMinutes()
  void y
  return h === 0 && mi === 0 ? `${pad(mo + 1)}-${pad(day)}` : `${pad(h)}:${pad(mi)}`
}

const MAIN_LINE_COLORS: Record<string, string> = {
  MA5: '#f5c02f',
  MA10: '#4e9cf5',
  MA20: '#e45f9d',
  EMA5: '#f5c02f',
  EMA10: '#4e9cf5',
  EMA20: '#e45f9d',
  BOLL_UPPER: '#e45f9d',
  BOLL_MID: '#f5c02f',
  BOLL_LOWER: '#4e9cf5',
  VWAP: '#f57f17',
  ICH_TENKAN: '#4e9cf5',
  ICH_KIJUN: '#e45f9d',
  ICH_SPANA: '#26a69a',
  ICH_SPANB: '#f57f17',
  ICH_CHIKOU: '#9aa7b5',
}

/** 副图指标线配色 */
const SUB_LINE_COLORS: Record<string, string> = {
  DIF: '#f5c02f',
  DEA: '#4e9cf5',
  K: '#f5c02f',
  D: '#4e9cf5',
  J: '#e45f9d',
  RSI: '#9aa7b5',
  WR: '#9aa7b5',
  OBV: '#f5c02f',
  ATR: '#9aa7b5',
  PDI: '#26a69a',
  MDI: '#ef5350',
  ADX: '#f5c02f',
  CCI: '#9aa7b5',
  PSY: '#4e9cf5',
  ROC: '#f5c02f',
  MOM: '#4e9cf5',
  MFI: '#f5c02f',
  CMF: '#4e9cf5',
  'DC-U': '#26a69a',
  'DC-L': '#ef5350',
  'DC-BC': '#f5c02f',
  'A-U': '#26a69a',
  'A-D': '#ef5350',
}

const SUB_PANE_HEIGHT = 90

/** 长按钉住十字光标的触觉反馈时长（ms，Android vibrate） */
export const TOUCH_PIN_VIBRATE_MS = 10
/** 双击复位的触觉反馈时长（ms，Android vibrate） */
export const TOUCH_RESET_VIBRATE_MS = 12
/** 长按打开文本/便签编辑器的触觉反馈时长（ms，Android vibrate） */
export const TOUCH_EDIT_VIBRATE_MS = 14

/**
 * 触觉反馈：兼容不支持/navigator 缺失的环境。
 * 传入真实 vibrate 函数（需 bind navigator），返回是否成功触发。
 */
export function vibrateIfSupported(vibrate: ((ms: number) => boolean) | undefined, ms: number): boolean {
  if (typeof vibrate !== 'function') return false
  try {
    return vibrate(ms)
  } catch {
    return false
  }
}

/** 存活图表实例注册表：键盘十字光标等全局输入需要分发给所有已挂载图表 */
const activeAdapters = new Set<LightweightChartAdapter>()

/** 全部图表十字光标移动一根 K 线（多图布局时各图各自移动） */
export function nudgeAllCrosshairs(dir: 1 | -1) {
  for (const a of activeAdapters) a.nudgeCrosshair(dir)
}

/** 清除全部图表十字光标 */
export function clearAllCrosshairs() {
  for (const a of activeAdapters) a.clearCrosshair()
}

export class LightweightChartAdapter implements ChartApi {
  private chart: IChartApi
  private container: HTMLElement
  private mainSeries: ISeriesApi<SeriesType>
  private volumeSeries: ISeriesApi<'Histogram'> | null = null
  /** G10 VOL 均量线（与 volumeSeries 同驻 volume 面板） */
  private volumeMaSeries: ISeriesApi<'Line'> | null = null
  private mainLines: ISeriesApi<'Line' | 'Area'>[] = []
  private subSeries: ISeriesApi<'Line' | 'Histogram'>[] = []
  /** H2 副图阈值区间（超买/超卖带）：overlay 半透明背景填充 [from, to] */
  private subZones: { from: number; to: number; color: string }[] = []
  private priceLine: IPriceLine | null = null
  private lastClose: number | null = null
  private lastCandles: Candle[] = []
  private crosshairTime: number | null = null
  /** C3 吸附对齐模式（默认 ohlc，兼容旧 behavior） */
  private snapMode: SnapMode = 'ohlc'
  private currentType: ChartType = 'candlestick'
  private positionLines: PositionLines | null = null
  private positionPriceLines = new Map<string, IPriceLine>()
  private referencePriceLine: IPriceLine | null = null
  private markerPriceLine: IPriceLine | null = null
  private theme: ChartTheme = THEMES.dark
  private labels: ChartLabels = chartLabelsFor(DEFAULT_LANG)
  /** 免责声明水印开关（默认开） */
  private showWatermark = true
  /** 当前 K 线周期秒数（量度标签根数） */
  private periodSeconds = 60
  /** 最近一次 pointerdown 的点击次数（多段折线双击收尾用） */
  private lastDownDetail = 1
  private dragHandler: ((key: PositionLineKey, price: number) => void) | null = null
  private dragKey: PositionLineKey | null = null
  private hoverKey: PositionLineKey | null = null
  private overlay: HTMLCanvasElement
  private overlayCtx: CanvasRenderingContext2D
  private resizeObserver: ResizeObserver | null = null
  private drawings: Drawing[] = []
  /** C12 便签全局显隐（默认显示） */
  private notesHidden = false
  private drawingTool: DrawingTool = 'none'
  private drawingCallbacks: DrawingCallbacks | null = null
  private selectedDrawingId: string | null = null
  /** C9 悬停高亮：指针当前命中的画线 id（悬停时显示锚点） */
  private hoveredDrawingId: string | null = null
  /** 双指捏合纵向缩放状态（指距 / 起始价格区间） */
  private pinch: { dist: number; range: IRange<number> } | null = null
  /** 最近一次已震动的缩放因子（跨步进才重复震动） */
  private pinchStepVibrated = 0
  /** 触屏双击重置计时 */
  private lastTapAt = 0
  /** 触屏双击复位有效轻点会话（排除捏合残留、拖拽与长按） */
  private touchTaps = new TouchTapTracker()
  /** 画线模式下的触屏平移/捏合锁定 */
  private touchDrawingGestures = new TouchDrawingGestureLock()
  /** 捏合结束后残留单指的短防护期 */
  private pinchLinger = new PinchLingeringTracker()
  /** 本次单指触摸是否已移动（拖动≠轻点：避免两次快速拖动误触发复位） */
  private touchMoved = false
  /** 单指触摸起点（判移动阈值用） */
  private touchStartPos: { x: number; y: number } | null = null
  /** 单指快扫速度采样；lightweight-charts 当前触屏 kinetic 未生效，由适配层补齐惯性 */
  private touchInertia = new TouchInertiaTracker()
  /** 惯性滚动动画帧；null 表示未运行动画 */
  private inertiaFrame: number | null = null
  /** A4 实时帧 rAF 合并：同一帧多次 updateCandle 只重绘一次（光栅化有界，高刷行情节流收益明显） */
  private drawRafHandle: number | null = null
  /** 松手时估算出的横向速度（px/s） */
  private inertiaVelocity = 0
  /** 动画起始时间（rAF 时钟，毫秒） */
  private inertiaStartedAt = 0
  /** 上一帧时间，用来把速度换算成本帧位移 */
  private lastInertiaAt = 0
  /** 启动动画时的主图可视宽度（px） */
  private inertiaVisibleWidthPx = 0
  /** 单指触屏十字光标跟踪中（移动端无 hover，拖动/长按时跟随手指显示 OHLC） */
  private touchCrosshair = false
  /** 单指长按计时器（250ms 未移动即钉住十字光标，轻点不闪线） */
  private touchHoldTimer: number | null = null
  /** 长按起点（clientX/clientY，供定时器回调显示十字线） */
  private touchHoldPos: { x: number; y: number } | null = null
  /** 长按钉线已触发（本触摸会话内，抬起时据此决定保留十字光标） */
  private touchHoldFired = false
  /** 长按已打开文本/便签编辑器；同一触摸的后续移动不再驱动图表手势 */
  private touchEditOpened = false
  /** 十字光标松手保留计时器（拖完/长按抬起后保留片刻便于读 OHLC，轻点或新手势立即消除） */
  private touchLingerTimer: number | null = null
  /** 十字光标正处于松手保留期 */
  private touchLingering = false
  /** 长按显示十字光标阈值（ms） */
  private static readonly TOUCH_HOLD_MS = 250
  /** 十字光标松手保留时长（ms）：拖完/长按抬起后保留片刻，轻点立即消除 */
  private static readonly TOUCH_LINGER_MS = 2000
  /** 拖动判定的移动阈值（px，与之前一致） */
  private static readonly TOUCH_MOVE_PX = 10
  /** 双击复位间隔（ms） */
  private static readonly DOUBLE_TAP_MS = 300
  /** 惯性启动最低横向速度（px/s）；慢拖松手不滑 */
  private static readonly INERTIA_MIN_PX_PER_SECOND = 500
  /** 惯性半衰期（ms）：约 1 秒后剩 4.5%，手感接近移动端列表 */
  private static readonly INERTIA_HALF_LIFE_MS = 225
  /** 惯性判停阈值（px/s），避免无限小数帧浪费电量 */
  private static readonly INERTIA_SETTLE_PX_PER_SECOND = 20
  /** 捏合结束后残留单指的最短防护时长（ms） */
  private static readonly PINCH_RESIDUE_MS = 120
  /** 框选截图模式 */
  private regionSelect = false
  private regionDown: { x: number; y: number } | null = null
  private regionCurrent: { x: number; y: number } | null = null
  private regionCallback: ((rect: RegionRect) => void) | null = null
  /** 画线交互：当前手势按下点（释放时作为锚点提交） */
  private drawingDown: { time: number; price: number } | null = null
  /** 多锚点工具（斐波那契扩展）已确认的锚点 */
  private drawingPoints: { time: number; price: number }[] = []
  private drawingPreview: { time: number; price: number } | null = null
  private dragEdit:
    | {
        id: string
        kind: 'anchor' | 'move'
        anchorIdx?: number
        startTime: number
        startPrice: number
        orig: Drawing
      }
    | null = null
  private dragPreview: Drawing | null = null

  constructor(container: HTMLElement) {
    activeAdapters.add(this)
    this.container = container
    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: this.theme.background },
        textColor: this.theme.textColor,
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: this.theme.gridColor },
        horzLines: { color: this.theme.gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        borderColor: this.theme.borderColor,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 1,
      },
      rightPriceScale: { borderColor: this.theme.borderColor },
      // 触屏交互：单指拖拽平移 + 双指捏合缩放（横向由库原生处理，纵向由 onTouchMove 补充）
      handleScroll: { horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { pinch: true },
      // G13 价格坐标轴单位标签缩写（k/M/B），大数字更紧凑
      localization: { priceFormatter: fmtAxisPrice as never },
    })

    this.mainSeries = this.createMainSeries('candlestick')
    this.chart.panes()[1]?.setHeight(SUB_PANE_HEIGHT)

    // 画线 overlay 图层（pointer-events: none，不挡图表交互）
    this.overlay = document.createElement('canvas')
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;'
    container.appendChild(this.overlay)
    const ctx = this.overlay.getContext('2d')
    if (!ctx) throw new Error('canvas 2d unavailable')
    this.overlayCtx = ctx

    this.resizeObserver = new ResizeObserver(() => {
      this.syncOverlaySize()
      this.draw()
    })
    this.resizeObserver.observe(container)
    this.syncOverlaySize()

    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointerup', this.onPointerUp)
    // 系统手势/浏览器接管触摸时会发出 pointercancel；必须回滚进行中的交互，
    // 否则画线/编辑/框选可能卡在预览态，图表平移与捏合也会保持禁用。
    container.addEventListener('pointercancel', this.onPointerCancel)
    container.addEventListener('lostpointercapture', this.onLostPointerCapture)
    container.addEventListener('pointerleave', this.onPointerLeave)
    container.addEventListener('dblclick', this.onDblClick)
    // 双指捏合（纵向缩放）与双击重置：passive 不拦截，横向捏合仍由图表库原生处理
    container.addEventListener('touchstart', this.onTouchStart, { passive: true })
    container.addEventListener('touchmove', this.onTouchMove, { passive: true })
    container.addEventListener('touchend', this.onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', this.onTouchEnd, { passive: true })
  }

  setDrawings(drawings: Drawing[]) {
    this.drawings = drawings
    this.draw()
  }

  /** C12 便签全局显隐：notesHidden=true 时不渲染任何 note 类型画线（数据保留） */
  setNotesHidden(hidden: boolean) {
    if (this.notesHidden === hidden) return
    this.notesHidden = hidden
    this.draw()
  }

  setDrawingTool(tool: DrawingTool) {
    this.drawingTool = tool
    if (tool !== 'none') this.selectedDrawingId = null
    // 移动端画线模式禁用触屏平移/捏合：轻扫只用于创建画线预览，避免误触发图表手势；
    // 桌面 pressedMouseMove 不受影响，保持连续画线体验。提交/切回鼠标后恢复。
    this.touchDrawingGestures.setTool(tool)
    this.chart.applyOptions({
      handleScroll: {
        horzTouchDrag: !this.touchDrawingGestures.locked,
        vertTouchDrag: !this.touchDrawingGestures.locked,
      },
      handleScale: { pinch: !this.touchDrawingGestures.locked },
    })
    this.container.style.cursor = tool === 'none' ? '' : 'crosshair'
    this.draw()
  }

  setDrawingCallbacks(cb: DrawingCallbacks | null) {
    this.drawingCallbacks = cb
  }

  /** 取消进行中的多锚点画线：清空进度、恢复平移/捏合 */
  cancelDrawing() {
    this.resetDrawing()
  }

  setSelectedDrawing(id: string | null) {
    this.selectedDrawingId = id
    this.draw()
  }

  /** C9 悬停高亮：仅当 hover 画线变化时重绘（避免每次 pointermove 都触发整图重绘） */
  private setHoveredDrawing(id: string | null) {
    if (this.hoveredDrawingId === id) return
    this.hoveredDrawingId = id
    this.draw()
  }

  setTheme(mode: ThemeMode, presetId: ColorPresetId = 'classic') {
    this.theme = themeFor(mode, presetId)
    this.chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: this.theme.background },
        textColor: this.theme.textColor,
      },
      grid: {
        vertLines: { color: this.theme.gridColor },
        horzLines: { color: this.theme.gridColor },
      },
      timeScale: { borderColor: this.theme.borderColor },
      rightPriceScale: { borderColor: this.theme.borderColor },
      // 触屏交互：单指拖拽平移 + 双指捏合缩放（横向由库原生处理，纵向由 onTouchMove 补充）
      handleScroll: { horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { pinch: true },
    })
    this.mainSeries.applyOptions({
      upColor: this.theme.up,
      downColor: this.theme.down,
      wickUpColor: this.theme.up,
      wickDownColor: this.theme.down,
    })
    this.trackPrice(this.lastClose ?? 0)
    this.applyPositionLines()
    this.draw()
  }

  setLocale(lang: Lang) {
    this.labels = chartLabelsFor(lang)
    this.applyPositionLines()
    this.draw()
  }

  setWatermark(show: boolean) {
    if (this.showWatermark === show) return
    this.showWatermark = show
    this.draw()
  }

  setPeriodSeconds(sec: number) {
    this.periodSeconds = sec
  }

  setSnapMode(mode: SnapMode) {
    this.snapMode = mode
  }

  /** 吸附包装：按对齐模式把 (time, price) 吸附到最近 K 线（off 原样返回） */
  private snapPoint(time: number, price: number): { time: number; price: number } {
    return snapToCandle(time, price, this.lastCandles, this.snapMode)
  }

  setTimezoneMode(mode: 'utc' | 'local') {
    const fmt = (time: never) => formatTickTime(Number(time), mode)
    this.chart.applyOptions({
      localization: { timeFormatter: fmt as never },
      timeScale: { tickMarkFormatter: fmt as never },
    })
    this.draw()
  }

  setPriceScaleMode(mode: 'linear' | 'log') {
    this.chart
      .priceScale('right')
      .applyOptions({ mode: mode === 'log' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal })
  }

  takeScreenshot(rect?: RegionRect): string | null {
    const main = this.chart.takeScreenshot()
    if (!main) return null
    const canvas = document.createElement('canvas')
    canvas.width = main.width
    canvas.height = main.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return main.toDataURL('image/png')
    ctx.drawImage(main, 0, 0)
    ctx.drawImage(this.overlay, 0, 0, this.overlay.width, this.overlay.height, 0, 0, main.width, main.height)
    if (rect) {
      const dpr = window.devicePixelRatio || 1
      const sx = Math.max(0, Math.round(rect.x * dpr))
      const sy = Math.max(0, Math.round(rect.y * dpr))
      const sw = Math.min(canvas.width - sx, Math.round(rect.w * dpr))
      const sh = Math.min(canvas.height - sy, Math.round(rect.h * dpr))
      if (sw <= 0 || sh <= 0) return canvas.toDataURL('image/png')
      const out = document.createElement('canvas')
      out.width = sw
      out.height = sh
      const octx = out.getContext('2d')
      if (!octx) return canvas.toDataURL('image/png')
      octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
      return out.toDataURL('image/png')
    }
    return canvas.toDataURL('image/png')
  }

  startRegionSelect() {
    this.regionSelect = true
    this.container.style.cursor = 'crosshair'
    // 移动端框选：单指手势归区域选择，禁用图表平移与双指缩放，避免抢事件
    this.setPanEnabled(false)
    this.chart.applyOptions({ handleScale: { pinch: false } })
    this.draw()
  }

  cancelRegionSelect() {
    this.regionSelect = false
    this.regionDown = null
    this.regionCurrent = null
    this.setPanEnabled(true)
    this.chart.applyOptions({ handleScale: { pinch: true } })
    this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
    this.draw()
  }

  onRegionCapture(cb: ((rect: RegionRect) => void) | null) {
    this.regionCallback = cb
  }

  private syncOverlaySize() {
    const rect = this.container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.round(rect.width * dpr))
    const h = Math.max(1, Math.round(rect.height * dpr))
    if (this.overlay.width !== w) this.overlay.width = w
    if (this.overlay.height !== h) this.overlay.height = h
    // canvas 是替换元素：改 width/height 属性会同时改其固有 CSS 尺寸（=物理像素），
    // dpr>1 时必须显式设回 CSS 尺寸，否则画线 overlay 撑出横向滚动条
    this.overlay.style.width = `${rect.width}px`
    this.overlay.style.height = `${rect.height}px`
  }

  /** 坐标投影：time/price → 屏幕坐标（主图 pane） */
  private project(time: number, price: number) {
    const x = this.chart.timeScale().timeToCoordinate(time as never)
    const y = this.mainSeries.priceToCoordinate(price)
    if (x === null || y === null) return null
    return { x, y }
  }

  private draw() {
    const ctx = this.overlayCtx
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const w = this.overlay.width / dpr
    const h = this.overlay.height / dpr
    ctx.clearRect(0, 0, w, h)

    // 免责声明水印：最底层绘制（画线在上），低透明度不抢视觉、不拦截交互
    this.drawWatermark(ctx, w, h)
    // H2 副图阈值区间背景：超买/超卖带半透明填充（画线之下）
    this.drawSubZones(ctx, w)

    for (const d of this.drawings) {
      // 图层管理：隐藏的画线不渲染（数据仍保留，取消隐藏即恢复）
      if (d.hidden) continue
      // C12 便签全局显隐：notesHidden 时跳过所有 note 类型
      if (this.notesHidden && d.type === 'note') continue
      // 拖拽中的画线由预览态绘制（实时跟随指针）
      if (this.dragEdit && d.id === this.dragEdit.id) continue
      // C15 position 工具贴附最新价：入场锚点随最新收盘价移动（渲染期派生，不写回数据）
      const latestCandle = this.lastCandles[this.lastCandles.length - 1]
      const renderDraw = latestCandle
        ? followLatestEntry(d, { time: latestCandle.time, price: latestCandle.close })
        : d
      // C9 悬停高亮：指针命中的画线显示锚点（与选中同视觉，但非拖拽态才生效）
      const hovered = !this.dragEdit && renderDraw.id === this.hoveredDrawingId
      // C10 单条透明度：drawOne 内有多处提前 return，故用 save/restore 包裹避免 globalAlpha 泄漏
      if (renderDraw.opacity !== undefined && renderDraw.opacity !== 1) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, Math.max(0.15, renderDraw.opacity))
        this.drawOne(ctx, renderDraw, renderDraw.id === this.selectedDrawingId || hovered)
        ctx.restore()
      } else {
        this.drawOne(ctx, renderDraw, renderDraw.id === this.selectedDrawingId || hovered)
      }
    }
    if (this.dragPreview) {
      this.drawOne(ctx, this.dragPreview, true)
      // C13 拖拽实时坐标提示：当前位置（锚点）标签，跟随锚点显示
      const anchor = this.dragEdit
        ? this.dragPreview.points[this.dragEdit.kind === 'anchor' ? this.dragEdit.anchorIdx ?? 0 : 0]
        : undefined
      if (anchor) {
        const ap = this.project(anchor.time, anchor.price)
        if (ap) {
          const d = new Date(anchor.time * 1000).toLocaleDateString()
          const t = new Date(anchor.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          this.drawLabel(ctx, ap.x, ap.y - 10, `📍 ${anchor.price.toFixed(2)} · ${d} ${t}`, 'left')
        }
      }
    }

    // 画线预览
    // 手势间隙也要保留多锚点进度：否则三角形等工具前两针之间没有任何视觉反馈。
    if (this.drawingPreview && (this.drawingDown || this.drawingPoints.length > 0)) {
      const tool = this.drawingTool as Drawing['type']
      const need = requiredPoints(tool)
      const current = this.drawingDown ?? this.drawingPreview
      let pts: { time: number; price: number }[]
      if (need === 2 && this.drawingPoints.length === 0) {
        pts = normalizePoints(tool, [current, this.drawingPreview])
      } else {
        // 多锚点工具：已确认锚点 + 当前手势点/最近确认点
        pts = [...this.drawingPoints, current].slice(0, need)
      }
      this.drawOne(ctx, { id: '__preview', type: tool, points: pts }, true)
    }

    // 框选截图：半透明遮罩 + 蓝色虚线框 + 尺寸标注
    if (this.regionSelect && this.regionDown && this.regionCurrent) {
      const rect = normalizeRegionRect(this.regionDown, this.regionCurrent)
      ctx.fillStyle = 'rgba(78,156,245,0.08)'
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      ctx.strokeStyle = '#4e9cf5'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(78,156,245,0.95)'
      ctx.font = '10px system-ui'
      ctx.fillText(Math.round(rect.w) + '×' + Math.round(rect.h), rect.x + 4, Math.max(10, rect.y - 4))
    }
  }

  /** H2 副图阈值区间背景：超买/超卖带（[from, to]）按副图系列坐标绘制半透明水平带 */
  private drawSubZones(ctx: CanvasRenderingContext2D, w: number) {
    if (this.subZones.length === 0) return
    // 副图系列 priceToCoordinate 返回图表坐标系 y（已含副图 pane 偏移），可直接用于 overlay
    const series = this.volumeSeries ?? this.subSeries[0]
    if (!series) return
    for (const z of this.subZones) {
      const yFrom = series.priceToCoordinate(z.from)
      const yTo = series.priceToCoordinate(z.to)
      if (yFrom === null || yTo === null) continue
      const top = Math.min(yFrom, yTo)
      const bottom = Math.max(yFrom, yTo)
      ctx.fillStyle = z.color
      ctx.fillRect(0, top, w, bottom - top)
    }
  }

  /** 免责声明水印：主图区居中、低透明度、跟随主题色；overlay 无 pointer-events 不拦截交互 */
  private drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.showWatermark) return
    const text = this.labels.watermark
    if (!text) return
    const size = watermarkFitSize(w, text.length)
    ctx.save()
    ctx.globalAlpha = 0.055
    ctx.fillStyle = this.theme.textColor
    ctx.font = `600 ${size}px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const { x, y } = watermarkAnchor(w, h)
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  /** 锚点小圆点 */
  private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  /** 回归通道线段：取 [A,B] 时间窗内收盘价做线性回归 → 中线 + ±σ 上下轨 */
  private regchanSegments(d: Drawing): SegmentLine[] {
    const [a, b] = d.points
    const closes = this.lastCandles
      .filter((c) => c.time >= Math.min(a.time, b.time) && c.time <= Math.max(a.time, b.time))
      .map((c) => ({ time: c.time, price: c.close }))
    return regressionSegments(a, b, closes)
  }

  /** 拖拽画线/仓位线时关闭图表平移，避免线条跟随数据而不是光标 */
  private setPanEnabled(enabled: boolean) {
    this.chart.applyOptions({
      handleScroll: { pressedMouseMove: enabled, horzTouchDrag: enabled, vertTouchDrag: enabled },
    })
  }

  private drawOne(ctx: CanvasRenderingContext2D, d: Drawing, selected: boolean) {
    // 用户自定义色优先；未设置时跟随主题色。alpha 后缀（如 + '88'）依赖 hex 格式
    const userColor = d.color || this.theme.yellow
    const color = selected ? '#4e9cf5' : userColor
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = selected ? 1.6 : 1
    ctx.font = '10px system-ui'
    ctx.setLineDash([])

    if (d.type === 'horizontal') {
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      ctx.beginPath()
      ctx.moveTo(0, a.y)
      ctx.lineTo(this.overlay.width / (window.devicePixelRatio || 1), a.y)
      ctx.stroke()
      this.drawLabel(ctx, a.x, a.y, d.points[0].price.toFixed(2), 'left')
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'vertical') {
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      ctx.beginPath()
      ctx.moveTo(a.x, 0)
      ctx.lineTo(a.x, this.overlay.height / (window.devicePixelRatio || 1))
      ctx.stroke()
      this.drawLabel(ctx, a.x, a.y, new Date(d.points[0].time * 1000).toLocaleDateString(), 'left')
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'cross') {
      // 十字线：锚点确定时间与价格，横纵两线全画布延伸
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      ctx.beginPath()
      ctx.moveTo(0, a.y)
      ctx.lineTo(w, a.y)
      ctx.moveTo(a.x, 0)
      ctx.lineTo(a.x, h)
      ctx.stroke()
      this.drawLabel(ctx, a.x, a.y, `${d.points[0].price.toFixed(2)} · ${new Date(d.points[0].time * 1000).toLocaleDateString()}`, 'left')
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'text') {
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const fontSize = d.fontSize ?? DEFAULT_TEXT_FONT_SIZE
      const fill = d.color || userColor
      // 多行文本：按 \n 分段逐行渲染，行高 = 字号 × 1.4
      const raw = d.text && d.text.trim() ? d.text : this.labels.defaultText
      const lines = raw.split('\n')
      ctx.font = `${fontSize}px system-ui`
      const lineH = Math.round(fontSize * 1.4)
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12
      const h = lineH * lines.length + 8
      // C8 文字对齐：左/中/右（缺省 center）
      const bx = textBoxX(a.x, w, d.textAlign ?? 'center')
      const by = a.y - h / 2
      ctx.fillStyle = this.theme.background + 'e6'
      ctx.fillRect(bx, by, w, h)
      ctx.strokeStyle = selected ? '#4e9cf5' : fill + '99'
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.strokeRect(bx, by, w, h)
      ctx.fillStyle = selected ? '#4e9cf5' : fill
      ctx.textBaseline = 'middle'
      lines.forEach((line, i) => {
        ctx.fillText(line, bx + 6, by + 4 + lineH * i + lineH / 2 + 0.5)
      })
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'note') {
      // 备注/便签：单点锚定，黄色折叠角卡片；复用 text 的多行内容与命中逻辑
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const fontSize = d.fontSize ?? DEFAULT_TEXT_FONT_SIZE
      const raw = d.text && d.text.trim() ? d.text : this.labels.defaultText
      const lines = raw.split('\n')
      ctx.font = `${fontSize}px system-ui`
      const lineH = Math.round(fontSize * 1.4)
      const padX = 8
      const padY = 7
      const fold = 9
      const w = Math.max(48, Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2)
      const h = Math.max(fontSize + padY * 2, lineH * lines.length + padY * 2)
      // C8 文字对齐：左/中/右（缺省 center）
      const bx = textBoxX(a.x, w, d.textAlign ?? 'center')
      const by = a.y - h / 2
      ctx.fillStyle = selected ? 'rgba(78,156,245,0.16)' : 'rgba(245,192,47,0.14)'
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + w - fold, by)
      ctx.lineTo(bx + w, by + fold)
      ctx.lineTo(bx + w, by + h)
      ctx.lineTo(bx, by + h)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = selected ? '#4e9cf5' : '#f5c02f'
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.stroke()
      // 折叠角三角
      ctx.fillStyle = selected ? 'rgba(78,156,245,0.35)' : 'rgba(245,192,47,0.42)'
      ctx.beginPath()
      ctx.moveTo(bx + w - fold, by)
      ctx.lineTo(bx + w, by + fold)
      ctx.lineTo(bx + w - fold, by + fold)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = selected ? '#4e9cf5' : this.theme.textColor
      ctx.textBaseline = 'middle'
      lines.forEach((line, i) => {
        ctx.fillText(line, bx + padX, by + padY + lineH * i + lineH / 2 + 0.5)
      })
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'pricelabel') {
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      ctx.beginPath()
      ctx.arc(a.x, a.y, 3, 0, Math.PI * 2)
      ctx.fill()
      this.drawLabel(ctx, a.x, a.y, d.points[0].price.toFixed(2), 'left')
      if (selected) this.drawAnchor(ctx, a.x, a.y)
      return
    }

    if (d.type === 'triangle') {
      // 三角形：A/B/C 三点围合，半透明填充 + 描边（支持多段点击预览）
      const [pa, pb, pc] = d.points
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = pb ? this.project(pb.time, pb.price) : null
      const c = pc ? this.project(pc.time, pc.price) : null
      ctx.fillStyle = userColor + '1f'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      if (b) ctx.lineTo(b.x, b.y)
      if (c) ctx.lineTo(c.x, c.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.stroke()
      for (const pt of [a, b, c]) {
        if (!pt) continue
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'wedge') {
      // 楔形：A/B 为两条边起点、C 为收敛点；边实线 + C 之后沿同方向虚线延伸（投影收敛）
      const [pa, pb, pc] = d.points
      const a = pa ? this.project(pa.time, pa.price) : null
      const b = pb ? this.project(pb.time, pb.price) : null
      const c = pc ? this.project(pc.time, pc.price) : null
      if (!c) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      for (const pt of [a, b]) {
        if (!pt) continue
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
        // C 之后虚线延伸（投影方向继续向外）
        const dx = c.x - pt.x
        const dy = c.y - pt.y
        const t = dx !== 0 ? (w - c.x) / dx : 0
        if (t > 0) {
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(c.x, c.y)
          ctx.lineTo(c.x + dx * t, c.y + dy * t)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      for (const pt of [a, b, c]) {
        if (!pt) continue
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'fibext') {
      // 斐波那契扩展：A→B 主摆幅；回撤区在 A/B 之间，延伸区从 B 向右缘
      const [pa, pb, pc] = d.points
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = pb ? this.project(pb.time, pb.price) : null
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      if (b) {
        const left = Math.min(a.x, b.x)
        const right = Math.max(a.x, b.x)
        for (const { level, price } of fibExtPrices(pa, pb)) {
          const y = this.mainSeries.priceToCoordinate(price)
          if (y === null) continue
          const isExt = level >= 1
          const x0 = isExt ? right : left
          const x1 = isExt ? w : right
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
          ctx.beginPath()
          ctx.moveTo(x0, y)
          ctx.lineTo(x1, y)
          ctx.stroke()
          this.drawLabel(ctx, x0, y, `${level.toFixed(3)} ${price.toFixed(2)}`, isExt ? 'right' : 'left')
        }
        // 摆幅框
        ctx.strokeStyle = userColor + '66'
        ctx.strokeRect(left, Math.min(a.y, b.y), right - left, Math.abs(a.y - b.y))
      }
      // C 回撤点竖虚线标记
      if (pc) {
        const c = this.project(pc.time, pc.price)
        if (c) {
          ctx.setLineDash([3, 3])
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '88'
          ctx.beginPath()
          ctx.moveTo(c.x, Math.min(a.y, c.y))
          ctx.lineTo(c.x, Math.max(a.y, c.y))
          ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.arc(c.x, c.y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        if (b) this.drawAnchor(ctx, b.x, b.y)
        if (pc) {
          const c = this.project(pc.time, pc.price)
          if (c) this.drawAnchor(ctx, c.x, c.y)
        }
      }
      return
    }

    if (d.type === 'fibchannel') {
      // 斐波那契通道：基线 A→B（level 0 实线）+ 8 条平行分位线（0.236…1.618 虚线），横贯全宽，左侧标 level
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = this.project(pb.time, pb.price)
      if (!b) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const dir = { x: b.x - a.x, y: b.y - a.y }
      if (dir.x === 0 && dir.y === 0) return
      for (const { level, price } of fibChannelLevels(pa, pb)) {
        const p0 = this.project(pa.time, price)
        if (!p0) continue
        const slope = dir.y / dir.x
        const y0 = p0.y + slope * (0 - p0.x)
        const y1 = p0.y + slope * (w - p0.x)
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
        ctx.lineWidth = selected ? 1.6 : 1
        if (level === 0) {
          ctx.setLineDash([])
        } else {
          ctx.setLineDash([4, 3])
        }
        ctx.beginPath()
        ctx.moveTo(0, y0)
        ctx.lineTo(w, y1)
        ctx.stroke()
        ctx.setLineDash([])
        this.drawLabel(ctx, 0, y0, level === 0 ? '0' : level.toFixed(3), 'left')
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'fibtimed') {
      // 斐波那契时间线：A→B 锚点 x 之间按分位线性插值画 7 条竖线（0/1 实线，中间虚线）+ 顶部标签
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = this.project(pb.time, pb.price)
      if (!b) return
      const dpr = window.devicePixelRatio || 1
      const cRect = this.container.getBoundingClientRect()
      const paneEl = this.chart.panes()[0]?.getHTMLElement() ?? null
      let top = 0
      let bottom = this.overlay.height / dpr
      if (paneEl) {
        const pRect = paneEl.getBoundingClientRect()
        top = pRect.top - cRect.top
        bottom = pRect.bottom - cRect.top
      }
      for (const { level, x } of fibTimeXs(a.x, b.x)) {
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
        ctx.lineWidth = selected ? 1.6 : 1
        if (level === 0 || level === 1) {
          ctx.setLineDash([])
        } else {
          ctx.setLineDash([4, 3])
        }
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.setLineDash([])
        this.drawLabel(ctx, x, top + 7, level.toFixed(3), 'left')
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'cycle') {
      // 周期线：以 A 为原点、A→B 时间间隔为周期，向右等比延伸竖线。
      // 优先按真实时间换算 x（轴上留白/滚动仍准确），timeToCoordinate 越界返回 null 时退回屏幕等比外推（与命中测试一致）。
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = this.project(pb.time, pb.price)
      if (!b) return
      const dpr = window.devicePixelRatio || 1
      const cRect = this.container.getBoundingClientRect()
      const paneEl = this.chart.panes()[0]?.getHTMLElement() ?? null
      let top = 0
      let bottom = this.overlay.height / dpr
      if (paneEl) {
        const pRect = paneEl.getBoundingClientRect()
        top = pRect.top - cRect.top
        bottom = pRect.bottom - cRect.top
      }
      const xOf = (time: number, index: number): number => {
        const x = this.chart.timeScale().timeToCoordinate(time as never)
        return x === null ? a.x + (b.x - a.x) * index : x
      }
      for (const { index, time } of cycleLines(pa, pb)) {
        const x = xOf(time, index)
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
        ctx.lineWidth = selected ? 1.6 : 1
        if (index === 0) {
          ctx.setLineDash([])
        } else {
          ctx.setLineDash([4, 3])
        }
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.setLineDash([])
        if (index > 0) this.drawLabel(ctx, x, top + 7, `+${index}`, 'left')
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'fibtz') {
      // 斐波那契时间区间：A 为原点、A→B 间隔为基期，向右按斐波那契倍数画分界线 + 相邻分界交替半透明竖带 + 顶部倍数标签
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = this.project(pb.time, pb.price)
      if (!b) return
      const dpr = window.devicePixelRatio || 1
      const cRect = this.container.getBoundingClientRect()
      const paneEl = this.chart.panes()[0]?.getHTMLElement() ?? null
      let top = 0
      let bottom = this.overlay.height / dpr
      if (paneEl) {
        const pRect = paneEl.getBoundingClientRect()
        top = pRect.top - cRect.top
        bottom = pRect.bottom - cRect.top
      }
      const xOf = (time: number, n: number): number => {
        const x = this.chart.timeScale().timeToCoordinate(time as never)
        return x === null ? a.x + (b.x - a.x) * n : x
      }
      const lines = fibTimeZones(pa, pb)
      // 相邻分界之间的竖带（偶数段填充，形成交替带）
      for (let i = 0; i + 1 < lines.length; i++) {
        const x0 = xOf(lines[i].time, lines[i].n)
        const x1 = xOf(lines[i + 1].time, lines[i + 1].n)
        if (i % 2 === 0) {
          ctx.fillStyle = userColor + '12'
          ctx.fillRect(Math.min(x0, x1), top, Math.abs(x1 - x0), bottom - top)
        }
      }
      // 分界线
      for (const { n, time } of lines) {
        const x = xOf(time, n)
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
        ctx.lineWidth = selected ? 1.6 : 1
        ctx.setLineDash(n === 1 ? [] : [4, 3])
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.setLineDash([])
        this.drawLabel(ctx, x, top + 7, String(n), 'left')
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'hchannel') {
      // 水平通道：上下两条水平线横贯全宽 + 半透明区间填充 + 价格标签
      const p1 = this.project(d.points[0].time, d.points[0].price)
      const p2 = this.project(d.points[1].time, d.points[1].price)
      if (!p1 || !p2) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const top = Math.min(p1.y, p2.y)
      const bottom = Math.max(p1.y, p2.y)
      ctx.fillStyle = userColor + '14'
      ctx.fillRect(0, top, w, bottom - top)
      for (const p of [p1, p2]) {
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        ctx.beginPath()
        ctx.moveTo(0, p.y)
        ctx.lineTo(w, p.y)
        ctx.stroke()
        const price = p === p1 ? d.points[0].price : d.points[1].price
        this.drawLabel(ctx, 0, p.y, price.toFixed(2), 'left')
        if (selected) {
          // 锚点必须画在时间投影处：nearestAnchor 按同一投影点判定，x=0 会导致可见锚点不可拖。
          // drawLabel 结尾会把 fillStyle 改为黄色；锚点必须显式恢复选中蓝。
          ctx.fillStyle = '#4e9cf5'
          this.drawAnchor(ctx, p.x, p.y)
        }
      }
      return
    }


    if (d.type === 'angle') {
      // 趋势角度：A→B 线段 + 相对水平夹角标签（屏幕空间，向上为正）+ A 端小圆弧示意
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const b = this.project(d.points[1].time, d.points[1].price)
      if (!b) return
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      // 角度标签：图表直觉取号（向右上涨为正）
      const deg = trendAngleDeg(a, b)
      const sign = deg >= 0 ? '+' : ''
      const label = `${sign}${deg.toFixed(1)}°`
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      this.drawLabel(ctx, mx + 6, my - 8, label, 'left')
      // A 端小圆弧：从水平方向到线段方向的夹角（canvas y 向下，角度取反）
      const rad = Math.max(12, Math.min(26, Math.hypot(b.x - a.x, b.y - a.y) / 3))
      const canvasAng = Math.atan2(b.y - a.y, b.x - a.x)
      ctx.beginPath()
      ctx.arc(a.x, a.y, rad, 0, canvasAng, canvasAng < 0)
      ctx.stroke()
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'timerange') {
      // 时间区间：A→B 时间点之间画主图区半透明竖带 + 左右边框 + 顶部日期区间标签
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = this.project(pb.time, pb.price)
      if (!b) return
      const { left, right } = timeRangeXs(a.x, b.x)
      const dpr = window.devicePixelRatio || 1
      const cRect = this.container.getBoundingClientRect()
      const paneEl = this.chart.panes()[0]?.getHTMLElement() ?? null
      let top = 0
      let bottom = this.overlay.height / dpr
      if (paneEl) {
        const pRect = paneEl.getBoundingClientRect()
        top = pRect.top - cRect.top
        bottom = pRect.bottom - cRect.top
      }
      // 半透明竖带
      ctx.fillStyle = userColor + '14'
      ctx.fillRect(left, top, right - left, bottom - top)
      // 左右边框
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
      ctx.lineWidth = selected ? 1.6 : 1
      for (const x of [left, right]) {
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
      }
      // 顶部日期区间标签（与周期线标签同位置）
      const fmt = (t: number) => {
        const dt = new Date(t * 1000)
        return `${dt.toLocaleDateString()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
      }
      this.drawLabel(ctx, left, top + 7, `${fmt(pa.time)} ~ ${fmt(pb.time)}`, 'left')
      if (selected) {
        // drawLabel 结尾会把 fillStyle 改为黄色；锚点必须显式恢复选中蓝。
        ctx.fillStyle = '#4e9cf5'
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'pband') {
      // 价格带：上下两条水平线横贯全宽 + 半透明水平带填充 + 左侧价格标签（与时间区间互为孪生）
      const p1 = this.project(d.points[0].time, d.points[0].price)
      const p2 = this.project(d.points[1].time, d.points[1].price)
      if (!p1 || !p2) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const { top, bottom } = priceBandYs(p1.y, p2.y)
      ctx.fillStyle = userColor + '14'
      ctx.fillRect(0, top, w, bottom - top)
      for (const p of [p1, p2]) {
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        ctx.beginPath()
        ctx.moveTo(0, p.y)
        ctx.lineTo(w, p.y)
        ctx.stroke()
        const price = p === p1 ? d.points[0].price : d.points[1].price
        this.drawLabel(ctx, 0, p.y, price.toFixed(2), 'left')
        if (selected) {
          // 锚点必须画在时间投影处：nearestAnchor 按同一投影点判定，x=0 会导致可见锚点不可拖。
          // drawLabel 结尾会把 fillStyle 改为黄色；锚点必须显式恢复选中蓝。
          ctx.fillStyle = '#4e9cf5'
          this.drawAnchor(ctx, p.x, p.y)
        }
      }
      return
    }

    if (d.type === 'pricerange') {
      // 价格区间框：A/B 两点定义时间与价格范围；半透明填充、四边框、
      // 上下边界价格标签与中上部价差/百分比标签。
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      const b = this.project(pb.time, pb.price)
      if (!a || !b) return
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      const top = Math.min(a.y, b.y)
      const bottom = Math.max(a.y, b.y)
      ctx.fillStyle = userColor + '1f'
      ctx.fillRect(left, top, right - left, bottom - top)
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.strokeRect(left, top, right - left, bottom - top)
      this.drawLabel(ctx, left, top, Math.max(pa.price, pb.price).toFixed(2), 'left')
      this.drawLabel(ctx, left, bottom, Math.min(pa.price, pb.price).toFixed(2), 'left')
      const info = priceRangeInfo(pa, pb)
      this.drawLabel(ctx, (left + right) / 2, top - 8, `+${info.diff.toFixed(2)} (+${info.pct.toFixed(2)}%)`, 'left')
      if (selected) {
        ctx.fillStyle = '#4e9cf5'
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'position') {
      // 持仓计划（Position Tool）：A 入场 / B 止损 / C 止盈。
      // 时间范围矩形（A→最远锚点）+ 三条水平线 + 标签 + 盈亏比。
      const pts = [d.points[0], d.points[1], d.points[2]]
      const ys = pts.map((p) => (p ? this.project(p.time, p.price) : null))
      if (ys.some((y) => !y)) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const entryY = ys[0]!.y
      // 时间范围矩形：从 A.time 到 B/C 最远 time
      const tA = this.project(pts[0]!.time, pts[0]!.price)!
      const maxTime = Math.max(pts[1]!.time, pts[2]!.time)
      const tEnd = this.project(maxTime, pts[0]!.price) ?? tA
      ctx.fillStyle = userColor + '0d'
      ctx.fillRect(tA.x, Math.min(ys[1]!.y, ys[2]!.y), tEnd.x - tA.x, Math.abs(ys[2]!.y - ys[1]!.y))
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '40'
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.strokeRect(tA.x, Math.min(ys[1]!.y, ys[2]!.y), tEnd.x - tA.x, Math.abs(ys[2]!.y - ys[1]!.y))
      // 三条水平线
      for (let i = 0; i < 3; i++) {
        const p = pts[i]
        const pt = ys[i]!
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        if (i > 0) ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(0, pt.y)
        ctx.lineTo(w, pt.y)
        ctx.stroke()
        ctx.setLineDash([])
        const tag = i === 0 ? 'E' : i === 1 ? 'S' : 'T'
        this.drawLabel(ctx, pt.x + 4, pt.y, `${tag}:${p!.price.toFixed(2)}`, 'left')
        if (selected) {
          ctx.fillStyle = '#4e9cf5'
          this.drawAnchor(ctx, pt.x, pt.y)
        }
      }
      // 盈亏比标签
      const { ratio } = riskRewardRatio(d.points[0], d.points[1], d.points[2])
      this.drawLabel(ctx, w - 8, entryY - 8, this.labels.rrRatio.replace('{ratio}', ratio.toFixed(2)), 'right')
      return
    }

    if (d.type === 'forecast') {
      // 预测（Forecast）：A→B 实线历史段，B→C 虚线箭头投影段（同幅度时间+价格延伸）。
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      const b = this.project(pb.time, pb.price)
      if (!a || !b) return
      const c = { x: 2 * b.x - a.x, y: 2 * b.y - a.y }
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      // A→B 实线
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      // B→C 投影虚线
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(c.x, c.y)
      ctx.stroke()
      ctx.setLineDash([])
      // C 端箭头
      const angle = Math.atan2(c.y - b.y, c.x - b.x)
      for (const da of [-Math.PI / 7, Math.PI / 7]) {
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(c.x - 10 * Math.cos(angle + da), c.y - 10 * Math.sin(angle + da))
        ctx.stroke()
      }
      // 涨跌幅标签
      const diff = pb.price - pa.price
      const pct = pa.price === 0 ? 0 : (diff / pa.price) * 100
      const sign = diff >= 0 ? '+' : ''
      this.drawLabel(ctx, c.x + 8, c.y, `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%)`, 'left')
      if (selected) {
        ctx.fillStyle = '#4e9cf5'
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'daterange') {
      // 日期范围（Date Range）：A/B 两点定义时间范围，渲染半透明竖带 + 边界线 + 中间天数/小时数标签。
      const pa = d.points[0]
      const pb = d.points[1]
      const a = this.project(pa.time, pa.price)
      const b = this.project(pb.time, pb.price)
      if (!a || !b) return
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      ctx.fillStyle = userColor + '14'
      ctx.fillRect(left, 0, right - left, h)
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      for (const x of [left, right]) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      // 时间差标签（秒→天/小时）
      const dt = Math.abs(pb.time - pa.time)
      const days = dt / 86400
      const hours = dt / 3600
      const label = days >= 1 ? `${days.toFixed(1)}d` : `${hours.toFixed(1)}h`
      this.drawLabel(ctx, (left + right) / 2, 16, label, 'left')
      if (selected) {
        ctx.fillStyle = '#4e9cf5'
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'rr') {
      // 风险回报（R:R）：A 入场 / B 止损 / C 止盈 → 三条水平线横贯全宽（止损/止盈虚线）+ 左侧价格标签 + 右侧盈亏比标签
      const pts = [d.points[0], d.points[1], d.points[2]]
      const ys = pts.map((p) => (p ? this.project(p.time, p.price) : null))
      if (ys.some((y) => !y)) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      for (let i = 0; i < 3; i++) {
        const p = pts[i]
        const pt = ys[i]!
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        if (i > 0) ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(0, pt.y)
        ctx.lineTo(w, pt.y)
        ctx.stroke()
        ctx.setLineDash([])
        this.drawLabel(ctx, 0, pt.y, p!.price.toFixed(2), 'left')
        if (selected) {
          // 锚点必须画在时间投影处：nearestAnchor 按同一投影点判定，x=0 会导致可见锚点不可拖。
          // drawLabel 结尾会把 fillStyle 改为黄色；锚点必须显式恢复选中蓝。
          ctx.fillStyle = '#4e9cf5'
          this.drawAnchor(ctx, pt.x, pt.y)
        }
      }
      // 盈亏比标签：右侧（入场线附近），显示 1:ratio
      const { ratio } = riskRewardRatio(d.points[0], d.points[1], d.points[2])
      const entry = ys[0]!
      this.drawLabel(ctx, w - 8, entry.y - 8, this.labels.rrRatio.replace('{ratio}', ratio.toFixed(2)), 'right')
      return
    }

    if (d.type === 'xabcd' || d.type === 'elliott') {
      // XABCD 谐波形态 / 艾略特波浪：5 锚点依次连线 + 点位标注
      const labels = d.type === 'xabcd' ? ['X', 'A', 'B', 'C', 'D'] : ['1', '2', '3', '4', '5']
      const pts: Point[] = []
      for (const p of d.points) {
        const pt = this.project(p.time, p.price)
        if (!pt) return
        pts.push(pt)
      }
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      ctx.font = '10px system-ui'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < pts.length; i++) {
        ctx.beginPath()
        ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2)
        ctx.fill()
        const off = i % 2 === 0 ? -8 : 8
        ctx.fillText(labels[i] ?? '', pts[i].x + 6, pts[i].y + off)
      }
      if (selected) for (const p of pts) this.drawAnchor(ctx, p.x, p.y)
      return
    }

    if (d.type === 'bezier') {
      // 三点贝塞尔曲线：A/C 为端点，B 为控制点；投影后采样渲染
      // 必须放在通用两点投影之前：多锚点收集期的预览可能只有 1 个锚点
      const [pa, pb, pc] = d.points
      const ba = pa ? this.project(pa.time, pa.price) : null
      const control = pb ? this.project(pb.time, pb.price) : null
      const c = pc ? this.project(pc.time, pc.price) : null
      if (ba && control && c) {
        const pts = cubicBezierPoints(ba, control, c)
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (const pt of pts.slice(1)) ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
      }
      for (const pt of [ba, control, c]) {
        if (!pt) continue
        this.drawAnchor(ctx, pt.x, pt.y)
      }
      return
    }

    const a = this.project(d.points[0].time, d.points[0].price)
    const b = this.project(d.points[1].time, d.points[1].price)
    if (!a || !b) return

    if (d.type === 'channel') {
      // 基线 + 平行线（垂直偏移 = 两点价差）
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      const [c, e] = channelLine(d.points[0], d.points[1]).map((pt) => this.project(pt.time, pt.price))
      if (c && e) {
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(e.x, e.y)
        ctx.stroke()
      }
      for (const pt of [a, b]) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'trend') {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'polyline') {
      // 多段折线：依次连接各锚点，顶点画小圆点
      const pts: Point[] = [a, b]
      for (let i = 2; i < d.points.length; i++) {
        const p = this.project(d.points[i].time, d.points[i].price)
        if (p) pts.push(p)
      }
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, selected ? 3 : 2, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'measure') {
      // 量度：虚线连接 A→B + 锚点 + 中点标签（Δ价格 / Δ% / 根数）
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      const info = measureInfo(d.points[0], d.points[1])
      const bars = Math.max(1, Math.round(Math.abs(d.points[1].time - d.points[0].time) / this.periodSeconds))
      const sign = info.diff >= 0 ? '+' : ''
      // C14 测量增强：追加屏幕角度（°）与矩形面积（|Δprice × Δtime| 的视觉近似）
      // C14 测量增强：追加屏幕角度（°）与矩形面积（|Δx × Δy| 像素²）
      const deg = trendAngleDeg(a, b)
      const area = Math.abs(a.x - b.x) * Math.abs(a.y - b.y)
      const label = `${sign}${info.diff.toFixed(2)} (${sign}${info.pct.toFixed(2)}%) · ${this.labels.measureBars.replace('{bars}', String(bars))} · ∠${deg.toFixed(1)}° ${Math.round(area)}px²`
      this.drawLabel(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 8, label, 'left')
      return
    }

    if (d.type === 'speedlines') {
      // 速度线：A 为原点，B 处竖直等分 A→B 价差，1/3 与 2/3 分位连线
      const segs = speedLines(d.points[0], d.points[1])
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]
        const p = this.project(seg.from.time, seg.from.price)
        const q = this.project(seg.to.time, seg.to.price)
        if (!p || !q) continue
        if (i === 0) {
          // 主对角线：实线默认色
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor
          ctx.lineWidth = selected ? 1.6 : 1
          ctx.setLineDash([])
        } else {
          // B 竖直线 + 分位线：虚线浅色
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '88'
          ctx.lineWidth = selected ? 1.4 : 1
          ctx.setLineDash(i === 1 ? [3, 3] : [5, 4])
        }
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
      ctx.setLineDash([])
      for (const pt of [a, b]) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'regchan') {
      // 回归通道：中线实线 + ±σ 上下轨虚线（基于窗口内收盘价最小二乘回归）
      const segs = this.regchanSegments(d)
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]
        const p = this.project(seg.from.time, seg.from.price)
        const q = this.project(seg.to.time, seg.to.price)
        if (!p || !q) continue
        if (i === 0) {
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor
          ctx.lineWidth = selected ? 1.6 : 1
          ctx.setLineDash([])
        } else {
          ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '99'
          ctx.lineWidth = selected ? 1.4 : 1
          ctx.setLineDash([5, 4])
        }
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
      ctx.setLineDash([])
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }

    if (d.type === 'rect') {
      // 矩形：半透明填充 + 边框 + 四角锚点
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      const top = Math.min(a.y, b.y)
      const bottom = Math.max(a.y, b.y)
      ctx.fillStyle = userColor + '1f'
      ctx.fillRect(left, top, right - left, bottom - top)
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.strokeRect(left, top, right - left, bottom - top)
      for (const p of [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'ellipse') {
      // 椭圆：两对角锚点定义外接框，半透明填充 + 描边
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      const top = Math.min(a.y, b.y)
      const bottom = Math.max(a.y, b.y)
      const cx = (left + right) / 2
      const cy = (top + bottom) / 2
      const rx = Math.max(1, (right - left) / 2)
      const ry = Math.max(1, (bottom - top) / 2)
      ctx.fillStyle = userColor + '1f'
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      for (const p of [
        { x: left, y: top },
        { x: right, y: bottom },
      ]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'circle') {
      // 圆：首锚点为圆心，次锚点定半径
      const r = Math.hypot(b.x - a.x, b.y - a.y)
      if (r > 0) {
        ctx.fillStyle = userColor + '1f'
        ctx.beginPath()
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        ctx.beginPath()
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'arc') {
      // 圆弧：两点定弦，取该弦为直径的半圆（中心 = 弦中点，从 a 到 b 顺时针）
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const r = Math.hypot(b.x - a.x, b.y - a.y) / 2
      if (r > 0) {
        const start = Math.atan2(b.y - a.y, b.x - a.x)
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor
        ctx.lineWidth = selected ? 1.6 : 1
        ctx.beginPath()
        ctx.arc(mx, my, r, start, start + Math.PI)
        ctx.stroke()
      }
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'hray') {
      // 水平射线：从锚点向右无限延伸；第二点仅提供创建方向，不参与渲染
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(w + 2, a.y)
      ctx.stroke()
      this.drawLabel(ctx, a.x, a.y, d.points[0].price.toFixed(2), 'left')
      for (const pt of [a, b]) this.drawAnchor(ctx, pt.x, pt.y)
      return
    }

    if (d.type === 'vray') {
      // 垂直射线：从锚点向下无限延伸；第二点提供向上/向下创建方向
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const down = b.y >= a.y
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(a.x, down ? h + 2 : -2)
      ctx.stroke()
      this.drawLabel(ctx, a.x, a.y, new Date(d.points[0].time * 1000).toLocaleDateString(), 'left')
      for (const pt of [a, b]) this.drawAnchor(ctx, pt.x, pt.y)
      return
    }

    if (d.type === 'extended') {
      // 无限延长线：A→B 定方向，两端画到画布外（由 canvas 裁剪）
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        const w = this.overlay.width / (window.devicePixelRatio || 1)
        const h = this.overlay.height / (window.devicePixelRatio || 1)
        const s = Math.max(w, h) * 2
        ctx.beginPath()
        ctx.moveTo(a.x - (dx / len) * s, a.y - (dy / len) * s)
        ctx.lineTo(a.x + (dx / len) * s, a.y + (dy / len) * s)
        ctx.stroke()
      }
      for (const pt of [a, b]) this.drawAnchor(ctx, pt.x, pt.y)
      return
    }

    if (d.type === 'ray') {
      // 射线：锚点 → 经第二点方向无限延伸（画到画布外由 canvas 裁剪）
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        const w = this.overlay.width / (window.devicePixelRatio || 1)
        const h = this.overlay.height / (window.devicePixelRatio || 1)
        const s = Math.max(w, h) * 2
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(a.x + (dx / len) * s, a.y + (dy / len) * s)
        ctx.stroke()
        // 锚点 + 方向控制点（均可拖拽）
        ctx.beginPath()
        ctx.arc(a.x, a.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    if (d.type === 'parray') {
      // 平行射线：A→B 方向参考虚线 + 从 C 沿 (B−A) 方向无限延伸（画到画布外由 canvas 裁剪）
      const [pa, pb, pc] = d.points
      if (!pa || !pb || !pc) return
      const a = this.project(pa.time, pa.price)
      const b = this.project(pb.time, pb.price)
      const c = this.project(pc.time, pc.price)
      if (!a || !b || !c) return
      const spec = parallelRaySpec(a, b, c)
      // 方向参考线 A→B（细虚线）
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.lineWidth = selected ? 1.2 : 0.8
      ctx.beginPath()
      ctx.moveTo(spec.helperFrom.x, spec.helperFrom.y)
      ctx.lineTo(spec.helperTo.x, spec.helperTo.y)
      ctx.stroke()
      ctx.restore()
      // 平行射线：从 C 沿方向无限延伸
      const rdx = spec.rayDir.x - spec.rayFrom.x
      const rdy = spec.rayDir.y - spec.rayFrom.y
      const rlen = Math.hypot(rdx, rdy)
      if (rlen > 0) {
        const w = this.overlay.width / (window.devicePixelRatio || 1)
        const h = this.overlay.height / (window.devicePixelRatio || 1)
        const s = Math.max(w, h) * 2
        ctx.beginPath()
        ctx.moveTo(spec.rayFrom.x, spec.rayFrom.y)
        ctx.lineTo(spec.rayFrom.x + (rdx / rlen) * s, spec.rayFrom.y + (rdy / rlen) * s)
        ctx.stroke()
      }
      for (const pt of [a, b, c]) this.drawAnchor(ctx, pt.x, pt.y)
      return
    }

    if (d.type === 'pchannel') {
      // 宽度通道：过 A/过 C 两条无限平行线（方向 = B−A）+ B→C 宽度参考虚线
      const [pa, pb, pc] = d.points
      if (!pa || !pb || !pc) return
      const a = this.project(pa.time, pa.price)
      const b = this.project(pb.time, pb.price)
      const c = this.project(pc.time, pc.price)
      if (!a || !b || !c) return
      const spec = widthChannelSpec(a, b, c)
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      const s = Math.max(w, h) * 2
      const len = Math.hypot(spec.lineA.dir.x, spec.lineA.dir.y)
      const drawLine = (p0: Point) => {
        if (len === 0) return
        const ux = (spec.lineA.dir.x / len) * s
        const uy = (spec.lineA.dir.y / len) * s
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p0.x + ux, p0.y + uy)
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p0.x - ux, p0.y - uy)
        ctx.stroke()
      }
      drawLine(spec.lineA.p0)
      drawLine(spec.lineC.p0)
      // 宽度连线 B→C（细虚线）
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.lineWidth = selected ? 1.2 : 0.8
      ctx.beginPath()
      ctx.moveTo(spec.widthFrom.x, spec.widthFrom.y)
      ctx.lineTo(spec.widthTo.x, spec.widthTo.y)
      ctx.stroke()
      ctx.restore()
      for (const pt of [a, b, c]) this.drawAnchor(ctx, pt.x, pt.y)
      return
    }

    if (d.type === 'arrow') {
      // 箭头：A→B 线段 + B 端实心箭头
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const size = 9
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - size * Math.cos(angle - Math.PI / 6), b.y - size * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(b.x - size * Math.cos(angle + Math.PI / 6), b.y - size * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'fibfan') {
      // 斐波那契扇形：A 为原点，向 A→B 竖直距离各分位方向发散射线
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      const s2 = Math.max(w, h) * 2
      for (const { level, dir } of fibFanRays(d.points[0], d.points[1])) {
        const dirPt = this.project(dir.time, dir.price)
        if (!dirPt) continue
        const dx = dirPt.x - a.x
        const dy = dirPt.y - a.y
        const len = Math.hypot(dx, dy)
        if (len === 0) continue
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'bb'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(a.x + (dx / len) * s2, a.y + (dy / len) * s2)
        ctx.stroke()
        this.drawLabel(ctx, dirPt.x, dirPt.y, level.toFixed(3), 'left')
      }
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'gann') {
      // 江恩角度线：A 为原点，双向发散 9 条角度线（1×8 … 8×1）
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      const s2 = Math.max(w, h) * 2
      for (const { label, dir } of gannFanRays(d.points[0], d.points[1])) {
        const dirPt = this.project(dir.time, dir.price)
        if (!dirPt) continue
        const dx = dirPt.x - a.x
        const dy = dirPt.y - a.y
        const len = Math.hypot(dx, dy)
        if (len === 0) continue
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'bb'
        // 双向延伸：A 两侧各画 s2 长（canvas 自动裁剪）
        ctx.beginPath()
        ctx.moveTo(a.x - (dx / len) * s2, a.y - (dy / len) * s2)
        ctx.lineTo(a.x + (dx / len) * s2, a.y + (dy / len) * s2)
        ctx.stroke()
        this.drawLabel(ctx, dirPt.x, dirPt.y, label, 'left')
      }
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor
      ctx.lineWidth = selected ? 1.6 : 1
      // 1×1 主对角线加粗
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.lineWidth = 1
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    if (d.type === 'gannbox') {
      // 江恩箱：A→B 定矩形 + 四角 1×1/1×2/2×1 角度线（选中蓝色，1×1 主对角线加粗）
      const rect = gannBoxRect(d.points[0], d.points[1], (t, p) => this.project(t, p))
      const segs = gannBoxSegments(d.points[0], d.points[1], (t, p) => this.project(t, p))
      if (!rect || segs.length === 0) return
      const w = rect.right - rect.left
      const h = rect.bottom - rect.top
      // 1×1 主对角线（BL→TR、TL→BR）加粗；其余 1×2/2×1 细线
      const diagIdx = new Set([0, 1])
      for (let i = 0; i < segs.length; i++) {
        const { from, to } = segs[i]
        ctx.strokeStyle = diagIdx.has(i) ? (selected ? '#4e9cf5' : userColor) : selected ? '#4e9cf5' : userColor + 'aa'
        ctx.lineWidth = diagIdx.has(i) ? (selected ? 1.8 : 1.3) : 1
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }
      ctx.lineWidth = 1
      // 矩形边框（半透明，稍粗）
      ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '88'
      ctx.lineWidth = selected ? 1.6 : 1.2
      ctx.strokeRect(rect.left, rect.top, w, h)
      ctx.lineWidth = 1
      // 四角小标签：1×1 / 1×2 / 2×1
      const corners: { x: number; y: number; dx: number; dy: number }[] = [
        { x: rect.left, y: rect.bottom, dx: 3, dy: -3 },
        { x: rect.right, y: rect.bottom, dx: -20, dy: -3 },
        { x: rect.left, y: rect.top, dx: 3, dy: 12 },
        { x: rect.right, y: rect.top, dx: -20, dy: 12 },
      ]
      ctx.fillStyle = selected ? '#4e9cf5' : userColor
      for (const c of corners) {
        this.drawLabel(ctx, c.x, c.y, '1×1', c.dx < 0 ? 'right' : 'left')
        this.drawLabel(ctx, c.x, c.y + (c.dy < 0 ? 10 : -2), '1×2', c.dx < 0 ? 'right' : 'left')
        this.drawLabel(ctx, c.x + (c.dx < 0 ? -16 : 16), c.y, '2×1', c.dx < 0 ? 'right' : 'left')
      }
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
      return
    }
    if (d.type === 'pitchfork') {
      // 安德鲁叉（Andrews Pitchfork）：A 起点 → B/C 中点连中轨，过 B/C 作平行上/下轨，向右无限延伸（canvas 裁剪）
      const [pa, pb, pc] = d.points
      const a = this.project(pa.time, pa.price)
      if (!a) return
      const b = pb ? this.project(pb.time, pb.price) : null
      const c = pc ? this.project(pc.time, pc.price) : null
      const w = this.overlay.width / (window.devicePixelRatio || 1)
      const h = this.overlay.height / (window.devicePixelRatio || 1)
      const s2 = Math.max(w, h) * 2
      if (b && c) {
        const rays = pitchforkRays(a, b, c)
        rays.forEach((ray, i) => {
          const dx = ray.dir.x - ray.from.x
          const dy = ray.dir.y - ray.from.y
          const len = Math.hypot(dx, dy)
          if (len === 0) return
          ctx.strokeStyle = i === 0 ? (selected ? '#4e9cf5' : userColor) : selected ? '#4e9cf5' : userColor + 'aa'
          ctx.lineWidth = i === 0 ? (selected ? 1.8 : 1.3) : 1
          ctx.beginPath()
          ctx.moveTo(ray.from.x, ray.from.y)
          ctx.lineTo(ray.from.x + (dx / len) * s2, ray.from.y + (dy / len) * s2)
          ctx.stroke()
        })
        ctx.lineWidth = 1
        // B→C 中点小记号（浅色虚线，指示叉心）
        const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + '55'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(mid.x, mid.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(mid.x, mid.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const pt of [a, b, c]) {
        if (!pt) continue
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      if (selected) {
        for (const pt of [a, b, c]) {
          if (pt) this.drawAnchor(ctx, pt.x, pt.y)
        }
      }
      return
    }

    if (d.type === 'fib') {
      // 分位线（从高位向下）
      const prices = fibPrices(d.points[0].price, d.points[1].price)
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      for (const p of prices) {
        const y = this.mainSeries.priceToCoordinate(p)
        if (y === null) continue
        ctx.strokeStyle = selected ? '#4e9cf5' : userColor + 'cc'
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
        this.drawLabel(ctx, right, y, p.toFixed(2), 'right')
      }
      // 边框
      ctx.strokeStyle = userColor + '66'
      ctx.strokeRect(left, Math.min(a.y, b.y), right - left, Math.abs(a.y - b.y))
      if (selected) {
        this.drawAnchor(ctx, a.x, a.y)
        this.drawAnchor(ctx, b.x, b.y)
      }
    }
  }

  private drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, align: 'left' | 'right') {
    const label = `${text} `
    const w = ctx.measureText(label).width + 6
    const lx = align === 'left' ? x : x - w
    ctx.fillStyle = this.theme.background + 'e6'
    ctx.fillRect(lx, y - 8, w, 14)
    ctx.fillStyle = this.theme.yellow
    ctx.textBaseline = 'middle'
    ctx.fillText(label, lx + 3, y)
  }

  setPositionDragHandler(cb: ((key: PositionLineKey, price: number) => void) | null) {
    this.dragHandler = cb
  }

  /** 双击命中文本标注 → 快捷打开文本编辑器（桌面端） */
  private onDblClick = (e: MouseEvent) => {
    if (this.drawingTool !== 'none') return
    const rect = this.container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = hitTestDrawings(this.drawings, x, y, (t, p) => this.project(t, p))
    if (!hit) return
    const d = this.drawings.find((dd) => dd.id === hit && (dd.type === 'text' || dd.type === 'note'))
    if (!d) return
    this.selectedDrawingId = d.id
    this.drawingCallbacks?.onSelect?.(d.id)
    this.drawingCallbacks?.onEditText?.(d.id)
    this.draw()
  }

  private onPointerDown = (e: PointerEvent) => {
    this.lastDownDetail = e.detail
    const rect = this.container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 框选截图模式：记录起点并 capture 指针
    if (this.regionSelect) {
      this.regionDown = { x, y }
      this.regionCurrent = { x, y }
      this.container.setPointerCapture?.(e.pointerId)
      this.draw()
      return
    }

    // 画线模式：按下点 = 当前 time/price（释放时作为锚点提交），capture 指针
    if (this.drawingTool !== 'none') {
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)
      if (time !== null && price !== null) {
        this.drawingDown = this.snapPoint(Number(time), Number(price))
        this.drawingPreview = this.drawingDown
        this.container.setPointerCapture?.(e.pointerId)
        this.setPanEnabled(false)
        this.draw()
      }
      return
    }

    // 仓位线拖拽
    if (this.hoverKey && this.positionLines) {
      this.dragKey = this.hoverKey
      this.container.style.cursor = 'grabbing'
      this.container.setPointerCapture?.(e.pointerId)
      this.setPanEnabled(false)
      return
    }

    // 画线编辑（只读模式）：锚点拖拽 → 整线移动 → 选中/取消
    if (this.drawingTool === 'none') {
      // 手指接触面远大于鼠标光标，锚点判定单独放宽；整线/选中仍用桌面阈值，避免误抢相邻画线
      const anchorThreshold = e.pointerType === 'touch' ? TOUCH_ANCHOR_THRESHOLD_PX : undefined
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)
      const startTime = time !== null ? Number(time) : 0
      const startPrice = price !== null ? Number(price) : 0
      const selected = this.selectedDrawingId
        ? this.drawings.find((d) => d.id === this.selectedDrawingId)
        : null

      if (selected) {
        const anchorIdx = nearestAnchor(selected, x, y, (t, p) => this.project(t, p), anchorThreshold)
        if (anchorIdx !== null) {
          this.dragEdit = { id: selected.id, kind: 'anchor', anchorIdx, startTime, startPrice, orig: selected }
          this.dragPreview = selected
          this.container.setPointerCapture?.(e.pointerId)
          this.container.style.cursor = 'grabbing'
          this.setPanEnabled(false)
          this.draw()
          return
        }
      }

      const hit = hitTestDrawings(
        this.drawings,
        x,
        y,
        (t, p) => this.project(t, p),
        (d) => (d.type === 'regchan' ? this.regchanSegments(d) : null),
      )
      if (hit && hit === this.selectedDrawingId) {
        const hitDrawing = this.drawings.find((d) => d.id === hit)
        if (!hitDrawing) return
        this.dragEdit = { id: hit, kind: 'move', startTime, startPrice, orig: hitDrawing }
        this.dragPreview = hitDrawing
        this.container.setPointerCapture?.(e.pointerId)
        this.container.style.cursor = 'grabbing'
        this.setPanEnabled(false)
        this.draw()
        return
      }

      this.selectedDrawingId = hit
      this.drawingCallbacks?.onSelect(hit)
      this.draw()
      return
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 框选截图：实时更新选框
    if (this.regionSelect && this.regionDown) {
      this.regionCurrent = { x, y }
      this.draw()
      return
    }

    // 画线预览（仅当前手势内跟随）
    if (this.drawingDown) {
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)
      if (time !== null && price !== null) {
        this.drawingPreview = this.snapPoint(Number(time), Number(price))
        this.draw()
      }
      return
    }

    // 画线编辑拖拽：本地预览 + 重绘（不逐帧回调，提交时才写回）
    if (this.dragEdit) {
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)
      const orig = this.dragEdit.orig
      if (time !== null && price !== null && orig) {
        const snapped = this.snapPoint(Number(time), Number(price))
        this.dragPreview =
          this.dragEdit.kind === 'anchor'
            ? moveAnchor(orig, this.dragEdit.anchorIdx ?? 0, snapped)
            : moveDrawing(
                orig,
                Number(time) - this.dragEdit.startTime,
                Number(price) - this.dragEdit.startPrice,
              )
        this.draw()
      }
      return
    }

    if (!this.positionLines) {
      // 画线悬停光标：选中画线锚点 / 任意画线 → grab
      if (this.drawingTool === 'none' && this.drawings.length) {
        const selected = this.selectedDrawingId
          ? this.drawings.find((d) => d.id === this.selectedDrawingId)
          : null
        if (selected && nearestAnchor(selected, x, y, (t, p) => this.project(t, p)) !== null) {
          this.container.style.cursor = 'grab'
          // C9 悬停高亮：选中画线的锚点悬停也高亮该画线
          this.setHoveredDrawing(selected.id)
          return
        }
        const hit = hitTestDrawings(
          this.drawings,
          x,
          y,
          (t, p) => this.project(t, p),
          (d) => (d.type === 'regchan' ? this.regchanSegments(d) : null),
        )
        this.container.style.cursor = hit ? 'grab' : ''
        // C9 悬停高亮：命中画线高亮、未命中清除
        this.setHoveredDrawing(hit)
        return
      }
      this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
      return
    }
    if (this.dragKey) {
      const price = resolveDragPrice(y, (yy) => this.mainSeries.coordinateToPrice(yy))
      if (price !== null) {
        const next = { ...this.positionLines, [this.dragKey]: price }
        this.positionLines = next
        this.applyPositionLines()
        this.dragHandler?.(this.dragKey, price)
      }
      return
    }
    const lines = Object.entries(this.positionLines)
      .filter(([, price]) => Number.isFinite(price))
      .map(([key, price]) => ({ key: key as PositionLineKey, price }))
    const hit = detectHover(y, lines, (price) => this.mainSeries.priceToCoordinate(price))
    this.hoverKey = hit
    this.container.style.cursor = hit ? 'grab' : this.drawingTool === 'none' ? '' : 'crosshair'
  }

  private onPointerUp = (_e: PointerEvent) => {
    // 框选截图完成 → 清除选框并回调（导出由 UI 层触发 takeScreenshot(rect)）
    if (this.regionSelect && this.regionDown && this.regionCurrent) {
      const regionRect = normalizeRegionRect(this.regionDown, this.regionCurrent)
      this.regionSelect = false
      this.regionDown = null
      this.regionCurrent = null
      this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
      this.draw()
      this.regionCallback?.(regionRect)
      return
    }

    // 画线编辑完成 → 提交最终锚点
    if (this.dragEdit) {
      const edit = this.dragEdit
      const preview = this.dragPreview
      this.dragEdit = null
      this.dragPreview = null
      if (preview) {
        this.drawings = this.drawings.map((d) => (d.id === preview.id ? preview : d))
        this.drawingCallbacks?.onUpdate?.(edit.id, preview.points)
      }
      this.setPanEnabled(true)
      this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
      this.draw()
      return
    }

    // 画线完成 → 提交（按工具所需锚点数分批收集）
    if (this.drawingDown) {
      const tool = this.drawingTool as Drawing['type']
      const need = requiredPoints(tool)
      const final = this.drawingPreview ?? this.drawingDown
      if (need === 1) {
        // 单点工具：单击/拖放即提交
        this.drawingCallbacks?.onCommit({ type: tool, points: [final] })
        this.resetDrawing()
      } else if (need === 2 && this.drawingPoints.length === 0) {
        // 两点工具：单次手势「按下=起点，释放=终点」
        this.drawingCallbacks?.onCommit({ type: tool, points: normalizePoints(tool, [this.drawingDown, final]) })
        this.resetDrawing()
      } else {
        // 多锚点工具（斐波那契扩展）：每次手势的按下点作为一个锚点，集满提交
        this.drawingPoints.push(this.drawingDown)
        if (tool === 'polyline' && this.lastDownDetail >= 2) {
          // 多段折线：双击（detail>=2）收尾提交
          this.drawingCallbacks?.onCommit({ type: tool, points: this.drawingPoints })
          this.resetDrawing()
          return
        }
        if (this.drawingPoints.length >= need) {
          this.drawingCallbacks?.onCommit({ type: tool, points: this.drawingPoints })
          this.resetDrawing()
        } else {
          this.drawingPreview = this.drawingPoints[this.drawingPoints.length - 1]
          this.drawingDown = null
          this.setPanEnabled(true)
          this.draw()
        }
      }
      return
    }
    this.drawingDown = null
    this.drawingPreview = null
    this.drawingPoints = []
    this.dragKey = null
    this.hoverKey = null
    this.setPanEnabled(true)
    this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
  }

  private resetDrawing() {
    this.drawingDown = null
    this.drawingPreview = null
    this.drawingPoints = []
    this.setPanEnabled(true)
    this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
    this.draw()
  }

  /**
   * 指针手势被系统取消：不提交任何创建/编辑，只回滚到工具当前模式。
   * - 两点工具：丢弃本次按下与预览；
   * - 多锚点工具：保留已确认锚点，让用户可继续补点；
   * - 拖拽编辑：丢弃预览，保留原画线；
   * - 框选截图：整段取消。
   */
  private onPointerCancel = () => {
    this.cancelTouchInertia()
    this.drawingDown = null
    this.dragPreview = null
    this.dragEdit = null
    this.dragKey = null
    this.hoverKey = null
    this.touchMoved = false
    this.touchHoldFired = false
    this.touchEditOpened = false
    this.clearTouchHold()
    this.clearTouchLinger()
    if (this.touchCrosshair) this.setTouchCrosshair(false)
    if (this.regionSelect) {
      this.cancelRegionSelect()
    } else {
      this.setPanEnabled(true)
      this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
      this.draw()
    }
  }

  /** 捕获丢失是系统取消的兜底信号：只清理当前按下点，不重复回滚已完成状态 */
  private onLostPointerCapture = (e: PointerEvent) => {
    this.drawingDown = null
    // 触摸拖动会先释放 pointer 捕获、再派发 touchend；这里若清掉拖动标记，
    // touchend 会把两次快速拖动误判成双击复位，因此只在鼠标手势时重置。
    if (e.pointerType === 'mouse') this.touchMoved = false
  }

  /** 取消长按定时器并清空起点 */
  private clearTouchHold() {
    if (this.touchHoldTimer !== null) {
      window.clearTimeout(this.touchHoldTimer)
      this.touchHoldTimer = null
    }
    this.touchHoldPos = null
  }

  /**
   * 松手后的横向惯性滚动。
   * 只接管单指快扫：每帧把像素速度换算成 logical range 平移量，
   * 新手势、系统取消或组件销毁都必须先取消动画。
   */
  private startTouchInertia(velocityX: number) {
    const range = this.chart.timeScale().getVisibleLogicalRange()
    const rect = this.container.getBoundingClientRect()
    if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) return
    if (range.to - range.from <= 0 || !(rect.width > 0)) return
    this.cancelTouchInertia()
    this.inertiaVelocity = velocityX
    this.inertiaVisibleWidthPx = rect.width
    this.inertiaStartedAt = performance.now()
    this.lastInertiaAt = this.inertiaStartedAt
    this.inertiaFrame = requestAnimationFrame(this.animateTouchInertia)
  }

  private animateTouchInertia = (frameTime: number) => {
    this.inertiaFrame = null
    const dtMs = Math.min(100, Math.max(0, frameTime - this.lastInertiaAt))
    const elapsedMs = Math.max(0, frameTime - this.inertiaStartedAt)
    this.lastInertiaAt = frameTime

    const velocity = decayInertiaVelocity(
      this.inertiaVelocity,
      elapsedMs,
      LightweightChartAdapter.INERTIA_HALF_LIFE_MS,
    )
    const range = this.chart.timeScale().getVisibleLogicalRange()
    if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) return
    if (range.to - range.from <= 0) return

    let bars = horizontalInertiaBars(
      velocity,
      dtMs,
      this.inertiaVisibleWidthPx,
      range.to - range.from,
    )
    // 数据尾部仍保留图表配置的 rightOffset 空隙；贴边后立即停止，避免持续空转。
    const maxTo = Math.max(
      range.to,
      this.mainSeries.data().length - 1 + (this.chart.options().timeScale.rightOffset || 0),
    )
    let stopped = false
    if (range.to + bars > maxTo) {
      bars = Math.max(0, maxTo - range.to)
      stopped = true
    }

    const from = range.from + bars
    const to = range.to + bars
    if (from !== range.from || to !== range.to) {
      this.chart.timeScale().setVisibleLogicalRange({ from, to })
    }

    if (stopped || inertiaSettled(velocity, LightweightChartAdapter.INERTIA_SETTLE_PX_PER_SECOND)) {
      this.inertiaVelocity = 0
      return
    }
    this.inertiaVelocity = velocity
    this.inertiaFrame = requestAnimationFrame(this.animateTouchInertia)
  }

  /** 取消进行中的惯性动画；不清除十字光标，由具体手势决定后续视觉状态 */
  private cancelTouchInertia() {
    if (this.inertiaFrame !== null) {
      cancelAnimationFrame(this.inertiaFrame)
      this.inertiaFrame = null
    }
    this.inertiaVelocity = 0
  }

  /** 十字光标松手保留：拖完/长按抬起后保留 2s（期间轻点立即消除），到期自动清除 */
  private startTouchLinger() {
    this.clearTouchLinger()
    if (!this.touchCrosshair) return
    this.touchLingering = true
    this.touchLingerTimer = window.setTimeout(() => {
      this.touchLingerTimer = null
      this.touchLingering = false
      if (this.touchCrosshair) this.setTouchCrosshair(false)
    }, LightweightChartAdapter.TOUCH_LINGER_MS)
  }

  /** 取消松手保留计时器（不主动清十字光标，由调用方决定） */
  private clearTouchLinger() {
    if (this.touchLingerTimer !== null) {
      window.clearTimeout(this.touchLingerTimer)
      this.touchLingerTimer = null
    }
    this.touchLingering = false
  }

  /** 触屏按下：单指（非画线）长按文本打开编辑器 / 长按钉十字光标 / 拖拽编辑；双指记录起始指距与价格区间 */
  private onTouchStart = (e: TouchEvent) => {
    this.clearTouchHold()
    this.cancelTouchInertia()
    this.touchInertia.reset()
    if (this.regionSelect) {
      this.clearTouchLinger()
      this.touchTaps.invalidate()
      return
    }
    // 新手势开始：若上一手势的十字光标正保留中 → 立即消除（轻点/再拖/捏合均先消失，随后按需重显）
    if (this.touchLingering) {
      this.clearTouchLinger()
      this.setTouchCrosshair(false)
    }
    // 捏合后仍留在图上的单指是残留手势：标记为拖动并使轻点会话失效，
    // 防止其后续移动/抬起产生十字线或误触发双击复位。
    const pinchResidue = this.pinchLinger.active && e.touches.length === 1
    this.touchHoldFired = false
    this.touchEditOpened = false
    this.pinch = null
    this.touchMoved = pinchResidue
    this.touchStartPos = null
    // 新单指触摸才计入双击；保留期轻点只负责清除十字线，捏合残留指不计入复位
    this.touchTaps.begin({ touchCount: e.touches.length, lingering: this.touchLingering })
    if (pinchResidue) {
      this.touchTaps.invalidate()
      this.setTouchCrosshair(false)
      return
    }
    if (this.drawingTool !== 'none') return
    if (e.touches.length === 2) {
      this.touchTaps.invalidate()
      if (this.dragEdit) return
      this.clearTouchHold()
      this.setTouchCrosshair(false)
      this.pinchStepVibrated = 0
      const [t1, t2] = [e.touches[0], e.touches[1]]
      const range = this.chart.priceScale('right').getVisibleRange()
      if (!range) return
      this.pinch = {
        dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        range,
      }
      this.pinchLinger.clear()
      return
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]
      this.touchStartPos = { x: t.clientX, y: t.clientY }
      const rect = this.container.getBoundingClientRect()
      const lx = t.clientX - rect.left
      const ly = t.clientY - rect.top
      const hitId = hitTestDrawings(this.drawings, lx, ly, (tm, p) => this.project(tm, p))
      // 命中文本标注 → 长按直接打开编辑器（无论是否已选中；pointer 已开启的拖拽不阻断，长按优先）
      const hitText = hitId ? this.drawings.find((d) => d.id === hitId && (d.type === 'text' || d.type === 'note')) : null
      if (hitText) {
        this.clearTouchHold()
        this.touchHoldPos = { x: t.clientX, y: t.clientY }
        this.touchHoldTimer = window.setTimeout(() => {
          this.touchHoldTimer = null
          if (!this.touchMoved && this.touchHoldPos) {
            // 长按文本：选中并打开编辑器；标记 touchMoved 避免抬起被计入双击复位。
            // 后续同一手指滑动属于编辑器外的取消动作，不能继续平移图表或显示十字线。
            this.touchMoved = true
            this.touchEditOpened = true
            this.selectedDrawingId = hitText.id
            this.drawingCallbacks?.onSelect?.(hitText.id)
            this.drawingCallbacks?.onEditText?.(hitText.id)
            vibrateIfSupported(navigator.vibrate?.bind(navigator), TOUCH_EDIT_VIBRATE_MS)
            this.setTouchCrosshair(false)
            this.draw()
          }
        }, LightweightChartAdapter.TOUCH_HOLD_MS)
        return
      }
      // 画线/锚点拖拽手势（pointer 已接管）不参与长按钉线和双击复位
      if (this.dragEdit) {
        this.touchTaps.invalidate()
        return
      }
      const selected = this.selectedDrawingId
        ? this.drawings.find((d) => d.id === this.selectedDrawingId)
        : null
      const onSelected =
        !!selected &&
        (nearestAnchor(selected, lx, ly, (tm, p) => this.project(tm, p)) !== null || hitId === selected.id)
      // 触碰已选画线/锚点时，手势将用于整线/锚点拖拽编辑，不启动长按钉线
      if (onSelected) {
        this.clearTouchHold()
        this.setTouchCrosshair(false)
        this.touchHoldPos = null
        return
      }
      // 长按 250ms 未移动 → 钉住十字光标（轻点/快扫不闪线）
      this.clearTouchHold()
      this.touchHoldPos = { x: t.clientX, y: t.clientY }
      this.touchHoldTimer = window.setTimeout(() => {
        this.touchHoldTimer = null
        if (!this.touchMoved && this.touchHoldPos) {
          this.showCrosshairAt(this.touchHoldPos.x, this.touchHoldPos.y)
          this.touchHoldFired = true
          // 钉线成功触觉反馈（Android）
          vibrateIfSupported(navigator.vibrate?.bind(navigator), TOUCH_PIN_VIBRATE_MS)
        }
      }, LightweightChartAdapter.TOUCH_HOLD_MS)
    }
  }

  /** 触屏移动：单指更新十字光标；双指按指距比例缩放价格区间 */
  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (this.regionSelect && this.regionDown) {
        const rect = this.container.getBoundingClientRect()
        this.regionCurrent = { x: t.clientX - rect.left, y: t.clientY - rect.top }
        this.draw()
        return
      }
      if (this.drawingTool === 'none' && !this.dragEdit && !this.pinchLinger.active) {
        this.touchInertia.move(t.clientX, t.clientY)
      }
      if (this.touchEditOpened) return
      const s0 = this.touchStartPos
      const moved =
        !!s0 && Math.hypot(t.clientX - s0.x, t.clientY - s0.y) > LightweightChartAdapter.TOUCH_MOVE_PX
      if (!moved) {
        // 长按已显示十字线，轻微移动跟随手指
        if (this.touchCrosshair) this.showCrosshairAt(t.clientX, t.clientY)
        return
      }
      // 移动超过阈值视为拖动（平移/十字光标跟随）：取消长按并立即失效双击复位会话
      this.touchMoved = true
      // 画线整线/锚点拖拽由 pointer 事件驱动，触屏事件不再显示十字光标（避免编辑时跟随手指的视觉噪音）
      if (this.dragEdit) return
      this.clearTouchHold()
      this.showCrosshairAt(t.clientX, t.clientY)
      return
    }
    if (!this.pinch || this.drawingTool !== 'none' || this.dragEdit) return
    if (e.touches.length !== 2) return
    const [t1, t2] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    if (this.pinch.dist <= 0 || dist <= 0) return
    const factor = dist / this.pinch.dist
    if (Math.abs(factor - 1) < 0.02) return // 微小抖动忽略
    const scale = this.chart.priceScale('right')
    const rect = this.container.getBoundingClientRect()
    const midPrice = this.mainSeries.coordinateToPrice((t1.clientY + t2.clientY) / 2 - rect.top)
    const { from, to } = this.pinch.range
    if (midPrice === null || !isFinite(from) || !isFinite(to) || to - from <= 0) return
    const next = zoomRangeAround(midPrice, from, to, factor)
    if (next.to - next.from < 1e-9) return
    // 切到手动区间，避免被 autoScale 覆盖
    scale.setAutoScale(false)
    scale.setVisibleRange({ from: next.from, to: next.to })
    this.pinch = { dist, range: { from: next.from, to: next.to } }
    // 缩放步进触觉反馈（Android，跨 1.15/0.85 步进才震）
    if (navigator.vibrate && this.pinchStepVibrated !== factor) {
      const steps = [0.85, 1, 1.15]
      const near = steps.some((st) => Math.abs(factor - st) < 0.06)
      if (near) {
        vibrateIfSupported(navigator.vibrate?.bind(navigator), 8)
        this.pinchStepVibrated = factor
      }
    }
  }

  /** 触屏抬起/取消：结束十字光标与捏合；轻点两次 300ms 内恢复自适应 + 时间轴 */
  private onTouchEnd = (e: TouchEvent) => {
    this.clearTouchHold()
    if (this.regionSelect) {
      const touchCount = e.touches.length + e.changedTouches.length
      // 多指误触后先抬起一指：等最后一指离开才结束框选
      if (touchCount > 1 || e.touches.length > 0) return
      if (this.regionDown && this.regionCurrent) {
        const regionRect = normalizeRegionRect(this.regionDown, this.regionCurrent)
        this.regionSelect = false
        this.regionDown = null
        this.regionCurrent = null
        this.setPanEnabled(true)
        this.chart.applyOptions({ handleScale: { pinch: true } })
        this.draw()
        this.regionCallback?.(regionRect)
      } else {
        this.cancelRegionSelect()
      }
      return
    }
    const wasPinch = !!this.pinch
    this.pinch = null
    this.pinchStepVibrated = 0
    if (wasPinch || e.touches.length > 0) {
      // 双指捏合结束：不保留十字光标；残留指抬起也不得累积成双击复位。
      // 若仍剩一指，开启短防护：该指移动不显示十字线，后续按下/抬起也不计入双击。
      this.touchTaps.invalidate()
      if (wasPinch && e.touches.length === 1) {
        this.pinchLinger.start(LightweightChartAdapter.PINCH_RESIDUE_MS)
        this.touchMoved = true
      } else {
        this.pinchLinger.clear()
      }
      this.clearTouchLinger()
      if (this.touchCrosshair) this.setTouchCrosshair(false)
      return
    }
    if (e.changedTouches.length !== 1) return
    // 画线/锚点拖拽手势不参与双击复位计数（触屏绘制由 pointer 事件驱动）
    if (this.drawingTool !== 'none' || this.dragEdit) {
      this.touchMoved = false
      this.touchTaps.invalidate()
      this.clearTouchLinger()
      if (this.touchCrosshair) this.setTouchCrosshair(false)
      return
    }
    // 单指拖动（平移/十字光标跟随）不算轻点，避免两次快速拖动误触发复位；松手后十字光标保留片刻
    if (this.touchMoved) {
      this.touchMoved = false
      this.touchTaps.invalidate()
      this.lastTapAt = 0
      this.startTouchLinger()
      const { x, y } = this.touchInertia.release()
      if (shouldStartHorizontalInertia(x === 0 ? { x: 0, y } : { x, y }, {
        minPxPerSecond: LightweightChartAdapter.INERTIA_MIN_PX_PER_SECOND,
      })) {
        this.startTouchInertia(x)
      }
      return
    }
    // 长按钉线后抬起：同样保留片刻（不再是「抬起即消失」）
    if (this.touchHoldFired) {
      this.touchHoldFired = false
      this.touchTaps.invalidate()
      this.lastTapAt = 0
      this.startTouchLinger()
      return
    }
    const now = Date.now()
    if (this.touchTaps.shouldReset(now, this.lastTapAt, LightweightChartAdapter.DOUBLE_TAP_MS)) {
      this.touchTaps.invalidate()
      this.lastTapAt = 0
      this.chart.priceScale('right').setAutoScale(true)
      this.chart.timeScale().resetTimeScale()
      // 复位触觉反馈（Android）
      vibrateIfSupported(navigator.vibrate?.bind(navigator), TOUCH_RESET_VIBRATE_MS)
    } else {
      this.lastTapAt = now
    }
  }

  private onPointerLeave = () => {
    this.dragKey = null
    this.hoverKey = null
    // C9 悬停高亮：指针离开清空高亮
    if (this.hoveredDrawingId !== null) {
      this.hoveredDrawingId = null
      this.draw()
    }
    // 多锚点工具手势间隙保留进度预览；触屏 pointerup 后常伴随 pointerleave，
    // 若在这里清空，下一次实时重绘会把已确认锚点从 overlay 上擦掉。
    if (!this.drawingDown && !this.dragEdit && this.drawingPoints.length === 0) {
      this.drawingPreview = null
      this.dragPreview = null
    }
    if (!this.drawingDown && !this.dragEdit && !this.dragKey) this.setPanEnabled(true)
    this.container.style.cursor = ''
  }

  /**
   * 触屏十字光标：单指按下/移动时把十字光标钉在手指坐标（移动端无 hover），
   * 抬起/捏合时清除。坐标映射失败（越界）时保持不显示。
   */
  private setTouchCrosshair(active: boolean, touch?: Touch) {
    if (!active || !touch) {
      this.touchCrosshair = false
      this.chart.clearCrosshairPosition()
      return
    }
    this.showCrosshairAt(touch.clientX, touch.clientY)
  }

  /** 在指定手指坐标（client 系）显示十字光标；坐标映射失败时清除 */
  private showCrosshairAt(clientX: number, clientY: number) {
    const rect = this.container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const time = this.chart.timeScale().coordinateToTime(x)
    const price = this.mainSeries.coordinateToPrice(y)
    if (time === null || price === null) {
      this.touchCrosshair = false
      this.chart.clearCrosshairPosition()
      return
    }
    this.touchCrosshair = true
    this.chart.setCrosshairPosition(price, time, this.mainSeries)
  }

  private createMainSeries(type: ChartType): ISeriesApi<SeriesType> {
    if (type === 'line') {
      return this.chart.addSeries(
        LineSeries,
        {
          color: '#4e9cf5',
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerVisible: true,
        },
        0,
      )
    }
    if (type === 'area') {
      return this.chart.addSeries(
        AreaSeries,
        {
          lineColor: '#4e9cf5',
          topColor: 'rgba(78,156,245,0.28)',
          bottomColor: 'rgba(78,156,245,0.02)',
          lineWidth: 2,
          priceLineVisible: false,
        },
        0,
      )
    }
    return this.chart.addSeries(
      CandlestickSeries,
      {
        upColor: this.theme.up,
        downColor: this.theme.down,
        borderVisible: false,
        wickUpColor: this.theme.up,
        wickDownColor: this.theme.down,
      },
      0,
    )
  }

  private candleToBar(c: Candle) {
    if (this.currentType === 'candlestick') {
      return { time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }
    }
    return { time: c.time as UTCTimestamp, value: c.close }
  }

  setChartType(type: ChartType) {
    if (type === this.currentType) return
    this.chart.removeSeries(this.mainSeries)
    this.mainSeries = this.createMainSeries(type)
    this.currentType = type
    this.priceLine = null
    this.lastClose = null
    this.positionPriceLines.clear()
    if (this.lastCandles.length > 0) {
      this.mainSeries.setData(this.lastCandles.map((c) => this.candleToBar(c)))
      this.trackPrice(this.lastCandles[this.lastCandles.length - 1].close)
    }
    this.applyPositionLines()
  }

  setPositionLines(lines: PositionLines | null) {
    this.positionLines = lines
    this.applyPositionLines()
  }

  /** 价格线渲染：entry 黄 / TP 绿 / SL 红，按需创建或更新 */
  private applyPositionLines() {
    for (const key of this.positionPriceLines.keys()) {
      if (!this.positionLines || !this.positionLines[key as 'entry' | 'takeProfit' | 'stopLoss']) {
        this.mainSeries.removePriceLine(this.positionPriceLines.get(key)!)
        this.positionPriceLines.delete(key)
      }
    }
    if (!this.positionLines) return
    const specs: { key: 'entry' | 'takeProfit' | 'stopLoss'; price: number; color: string; label: string }[] = [
      { key: 'entry', price: this.positionLines.entry, color: this.theme.yellow, label: this.labels.entry },
      { key: 'takeProfit', price: this.positionLines.takeProfit ?? NaN, color: this.theme.up, label: this.labels.tp },
      { key: 'stopLoss', price: this.positionLines.stopLoss ?? NaN, color: this.theme.down, label: this.labels.sl },
    ]
    for (const s of specs) {
      if (!Number.isFinite(s.price)) continue
      const existing = this.positionPriceLines.get(s.key)
      if (existing) {
        existing.applyOptions({ price: s.price })
      } else {
        this.positionPriceLines.set(
          s.key,
          this.mainSeries.createPriceLine({
            price: s.price,
            color: s.color,
            lineStyle: s.key === 'entry' ? LineStyle.Solid : LineStyle.Dashed,
            lineWidth: 1,
            axisLabelVisible: true,
            title: `${s.label} `,
          }),
        )
      }
    }
  }

  /** 盘口参考价格线（accent 虚线段），hover 档位时显示，移出清除 */
  setReferencePrice(price: number | null) {
    if (price == null || !Number.isFinite(price)) {
      if (this.referencePriceLine) {
        this.mainSeries.removePriceLine(this.referencePriceLine)
        this.referencePriceLine = null
      }
      return
    }
    if (!this.referencePriceLine) {
      this.referencePriceLine = this.mainSeries.createPriceLine({
        price,
        color: this.theme.accent,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: 'OB ',
      })
    } else {
      this.referencePriceLine.applyOptions({ price })
    }
  }

  /** 限价标记线（accent 实线 + 'LMT' 轴标签），点击档位时显示，同档再点清除 */
  setMarkerPrice(price: number | null) {
    if (price == null || !Number.isFinite(price)) {
      if (this.markerPriceLine) {
        this.mainSeries.removePriceLine(this.markerPriceLine)
        this.markerPriceLine = null
      }
      return
    }
    if (!this.markerPriceLine) {
      this.markerPriceLine = this.mainSeries.createPriceLine({
        price,
        color: this.theme.accent,
        lineStyle: LineStyle.Solid,
        lineWidth: 2,
        axisLabelVisible: true,
        title: 'LMT ',
      })
    } else {
      this.markerPriceLine.applyOptions({ price })
    }
  }

  priceAt(clientX: number, clientY: number): { time: number; price: number } | null {
    const rect = this.container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const time = this.chart.timeScale().coordinateToTime(x)
    const price = this.mainSeries.coordinateToPrice(y)
    if (time === null || price === null) return null
    return { time: Number(time), price: Number(price) }
  }

  nudgeCrosshair(dir: 1 | -1) {
    if (this.lastCandles.length === 0) return
    const idx = this.crosshairTime != null
      ? this.lastCandles.findIndex((c) => c.time === this.crosshairTime)
      : this.lastCandles.length - 1
    const nextIdx = Math.max(0, Math.min(this.lastCandles.length - 1, (idx < 0 ? this.lastCandles.length - 1 : idx) + dir))
    const candle = this.lastCandles[nextIdx]
    this.crosshairTime = candle.time
    this.chart.setCrosshairPosition(candle.close, candle.time as UTCTimestamp, this.mainSeries)
  }

  clearCrosshair() {
    this.crosshairTime = null
    this.chart.clearCrosshairPosition()
  }

  /** G8 多格十字光标同步：按时间戳在本地数据上定位十字光标（null 清除）。
   *  各格周期/数据不同，故取「时间最接近的本地 K 线」的收盘价作为纵向位置。 */
  setCrosshairTime(time: number | null) {
    if (time === null || this.lastCandles.length === 0) {
      this.clearCrosshair()
      return
    }
    // 二分找最接近的 K 线
    let lo = 0
    let hi = this.lastCandles.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.lastCandles[mid].time < time) lo = mid + 1
      else hi = mid
    }
    // lo 指向第一个 >= time；比较左右取最近
    let idx = lo
    if (idx > 0 && Math.abs(this.lastCandles[idx - 1].time - time) < Math.abs(this.lastCandles[idx].time - time)) idx--
    const candle = this.lastCandles[idx]
    this.crosshairTime = candle.time
    this.chart.setCrosshairPosition(candle.close, candle.time as UTCTimestamp, this.mainSeries)
  }

  setCandles(candles: Candle[]) {
    this.lastCandles = candles
    this.mainSeries.setData(candles.map((c) => this.candleToBar(c)))
    this.volumeSeries?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? this.theme.up : this.theme.down,
      })),
    )
    if (candles.length > 0) this.trackPrice(candles[candles.length - 1].close)
    this.draw()
  }

  updateCandle(candle: Candle) {
    this.mainSeries.update(this.candleToBar(candle))
    this.volumeSeries?.update({
      time: candle.time as UTCTimestamp,
      value: candle.volume,
      color: candle.close >= candle.open ? this.theme.up : this.theme.down,
    })
    this.trackPrice(candle.close)
    this.scheduleDraw()
  }

  /** A4 实时帧渲染节流：rAF 合并，同一帧多次 updateCandle 只重绘一次（末帧最新） */
  private scheduleDraw() {
    if (this.drawRafHandle != null) return
    // 窄环境（SSR/部分测试）无 rAF：降级为同步直绘，保证不丢末帧
    if (typeof requestAnimationFrame !== 'function') {
      this.draw()
      return
    }
    this.drawRafHandle = requestAnimationFrame(() => {
      this.drawRafHandle = null
      this.draw()
    })
  }

  fitContent() {
    this.chart.timeScale().fitContent()
  }

  scrollToRealTime() {
    // 瞬时跳到最新（保留当前缩放宽度）：不自带平滑动画的 scrollToRealTime()——
    // 该动画在实时数据持续到达时会被时间轴更新打断，偶发半路停住（点击「回到最新」
    // 后视图仍停在历史）。setVisibleLogicalRange 瞬时生效、不可被打断。
    const bars = this.mainSeries.data()
    const len = bars.length
    if (len <= 0) return
    const cur = this.chart.timeScale().getVisibleLogicalRange()
    const span = cur && isFinite(cur.to - cur.from) && cur.to - cur.from > 0 ? cur.to - cur.from : 50
    const to = len - 1 + (this.chart.options().timeScale.rightOffset || 0)
    const from = Math.max(0, to - span)
    this.chart.timeScale().setVisibleLogicalRange({ from, to })
  }

  setMainIndicator(data: MainIndicatorData) {
    for (const s of this.mainLines) this.chart.removeSeries(s)
    this.mainLines = []
    const pane = 0

    // Ichimoku 云带：上边界（max）与下边界（min）各一条面积序列，涨绿/跌红
    if (data.cloud?.length) {
      const up = this.chart.addSeries(
        AreaSeries,
        {
          lineVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        pane,
      )
      up.setData(
        data.cloud.map((p) => ({
          time: p.time as UTCTimestamp,
          value: p.top,
          topColor: p.color,
          bottomColor: p.color,
        })),
      )
      this.mainLines.push(up)
      const down = this.chart.addSeries(
        AreaSeries,
        {
          lineVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        pane,
      )
      down.setData(
        data.cloud.map((p) => ({
          time: p.time as UTCTimestamp,
          value: p.bottom,
          topColor: p.color,
          bottomColor: p.color,
        })),
      )
      this.mainLines.push(down)
    }

    // SAR 圆点：单条线序列 + 逐点颜色（lineVisible:false 只留圆点标记）
    if (data.markers?.length) {
      const dots = this.chart.addSeries(
        LineSeries,
        {
          lineVisible: false,
          pointMarkersVisible: true,
          pointMarkersRadius: 2.5,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        pane,
      )
      dots.setData(
        data.markers.map((m) => ({ time: m.time as UTCTimestamp, value: m.price, color: m.color })),
      )
      this.mainLines.push(dots)
    }

    for (const l of data.lines) {
      const series = this.chart.addSeries(
        LineSeries,
        {
          color: l.color ?? MAIN_LINE_COLORS[l.id] ?? '#9aa7b5',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        pane,
      )
      series.setData(l.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      this.mainLines.push(series)
    }
  }

  setSubIndicator(data: SubIndicatorData) {
    for (const s of this.subSeries) this.chart.removeSeries(s)
    this.subSeries = []
    // G10 VOL 均量线：复用常驻 line 序列（与 volumeSeries 同驻 volume 面板）
    if (this.volumeMaSeries) {
      this.chart.removeSeries(this.volumeMaSeries)
      this.volumeMaSeries = null
    }

    const isVolume = data.kind === 'volume'
    if (isVolume) {
      // volume 复用常驻 volumeSeries，不参与销毁循环
      if (!this.volumeSeries) {
        this.volumeSeries = this.chart.addSeries(
          HistogramSeries,
          {
            priceScaleId: 'volume',
            priceFormat: { type: 'volume' },
            lastValueVisible: false,
            priceLineVisible: false,
          },
          1,
        )
        this.chart.priceScale('volume', 1).applyOptions({ scaleMargins: { top: 0.12, bottom: 0 } })
      }
      this.volumeSeries.setData(
        (data.hist ?? []).map((h) => ({
          time: h.time as UTCTimestamp,
          value: h.value,
          color: h.color ?? this.theme.up,
        })),
      )
      // G10 均量线（VOL MA）：叠加到 volume 面板同一价格轴
      const ma = data.lines?.[0]
      if (ma && ma.points.length) {
        this.volumeMaSeries = this.chart.addSeries(
          LineSeries,
          {
            priceScaleId: 'volume',
            color: SUB_LINE_COLORS[ma.id] ?? '#f5c02f',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          },
          1,
        )
        this.volumeMaSeries.setData(ma.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      }
      return
    }

    const scaleId = 'sub'
    if (this.volumeSeries) {
      this.chart.removeSeries(this.volumeSeries)
      this.volumeSeries = null
    }
    if (data.hist?.length) {
      const hist = this.chart.addSeries(
        HistogramSeries,
        {
          priceScaleId: scaleId,
          lastValueVisible: false,
          priceLineVisible: false,
        },
        1,
      )
      hist.setData(
        data.hist.map((h) => ({
          time: h.time as UTCTimestamp,
          value: h.value,
          color: h.color ?? this.theme.up,
        })),
      )
      this.subSeries.push(hist)
    }

    for (const l of data.lines ?? []) {
      const line = this.chart.addSeries(
        LineSeries,
        {
          priceScaleId: scaleId,
          color: SUB_LINE_COLORS[l.id] ?? '#9aa7b5',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        1,
      )
      line.setData(l.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      for (const m of data.markers ?? []) {
        line.createPriceLine({
          price: m.price,
          color: m.color,
          lineStyle: LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: '',
        })
      }
      this.subSeries.push(line)
    }
    // H2 阈值区间：存副图背景带数据（draw() 时在 overlay 上按副图价格坐标渲染）
    this.subZones = data.zones ?? []
  }

  subscribeCrosshairMove(
    cb: (time: number | null, x: number | null, y: number | null) => void,
  ): () => void {
    const handler = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      const time = param.time === undefined ? null : Number(param.time)
      this.crosshairTime = time
      cb(
        time,
        param.point ? param.point.x : null,
        param.point ? param.point.y : null,
      )
    }
    this.chart.subscribeCrosshairMove(handler)
    return () => this.chart.unsubscribeCrosshairMove(handler)
  }

  subscribeVisibleRange(cb: (from: number, to: number) => void): () => void {
    const handler = (range: { from: number; to: number } | null) => {
      this.draw() // 缩放/平移时画线跟随
      if (range) cb(range.from, range.to)
    }
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(handler)
    return () => this.chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler)
  }

  setVisibleRange(range: { from: number; to: number }) {
    this.chart.timeScale().setVisibleLogicalRange(range)
    this.draw()
  }

  destroy() {
    activeAdapters.delete(this)
    // 清理 pending rAF 重绘：销毁后不能再碰已 remove 的 overlay 画布
    if (this.drawRafHandle != null) {
      cancelAnimationFrame(this.drawRafHandle)
      this.drawRafHandle = null
    }
    this.cancelTouchInertia()
    this.clearTouchLinger()
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointercancel', this.onPointerCancel)
    this.container.removeEventListener('lostpointercapture', this.onLostPointerCapture)
    this.container.removeEventListener('pointerleave', this.onPointerLeave)
    this.container.removeEventListener('dblclick', this.onDblClick)
    this.resizeObserver?.disconnect()
    this.overlay.remove()
    this.chart.remove()
  }

  private trackPrice(close: number) {
    if (this.lastClose === close) return
    this.lastClose = close
    if (!this.priceLine) {
      this.priceLine = this.mainSeries.createPriceLine({
        price: close,
        color: this.theme.yellow,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: '',
      })
    } else {
      this.priceLine.applyOptions({ price: close })
    }
  }
}
