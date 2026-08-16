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
} from 'lightweight-charts'
import type { Candle } from './types'
import type { ValuePoint } from '../indicators/sma'
import { detectHover, resolveDragPrice, type PositionLineKey } from './dragState'
import {
  channelLine,
  fibPrices,
  hitTestDrawings,
  moveAnchor,
  moveDrawing,
  nearestAnchor,
  normalizePoints,
  type Drawing,
  type DrawingTool,
} from '../drawings/logic'
import { THEMES, type ChartTheme, type ThemeMode } from '../theme'
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
  kind: 'volume' | 'macd' | 'kdj' | 'rsi' | 'wr' | 'obv' | 'atr' | 'dmi' | 'cci' | 'psy'
  hist?: { time: number; value: number; color?: string }[]
  lines?: { id: string; points: ValuePoint[] }[]
  markers?: { price: number; color: string }[]
}

/** 仓位线（模拟订单叠加）：开仓/止盈/止损三条价格线 */
export interface PositionLines {
  entry: number
  takeProfit?: number
  stopLoss?: number
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
  /** 主图指标（ma/ema/boll），lines 的 id 由 UI 层传入，颜色本层分配 */
  setMainIndicator(lines: { id: string; points: ValuePoint[] }[]): void
  /** 副图指标（VOL/MACD/KDJ/RSI） */
  setSubIndicator(data: SubIndicatorData): void
  /** 仓位线（开仓/止盈/止损），null 清除 */
  setPositionLines(lines: PositionLines | null): void
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
  /** 截图：主图 + 画线图层合成 PNG dataURL */
  takeScreenshot(): string | null
  /** 切换图表主题 */
  setTheme(theme: ThemeMode): void
  /** 切换界面语言（文本标注默认文案 / 仓位线标签随语言更新） */
  setLocale(lang: Lang): void
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
}

const SUB_PANE_HEIGHT = 90

export class LightweightChartAdapter implements ChartApi {
  private chart: IChartApi
  private container: HTMLElement
  private mainSeries: ISeriesApi<SeriesType>
  private volumeSeries: ISeriesApi<'Histogram'> | null = null
  private mainLines: ISeriesApi<'Line'>[] = []
  private subSeries: ISeriesApi<'Line' | 'Histogram'>[] = []
  private priceLine: IPriceLine | null = null
  private lastClose: number | null = null
  private lastCandles: Candle[] = []
  private currentType: ChartType = 'candlestick'
  private positionLines: PositionLines | null = null
  private positionPriceLines = new Map<string, IPriceLine>()
  private theme: ChartTheme = THEMES.dark
  private labels: ChartLabels = chartLabelsFor(DEFAULT_LANG)
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
  private drawingStart: { time: number; price: number } | null = null
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

  setTheme(mode: ThemeMode) {
    this.theme = THEMES[mode]
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

  takeScreenshot(): string | null {
    const main = this.chart.takeScreenshot()
    if (!main) return null
    const canvas = document.createElement('canvas')
    canvas.width = main.width
    canvas.height = main.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return main.toDataURL('image/png')
    ctx.drawImage(main, 0, 0)
    ctx.drawImage(this.overlay, 0, 0, this.overlay.width, this.overlay.height, 0, 0, main.width, main.height)
    return canvas.toDataURL('image/png')
  }

  private syncOverlaySize() {
    const rect = this.container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.round(rect.width * dpr))
    const h = Math.max(1, Math.round(rect.height * dpr))
    if (this.overlay.width !== w) this.overlay.width = w
    if (this.overlay.height !== h) this.overlay.height = h
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
    if (this.drawingStart && this.drawingPreview) {
      const tool = this.drawingTool as Drawing['type']
      const pts = normalizePoints(tool, [this.drawingStart, this.drawingPreview])
      this.drawOne(ctx, { id: '__preview', type: this.drawingTool as Drawing['type'], points: pts }, true)
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
    const rect = this.container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 画线模式：起点 = 当前 time/price，capture 指针
    if (this.drawingTool !== 'none') {
      const time = this.chart.timeScale().coordinateToTime(x)
      const price = this.mainSeries.coordinateToPrice(y)

      if (time !== null && price !== null) {
        this.drawingStart = { time: Number(time), price: Number(price) }
        this.drawingPreview = this.drawingStart
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

    // 画线预览
    if (this.drawingStart) {
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

    // 画线完成 → 提交
    if (this.drawingStart && this.drawingPreview) {
      // 水平线支持单击放置（未拖动也提交）；趋势线/斐波那契需两点
      const pts =
        this.drawingTool === 'horizontal' || this.drawingTool === 'text'
          ? [this.drawingStart]
          : normalizePoints(this.drawingTool as Drawing['type'], [this.drawingStart, this.drawingPreview])
      this.drawingCallbacks?.onCommit({
        type: this.drawingTool as Drawing['type'],
        points: pts,
      })
      this.drawingStart = null
      this.drawingPreview = null
      this.setPanEnabled(true)
      this.draw()
      return
    }
    this.drawingStart = null
    this.drawingPreview = null
    this.dragKey = null
    this.hoverKey = null
    this.setPanEnabled(true)
    this.container.style.cursor = this.drawingTool === 'none' ? '' : 'crosshair'
  }

  private onPointerLeave = () => {
    this.dragKey = null
    this.hoverKey = null
    if (!this.drawingStart && !this.dragEdit) {
      this.drawingPreview = null
      this.dragPreview = null
    }
    if (!this.drawingStart && !this.dragEdit && !this.dragKey) this.setPanEnabled(true)
    this.container.style.cursor = ''
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

  setMainIndicator(lines: { id: string; points: ValuePoint[] }[]) {
    for (const s of this.mainLines) this.chart.removeSeries(s)
    this.mainLines = lines.map((l) => {
      const series = this.chart.addSeries(
        LineSeries,
        {
          color: MAIN_LINE_COLORS[l.id] ?? '#9aa7b5',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        0,
      )
      series.setData(l.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      return series
    })
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
