/* eslint-disable max-lines -- O3 治理基线：ChartView 为图表编排大组件，指标/数据/交互聚合，行数已超新代码阈值；新增逻辑应抽到 indicators/hooks 层。 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'
import { sessionExtremes } from '../data/session'
import { formatOhlc } from '../utils/ohlc'
import { PERIODS, PERIOD_MS, type Candle, type Period } from '../chart/types'
import { LightweightChartAdapter, type ChartApi, type ChartType, type MainIndicatorData, type PositionLines } from '../chart/adapter'
import type { Drawing, DrawingTool } from '../drawings/logic'
import type { SnapMode } from '../drawings/snap'
import { anchorRangeForSwitch, cullWindow, floorIndexByTime, localRange, nextCullWindow, shouldCull, windowCovers, type CullWindow } from '../chart/cull'
import { isAwayFromLatest } from '../chart/latest'
import { themeFor, type ColorPresetId } from '../theme'
import { calcMA, calcEMA, calcSMA, type ValuePoint } from '../indicators/sma'
import { calcBOLL, bollToLines } from '../indicators/boll'
import { calcBBW } from '../indicators/bbw'
import { calcSupertrend } from '../indicators/supertrend'
import { calcMACD } from '../indicators/macd'
import { calcKDJ } from '../indicators/kdj'
import { calcRSI } from '../indicators/rsi'
import { calcVWAP } from '../indicators/vwap'
import { calcWR, calcOBV, calcATR, calcDMI, calcCCI, calcPSY, calcSTOCH, calcROC, calcMOM } from '../indicators/extras'
import { calcMFI } from '../indicators/mfi'
import { mergeSubData } from '../indicators/mergeSubData'
import { calcAO } from '../indicators/ao'
import { calcCMF } from '../indicators/cmf'
import { calcDonchian } from '../indicators/donchian'
import { calcAroon } from '../indicators/aroon'
import { calcSAR } from '../indicators/sar'
import { calcIchimoku, ichimokuCloud } from '../indicators/ichimoku'
import { thresholdZones } from '../indicators/thresholdZones'
import { subScaleFixedRange } from '../indicators/subScale'
import { applyLineColorOverrides } from '../indicators/lineColors'
import { annotateCrossovers, findCrossovers } from '../indicators/crossovers'
import { calcTRIX } from '../indicators/trix'
import { calcDPO } from '../indicators/dpo'
import { calcVortex } from '../indicators/vortex'
import { histValueAtTime, lastHistValue, lastValuesOfLines, valuesAtTime } from '../indicators/lastValues'
import type { IndicatorParams } from '../indicators/params'
import type { SubIndicatorData } from '../chart/adapter'
import { useSubIndicatorWorker } from '../hooks/useSubIndicatorWorker'
import { useI18n } from '../i18n/useI18n'
import { localeFor, chartLabelsFor, type MessageKey } from '../i18n/messages'
import { clampTooltipPos } from './tooltipPos'
import { fmtPricePrecise as fmtPrice, fmtVolumeMK as fmtVolume, roundPricePrecise } from '../utils/format'
import { exportScreenshotWithDisclaimer, shareScreenshotWithDisclaimer } from './exportDisclaimer'
import { saveSnapshot, defaultSnapshotName } from '../utils/snapshotGallery'

export type MainIndicatorKind = 'ma' | 'ema' | 'boll' | 'vwap' | 'sar' | 'ichimoku' | 'supertrend' | 'none'
export type SubIndicatorKind = 'volume' | 'macd' | 'kdj' | 'rsi' | 'wr' | 'obv' | 'atr' | 'dmi' | 'cci' | 'psy' | 'stoch' | 'roc' | 'mom' | 'bbw' | 'mfi' | 'ao' | 'cmf' | 'donchian' | 'aroon' | 'trix' | 'dpo' | 'vortex' | 'none'
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

/** 副图线取值展示：VOL 副图的均量线是成交量，与柱体同一套缩写；其余副图线（KDJ/RSI/MACD…）是小数值 */
function fmtSubLineValue(kind: SubIndicatorKind | undefined, v: number): string {
  return kind === 'volume' ? fmtVolume(v) : v.toFixed(2)
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
  /** H11 指标线颜色自定义：line id → 覆盖色（持久化于 App） */
  lineColors?: Record<string, string>
  /** 回放模式：仅渲染 [0, cursor] 区间的数据 */
  replay: { cursor: number } | null
  hasMore: boolean
  onLoadMore: () => void
  /** N15 演示数据降级：网络不可用时注入合成 K 线（可交互演示） */
  onLoadDemo?: () => void
  /** N14 实时帧丢帧统计（压测/诊断时显示高丢帧角标） */
  frameStats?: { rate: number; dropped: number; total: number } | null
  /** 可见区间变化上报（多图时间轴同步用）：起止为 K 线秒，不是索引 */
  onViewRangeChange?: (range: { from: number; to: number }) => void
  /** 外部可见区间指令（多图同步 / 流水定位写入）：起止为 K 线秒，本图按自己的数据换算成索引 */
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
  /** v0.5.x 模拟成交图面标记（当前品种，buy/sell 点标），空数组/undefined 清除 */
  tradeMarkers?: { time: number; price: number; side: 'buy' | 'sell' }[]
  /** 仓位线拖拽回调：返回夹紧后的价格，或 null 表示拒绝本次移动（线停在原位） */
  onPositionDrag?: (key: 'entry' | 'takeProfit' | 'stopLoss', price: number) => number | null | void
  /** 画线数据（已按当前品种过滤） */
  drawings?: Drawing[]
  /** C12 便签全局显隐（隐藏时不渲染 note，数据保留） */
  notesHidden?: boolean
  /** I9 画线坐标角标常显（每条线端点显示坐标标签） */
  coordBadge?: boolean
  /** I13 画线全局透明度（0.15–1，与单条透明度相乘） */
  drawingGlobalOpacity?: number
  /** L3 对比模式：单图叠加的第二品种收盘价线（null/缺省=不叠加） */
  compareSeries?: { symbol: string; candles: Candle[] } | null
  /** L5 动态字号：图表内系统字号系数（0.85–1.2） */
  fontScale?: number
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
  onLoadDemo,
  onViewRangeChange,
  externalRange,
  onCrosshairChange,
  externalCrosshairTime,
  positionLines,
  referencePrice,
  markerPrice,
  tradeMarkers,
  onPositionDrag,
  drawings,
  notesHidden,
  coordBadge,
  drawingGlobalOpacity,
  compareSeries,
  fontScale,
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
  lineColors = {},
  frameStats,
}: ChartViewProps) {
  const { t, lang } = useI18n()
  const theme = themeFor(themeMode, colorPreset)
  const UP = theme.up
  const DOWN = theme.down
  // v0.5 会话高低点（当日 H/L 虚线）：开关持久化，随当日高低变化更新
  const [sessionLinesOn, setSessionLinesOn] = usePersistedState<boolean>('sessionLines', false)
  const session = useMemo(() => (sessionLinesOn ? sessionExtremes(candles) : null), [candles, sessionLinesOn])
  const sessionSig = session ? `${session.dayStart}|${session.high}|${session.low}` : ''
  /** H2 副图阈值区间：纯函数区间 + 半透明上色（from≥50 超买→DOWN 带、to≤50 超卖→UP 带） */
  const coloredZones = (kind: SubIndicatorKind): { from: number; to: number; color: string }[] =>
    thresholdZones(kind).map((z) => ({
      from: z.from,
      to: z.to,
      color: withAlpha(z.from >= 50 ? DOWN : UP, 0.06),
    }))
  /** H13 阈值线标记（worker 短路时补齐）：与各分支 markers 一致 */
  const lineMarkersFor = (kind: SubIndicatorKind): { price: number; color: string }[] => {
    switch (kind) {
      case 'rsi':
      case 'aroon':
        return [
          { price: 70, color: DOWN },
          { price: 30, color: UP },
        ]
      case 'wr':
        return [
          { price: 80, color: DOWN },
          { price: 20, color: UP },
        ]
      case 'cci':
        return [
          { price: 100, color: DOWN },
          { price: -100, color: UP },
        ]
      case 'psy':
        return [
          { price: 75, color: DOWN },
          { price: 25, color: UP },
        ]
      case 'mfi':
        return [
          { price: 80, color: DOWN },
          { price: 20, color: UP },
        ]
      case 'roc':
      case 'mom':
      case 'cmf':
      case 'trix':
      case 'dpo':
        return [{ price: 0, color: '#2a2e39' }]
      default:
        return []
    }
  }
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
  /**
   * 图表里**当前真正装载着**的那片切片：起始全局下标 + 根数（每次 setCandles 时写入）。
   * 局部→全局换算只能用它，不能用 cullRef：cull 在渲染期就变了，而图表数据要等到装载 effect 才换，
   * 这中间的可见区间回调会拿新 base 去解释旧切片，得到被 clamp 的假视角（停在最新却判成回看、
   * 锚定跨度被压成几分钟）。
   */
  const loadedRef = useRef({ base: 0, len: 0 })
  /** 装载中标记：setData 会同步补发一条仍按旧切片索引计算的可见区间，这期间的所有通知都不可信 */
  const applyingRef = useRef(false)
  /** 可见区间处理函数（初始化 effect 里定义）：装载收尾要主动补一次读数，故存下来供别的 effect 调用 */
  const applyRangeRef = useRef<((from: number, to: number, trusted?: boolean) => void) | null>(null)
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
  /** 本图最近一次「被外部指令写入」的十字光标时间：这类写入会从 subscribeCrosshairMove 回流，
   *  回流再上报会把广播风暴起来，把某一格「移出」的那条 null 永久盖掉（其余格留幻影十字光标） */
  const lastAppliedCrosshairRef = useRef<number | null>(null)
  const onDrawingCommitRef = useRef(onDrawingCommit)
  onDrawingCommitRef.current = onDrawingCommit
  const onDrawingSelectRef = useRef(onDrawingSelect)
  onDrawingSelectRef.current = onDrawingSelect
  const onDrawingUpdateRef = useRef(onDrawingUpdate)
  onDrawingUpdateRef.current = onDrawingUpdate
  const onEditTextRef = useRef(onEditText)
  onEditTextRef.current = onEditText
  const [regionSelecting, setRegionSelecting] = useState(false)
  // N5 截图分辨率倍数（1x/2x/3x 循环）
  const [screenshotScale, setScreenshotScale] = useState<1 | 2 | 3>(1)
  // T27：右键菜单（复制价格 / 添加提醒 / 清空画线）；触屏为主设备时不启用
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number; time: number } | null>(null)
  // I14 快照保存反馈：短暂显示「已保存到画廊」
  const [snapSaved, setSnapSaved] = useState(false)
  /** H12 副图 Y 轴固定范围（有界指标）：true 锁定到理论极值，false 自动缩放 */
  const [subScaleFixed, setSubScaleFixed] = useState(false)
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

  // 外部可见区间指令（多图同步 / 流水定位）：给的是**秒**，图表吃的是索引。
  // 各格周期不同，同一个索引对应的时间跨度能差几十倍，所以先按本格数据换算再落位
  // （全局索引 → 局部索引要减裁剪窗口起点 base）。
  const lastExternalRef = useRef('')
  useEffect(() => {
    if (!externalRange || !apiRef.current) return
    const sig = `${externalRange.from}:${externalRange.to}`
    if (sig === lastExternalRef.current) return
    lastExternalRef.current = sig
    const all = allCandlesRef.current
    if (all.length === 0) return
    const base = loadedRef.current.base
    // 本格一根 K 线多少秒：直接量数据的间距，比读 period 更贴此刻装载的那份
    const ownSec = all.length > 1 ? Math.max(1, all[1].time - all[0].time) : 1
    const want = Math.max(1, Math.round(Math.max(0, externalRange.to - externalRange.from) / ownSec))
    const fromIdx = floorIndexByTime(all, externalRange.from)
    // 粗周期上「同一小时里的两个时刻」会吸附到同一根 K 线：不撑开就落成一根宽度的退化视角，
    // 而它还会被再广播回去，把对面那格一路压扁（实测 1m 格最后只剩 1 分钟可视）
    const toIdx = Math.min(all.length - 1, Math.max(floorIndexByTime(all, externalRange.to), fromIdx + want))
    const left = toIdx <= fromIdx ? Math.max(0, toIdx - 1) : fromIdx
    apiRef.current.setVisibleRange({ from: left - base, to: toIdx - base })
  }, [externalRange])

  // G8 外部十字光标时间指令（多图同步）：与本图最近上报值相同则跳过（防回环）
  useEffect(() => {
    if (externalCrosshairTime === undefined || !apiRef.current) return
    if (externalCrosshairTime === lastReportedCrosshairRef.current) return
    lastReportedCrosshairRef.current = externalCrosshairTime
    lastAppliedCrosshairRef.current = externalCrosshairTime
    apiRef.current.setCrosshairTime(externalCrosshairTime)
  }, [externalCrosshairTime])

  // 回放模式只取 [0, cursor] 区间；实时模式全量
  const replayData = useMemo(
    () => (replay ? candles.slice(0, replay.cursor + 1) : candles),
    [candles, replay],
  )

  // 大数据量窗口裁剪：超过阈值只装载可见区间 + 余量，滚动到边缘再重载
  const windowSlice = useMemo(() => {
    if (!cull) return { data: replayData, base: 0 }
    const len = replayData.length
    // 窗口整体在数据之外（如回放起点游标很小时残留的旧窗口）→ 退回全量，避免空切片
    if (cull.start >= len) return { data: replayData, base: 0 }
    const start = Math.max(0, cull.start)
    // 窗口装载时即贴着数据尾沿（覆盖到末尾）：实时新帧/新 K 线自然流入窗口，
    // 走增量 updateCandle 路径，避免每 tick 全量重载
    const atTail = cull.end >= fullLenAtCullRef.current
    const end = atTail ? len : Math.min(cull.end, len)
    return { data: replayData.slice(start, Math.max(start, end)), base: start }
  }, [replayData, cull])
  const windowData = windowSlice.data
  const windowBase = windowSlice.base
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
      // 外部写入的回流不再上报（见 lastAppliedCrosshairRef）：time 为 null 的「移出」永远上报
      if (time === null || time !== lastAppliedCrosshairRef.current) onCrosshairChangeRef.current?.(time)
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
    /**
     * 可见区间落地的唯一入口。
     * @param trusted 事件是否来自图表本身。装载收尾的补读传 false：那一刻图表可能仍按**上一片切片**的
     *  间距报区间（右缘能越出本切片），拿它去决定裁剪窗口迁移会造出「窗口比视角还窄」的自锁状态
     *  ——实测停在最新处切周期后视角被甩到历史中段，「回到最新」常驻。补读只发布状态（A11 时间范围、
     *  atLatest、多图广播），不动窗口、不触发分页。
     */
    const onVisibleRange = (from: number, to: number, trusted = true) => {
      const now = Date.now()
      // 整窗 setData 期间图表会同步补发一条按**旧切片**索引算出的可见区间：此刻 loadedRef 已是新切片，
      // 换算得到的是一条被 clamp 的窄假视角，写进视角状态后会被窗口迁移/重载回放，真的把视野压扁。
      // 装载完成后我们总会显式设定视角（setVisibleRange / fitContent），那条通知才是可信的。
      if (applyingRef.current) return
      // 局部索引 → 全局索引（叠加裁剪窗口偏移）。
      // A2 修复：lightweight-charts 的 visibleLogicalRange 是浮点逻辑索引且含 rightOffset 越界
      // （to 可 > len-1）。此前直接用浮点索引取 allCandlesRef 得 undefined → tFrom/tTo 恒 null →
      // lastVisibleTimeRef 不更新 → 切周期锚定拿不到旧右缘时间而回落 fitContent 跳回最新，
      // A11 可视范围显示、loadMore 左缘判定、pair/quad 时间轴同步同样受影响。先取整并 clamp 到数据范围。
      const base = loadedRef.current.base
      const len = dataLenRef.current
      const lastIdx = Math.max(0, len - 1)
      const gFrom = Math.min(base + Math.max(0, Math.floor(from)), lastIdx)
      // max(gFrom, …) 兜底：空数据初始区间 {0,-1} / base 越界时也能保证 from ≤ to，避免 setVisibleLogicalRange 断言崩溃
      const gTo = Math.max(gFrom, Math.min(base + Math.floor(to), lastIdx))
      lastVisibleRef.current = { from: gFrom, to: gTo }
      // A11 可视起止时间戳（索引 → 时间，数据不足时显示 null）
      const tFrom = allCandlesRef.current[gFrom]?.time ?? null
      const tTo = allCandlesRef.current[gTo]?.time ?? null
      setVisibleRange({ from: tFrom, to: tTo })
      // G2 周期切换锚定：记录右缘时间戳 + 时间跨度（毫秒）
      if (tFrom != null && tTo != null) {
        lastVisibleTimeRef.current = { toTime: tTo, spanMs: Math.max((tTo - tFrom) * 1000, 1) }
      }
      setAtLatest(!isAwayFromLatest(gTo, len))
      // 数据量超阈值 → 只在视角越出装载区间（或左缘空转一个余量）时迁移窗口；窗口内滚动/缩放零重载
      if (trusted) {
        const cur = cullRef.current
        const loadedWindow = { start: base, end: base + loadedRef.current.len }
        const target = nextCullWindow(cur, loadedWindow, { from: gFrom, to: gTo }, len)
        if (target !== cur) {
          fullLenAtCullRef.current = target ? len : 0
          setCull(target)
        }
        if (!replayRef.current) {
          if (gFrom <= 2 && hasMoreRef.current && now - lastLoadAt > LOAD_MORE_COOLDOWN_MS) {
            lastLoadAt = now
            onLoadMoreRef.current()
          }
        }
      }
      // 广播按**时间**而不是索引：接收格周期可能完全不同，索引对它们意味着另一段时间跨度
      if (tFrom != null && tTo != null) onViewRangeChangeRef.current?.({ from: tFrom, to: tTo })
    }
    applyRangeRef.current = onVisibleRange
    const unsubRange = api.subscribeVisibleRange(onVisibleRange)

    return () => {
      unsubCross()
      unsubRange()
      applyRangeRef.current = null
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
      // H3/H14 金叉/死叉信号：最快线与最慢线交叉处打点（金叉=UP B 标注、死叉=DOWN S 标注）
      const [fast, slow] = lines
      let markers: { time: number; price: number; color: string; label?: string }[] | undefined
      if (fast && slow && fast.points.length > 0 && slow.points.length > 0) {
        markers = annotateCrossovers(findCrossovers(fast.points, slow.points)).map((x) => ({
          time: x.time,
          price: x.price,
          color: x.kind === 'golden' ? UP : DOWN,
          label: x.label,
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

  // L3 对比模式：单图叠加第二品种收盘价线（归一化到主图坐标；用于走势对比）
  const compareLines = useMemo<{ id: string; points: ValuePoint[]; color?: string }[] | null>(() => {
    if (!compareSeries || compareSeries.candles.length === 0) return null
    return [
      {
        id: `CMP_${compareSeries.symbol}`,
        points: compareSeries.candles.map((c) => ({ time: c.time, value: c.close })),
        color: theme.accent,
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme 为渲染派生量
  }, [compareSeries, themeMode])

  // H13 副图线 worker：大数据量时异步计算（小窗口/worker 不可用走同步兜底）
  const subWorker = useSubIndicatorWorker(subIndicator, windowData, indicatorParams)
  const workerLines = subWorker.lines
  const workerActive = subWorker.fromWorker

  const subData = useMemo(() => {
    const buildSubData = (kind: SubIndicatorKind): SubIndicatorData | null => {
    // H13 大数据量副图线 worker 短路：当前副图由 worker 提供线集时跳过主线程重算
    if (kind === subIndicator && kind !== 'none' && workerLines && workerActive) {
      return { kind, lines: workerLines, markers: lineMarkersFor(kind), zones: coloredZones(kind) }
    }
    if (kind === 'bbw') {
      return { kind: 'bbw' as const, lines: [{ id: 'BBW', points: calcBBW(windowData, indicatorParams.bbwPeriod, indicatorParams.bbwMult) }] }
    }
    if (kind === 'volume') {
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
    if (kind === 'macd') {
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
    if (kind === 'kdj') {
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
    if (kind === 'rsi') {
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
    if (kind === 'wr') {
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
    if (kind === 'obv') {
      return { kind: 'obv' as const, lines: [{ id: 'OBV', points: calcOBV(windowData, indicatorParams.obvMaPeriod) }] }
    }
    if (kind === 'atr') {
      return { kind: 'atr' as const, lines: [{ id: 'ATR', points: calcATR(windowData, indicatorParams.atrPeriod) }] }
    }
    if (kind === 'dmi') {
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
    if (kind === 'cci') {
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
    if (kind === 'psy') {
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
    if (kind === 'stoch') {
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
    if (kind === 'roc') {
      return {
        kind: 'roc' as const,
        lines: [{ id: 'ROC', points: calcROC(windowData, indicatorParams.rocPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (kind === 'mom') {
      return {
        kind: 'mom' as const,
        lines: [{ id: 'MOM', points: calcMOM(windowData, indicatorParams.momPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (kind === 'mfi') {
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
    if (kind === 'ao') {
      const ao = calcAO(windowData, indicatorParams.aoFast, indicatorParams.aoSlow)
      return {
        kind: 'ao' as const,
        hist: ao.map((p) => ({ time: p.time, value: p.value, color: p.value >= 0 ? UP : DOWN })),
      }
    }
    if (kind === 'cmf') {
      return {
        kind: 'cmf' as const,
        lines: [{ id: 'CMF', points: calcCMF(windowData, indicatorParams.cmfPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (kind === 'donchian') {
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
    if (kind === 'aroon') {
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
    if (kind === 'trix') {
      return {
        kind: 'trix' as const,
        lines: [{ id: 'TRIX', points: calcTRIX(windowData, indicatorParams.trixPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (kind === 'dpo') {
      return {
        kind: 'dpo' as const,
        lines: [{ id: 'DPO', points: calcDPO(windowData, indicatorParams.dpoPeriod) }],
        markers: [{ price: 0, color: '#2a2e39' }],
      }
    }
    if (kind === 'vortex') {
      const v = calcVortex(windowData, indicatorParams.vortexPeriod)
      return {
        kind: 'vortex' as const,
        lines: [
          { id: 'VI+', points: v.plus },
          { id: 'VI-', points: v.minus },
        ],
      }
    }
    return null
    }
    // H10 副图叠加：overlay 非 none 且非当前副图时，同轴合并其线
    const overlayKind = indicatorParams.subOverlay as SubIndicatorKind
    const overlay = overlayKind !== 'none' && overlayKind !== subIndicator ? buildSubData(overlayKind) : null
    return mergeSubData(buildSubData(subIndicator), overlay)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- UP/DOWN 为渲染派生量（来自 theme），加入会破坏 memo 稳定性；workerLines 已由 workerActive 门控
  }, [windowData, subIndicator, indicatorParams, workerActive])

  // ---- 数据装载（窗口装载 / 增量 updateCandle + 指标重绘） ----
  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    const key = `${symbol}:${period}`
    const prevKey = keyRef.current
    const keyChanged = key !== prevKey
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

    // 整窗装载：先把「图表里到底装着什么」记牢，再让 setData 内部的补发通知一律作废
    const loadSlice = (data: Candle[], base: number) => {
      loadedRef.current = { base, len: data.length }
      applyingRef.current = true
      try {
        api.setCandles(data)
      } finally {
        applyingRef.current = false
      }
    }
    // 本次真正装载进图表的切片：prevDataRef 必须记录它（而非名义上的 windowData），
    // 否则锚定路径下「图表里的数据」与「增量的起点基准」是两片不同数据
    let loaded = windowData
    // 是否走了整窗装载（只有它会作废 setData 期间的可见区间通知，需要在收尾补一次可信读数）
    let wholeWindowLoad = false
    if (keyChanged || !prev || prev.length === 0 || needReload) {
      wholeWindowLoad = true
      loadSlice(windowData, windowBase)
      // 换品种 / 进入回放 / 退出回放 / 首个裁剪窗口 → 适配全量
      if (keyChanged || enteringReplay || exitingReplay || (!cur && shouldCull(fullLen))) {
        // G2 周期切换右侧锚定：仅 period 变化（symbol 不变）且此前有可见区间时，
        // 按旧右缘时间戳 + 时间跨度在「全量新数据」上定位目标区间，再重建裁剪窗口装载。
        // 修复一（A2）：此前 keyRef.current 已被覆盖，symChanged 恒 false，换品种也走锚定。
        // 修复二（A2）：此前对 windowData（旧周期位置索引裁出的新周期切片）做二分，
        // 位置×周期会错位，旧右缘时间常落新窗口之外被 clamp 到错误位置甚至跳回最新；
        // 改为对全量 replayData 按时间定位，并同步重建窗口基准。
        const symChanged = prevKey.slice(0, prevKey.indexOf(':')) !== symbol
        const vt = lastVisibleTimeRef.current
        const periodChanged = keyChanged && !symChanged
        if (periodChanged && !enteringReplay && !exitingReplay && vt && replayData.length > 0) {
          // 在「全量新数据」上按旧右缘时间戳 + 时间跨度计算锚定区间（全局索引，已保证 ≥2 根）
          const anchor = anchorRangeForSwitch(replayData, vt.toTime, vt.spanMs, PERIOD_MS[period])
          if (anchor) {
            const len = replayData.length
            const useCull = shouldCull(len)
            const target = useCull ? cullWindow(len, anchor) : null
            const slice = target ? replayData.slice(target.start, target.end) : replayData
            // 先立基准再装载：随后 setVisibleRange 触发的可见区间回调要用新切片自己的起点换算
            loadSlice(slice, target ? target.start : 0)
            loaded = slice
            if (target) {
              setCull(target)
              cullRef.current = target
              api.setVisibleRange(localRange(target, anchor))
            } else {
              api.setVisibleRange(anchor)
            }
          } else {
            api.fitContent()
          }
        } else {
          api.fitContent()
        }
      } else if (cur) {
        // 窗口重载（滚动越界 / seek 落到新窗口）：保持原全局视角，映射回本次切片的局部坐标
        const v = lastVisibleRef.current
        if (v) {
          api.setVisibleRange({ from: v.from - windowBase, to: v.to - windowBase })
          if (replay) api.scrollToRealTime()
        }
      }
    } else if (prefixSame) {
      // 增量：实时新帧/新 K 线逐根 updateCandle，避免整窗重载（起点基准不变，仅尾沿生长）
      for (let i = prev.length - 1; i < windowData.length; i++) api.updateCandle(windowData[i])
      loadedRef.current = { base: windowBase, len: windowData.length }
      // 回放播放推进时跟随最新，seek/实时增量不打扰用户视图
      if (replay && windowData.length > prev.length) api.scrollToRealTime()
    } else {
      // 回放 seek 后退等乱序：全量装载并适配
      wholeWindowLoad = true
      loadSlice(windowData, windowBase)
      if (cur) {
        const v = lastVisibleRef.current
        if (v) api.setVisibleRange({ from: v.from - windowBase, to: v.to - windowBase })
        if (replay) api.scrollToRealTime()
      } else if (replay) {
        api.fitContent()
      }
    }

    // 整窗装载作废了 setData 期间那次陈旧通知，而随后的 fitContent/setVisibleRange 往往算出与图表
    // 当前值相同的区间 → 变化事件不再触发 → 视角基准、A11 可视时间范围、atLatest 全停在装载前的 null
    // （未启用裁剪时尤其明显：之后再没有任何事件会补上）。这里只补**状态发布**：那一刻图表报的区间
    // 可能仍按上一片切片的间距算，拿它决定裁剪窗口会把视角甩出最新（见 onVisibleRange 的 trusted）
    if (wholeWindowLoad) {
      const r = api.visibleRange()
      if (r) applyRangeRef.current?.(r.from, r.to, false)
    }

    api.setChartType(chartType)
    const lines = applyLineColorOverrides(mainData.lines, lineColors)
    // L3 对比模式：主图指标线末尾追加对比品种收盘价线
    if (compareLines) lines.push(...compareLines)
    api.setMainIndicator({ ...mainData, lines })
    if (subData) {
      api.setSubIndicator({
        ...subData,
        lines: subData.lines ? applyLineColorOverrides(subData.lines, lineColors) : undefined,
      })
    }
    prevDataRef.current = loaded
  }, [windowData, mainData, subData, symbol, period, chartType, replay, cull, lineColors, compareLines])

  // H12 副图 Y 轴固定范围：切换副图指标时重置为自动；开启/关闭时同步 adapter
  useEffect(() => {
    const r = subScaleFixed ? subScaleFixedRange(subIndicator) : null
    apiRef.current?.setSubScaleRange(r)
  }, [subScaleFixed, subIndicator])

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

  // v0.5.x 模拟成交图面标记：随成交流水变化重设（独立于指标/数据重绘）
  useEffect(() => {
    apiRef.current?.setTradeMarkers(tradeMarkers && tradeMarkers.length > 0 ? tradeMarkers : null)
  }, [tradeMarkers])

  // v0.5 会话高低点：仅在开关/当日高低/会话切换时更新，避免逐 tick 重设
  useEffect(() => {
    apiRef.current?.setSessionHighLow(
      sessionSig ? { high: session!.high, low: session!.low } : null,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session 由 sessionSig 稳定签名驱动
  }, [sessionSig])

  // 画线重绘 effect：数据变化时仅重绘（保留当前选中态，避免确认文本/更新画线后选中被清）
  useEffect(() => {
    apiRef.current?.setDrawings(drawings ?? [])
  }, [drawings])

  // C12 便签全局显隐 effect：隐藏时不渲染 note（数据保留，可再显示）
  // 双可选链：apiRef 可能为部分 mock（测试环境），方法缺失时静默跳过
  useEffect(() => {
    apiRef.current?.setNotesHidden?.(notesHidden ?? false)
  }, [notesHidden])

  // I9 画线坐标角标常显 effect
  useEffect(() => {
    apiRef.current?.setCoordBadge?.(coordBadge ?? false)
  }, [coordBadge])

  // I13 画线全局透明度 effect
  useEffect(() => {
    apiRef.current?.setGlobalDrawingOpacity?.(drawingGlobalOpacity ?? 1)
  }, [drawingGlobalOpacity])

  // L5 动态字号 effect
  useEffect(() => {
    apiRef.current?.setFontScale?.(fontScale ?? 1)
  }, [fontScale])

  // 画线工具 effect：工具变化时切换（切换非 none 工具会清空选中，符合预期）
  useEffect(() => {
    apiRef.current?.setDrawingTool(drawingTool ?? 'none')
  }, [drawingTool])

  // M8 键盘画线：画线工具激活时 Enter 在当前十字光标处放置锚点（Esc 取消由 App 全局处理）
  useEffect(() => {
    if (!drawingTool || drawingTool === 'none') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      e.preventDefault()
      apiRef.current?.keyboardPlaceAnchorAtCrosshair()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      if (v !== undefined) rows.push({ label: l.id, value: fmtSubLineValue(subData?.kind, v), color: 'var(--text)' })
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
        // 光标价格是像素反算的浮点尾数，先收口到展示精度再进菜单：复制/提醒/挂单三个出口都用它
        setCtxMenu({ x: e.clientX, y: e.clientY, price: roundPricePrecise(pt.price), time: pt.time })
      }}
    >
      {/* data-candles：已入仓的 K 线根数。画布上有红绿像素不等于「图表可用」——首根 WS tick 先到、
          历史 K 线还在路上时同样有像素，而此时的手势与断言都落在只有一两根柱子的图上 */}
      <div ref={containerRef} className="chart-container" data-candles={candles.length} style={{ width: '100%', height: '100%' }} />
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
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {onRetry && (
                  <button
                    data-testid="chart-retry"
                    onClick={onRetry}
                    style={{
                      pointerEvents: 'auto',
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
                {onLoadDemo && (
                  <button
                    data-testid="chart-load-demo"
                    onClick={onLoadDemo}
                    style={{
                      pointerEvents: 'auto',
                      padding: '4px 12px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: '1px solid var(--text-dim)',
                      background: 'transparent',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    {t('status.loadDemo')}
                  </button>
                )}
              </div>
            </>
          ) : (
            t('status.noData')
          )}
        </div>
      )}
      <button
        onClick={() => {
          const dataUrl = apiRef.current?.takeScreenshot(undefined, screenshotScale)
          if (!dataUrl) return
          void exportScreenshotWithDisclaimer(
            dataUrl,
            `${symbol}_${period}@${screenshotScale}x.png`,
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
      {/* I2 一键分享：Web Share API 带文件，不支持时降级下载 */}
      <button
        onClick={() => {
          const dataUrl = apiRef.current?.takeScreenshot(undefined, screenshotScale)
          if (!dataUrl) return
          void shareScreenshotWithDisclaimer(
            dataUrl,
            `${symbol}_${period}@${screenshotScale}x.png`,
            chartLabelsFor(lang).watermark,
          )
        }}
        title={t('drawing.shareTitle')}
        style={{
          position: 'absolute',
          top: 8,
          right: 92,
          padding: '3px 8px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'var(--panel)',
          color: 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {t('drawing.share')}
      </button>
      {/* I14 存快照到本地画廊（供对比/回看），不吃截图导出与免责水印路径 */}
      <button
        data-testid="snapshot-save"
        onClick={() => {
          const dataUrl = apiRef.current?.takeScreenshot(undefined, 1)
          if (!dataUrl) return
          const ok = saveSnapshot({ name: defaultSnapshotName(symbol, period), symbol, period, dataUrl, width: 0, height: 0 })
          setSnapSaved(ok != null)
        }}
        title={t('snap.save')}
        style={{
          position: 'absolute',
          top: 8,
          right: 228,
          padding: '3px 8px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'var(--panel)',
          color: 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {snapSaved ? t('snap.saved') : t('snap.save')}
      </button>
      <button
        data-testid="session-lines-toggle"
        onClick={() => setSessionLinesOn((v) => !v)}
        title={t('chart.sessionLines')}
        aria-pressed={sessionLinesOn}
        style={{
          position: 'absolute',
          top: 36,
          right: 8,
          padding: '3px 8px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: sessionLinesOn ? 'rgba(41,98,255,0.18)' : 'var(--panel)',
          color: sessionLinesOn ? 'var(--accent)' : 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {t('chart.sessionLines')}
      </button>
      <button
        data-testid="screenshot-scale-toggle"
        onClick={() => setScreenshotScale((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
        title={t('drawing.screenshotScale')}
        aria-pressed={screenshotScale !== 1}
        style={{
          position: 'absolute',
          top: 8,
          right: 160,
          padding: '3px 8px',
          fontSize: 11,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: screenshotScale !== 1 ? 'rgba(41,98,255,0.18)' : 'var(--panel)',
          color: screenshotScale !== 1 ? 'var(--accent)' : 'var(--text-dim)',
          zIndex: 6,
        }}
      >
        {screenshotScale}x
      </button>
      {frameStats && frameStats.total >= 4 && frameStats.rate > 0.1 && (
        <div
          data-testid="frame-drop-badge"
          title={t('status.frameDrop', { rate: `${Math.round(frameStats.rate * 100)}%` })}
          style={{
            position: 'absolute',
            top: 8,
            right: 140,
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid rgba(245,192,47,0.6)',
            borderRadius: 4,
            background: 'rgba(245,192,47,0.15)',
            color: 'var(--yellow)',
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          🐢 {Math.round(frameStats.rate * 100)}% {t('status.frameDropUnit')}
        </div>
      )}
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
          right: 176,
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
          <div data-testid="crosshair-time" data-time={tooltipInfo.time} style={{ color: 'var(--text-dim)' }}>
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
      {/* B1/H9 指标值一览（主图线 + 副图线/柱）：
          十字光标激活时按光标时刻取值（跟随光标），否则显示最新值 */}
      {(() => {
        const crosshairTime = tooltip?.time ?? null
        const main = crosshairTime != null ? valuesAtTime(mainData.lines, crosshairTime) : lastValuesOfLines(mainData.lines)
        const sub = subData
          ? crosshairTime != null
            ? valuesAtTime(subData.lines ?? [], crosshairTime)
            : lastValuesOfLines(subData.lines ?? [])
          : []
        const subHist = subData
          ? crosshairTime != null
            ? histValueAtTime(subData.hist, crosshairTime)
            : lastHistValue(subData.hist)
          : null
        if (main.length === 0 && sub.length === 0 && subHist === null) return null
        const rows: { id: string; value: string }[] = [
          ...main.map((v) => ({ id: v.id, value: fmtPrice(v.value) })),
          ...sub.map((v) => ({ id: v.id, value: fmtSubLineValue(subData?.kind, v.value) })),
        ]
        if (subHist !== null) {
          rows.unshift({ id: subData?.kind === 'macd' ? 'MACD' : 'VOL', value: subData?.kind === 'macd' ? subHist.toFixed(3) : fmtVolume(subHist) })
        }
        return (
          <div
            data-testid="chart-indicator-last"
            style={{
              position: 'absolute',
              left: 10,
              bottom: 40,
              // 指标行多时（MA×n + VOL + MACD）一行装不下：限宽换行，避免撑出横向滚动
              maxWidth: 'calc(100% - 20px)',
              display: 'flex',
              flexWrap: 'wrap',
              columnGap: 12,
              rowGap: 2,
              fontSize: 11,
              color: 'var(--text-dim)',
              opacity: 0.85,
              pointerEvents: 'none',
              userSelect: 'none',
              fontVariantNumeric: 'tabular-nums',
              zIndex: 3,
            }}
          >
            {rows.map((r) => (
              <span key={r.id} style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--text-faint)' }}>{r.id}:</span> {r.value}
              </span>
            ))}
            {/* H12 副图 Y 轴固定范围切换：仅对有界指标显示 */}
            {subScaleFixedRange(subIndicator) && (
              <button
                data-testid="sub-scale-toggle"
                onClick={() => setSubScaleFixed((v) => !v)}
                aria-pressed={subScaleFixed}
                title={t('chart.subScaleToggleTitle')}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: subScaleFixed ? 'rgba(41,98,255,0.15)' : 'transparent',
                  color: subScaleFixed ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '0 6px',
                  pointerEvents: 'auto',
                }}
              >
                {t('chart.subScaleFixed')}
              </button>
            )}
          </div>
        )
      })()}
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
                }}                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
              >
                {t('ctx.copyPrice')} {fmtPrice(ctxMenu.price)}
              </button>
              <button
                role="menuitem"
                data-testid="ctx-copy-ohlc"
                onClick={() => {
                  const c = candleByTime.get(ctxMenu.time)
                  if (c) void navigator.clipboard?.writeText(formatOhlc(c)).catch(() => {})
                  setCtxCopied(true)
                  window.setTimeout(() => {
                    setCtxCopied(false)
                    setCtxMenu(null)
                  }, 900)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
              >
                {t('ctx.copyOhlc')}
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
              {/* v0.5.x 以光标价挂限价单（买入/卖出两向，打开快速下单的限价模式） */}
              {(['buy', 'sell'] as const).map((side) => (
                <button
                  key={side}
                  role="menuitem"
                  data-testid={`ctx-limit-${side}`}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('chart-request-limit-order', { detail: { symbol, price: ctxMenu.price, side } }))
                    setCtxMenu(null)
                  }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', color: side === 'buy' ? 'var(--up)' : 'var(--down)', fontSize: 12, cursor: 'pointer' }}
                >
                  {side === 'buy' ? t('ctx.limitBuy') : t('ctx.limitSell')}
                </button>
              ))}
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
