import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type SeriesType,
  type IRange,
} from 'lightweight-charts'
import { zoomRangeAround } from './pinchZoom'
import type { Candle } from './types'
import type { ValuePoint } from '../indicators/sma'
import { detectHover, resolveDragPrice, type PositionLineKey } from './dragState'
import {
  channelLine,
  fibExtPrices,
  fibFanRays,
  fibPrices,
  fibTimeXs,
  gannFanRays,
  hitTestDrawings,
  measureInfo,
  moveAnchor,
  moveDrawing,
  nearestAnchor,
  normalizePoints,
  requiredPoints,
  type Drawing,
  type DrawingTool,
  type Point,
} from '../drawings/logic'
import { themeFor, THEMES, type ChartTheme, type ColorPresetId, type ThemeMode } from '../theme'
import { chartLabelsFor, DEFAULT_LANG, type ChartLabels, type Lang } from '../i18n/messages'

export type ChartType = 'candlestick' | 'line' | 'area'

/** 画线回调 */
export interface DrawingCallbacks {
  onCommit: (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => void
  onSelect: (id: string | null) => void
  /** 画线编辑提交（拖拽整线/锚点后） */
  onUpdate?: (id: string, points: { time: number; price: number }[]) => void
}

/** 副图指标数据（UI 层计算，本层渲染） */
export interface SubIndicatorData {
  kind: 'volume' | 'macd' | 'kdj' | 'rsi' | 'wr' | 'obv' | 'atr' | 'dmi' | 'cci' | 'psy' | 'stoch' | 'roc' | 'mom'
  hist?: { time: number; value: number; color?: string }[]
  lines?: { id: string; points: ValuePoint[] }[]
  markers?: { price: number; color: string }[]
}

/** 主图指标数据（UI 层计算，本层渲染） */
export interface MainIndicatorData {
  lines: { id: string; points: ValuePoint[] }[]
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
 * 渲染层隔离接口：UI/数据层只依赖它，不直接触碰具体图表库。
 * 将来替换渲染引擎（自研 Canvas / klinecharts）时仅需新实现本接口。
 */
export interface ChartApi {
  /** 全量装载（首屏 / 周期切换 / 补数乱序时使用） */
  setCandles(candles: Candle[]): void
  /** 增量更新（WS 实时：追加新 K 线或替换最后一根） */
  updateCandle(candle: Candle): void
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
  /** 画线工具模式（none 为只读/选中） */
  setDrawingTool(tool: DrawingTool): void
  /** 同步外部选中画线（用于只读模式拖拽判定） */
  setSelectedDrawing?(id: string | null): void
  /** 画线回调（创建完成/选中变化） */
  setDrawingCallbacks(cb: DrawingCallbacks | null): void
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
  /** 设置 K 线周期秒数（量度工具标签计算根数用） */
  setPeriodSeconds(sec: number): void
  /** 十字光标移动回调（离开图表区域时 time 为 null） */
  subscribeCrosshairMove(cb: (time: number | null, x: number | null, y: number | null) => void): () => void
  /** 可见区间变化回调（逻辑索引 from/to），用于向左滚动分页 */
  subscribeVisibleRange(cb: (from: number, to: number) => void): () => void
  /** 外部设置可见区间（多图时间轴同步用） */
  setVisibleRange(range: { from: number; to: number }): void
  destroy(): void
}

/** 主图指标线配色 */
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
}

const SUB_PANE_HEIGHT = 90

export class LightweightChartAdapter implements ChartApi {
  private chart: IChartApi
  private container: HTMLElement
  private mainSeries: ISeriesApi<SeriesType>
  private volumeSeries: ISeriesApi<'Histogram'> | null = null
  private mainLines: ISeriesApi<'Line' | 'Area'>[] = []
  private subSeries: ISeriesApi<'Line' | 'Histogram'>[] = []
  private priceLine: IPriceLine | null = null
  private lastClose: number | null = null
  private lastCandles: Candle[] = []
  private currentType: ChartType = 'candlestick'
  private positionLines: PositionLines | null = null
  private positionPriceLines = new Map<string, IPriceLine>()
  private referencePriceLine: IPriceLine | null = null
  private markerPriceLine: IPriceLine | null = null
  private theme: ChartTheme = THEMES.dark
  private labels: ChartLabels = chartLabelsFor(DEFAULT_LANG)
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
  private drawingTool: DrawingTool = 'none'
  private drawingCallbacks: DrawingCallbacks | null = null
  private selectedDrawingId: string | null = null
  /** 双指捏合纵向缩放状态（指距 / 起始价格区间） */
  private pinch: { dist: number; range: IRange<number> } | null = null
  /** 触屏双击重置计时 */
  private lastTapAt = 0
  /** 单指触屏十字光标跟踪中（移动端无 hover，拖动时跟随手指显示 OHLC） */
  private touchCrosshair = false
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
    container.addEventListener('pointerleave', this.onPointerLeave)
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

