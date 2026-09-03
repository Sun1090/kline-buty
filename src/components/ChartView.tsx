import { useEffect, useMemo, useRef, useState } from 'react'
import { PERIODS, PERIOD_MS, type Candle, type Period } from '../chart/types'
import { LightweightChartAdapter, type ChartApi, type ChartType, type MainIndicatorData, type PositionLines } from '../chart/adapter'
import type { Drawing, DrawingTool } from '../drawings/logic'
import type { SnapMode } from '../drawings/snap'
import { anchorRangeForSwitch, cullWindow, localRange, shouldCull, windowCovers, type CullWindow } from '../chart/cull'
import { isAwayFromLatest } from '../chart/latest'
import { themeFor, type ColorPresetId } from '../theme'
import { calcMA, calcEMA, calcSMA } from '../indicators/sma'
import { calcBOLL, bollToLines } from '../indicators/boll'
import { calcBBW } from '../indicators/bbw'
import { calcSupertrend } from '../indicators/supertrend'
import { calcMACD } from '../indicators/macd'
import { calcKDJ } from '../indicators/kdj'
import { calcRSI } from '../indicators/rsi'
import { calcVWAP } from '../indicators/vwap'
import { calcWR, calcOBV, calcATR, calcDMI, calcCCI, calcPSY, calcSTOCH, calcROC, calcMOM } from '../indicators/extras'
import { calcMFI } from '../indicators/mfi'
import { calcAO } from '../indicators/ao'
import { calcCMF } from '../indicators/cmf'
import { calcDonchian } from '../indicators/donchian'
import { calcAroon } from '../indicators/aroon'
import { calcSAR } from '../indicators/sar'
import { calcIchimoku, ichimokuCloud } from '../indicators/ichimoku'
import { thresholdZones } from '../indicators/thresholdZones'
import { findCrossovers } from '../indicators/crossovers'
import { calcTRIX } from '../indicators/trix'
import { calcDPO } from '../indicators/dpo'
import type { IndicatorParams } from '../indicators/params'
import { useI18n } from '../i18n/useI18n'
import { localeFor, chartLabelsFor, type MessageKey } from '../i18n/messages'
import { clampTooltipPos } from './tooltipPos'
import { fmtPricePrecise as fmtPrice, fmtVolumeMK as fmtVolume } from '../utils/format'
import { exportScreenshotWithDisclaimer } from './exportDisclaimer'

export type MainIndicatorKind = 'ma' | 'ema' | 'boll' | 'vwap' | 'sar' | 'ichimoku' | 'supertrend' | 'none'
export type SubIndicatorKind = 'volume' | 'macd' | 'kdj' | 'rsi' | 'wr' | 'obv' | 'atr' | 'dmi' | 'cci' | 'psy' | 'stoch' | 'roc' | 'mom' | 'bbw' | 'mfi' | 'ao' | 'cmf' | 'donchian' | 'aroon' | 'trix' | 'dpo' | 'none'
export type { ChartType }

const LOAD_MORE_COOLDOWN_MS = 3000

/** hex 颜色转 rgba（Ichimoku 云带半透明填充用） */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

/** A11 可视范围时间短格式：UTC 或本地时区，MM-DD HH:MM（跨年纪年） */
function fmtRangeTime(time: number, tz: 'utc' | 'local', locale: string): string {
  const d = new Date(time * 1000)
  const opts: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: d.getUTCFullYear() < new Date().getUTCFullYear() ? '2-digit' : undefined,
    timeZone: tz === 'utc' ? 'UTC' : undefined,
  }
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  } catch {
    return d.toLocaleString(locale, { hour12: false, timeZone: tz === 'utc' ? 'UTC' : undefined })
  }
}

