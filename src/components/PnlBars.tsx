import type { PnlBarDatum } from '../trade/perf'
import { useI18n } from '../i18n/useI18n'

const W = 340
const H = 56
const PAD_TOP = 4
const PAD_BOTTOM = 12

/**
 * v0.5 逐笔盈亏条形图：已平仓记录按时间升序排布，盈利向上（up 色）/ 亏损向下（down 色），
 * 中线为零轴，柱高按最大 |pnl| 归一化。无平仓 → 不渲染。
 */
export function PnlBars({ data }: { data: PnlBarDatum[] }) {
  const { t } = useI18n()
  if (data.length === 0) return null
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1)
  const n = data.length
  const slot = W / n
  const barW = Math.max(2, Math.min(14, slot * 0.7))
  const plotH = H - PAD_TOP - PAD_BOTTOM
  const zeroY = PAD_TOP + plotH / 2
  const half = plotH / 2
  return (
    <div
      data-testid="pnl-bars"
      role="img"
      aria-label={t('trade.pnlBars')}
      style={{ width: '100%', margin: '2px 0 6px' }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="var(--text-faint)" strokeWidth={1} opacity={0.4} />
        {data.map((d, i) => {
          const h = Math.max(1, (Math.abs(d.pnl) / maxAbs) * half)
          const x = i * slot + (slot - barW) / 2
          const y = d.pnl >= 0 ? zeroY - h : zeroY
          return <rect key={i} x={x} y={y} width={barW} height={h} fill={d.pnl >= 0 ? 'var(--up)' : 'var(--down)'} opacity={0.85} />
        })}
      </svg>
    </div>
  )
}
