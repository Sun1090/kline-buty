import { useMemo } from 'react'
import type { Candle } from '../chart/types'
import { computeVolumeProfile, pointOfControl } from '../volumeProfile/calc'
import { useI18n } from '../i18n'

interface VolumeProfileChartProps {
  symbol: string
  candles: Candle[]
}

const W = 300
const H = 260
const BID = 'var(--up)'
const ASK = 'var(--down)'

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)
}

/** 筹码分布（VPVR）：横向柱状图，绿=买量 红=卖量，标注密集区 */
export function VolumeProfileChart({ symbol, candles }: VolumeProfileChartProps) {
  const { t } = useI18n()
  const render = useMemo(() => {
    const profile = computeVolumeProfile(candles.slice(-300), 24)
    if (profile.length === 0) return null
    const maxVol = profile.reduce((m, b) => Math.max(m, b.volume), 0) || 1
    const poc = pointOfControl(profile)
    const barMax = W - 58
    const buckets = profile.length
    const barH = H / buckets
    return { profile, maxVol, poc, barMax, barH, buckets }
  }, [candles])

  if (!render) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
        {t('status.vpNotEnough')}
      </div>
    )
  }

  const { profile, maxVol, poc, barMax, barH } = render

  return (
    <div
      style={{
        padding: '6px 16px',
        borderTop: '1px solid #2a2e39',
        background: 'var(--panel)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
        {t('volumeProfile.title', { symbol: symbol.replace('USDT', '/USDT') })}
        {poc && (
          <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>
            {t('volumeProfile.poc', { price: fmtPrice(poc.price) })}
          </span>
        )}
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: 300 }}>
        {profile.map((b, i) => {
          const y = H - (i + 1) * barH
          const upW = (b.upVolume / maxVol) * barMax
          const downW = (b.downVolume / maxVol) * barMax
          const isPoc = poc && b.price === poc.price
          return (
            <g key={i}>
              {downW > 0 && <rect x={W - 56 - downW} y={y + 1} width={downW} height={barH - 2} fill={ASK} />}
              {upW > 0 && <rect x={W - 56 - upW} y={y + 1} width={upW} height={barH - 2} fill={BID} opacity={0.85} />}
              {isPoc && <rect x={W - 56} y={y} width={2} height={barH} style={{fill: "var(--placeholder)"}} />}
              {(i % 4 === 0 || i === profile.length - 1) && (
                <text x={W - 52} y={y + barH / 2 + 3} style={{fill: "var(--placeholder)"}} fontSize={9}>
                  {fmtPrice(b.price)}
                </text>
              )}
            </g>
          )
        })}
        <text x={4} y={12} fill={BID} fontSize={9}>{t('volumeProfile.bidVol')}</text>
        <text x={56} y={12} fill={ASK} fontSize={9}>{t('volumeProfile.askVol')}</text>
        <text x={104} y={12} style={{fill: "var(--placeholder)"}} fontSize={9}>{t('volumeProfile.pocLabel')}</text>
      </svg>
    </div>
  )
}