interface ChartViewProps {
  symbol: string
  period: Period
  candles: Candle[]
  /** 数据加载状态（空数据时显示提示） */
  status?: string
  /** E14 错误重试：加载失败时点击重载 */
  onRetry?: () => void
  chartType: ChartType
  /** 价格坐标轴模式：线性 / 对数 */
  priceScaleMode?: 'linear' | 'log'
  /** 时间轴时区（默认 utc，与交易所一致） */
  timezoneMode?: 'utc' | 'local'
  /** 画线锚点吸附 K 线 OHLC（默认关） */
  drawingSnap?: SnapMode
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  indicatorParams: IndicatorParams
  /** 回放模式：仅渲染 [0, cursor] 区间的数据 */
  replay: { cursor: number } | null
  hasMore: boolean
  onLoadMore: () => void
  /** 可见区间变化上报（多图时间轴同步用） */
  onViewRangeChange?: (range: { from: number; to: number }) => void
  /** 外部可见区间指令（多图同步时写入） */
  externalRange?: { from: number; to: number } | null
  /** G8 十字光标时间变化上报（多图同步用，null=移出） */
  onCrosshairChange?: (time: number | null) => void
  /** G8 外部十字光标时间指令（多图同步时写入） */
  externalCrosshairTime?: number | null
  /** 仓位线（模拟订单叠加） */
  positionLines?: PositionLines | null
  /** 外部参考价格线（盘口档位 hover 联动），null 清除 */
  referencePrice?: number | null
  /** 限价标记线（盘口档位点击联动），null 清除 */
  markerPrice?: number | null
  /** 仓位线拖拽回调 */
  onPositionDrag?: (key: 'entry' | 'takeProfit' | 'stopLoss', price: number) => void
  /** 画线数据（已按当前品种过滤） */
  drawings?: Drawing[]
  /** C12 便签全局显隐（隐藏时不渲染 note，数据保留） */
  notesHidden?: boolean
  /** 画线工具 */
  drawingTool?: DrawingTool
  /** 当前选中画线 id（同步到渲染层用于拖拽判定） */
  selectedDrawingId?: string | null
  /** 画线创建完成回调 */
  onDrawingCommit?: (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => void
  /** 画线选中变化回调 */
  onDrawingSelect?: (id: string | null) => void
  /** 画线编辑提交回调（整线移动/锚点拖拽后） */
  onDrawingUpdate?: (id: string, points: { time: number; price: number }[]) => void
  /** 文本标注快捷编辑回调（桌面双击 / 移动端长按） */
  onEditText?: (id: string) => void
  /** 取消进行中的多锚点画线进度 */
  onCancelDrawingProgress?: () => void
  /** 注册取消画线的 ref（供 App Esc 快捷键调用 adapter.cancelDrawing()） */
  onCancelDrawingProgressRef?: React.MutableRefObject<(() => void) | null>
  /** 主题模式（canvas 渲染色） */
  themeMode?: 'dark' | 'light'
  /** 主题色预设（涨跌/强调色） */
  colorPreset?: ColorPresetId
  /** 免责声明水印开关 */
  showWatermark?: boolean
}

interface Tooltip {
  x: number
  y: number
  time: number
}

export function ChartView({
  symbol,
  period,
  candles,
  status,
  onRetry,
  chartType,
  priceScaleMode = 'linear',
  timezoneMode = 'utc',
  drawingSnap = 'ohlc',
  mainIndicator,
  subIndicator,
  indicatorParams,
  replay,
  hasMore,
  onLoadMore,
  onViewRangeChange,
  externalRange,
  onCrosshairChange,
  externalCrosshairTime,
  positionLines,
  referencePrice,
  markerPrice,
  onPositionDrag,
  drawings,
  notesHidden,
  drawingTool,
  selectedDrawingId,
  onDrawingCommit,
  onDrawingSelect,
  onDrawingUpdate,
  onEditText,
  onCancelDrawingProgress,
  onCancelDrawingProgressRef,
  themeMode = 'dark',
  colorPreset = 'classic',
  showWatermark = true,
}: ChartViewProps) {
  const { t, lang } = useI18n()
  const theme = themeFor(themeMode, colorPreset)
  const UP = theme.up
  const DOWN = theme.down
  /** H2 副图阈值区间：纯函数区间 + 半透明上色（from≥50 超买→DOWN 带、to≤50 超卖→UP 带） */
  const coloredZones = (kind: SubIndicatorKind): { from: number; to: number; color: string }[] =>
    thresholdZones(kind).map((z) => ({
      from: z.from,
      to: z.to,
      color: withAlpha(z.from >= 50 ? DOWN : UP, 0.06),
    }))
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ChartApi | null>(null)
  const prevDataRef = useRef<Candle[] | null>(null)
  /** 当前品种全量 K 线快照镜像（A11 时间戳换算：subscribe 回调只挂一次，读 ref 取最新） */
  const allCandlesRef = useRef<Candle[]>([])
  const keyRef = useRef('')
  /** 大数据量窗口裁剪状态（全量坐标 [start,end)），null = 不裁剪 */
  const [cull, setCull] = useState<CullWindow | null>(null)
  const cullRef = useRef<CullWindow | null>(null)
  cullRef.current = cull
  /** 最近一次可见区间（全局坐标），窗口重载后恢复视角用 */
  const lastVisibleRef = useRef<{ from: number; to: number } | null>(null)
  /** G2 周期切换锚定：最近可见区间的（右缘时间戳, 时间跨度），跨周期换算恢复视角用 */
  const lastVisibleTimeRef = useRef<{ toTime: number; spanMs: number } | null>(null)
  /** A11 可视起止时间戳（随缩放/平移更新），用于图表角落显示 */
  const [visibleRange, setVisibleRange] = useState<{ from: number | null; to: number | null }>({ from: null, to: null })
  /** 装载窗口生成时的全量数据长度：窗口贴尾沿时实时新帧自然流入 */
  const fullLenAtCullRef = useRef(0)
  /** 当前全量数据长度（渲染期同步，供可见区间回调读取） */
  const dataLenRef = useRef(0)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  /** 可见区间是否停在最新 K 线（回看历史时显示「回到最新」按钮） */
  const [atLatest, setAtLatest] = useState(true)

  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore
  const replayRef = useRef(replay)
  replayRef.current = replay
  const prevReplayRef = useRef<{ cursor: number } | null>(null)
  const onViewRangeChangeRef = useRef(onViewRangeChange)
  onViewRangeChangeRef.current = onViewRangeChange
  const onCrosshairChangeRef = useRef(onCrosshairChange)
  onCrosshairChangeRef.current = onCrosshairChange
  /** G8 防回环：记录本图最近一次上报的十字光标时间，外部同步回来相同时跳过写入 */
  const lastReportedCrosshairRef = useRef<number | null>(null)
  const onDrawingCommitRef = useRef(onDrawingCommit)
  onDrawingCommitRef.current = onDrawingCommit
  const onDrawingSelectRef = useRef(onDrawingSelect)
  onDrawingSelectRef.current = onDrawingSelect
  const onDrawingUpdateRef = useRef(onDrawingUpdate)
  onDrawingUpdateRef.current = onDrawingUpdate
  const onEditTextRef = useRef(onEditText)
  onEditTextRef.current = onEditText
  const [regionSelecting, setRegionSelecting] = useState(false)
  // T27：右键菜单（复制价格 / 添加提醒 / 清空画线）；触屏为主设备时不启用
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number } | null>(null)
  const [ctxCopied, setCtxCopied] = useState(false)
  useEffect(() => {
    if (!ctxMenu) return
    const close = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-testid="chart-ctx-menu"]')) return
      setCtxMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [ctxMenu])
  const regionCaptureRef = useRef<(rect: { x: number; y: number; w: number; h: number }) => void>(
    () => {},
  )
  regionCaptureRef.current = (rect) => {
    const dataUrl = apiRef.current?.takeScreenshot(rect)
    if (!dataUrl) return
    void exportScreenshotWithDisclaimer(
      dataUrl,
      `${symbol}_${period}_region.png`,
      chartLabelsFor(lang).watermark,
    )
    setRegionSelecting(false)
  }