  setDrawingTool(tool: DrawingTool) {
    this.drawingTool = tool
    if (tool !== 'none') this.selectedDrawingId = null
    this.container.style.cursor = tool === 'none' ? '' : 'crosshair'
    this.draw()
  }

  setDrawingCallbacks(cb: DrawingCallbacks | null) {
    this.drawingCallbacks = cb
  }

  setSelectedDrawing(id: string | null) {
    this.selectedDrawingId = id
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

  setPeriodSeconds(sec: number) {
    this.periodSeconds = sec
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
    this.draw()
  }

  cancelRegionSelect() {
    this.regionSelect = false
    this.regionDown = null
    this.regionCurrent = null
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

    for (const d of this.drawings) {
      // 拖拽中的画线由预览态绘制（实时跟随指针）
      if (this.dragEdit && d.id === this.dragEdit.id) continue
      this.drawOne(ctx, d, d.id === this.selectedDrawingId)
    }
    if (this.dragPreview) this.drawOne(ctx, this.dragPreview, true)

    // 画线预览
    if (this.drawingDown && this.drawingPreview) {
      const tool = this.drawingTool as Drawing['type']
      const need = requiredPoints(tool)
      let pts: { time: number; price: number }[]
      if (need === 2 && this.drawingPoints.length === 0) {
        pts = normalizePoints(tool, [this.drawingDown, this.drawingPreview])
      } else {
        // 多锚点工具：已确认锚点 + 当前预览
        pts = [...this.drawingPoints, this.drawingPreview].slice(0, need)
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

  /** 锚点小圆点 */
  private drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  /** 拖拽画线/仓位线时关闭图表平移，避免线条跟随数据而不是光标 */
  private setPanEnabled(enabled: boolean) {
    this.chart.applyOptions({
      handleScroll: { pressedMouseMove: enabled, horzTouchDrag: enabled, vertTouchDrag: enabled },
    })
  }

  private drawOne(ctx: CanvasRenderingContext2D, d: Drawing, selected: boolean) {
    const color = selected ? '#4e9cf5' : this.theme.yellow
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

    if (d.type === 'text') {
      const a = this.project(d.points[0].time, d.points[0].price)
      if (!a) return
      const label = d.text && d.text.trim() ? d.text : this.labels.defaultText
      ctx.font = '11px system-ui'
      const w = ctx.measureText(label).width + 12
      const h = 18
      const bx = a.x - w / 2
      const by = a.y - h / 2
      ctx.fillStyle = this.theme.background + 'e6'
      ctx.fillRect(bx, by, w, h)
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + '99'
      ctx.lineWidth = selected ? 1.6 : 1
      ctx.strokeRect(bx, by, w, h)
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'
      ctx.fillText(label, bx + 6, by + h / 2 + 0.5)
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
      ctx.fillStyle = this.theme.yellow + '1f'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      if (b) ctx.lineTo(b.x, b.y)
      if (c) ctx.lineTo(c.x, c.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
          ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + 'cc'
          ctx.beginPath()
          ctx.moveTo(x0, y)
          ctx.lineTo(x1, y)
          ctx.stroke()
          this.drawLabel(ctx, x0, y, `${level.toFixed(3)} ${price.toFixed(2)}`, isExt ? 'right' : 'left')
        }
        // 摆幅框
        ctx.strokeStyle = this.theme.yellow + '66'
        ctx.strokeRect(left, Math.min(a.y, b.y), right - left, Math.abs(a.y - b.y))
      }
      // C 回撤点竖虚线标记
      if (pc) {
        const c = this.project(pc.time, pc.price)
        if (c) {
          ctx.setLineDash([3, 3])
          ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + '88'
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
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + 'cc'
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
      const label = `${sign}${info.diff.toFixed(2)} (${sign}${info.pct.toFixed(2)}%) · ${bars}根`
      this.drawLabel(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 8, label, 'left')
      return
    }

    if (d.type === 'rect') {
      // 矩形：半透明填充 + 边框 + 四角锚点
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      const top = Math.min(a.y, b.y)
      const bottom = Math.max(a.y, b.y)
      ctx.fillStyle = this.theme.yellow + '1f'
      ctx.fillRect(left, top, right - left, bottom - top)
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
      ctx.fillStyle = this.theme.yellow + '1f'
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
        ctx.fillStyle = this.theme.yellow + '1f'
        ctx.beginPath()
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + 'bb'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(a.x + (dx / len) * s2, a.y + (dy / len) * s2)
        ctx.stroke()
        this.drawLabel(ctx, dirPt.x, dirPt.y, level.toFixed(3), 'left')
      }
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + 'bb'
        // 双向延伸：A 两侧各画 s2 长（canvas 自动裁剪）
        ctx.beginPath()
        ctx.moveTo(a.x - (dx / len) * s2, a.y - (dy / len) * s2)
        ctx.lineTo(a.x + (dx / len) * s2, a.y + (dy / len) * s2)
        ctx.stroke()
        this.drawLabel(ctx, dirPt.x, dirPt.y, label, 'left')
      }
      ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow
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

    if (d.type === 'fib') {
      // 分位线（从高位向下）
      const prices = fibPrices(d.points[0].price, d.points[1].price)
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      for (const p of prices) {
        const y = this.mainSeries.priceToCoordinate(p)
        if (y === null) continue
        ctx.strokeStyle = selected ? '#4e9cf5' : this.theme.yellow + 'cc'
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
        this.drawLabel(ctx, right, y, p.toFixed(2), 'right')
      }
      // 边框
      ctx.strokeStyle = this.theme.yellow + '66'
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
        this.drawingDown = { time: Number(time), price: Number(price) }
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
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)
      const startTime = time !== null ? Number(time) : 0
      const startPrice = price !== null ? Number(price) : 0
      const selected = this.selectedDrawingId
        ? this.drawings.find((d) => d.id === this.selectedDrawingId)
        : null

      if (selected) {
        const anchorIdx = nearestAnchor(selected, x, y, (t, p) => this.project(t, p))
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

      const hit = hitTestDrawings(this.drawings, x, y, (t, p) => this.project(t, p))
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
        this.drawingPreview = { time: Number(time), price: Number(price) }
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
        this.dragPreview =
          this.dragEdit.kind === 'anchor'
            ? moveAnchor(orig, this.dragEdit.anchorIdx ?? 0, {
                time: Number(time),
                price: Number(price),
              })
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
          return
        }
        const hit = hitTestDrawings(this.drawings, x, y, (t, p) => this.project(t, p))
        this.container.style.cursor = hit ? 'grab' : ''
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

  /** 触屏按下：单指（非画线/非拖拽）显示十字光标跟随手指；双指记录起始指距与价格区间 */
  private onTouchStart = (e: TouchEvent) => {
    this.pinch = null
    if (this.drawingTool !== 'none' || this.dragEdit) return
    if (e.touches.length === 2) {
      this.setTouchCrosshair(false)
      const [t1, t2] = [e.touches[0], e.touches[1]]
      const range = this.chart.priceScale('right').getVisibleRange()
      if (!range) return
      this.pinch = {
        dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        range,
      }
      return
    }
    if (e.touches.length === 1) this.setTouchCrosshair(true, e.touches[0])
  }

  /** 触屏移动：单指更新十字光标；双指按指距比例缩放价格区间 */
  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && this.touchCrosshair) {
      this.setTouchCrosshair(true, e.touches[0])
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
  }

  /** 触屏抬起/取消：结束十字光标与捏合；轻点两次 300ms 内恢复自适应 + 时间轴 */
  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchCrosshair) this.setTouchCrosshair(false)
    const wasPinch = !!this.pinch
    this.pinch = null
    if (wasPinch || e.touches.length > 0 || e.changedTouches.length !== 1) return
    const now = Date.now()
    if (now - this.lastTapAt < 300) {
      this.lastTapAt = 0
      this.chart.priceScale('right').setAutoScale(true)
      this.chart.timeScale().resetTimeScale()
    } else {
      this.lastTapAt = now
    }
  }

  private onPointerLeave = () => {
    this.dragKey = null
    this.hoverKey = null
    if (!this.drawingDown && !this.dragEdit) {
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
    if (!active) {
      this.touchCrosshair = false
      this.chart.clearCrosshairPosition()
      return
    }
    const rect = this.container.getBoundingClientRect()
    const x = touch!.clientX - rect.left
    const y = touch!.clientY - rect.top
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
    this.draw()
  }

  fitContent() {
    this.chart.timeScale().fitContent()
  }

  scrollToRealTime() {
    this.chart.timeScale().scrollToRealTime()
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
          color: MAIN_LINE_COLORS[l.id] ?? '#9aa7b5',
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
  }

  subscribeCrosshairMove(
    cb: (time: number | null, x: number | null, y: number | null) => void,
  ): () => void {
    const handler = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      cb(
        param.time === undefined ? null : Number(param.time),
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
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointerleave', this.onPointerLeave)
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
