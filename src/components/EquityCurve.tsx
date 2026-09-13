import { useMemo, useRef, useState } from 'react'
import type { EquityPoint } from '../utils/equity'
import { scaleEquity } from '../trade/perf'
import { useI18n } from '../i18n/useI18n'

interface EquityCurveProps {
  /** 权益点（时间升序） */
  points: EquityPoint[]
  /** 初始权益（用于基准虚线着色，默认 10,000） */
  initialBalance?: number
  /** SVG 逻辑高度（默认 120） */
  height?: number
}

const W = 340
const PAD = 8

/** 时间轴标签（本地时区，确定性格式 MM-DD HH:mm） */
export function fmtCurveTime(at: number): string {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * v0.5 交易绩效：可交互权益曲线。
 * 悬停显示十字定位 + 该时点权益/回撤 tooltip；底色按终值相对初始权益着色（升 → up 色，降 → down 色）。
 */
export function EquityCurve({ points, initialBalance = 10_000, height = 120 }: EquityCurveProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const { xs, ys, path, area, min, max } = useMemo(
    () => scaleEquity(points, W, height, PAD),
    [points, height],
  )
  const last = points[points.length - 1]
  const up = last !== undefined && last.equity >= initialBalance
  const color = up ? 'var(--up)' : 'var(--down)'
  const baselineY = useMemo(() => {
    if (max === min || points.length === 0) return null
    const span = max - min || 1
    return height - PAD - ((initialBalance - min) / span) * (height - PAD * 2)
  }, [points, initialBalance, height, min, max])

  const onMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || points.length === 0) return
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const idx = Math.round(frac * (points.length - 1))
    setHover(idx)
  }

  const hovered = hover !== null ? points[hover] : undefined
  // 该时点相对「至此为止的峰值（含初始资金基准）」的回撤比例（tooltip 展示）
  let hoverPeak = initialBalance
  if (hover !== null) {
    for (let i = 0; i <= hover; i++) if (points[i]?.equity > hoverPeak) hoverPeak = points[i]?.equity ?? hoverPeak
  }
  const hoverDd = hovered !== undefined && hoverPeak > 0 ? (hoverPeak - hovered.equity) / hoverPeak : 0
  const hx = hover !== null ? xs[hover] : 0
  const hy = hover !== null ? ys[hover] : 0
  const tipLeft = hover !== null ? Math.min(Math.max(hx, 46), W - 46) : 0

  return (
    <div
      ref={ref}
      data-testid="equity-curve"
      style={{ position: 'relative', width: '100%', touchAction: 'pan-y' }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('paper.equity')}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {area && <path d={area} fill={color} opacity={0.08} />}
        {path && (
          <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {baselineY !== null && (
          <line
            x1={0}
            y1={baselineY}
            x2={W}
            y2={baselineY}
            stroke="var(--text-faint)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
          />
        )}
        {hover !== null && (
          <line x1={hx} y1={0} x2={hx} y2={height} stroke="var(--text-faint)" strokeWidth={1} opacity={0.6} />
        )}
      </svg>
      {/* 悬停定位点 + tooltip（HTML 绝对定位，避免 SVG 非等比缩放变形） */}
      {hover !== null && hovered !== undefined && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: `${(hx / W) * 100}%`,
              top: `${(hy / height) * 100}%`,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: color,
              transform: 'translate(-50%, -50%)',
              border: '1px solid var(--bg)',
              pointerEvents: 'none',
            }}
          />
          <div
            data-testid="equity-curve-tooltip"
            style={{
              position: 'absolute',
              left: `${(tipLeft / W) * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
              background: 'var(--panel-bg, #1c2128)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 10,
              color: 'var(--text)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
            }}
          >
            {fmtCurveTime(hovered.at)} · {t('paper.equity')} <b style={{ color }}>{hovered.equity.toFixed(2)}</b>
            <span style={{ color: 'var(--text-faint)', marginLeft: 4 }}>
              {t('trade.drawdown')} {(hoverDd * 100).toFixed(2)}%
            </span>
          </div>
        </>
      )}
    </div>
  )
}