  // 外部可见区间指令（多图同步）：全局坐标 → 当前窗口局部坐标，与本地值不同才写入防回环
  const lastExternalRef = useRef('')
  useEffect(() => {
    if (!externalRange || !apiRef.current) return
    const sig = `${externalRange.from}:${externalRange.to}`
    if (sig === lastExternalRef.current) return
    lastExternalRef.current = sig
    const cur = cullRef.current
    apiRef.current.setVisibleRange(cur ? localRange(cur, externalRange) : externalRange)
  }, [externalRange])

  // G8 外部十字光标时间指令（多图同步）：与本图最近上报值相同则跳过（防回环）
  useEffect(() => {
    if (externalCrosshairTime === undefined || !apiRef.current) return
    if (externalCrosshairTime === lastReportedCrosshairRef.current) return
    lastReportedCrosshairRef.current = externalCrosshairTime
    apiRef.current.setCrosshairTime(externalCrosshairTime)
  }, [externalCrosshairTime])

  // 回放模式只取 [0, cursor] 区间；实时模式全量
  const replayData = useMemo(
    () => (replay ? candles.slice(0, replay.cursor + 1) : candles),
    [candles, replay],
  )

  // 大数据量窗口裁剪：超过阈值只装载可见区间 + 余量，滚动到边缘再重载
  const windowData = useMemo(() => {
    if (!cull) return replayData
    const len = replayData.length
    // 窗口整体在数据之外（如回放起点游标很小时残留的旧窗口）→ 退回全量，避免空切片
    if (cull.start >= len) return replayData
    const start = Math.max(0, cull.start)
    // 窗口装载时即贴着数据尾沿（覆盖到末尾）：实时新帧/新 K 线自然流入窗口，
    // 走增量 updateCandle 路径，避免每 tick 全量重载
    const atTail = cull.end >= fullLenAtCullRef.current
    const end = atTail ? len : Math.min(cull.end, len)
    return replayData.slice(start, Math.max(start, end))
  }, [replayData, cull])
  dataLenRef.current = replayData.length
  allCandlesRef.current = replayData

  // ---- 图表实例与事件订阅（一次创建） ----
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const api = new LightweightChartAdapter(container)
    apiRef.current = api

    const unsubCross = api.subscribeCrosshairMove((time, x, y) => {
      // G8 十字光标同步：把时间上报给父级（pair/quad 联动），null 表示移出；
      // 记录本次上报值供防回环（外部同步回来相同时跳过写入）
      lastReportedCrosshairRef.current = time
      onCrosshairChangeRef.current?.(time)
      if (time === null || x === null || y === null) {
        setTooltip(null)
        return
      }
      setTooltip({ x, y, time })
    })
    api.setPositionDragHandler(onPositionDrag ?? null)
    api.setTheme(themeMode, colorPreset)
    api.setDrawingCallbacks(
      onDrawingCommit || onDrawingSelect || onDrawingUpdate || onEditText
        ? {
            onCommit: (d) => onDrawingCommitRef.current?.(d),
            onSelect: (id) => onDrawingSelectRef.current?.(id),
            onUpdate: (id, points) => onDrawingUpdateRef.current?.(id, points),
            onEditText: (id) => onEditTextRef.current?.(id),
          }
        : null,
    )
    // 注册取消画线进度回调（App 层 Esc 快捷键 / 外部取消）
    if (onCancelDrawingProgressRef) {
      onCancelDrawingProgressRef.current = () => api.cancelDrawing()
    }
    void onCancelDrawingProgress
    api.onRegionCapture((rect) => regionCaptureRef.current?.(rect))

    let lastLoadAt = 0
    const unsubRange = api.subscribeVisibleRange((from, to) => {
      const now = Date.now()
      // 局部索引 → 全局索引（叠加裁剪窗口偏移）
      const base = cullRef.current?.start ?? 0
      const gFrom = base + from
      const gTo = base + to
      lastVisibleRef.current = { from: gFrom, to: gTo }
      // A11 可视起止时间戳（索引 → 时间，数据不足时显示 null）
      const tFrom = allCandlesRef.current[gFrom]?.time ?? null
      const tTo = allCandlesRef.current[gTo]?.time ?? null
      setVisibleRange({ from: tFrom, to: tTo })
      // G2 周期切换锚定：记录右缘时间戳 + 时间跨度（毫秒）
      if (tFrom != null && tTo != null) {
        lastVisibleTimeRef.current = { toTime: tTo, spanMs: Math.max((tTo - tFrom) * 1000, 1) }
      }
      const len = dataLenRef.current
      setAtLatest(!isAwayFromLatest(gTo, len))
      // 数据量超阈值 → 越出装载窗口时重载新窗口（窗口内滚动/缩放零重载）
      if (shouldCull(len)) {
        const target = cullWindow(len, { from: gFrom, to: gTo })
        const cur = cullRef.current
        if (!cur || target.start !== cur.start || target.end !== cur.end) {
          fullLenAtCullRef.current = len
          setCull(target)
        }
      } else if (cullRef.current) {
        fullLenAtCullRef.current = 0
        setCull(null)
      }
      if (!replayRef.current) {
        if (gFrom <= 2 && hasMoreRef.current && now - lastLoadAt > LOAD_MORE_COOLDOWN_MS) {
          lastLoadAt = now
          onLoadMoreRef.current()
        }
      }
      onViewRangeChangeRef.current?.({ from: gFrom, to: gTo })
    })

