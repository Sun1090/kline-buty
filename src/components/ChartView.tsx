import { useEffect, useMemo, useRef, useState } from 'react'
import type { Candle, Period } from '../chart/types'
import { LightweightChartAdapter, type ChartApi, type ChartType, type PositionLines } from '../chart/adapter'
import type { Drawing, DrawingTool } from '../drawings/logic'
import { THEMES } from '../theme'
import { calcMA, calcEMA, type ValuePoint } from '../indicators/sma'
import { calcBOLL, bollToLines } from '../indicators/boll'
import { calcMACD } from '../indicators/macd'
import { calcKDJ } from '../indicators/kdj'
import { calcRSI } from '../indicators/rsi'
import { calcVWAP } from '../indicators/vwap'
import type { IndicatorParams } from '../indicators/params'

export type MainIndicatorKind = 'ma' | 'ema' | 'boll' | 'vwap' | 'none'
export type SubIndicatorKind = 'volume' | 'macd' | 'kdj' | 'rsi' | 'none'
export type { ChartType }

const LOAD_MORE_COOLDOWN_MS = 3000

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
}

function fmtVolume(v: number) {
  return v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(2)}K` : v.toFixed(0)
}

interface ChartViewProps {
  symbol: string
  period: Period
  candles: Candle[]
  /** 数据加载状态（空数据时显示提示） */
  status?: string
  chartType: ChartType
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
  /** 仓位线（模拟订单叠加） */
  positionLines?: PositionLines | null
  /** 仓位线拖拽回调 */
  onPositionDrag?: (key: 'entry' | 'takeProfit' | 'stopLoss', price: number) => void
  /** 画线数据（已按当前品种过滤） */
  drawings?: Drawing[]
  /** 画线工具 */
  drawingTool?: DrawingTool
  /** 画线创建完成回调 */
  onDrawingCommit?: (d: { type: Drawing['type']; points: { time: number; price: number }[] }) => void
  /** 画线选中变化回调 */
  onDrawingSelect?: (id: string | null) => void
  /** 主题模式（canvas 渲染色） */
  themeMode?: 'dark' | 'light'
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
  chartType,
  mainIndicator,
  subIndicator,
  indicatorParams,
  replay,
  hasMore,
  onLoadMore,
  onViewRangeChange,
  externalRange,
  positionLines,
  onPositionDrag,
  drawings,
  drawingTool,
  onDrawingCommit,
  onDrawingSelect,
  themeMode = 'dark',
}: ChartViewProps) {
  const theme = THEMES[themeMode]
  const UP = theme.up
  const DOWN = theme.down
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ChartApi | null>(null)
  const prevDataRef = useRef<Candle[] | null>(null)
  const keyRef = useRef('')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore
  const replayRef = useRef(replay)
  replayRef.current = replay
  const prevReplayRef = useRef<{ cursor: number } | null>(null)
  const onViewRangeChangeRef = useRef(onViewRangeChange)
  onViewRangeChangeRef.current = onViewRangeChange
  const onDrawingCommitRef = useRef(onDrawingCommit)
  onDrawingCommitRef.current = onDrawingCommit
  const onDrawingSelectRef = useRef(onDrawingSelect)
  onDrawingSelectRef.current = onDrawingSelect

  // 外部可见区间指令（多图同步）：与本地值不同才写入，防回环
  const lastExternalRef = useRef('')
  useEffect(() => {
    if (!externalRange || !apiRef.current) return
    const sig = `${externalRange.from}:${externalRange.to}`
    if (sig === lastExternalRef.current) return
    lastExternalRef.current = sig
    apiRef.current.setVisibleRange(externalRange)
  }, [externalRange])

  // 回放模式只取 [0, cursor] 区间；实时模式全量
  const replayData = useMemo(
    () => (replay ? candles.slice(0, replay.cursor + 1) : candles),
    [candles, replay],
  )

  // ---- 图表实例与事件订阅（一次创建） ----
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const api = new LightweightChartAdapter(container)
    apiRef.current = api

    const unsubCross = api.subscribeCrosshairMove((time, x, y) => {
      if (time === null || x === null || y === null) {
        setTooltip(null)
        return
      }
      setTooltip({ x, y, time })
    })
    api.setPositionDragHandler(onPositionDrag ?? null)
    api.setTheme(themeMode)
    api.setDrawingCallbacks(
      onDrawingCommit || onDrawingSelect
        ? {
            onCommit: (d) => onDrawingCommitRef.current?.(d),
            onSelect: (id) => onDrawingSelectRef.current?.(id),
          }
        : null,
    )

    let lastLoadAt = 0
    const unsubRange = api.subscribeVisibleRange((from, to) => {
      const now = Date.now()
      if (!replayRef.current) {
        if (from <= 2 && hasMoreRef.current && now - lastLoadAt > LOAD_MORE_COOLDOWN_MS) {
          lastLoadAt = now
          onLoadMoreRef.current()
        }
      }
      onViewRangeChangeRef.current?.({ from, to })
    })

    return () => {
      unsubCross()
      unsubRange()
      api.destroy()
      apiRef.current = null
      prevDataRef.current = null
    }
  }, [])

  // ---- 指标计算（纯函数，随回放/实时数据变化全量重算） ----
  const mainLines = useMemo<{ id: string; points: ValuePoint[] }[]>(() => {
    if (mainIndicator === 'ma') return indicatorParams.maPeriods.map((p) => ({ id: `MA${p}`, points: calcMA(replayData, p) }))
    if (mainIndicator === 'ema') {
      const closes = replayData.map((c) => ({ time: c.time, value: c.close }))
      return indicatorParams.maPeriods.map((p) => ({ id: `EMA${p}`, points: calcEMA(closes, p) }))
    }
    if (mainIndicator === 'boll') {
      const b = bollToLines(calcBOLL(replayData, indicatorParams.bollPeriod, indicatorParams.bollMult))
      return [
        { id: 'BOLL_UPPER', points: b.upper },
        { id: 'BOLL_MID', points: b.mid },
        { id: 'BOLL_LOWER', points: b.lower },
      ]
    }
    if (mainIndicator === 'vwap') return [{ id: 'VWAP', points: calcVWAP(replayData) }]
    return []
  }, [replayData, mainIndicator, indicatorParams])

  const subData = useMemo(() => {
    if (subIndicator === 'volume') {
      return {
        kind: 'volume' as const,
        hist: replayData.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? UP : DOWN,
        })),
      }
    }
    if (subIndicator === 'macd') {
      const macd = calcMACD(replayData, indicatorParams.macdFast, indicatorParams.macdSlow, indicatorParams.macdSignal)
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
      const kdj = calcKDJ(replayData, indicatorParams.kdjN, indicatorParams.kdjM1, indicatorParams.kdjM2)
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
        lines: [{ id: 'RSI', points: calcRSI(replayData, indicatorParams.rsiPeriod) }],
        markers: [
          { price: 70, color: DOWN },
          { price: 30, color: UP },
        ],
      }
    }
    return null
  }, [replayData, subIndicator, indicatorParams])

  // ---- 数据装载（增量/全量 + 指标重绘） ----
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
    const prefixSame =
      !!prev &&
      prev.length > 0 &&
      replayData.length >= prev.length &&
      replayData[prev.length - 1]?.time === prev[prev.length - 1].time

    if (keyChanged || !prev || prev.length === 0 || enteringReplay || exitingReplay) {
      api.setCandles(replayData)
      api.fitContent()
    } else if (prefixSame) {
      for (let i = prev.length - 1; i < replayData.length; i++) api.updateCandle(replayData[i])
      // 回放播放推进时跟随最新，seek/实时增量不打扰用户视图
      if (replay && replayData.length > prev.length) api.scrollToRealTime()
    } else {
      // 回放 seek 后退等乱序：全量装载并适配
      api.setCandles(replayData)
      if (replay) api.fitContent()
    }

    api.setChartType(chartType)
    api.setMainIndicator(mainLines)
    if (subData) api.setSubIndicator(subData)
    prevDataRef.current = replayData
  }, [replayData, mainLines, subData, symbol, period, chartType, replay])

  // 仓位线独立 effect：拖拽高频更新时避免触发指标/数据装载
  useEffect(() => {
    apiRef.current?.setPositionLines(positionLines ?? null)
  }, [positionLines])

  // 画线独立 effect：数据/工具变化时重绘
  useEffect(() => {
    apiRef.current?.setDrawings(drawings ?? [])
    apiRef.current?.setDrawingTool(drawingTool ?? 'none')
  }, [drawings, drawingTool])

  // 主题切换
  useEffect(() => {
    apiRef.current?.setTheme(themeMode)
  }, [themeMode])

  // ---- 十字光标信息窗内容 ----
  const candleByTime = useMemo(() => new Map(replayData.map((c) => [c.time, c])), [replayData])
  const lineMaps = useMemo(
    () => new Map(mainLines.map((l) => [l.id, new Map(l.points.map((p) => [p.time, p.value]))])),
    [mainLines],
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
      { label: '开', value: fmtPrice(c.open), color: c.open >= c.close ? DOWN : UP },
      { label: '高', value: fmtPrice(c.high), color: c.high >= c.close ? DOWN : UP },
      { label: '低', value: fmtPrice(c.low), color: c.low >= c.close ? DOWN : UP },
      { label: '收', value: fmtPrice(c.close), color: c.close >= c.open ? UP : DOWN },
      { label: '量', value: fmtVolume(c.volume), color: 'var(--text-dim)' },
    ]
    for (const l of mainLines) {
      const v = lineMaps.get(l.id)?.get(tooltip.time)
      if (v !== undefined) rows.push({ label: l.id, value: fmtPrice(v), color: 'var(--text)' })
    }
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
  }, [tooltip, candleByTime, mainLines, lineMaps, subLineMaps, subData])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {candles.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            fontSize: 13,
            zIndex: 4,
            pointerEvents: 'none',
          }}
        >
          {status === 'loading'
            ? '加载历史数据…'
            : status === 'error'
              ? '行情数据加载失败：请检查网络或数据源可达性'
              : '暂无数据'}
        </div>
      )}
      <button
        onClick={() => {
          const dataUrl = apiRef.current?.takeScreenshot()
          if (!dataUrl) return
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = `${symbol}_${period}.png`
          a.click()
        }}
        title="截图分享"
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
        截图
      </button>
      {tooltipInfo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(tooltipInfo.x + 12, window.innerWidth - 180),
            top: tooltipInfo.y + 8,
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
            {new Date(tooltipInfo.time * 1000).toLocaleString('zh-CN', { hour12: false })}
          </div>
          {tooltipInfo.rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-dim)' }}>{r.label}</span>
              <span style={{ color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