    return () => {
      unsubCross()
      unsubRange()
      api.destroy()
      apiRef.current = null
      prevDataRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始化订阅+清理，mount-once 故意空依赖，回调通过 ref 读取
  }, [])

  // 语言切换 → 画线默认文案 / 仓位线标签随语言更新（adapter 内部重绘）
  useEffect(() => {
    apiRef.current?.setLocale(lang)
  }, [lang])

  // 周期秒数 → 量度工具标签（根数）
  useEffect(() => {
    apiRef.current?.setPeriodSeconds(PERIOD_MS[period] / 1000)
  }, [period])

  // 免责声明水印开关
  useEffect(() => {
    apiRef.current?.setWatermark(showWatermark)
  }, [showWatermark])

  // 价格坐标轴模式（线性/对数）
  useEffect(() => {
    apiRef.current?.setPriceScaleMode(priceScaleMode)
  }, [priceScaleMode])
  // T7：时间轴时区切换
  useEffect(() => {
    apiRef.current?.setTimezoneMode(timezoneMode)
  }, [timezoneMode])
  // T18：画线吸附开关
  useEffect(() => {
    apiRef.current?.setSnapMode?.(drawingSnap)
  }, [drawingSnap])

  // ---- 指标计算（纯函数，随回放/实时数据变化全量重算） ----
  const mainData = useMemo<MainIndicatorData>(() => {
    if (mainIndicator === 'ma') {
      const lines = indicatorParams.maPeriods.map((p) => ({ id: `MA${p}`, points: calcMA(windowData, p) }))
      // 主图叠加：MA 之上同时显示 EMA（复合均线），可参数面板开关
      if (indicatorParams.maOverlayEma) {
        const closes = windowData.map((c) => ({ time: c.time, value: c.close }))
        lines.push(...indicatorParams.maPeriods.map((p) => ({ id: `EMA${p}`, points: calcEMA(closes, p) })))
      }
      // H3 金叉/死叉信号：最快线与最慢线交叉处打点（金叉=UP 圆点、死叉=DOWN 圆点）
      const [fast, slow] = lines
      let markers: { time: number; price: number; color: string }[] | undefined
      if (fast && slow && fast.points.length > 0 && slow.points.length > 0) {
        markers = findCrossovers(fast.points, slow.points).map((x) => ({
          time: x.time,
          price: x.price,
          color: x.kind === 'golden' ? UP : DOWN,
        }))
      }
      return { lines, markers }
    }
    if (mainIndicator === 'ema') {
      const closes = windowData.map((c) => ({ time: c.time, value: c.close }))
      return { lines: indicatorParams.maPeriods.map((p) => ({ id: `EMA${p}`, points: calcEMA(closes, p) })) }
    }
    if (mainIndicator === 'boll') {
      const b = bollToLines(calcBOLL(windowData, indicatorParams.bollPeriod, indicatorParams.bollMult))
      return {
        lines: [
          { id: 'BOLL_UPPER', points: b.upper },
          { id: 'BOLL_MID', points: b.mid },
          { id: 'BOLL_LOWER', points: b.lower },
        ],
      }
    }
    if (mainIndicator === 'vwap') return { lines: [{ id: 'VWAP', points: calcVWAP(windowData) }] }
    if (mainIndicator === 'supertrend') {
      const st = calcSupertrend(windowData, indicatorParams.stPeriod, indicatorParams.stMult)
      return {
        lines: [
          { id: 'ST_UP', points: st.up, color: UP },
          { id: 'ST_DOWN', points: st.down, color: DOWN },
        ],
      }
    }
    if (mainIndicator === 'sar') {
      // SAR 圆点：多头在价格下方（涨色），空头在价格上方（跌色）
      const sar = calcSAR(windowData, indicatorParams.sarAfStart, indicatorParams.sarAfStep, indicatorParams.sarAfMax)
      return {
        lines: [],
        markers: sar.map((p) => ({ time: p.time, price: p.value, color: p.bull ? UP : DOWN })),
      }
    }
    if (mainIndicator === 'ichimoku') {
      const r = calcIchimoku(windowData, {
        tenkanPeriod: indicatorParams.ichimokuTenkan,
        kijunPeriod: indicatorParams.ichimokuKijun,
        senkouBPeriod: indicatorParams.ichimokuSpanB,
        displacement: indicatorParams.ichimokuDisplacement,
        periodSeconds: PERIOD_MS[period] / 1000,
      })
      return {
        lines: [
          { id: 'ICH_TENKAN', points: r.tenkan },
          { id: 'ICH_KIJUN', points: r.kijun },
          { id: 'ICH_SPANA', points: r.spanA },
          { id: 'ICH_SPANB', points: r.spanB },
          { id: 'ICH_CHIKOU', points: r.chikou },
        ],
        cloud: ichimokuCloud(r).map((p) => ({
          time: p.time,
          top: p.top,
          bottom: p.bottom,
          color: p.bull ? withAlpha(UP, 0.12) : withAlpha(DOWN, 0.12),
        })),
      }
    }
    return { lines: [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- UP/DOWN 为渲染派生量（来自 theme），加入会破坏 memo 稳定性
  }, [windowData, mainIndicator, indicatorParams, period, themeMode])

  const subData = useMemo(() => {
    if (subIndicator === 'bbw') {
      return { kind: 'bbw' as const, lines: [{ id: 'BBW', points: calcBBW(windowData, indicatorParams.bbwPeriod, indicatorParams.bbwMult) }] }
    }
    if (subIndicator === 'volume') {
      const hist = windowData.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? UP : DOWN,
      }))
      // G10 VOL 均量线（多周期可配）：volMaPeriod > 1 时按 SMA 平滑成交量
      const maPeriod = indicatorParams.volMaPeriod
      const ma = maPeriod > 1 ? calcSMA(hist.map((h) => ({ time: h.time, value: h.value })), maPeriod) : null
      return {
        kind: 'volume' as const,
        hist,
        lines: ma ? [{ id: 'VOL-MA', points: ma }] : [],
      }
    }
    if (subIndicator === 'macd') {
      const macd = calcMACD(windowData, indicatorParams.macdFast, indicatorParams.macdSlow, indicatorParams.macdSignal)
      return {
        kind: 'macd' as const,
        hist: macd.map((p) => ({ time: p.time, value: p.hist, color: p.hist >= 0 ? UP : DOWN })),
        lines: [
          { id: 'DIF', points: macd.map((p) => ({ time: p.time, value: p.dif })) },
          { id: 'DEA', points: macd.map((p) => ({ time: p.time, value: p.dea })) },
        ],
      }
    }
    if (subIndicator === 'kdj') {
      const kdj = calcKDJ(windowData, indicatorParams.kdjN, indicatorParams.kdjM1, indicatorParams.kdjM2)
      return {
        kind: 'kdj' as const,
        lines: [
          { id: 'K', points: kdj.map((p) => ({ time: p.time, value: p.k })) },
          { id: 'D', points: kdj.map((p) => ({ time: p.time, value: p.d })) },
          { id: 'J', points: kdj.map((p) => ({ time: p.time, value: p.j })) },
        ],
      }
    }
    if (subIndicator === 'rsi') {
      return {
        kind: 'rsi' as const,
        lines: [{ id: 'RSI', points: calcRSI(windowData, indicatorParams.rsiPeriod) }],
        markers: [
          { price: 70, color: DOWN },
          { price: 30, color: UP },
        ],
        zones: coloredZones('rsi'),
      }
    }
    if (subIndicator === 'wr') {
      return {
        kind: 'wr' as const,
        lines: [{ id: 'WR', points: calcWR(windowData, indicatorParams.wrPeriod) }],
        markers: [
          { price: 20, color: UP },
          { price: 80, color: DOWN },
        ],
        zones: coloredZones('wr'),
      }
    }
    if (subIndicator === 'obv') {
      return { kind: 'obv' as const, lines: [{ id: 'OBV', points: calcOBV(windowData, indicatorParams.obvMaPeriod) }] }
    }
    if (subIndicator === 'atr') {
      return { kind: 'atr' as const, lines: [{ id: 'ATR', points: calcATR(windowData, indicatorParams.atrPeriod) }] }
    }
    if (subIndicator === 'dmi') {
      const dmi = calcDMI(windowData, indicatorParams.dmiPeriod)
      return {
        kind: 'dmi' as const,
        lines: [
          { id: 'PDI', points: dmi.map((p) => ({ time: p.time, value: p.pdi })) },
          { id: 'MDI', points: dmi.map((p) => ({ time: p.time, value: p.mdi })) },
          { id: 'ADX', points: dmi.map((p) => ({ time: p.time, value: p.adx })) },
        ],
      }
    }
    if (subIndicator === 'cci') {
      return {
        kind: 'cci' as const,
        lines: [{ id: 'CCI', points: calcCCI(windowData, indicatorParams.cciPeriod) }],
        markers: [
          { price: 100, color: DOWN },
          { price: -100, color: UP },
        ],
        zones: coloredZones('cci'),
      }
    }
    if (subIndicator === 'psy') {
      return {
        kind: 'psy' as const,
        lines: [{ id: 'PSY', points: calcPSY(windowData, indicatorParams.psyPeriod) }],
        markers: [
          { price: 75, color: DOWN },
          { price: 25, color: UP },
        ],
        zones: coloredZones('psy'),
      }
    }
    if (subIndicator === 'stoch') {
      const { k, d } = calcSTOCH(windowData, indicatorParams.stochK, indicatorParams.stochSmooth, indicatorParams.stochD)
      return {
        kind: 'stoch' as const,
        lines: [
          { id: 'K', points: k },
          { id: 'D', points: d },
        ],
        zones: coloredZones('stoch'),
      }
    }
    if (subIndicator === 'roc') {
      return {
        kind: 'roc' as const,
        lines: [{ id: 'ROC', points: calcROC(windowData, indicatorParams.rocPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (subIndicator === 'mom') {
      return {
        kind: 'mom' as const,
        lines: [{ id: 'MOM', points: calcMOM(windowData, indicatorParams.momPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (subIndicator === 'mfi') {
      return {
        kind: 'mfi' as const,
        lines: [{ id: 'MFI', points: calcMFI(windowData, indicatorParams.mfiPeriod) }],
        markers: [
          { price: 80, color: DOWN },
          { price: 20, color: UP },
        ],
        zones: coloredZones('mfi'),
      }
    }
    if (subIndicator === 'ao') {
      const ao = calcAO(windowData, indicatorParams.aoFast, indicatorParams.aoSlow)
      return {
        kind: 'ao' as const,
        hist: ao.map((p) => ({ time: p.time, value: p.value, color: p.value >= 0 ? UP : DOWN })),
      }
    }
    if (subIndicator === 'cmf') {
      return {
        kind: 'cmf' as const,
        lines: [{ id: 'CMF', points: calcCMF(windowData, indicatorParams.cmfPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (subIndicator === 'donchian') {
      const dc = calcDonchian(windowData, indicatorParams.donchianPeriod)
      return {
        kind: 'donchian' as const,
        lines: [
          { id: 'DC-U', points: dc.map((p) => ({ time: p.time, value: p.upper })) },
          { id: 'DC-L', points: dc.map((p) => ({ time: p.time, value: p.lower })) },
          { id: 'DC-BC', points: dc.map((p) => ({ time: p.time, value: p.middle })) },
        ],
      }
    }
    if (subIndicator === 'aroon') {
      const aroon = calcAroon(windowData, indicatorParams.aroonPeriod)
      return {
        kind: 'aroon' as const,
        lines: [
          { id: 'A-U', points: aroon.map((p) => ({ time: p.time, value: p.up })) },
          { id: 'A-D', points: aroon.map((p) => ({ time: p.time, value: p.down })) },
        ],
        markers: [
          { price: 70, color: DOWN },
          { price: 30, color: UP },
        ],
        zones: coloredZones('aroon'),
      }
    }
    if (subIndicator === 'trix') {
      return {
        kind: 'trix' as const,
        lines: [{ id: 'TRIX', points: calcTRIX(windowData, indicatorParams.trixPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (subIndicator === 'dpo') {
      return {
        kind: 'dpo' as const,
        lines: [{ id: 'DPO', points: calcDPO(windowData, indicatorParams.dpoPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- UP/DOWN 为渲染派生量（来自 theme），加入会破坏 memo 稳定性
  }, [windowData, subIndicator, indicatorParams])

  // ---- 数据装载（窗口装载 / 增量 updateCandle + 指标重绘） ----
  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    const key = `${symbol}:${period}`
    const keyChanged = key !== keyRef.current
    keyRef.current = key
    const prev = prevDataRef.current
    const prevReplay = prevReplayRef.current
    const enteringReplay = !prevReplay && replay !== null
    const exitingReplay = prevReplay !== null && replay === null
    prevReplayRef.current = replay
    const cur = cullRef.current
    const fullLen = dataLenRef.current
    const view = lastVisibleRef.current
    // 进入/退出回放，或可见区间越出当前装载窗口 → 整窗重载
    const needReload =
      enteringReplay ||
      exitingReplay ||
      (shouldCull(fullLen) && (!cur || !view || !windowCovers(cur, view)))
    const prefixSame =
      !!prev &&
      prev.length > 0 &&
      windowData.length >= prev.length &&
      windowData[prev.length - 1]?.time === prev[prev.length - 1].time

    if (keyChanged || !prev || prev.length === 0 || needReload) {
      api.setCandles(windowData)
      // 换品种 / 进入回放 / 退出回放 / 首个裁剪窗口 → 适配全量
      if (keyChanged || enteringReplay || exitingReplay || (!cur && shouldCull(fullLen))) {
        // G2 周期切换锚定：仅 period 变化（symbol 不变）且此前有可见区间时，
        // 按旧右缘时间戳 + 时间跨度映射到新周期根数，保持相对位置而非跳到最新之外
        const symChanged = keyRef.current.slice(0, keyRef.current.indexOf(':')) !== symbol
        const vt = lastVisibleTimeRef.current
        if (!symChanged && !enteringReplay && !exitingReplay && vt && windowData.length > 0) {
          const anchor = anchorRangeForSwitch(windowData, vt.toTime, vt.spanMs, PERIOD_MS[period])
          if (anchor) api.setVisibleRange(anchor)
          else api.fitContent()
        } else {
          api.fitContent()
        }
      } else if (cur) {
        // 窗口重载（滚动越界 / seek 落到新窗口）：保持原全局视角，映射回局部坐标
        const v = lastVisibleRef.current
        if (v) {
          api.setVisibleRange(localRange(cur, v))
          if (replay) api.scrollToRealTime()
        }
      }
    } else if (prefixSame) {
      // 增量：实时新帧/新 K 线逐根 updateCandle，避免整窗重载
      for (let i = prev.length - 1; i < windowData.length; i++) api.updateCandle(windowData[i])
      // 回放播放推进时跟随最新，seek/实时增量不打扰用户视图
      if (replay && windowData.length > prev.length) api.scrollToRealTime()
    } else {
      // 回放 seek 后退等乱序：全量装载并适配
      api.setCandles(windowData)
      if (cur) {
        const v = lastVisibleRef.current
        if (v) api.setVisibleRange(localRange(cur, v))
        if (replay) api.scrollToRealTime()
      } else if (replay) {
        api.fitContent()
      }
    }

    api.setChartType(chartType)
    api.setMainIndicator(mainData)
    if (subData) api.setSubIndicator(subData)
    prevDataRef.current = windowData
  }, [windowData, mainData, subData, symbol, period, chartType, replay, cull])

  // 仓位线独立 effect：拖拽高频更新时避免触发指标/数据装载
  useEffect(() => {
    apiRef.current?.setPositionLines(positionLines ?? null)
  }, [positionLines])

  useEffect(() => {
    apiRef.current?.setReferencePrice(referencePrice ?? null)
  }, [referencePrice])

  useEffect(() => {
    apiRef.current?.setMarkerPrice(markerPrice ?? null)
  }, [markerPrice])

  // 画线重绘 effect：数据变化时仅重绘（保留当前选中态，避免确认文本/更新画线后选中被清）
  useEffect(() => {
    apiRef.current?.setDrawings(drawings ?? [])
  }, [drawings])

  // C12 便签全局显隐 effect：隐藏时不渲染 note（数据保留，可再显示）
  // 双可选链：apiRef 可能为部分 mock（测试环境），方法缺失时静默跳过
  useEffect(() => {
    apiRef.current?.setNotesHidden?.(notesHidden ?? false)
  }, [notesHidden])

  // 画线工具 effect：工具变化时切换（切换非 none 工具会清空选中，符合预期）
  useEffect(() => {
    apiRef.current?.setDrawingTool(drawingTool ?? 'none')
  }, [drawingTool])

  // 选中画线同步（拖拽判定依赖）
  useEffect(() => {
    apiRef.current?.setSelectedDrawing?.(selectedDrawingId ?? null)
  }, [selectedDrawingId])

  // 主题切换（模式 + 色预设）
  useEffect(() => {
    apiRef.current?.setTheme(themeMode, colorPreset)
  }, [themeMode, colorPreset])

  // ---- 十字光标信息窗内容 ----
  const candleByTime = useMemo(() => new Map(windowData.map((c) => [c.time, c])), [windowData])
  const lineMaps = useMemo(
    () => new Map(mainData.lines.map((l) => [l.id, new Map(l.points.map((p) => [p.time, p.value]))])),
    [mainData],
  )
  const sarMap = useMemo(
    () => new Map((mainData.markers ?? []).map((m) => [m.time, m.price])),
    [mainData],
  )
  const subLineMaps = useMemo(
    () => new Map((subData?.lines ?? []).map((l) => [l.id, new Map(l.points.map((p) => [p.time, p.value]))])),
    [subData],
  )

  const tooltipInfo = useMemo(() => {
    if (!tooltip) return null
    const c = candleByTime.get(tooltip.time)
    if (!c) return null
    const rows: { label: string; value: string; color: string }[] = [
      { label: t('tooltip.open'), value: fmtPrice(c.open), color: c.open >= c.close ? DOWN : UP },
      { label: t('tooltip.high'), value: fmtPrice(c.high), color: c.high >= c.close ? DOWN : UP },
      { label: t('tooltip.low'), value: fmtPrice(c.low), color: c.low >= c.close ? DOWN : UP },
      { label: t('tooltip.close'), value: fmtPrice(c.close), color: c.close >= c.open ? UP : DOWN },
      { label: t('tooltip.volume'), value: fmtVolume(c.volume), color: 'var(--text-dim)' },
    ]
    for (const l of mainData.lines) {
      const v = lineMaps.get(l.id)?.get(tooltip.time)
      if (v !== undefined) rows.push({ label: l.id, value: fmtPrice(v), color: 'var(--text)' })
    }
    const sarV = sarMap.get(tooltip.time)
    if (sarV !== undefined) rows.push({ label: 'SAR', value: fmtPrice(sarV), color: 'var(--text)' })
    for (const l of subData?.lines ?? []) {
      const v = subLineMaps.get(l.id)?.get(tooltip.time)
      if (v !== undefined) rows.push({ label: l.id, value: v.toFixed(2), color: 'var(--text)' })
    }
    if (subData?.hist) {
      const h = subData.hist.find((x) => x.time === tooltip.time)
      if (h) {
        rows.push({
          label: subData.kind === 'macd' ? 'MACD' : 'VOL',
          value: subData.kind === 'macd' ? h.value.toFixed(3) : fmtVolume(h.value),
          color: h.color ?? 'var(--text-dim)',
        })
      }
    }
    return { ...tooltip, rows }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- UP/DOWN 已固化进 subData 颜色，无需重复依赖
  }, [tooltip, candleByTime, mainData, lineMaps, sarMap, subLineMaps, subData, t])

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onContextMenu={(e) => {
        // E5：桌面右键 / 移动端长按（pointer: coarse 触发原生 contextmenu）统一弹自定义菜单；
        // preventDefault 屏蔽系统菜单，避免纯触屏设备出现两份菜单
        const pt = apiRef.current?.priceAt(e.clientX, e.clientY)
        if (!pt) return
        e.preventDefault()
        setCtxCopied(false)
        setCtxMenu({ x: e.clientX, y: e.clientY, price: pt.price })
      }}
    >
      <div ref={containerRef} className="chart-container" style={{ width: '100%', height: '100%' }} />
      {candles.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'var(--text-faint)',
            fontSize: 13,
            zIndex: 4,
            pointerEvents: 'none',
          }}
        >
          {status === 'loading' ? (
            <>
              <div className="kb-skeleton" aria-hidden="true">
                {[40, 65, 50, 80, 58, 95, 70, 45, 88, 60, 75, 52, 68, 84, 48].map((h, i) => (
                  <span key={i} style={{ height: h, animationDelay: `${(i % 5) * 0.18}s` }} />
                ))}
              </div>
              <div>{t('status.loading')}</div>
            </>
          ) : status === 'error' ? (
            <>
              <div>{t('status.chartError')}</div>
              {onRetry && (
                <button
                  data-testid="chart-retry"
                  onClick={onRetry}
                  style={{
                    pointerEvents: 'auto',
                    marginTop: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid var(--accent)',
                    background: 'transparent',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  {t('common.retry')}
                </button>
              )}
            </>
          ) : (
            t('status.noData')
          )}
        </div>
      )}
      <button
        onClick={() => {
          const dataUrl = apiRef.current?.takeScreenshot()
          if (!dataUrl) return
          void exportScreenshotWithDisclaimer(
            dataUrl,
            `${symbol}_${period}.png`,
            chartLabelsFor(lang).watermark,
          )
        }}
        title={t('drawing.screenshotTitle')}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '3px 10px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'var(--panel)',
          color: 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {t('drawing.screenshot')}
      </button>
      <button
        onClick={() => {
          if (regionSelecting) {
            apiRef.current?.cancelRegionSelect()
            setRegionSelecting(false)
          } else {
            setRegionSelecting(true)
            apiRef.current?.startRegionSelect()
          }
        }}
        title={t('drawing.screenshotRegion')}
        style={{
          position: 'absolute',
          top: 8,
          right: 92,
          padding: '3px 10px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: regionSelecting ? 'rgba(41,98,255,0.25)' : 'var(--panel)',
          color: regionSelecting ? '#4e9cf5' : 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {t('drawing.screenshotRegion')}
      </button>
      {regionSelecting && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 12px',
            fontSize: 11,
            borderRadius: 4,
            background: 'rgba(41,98,255,0.9)',
            color: '#fff',
            pointerEvents: 'none',
            zIndex: 7,
          }}
        >
          {t('drawing.regionHint')}
        </div>
      )}
      {tooltipInfo &&
        (() => {
          const pos = clampTooltipPos(
            tooltipInfo.x,
            tooltipInfo.y,
            tooltipInfo.rows.length,
            containerRef.current?.clientWidth ?? window.innerWidth,
            containerRef.current?.clientHeight ?? window.innerHeight,
          )
          return (
        <div
          style={{
            position: 'absolute',
            left: pos.left,
            top: pos.top,
            pointerEvents: 'none',
            background: 'var(--panel)',
            border: '1px solid #2a2e39',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          <div style={{ color: 'var(--text-dim)' }}>
            {timezoneMode === 'utc'
              ? new Date(tooltipInfo.time * 1000).toLocaleString(localeFor(lang), { hour12: false, timeZone: 'UTC' })
              : new Date(tooltipInfo.time * 1000).toLocaleString(localeFor(lang), { hour12: false })}
          </div>
          {tooltipInfo.rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-dim)' }}>{r.label}</span>
              <span style={{ color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
            </div>
          ))}
        </div>
          )
        })()}
      {!atLatest && !replay && candles.length > 1 && (
        <button
          data-testid="back-to-latest"
          onClick={() => {
            apiRef.current?.scrollToRealTime()
            setAtLatest(true)
          }}
          title={t('common.backToLatest')}
          style={{
            position: 'absolute',
            right: 10,
            bottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            fontSize: 12,
            border: '1px solid #2a2e39',
            borderRadius: 999,
            cursor: 'pointer',
            background: 'var(--panel)',
            color: '#4e9cf5',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            zIndex: 6,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>⤓</span>
          {t('common.backToLatest')}
        </button>
      )}
      <div
        data-testid="chart-watermark"
        style={{
          position: 'absolute',
          left: 10,
          bottom: 6,
          fontSize: 11,
          color: 'var(--text-faint)',
          opacity: 0.55,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 3,
        }}
      >
        {symbol.replace('USDT', '/USDT')} ·{' '}
        {t((PERIODS.find((pp) => pp.value === period)?.labelKey ?? 'period.1m') as MessageKey)}
      </div>
      {/* A11 图表可视时间范围（随缩放/平移更新；UTC 按配置） */}
      {visibleRange.from != null && visibleRange.to != null && (
        <div
          data-testid="chart-visible-range"
          style={{
            position: 'absolute',
            left: 10,
            bottom: 22,
            fontSize: 11,
            color: 'var(--text-faint)',
            opacity: 0.7,
            pointerEvents: 'none',
            userSelect: 'none',
            fontVariantNumeric: 'tabular-nums',
            zIndex: 3,
          }}
        >
          {fmtRangeTime(visibleRange.from, timezoneMode, localeFor(lang))} —{' '}
          {fmtRangeTime(visibleRange.to, timezoneMode, localeFor(lang))}
        </div>
      )}
      {ctxMenu && (
        <div
          data-testid="chart-ctx-menu"
          role="menu"
          style={{
            position: 'fixed',
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 210,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: 140,
          }}
        >
          {ctxCopied ? (
            <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--up)' }}>{t('ctx.copied')}</div>
          ) : (
            <>
              <button
                role="menuitem"
                data-testid="ctx-copy-price"
                onClick={() => {
                  void navigator.clipboard?.writeText(String(ctxMenu.price)).catch(() => {})
                  setCtxCopied(true)
                  window.setTimeout(() => {
                    setCtxCopied(false)
                    setCtxMenu(null)
                  }, 900)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
              >
                {t('ctx.copyPrice')} {fmtPrice(ctxMenu.price)}
              </button>
              <button
                role="menuitem"
                data-testid="ctx-add-alert"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('chart-request-alert', { detail: { symbol, price: ctxMenu.price } }))
                  setCtxMenu(null)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
              >
                {t('ctx.addAlert')}
              </button>
              <button
                role="menuitem"
                data-testid="ctx-clear-drawings"
                onClick={() => {
                  if (window.confirm(t('ctx.confirmClear'))) {
                    window.dispatchEvent(new CustomEvent('chart-clear-drawings'))
                  }
                  setCtxMenu(null)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: 'var(--down)', fontSize: 12, cursor: 'pointer' }}
              >
                {t('ctx.clearDrawings')}
              </button>
            </>
          )}
        </div>
      )}

    </div>
  )
}
