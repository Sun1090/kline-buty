import type { MarketStats } from '../hooks/useMarketStats'
import type { LiveTick } from '../hooks/useKlineData'
import { useI18n } from '../i18n/useI18n'

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
}

function fmtVolume(v: number) {
  return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toFixed(0)
}

interface StatsBarProps {
  stats: MarketStats
  /** WS 实时帧（最新价 + 方向）：非空时覆盖轮询价并做跳动高亮 */
  live?: LiveTick | null
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      {children}
    </span>
  )
}

export function StatsBar({ stats, live }: StatsBarProps) {
  const { t } = useI18n()
  const empty = stats.price === null && stats.fundingRate === null && stats.openInterest === null && !live
  if (empty) return null
  const changeColor = (stats.changePct ?? 0) >= 0 ? 'var(--up)' : 'var(--down)'
  const fundingPct = (stats.fundingRate ?? 0) * 100
  const fundingColor = fundingPct >= 0 ? 'var(--up)' : 'var(--down)'
  // 实时帧优先：价 + 方向 + 闪烁（帧到达即高亮一次，肉眼可见行情在推）
  const price = live?.price ?? stats.price
  const dirColor =
    live && live.dir !== 0 ? (live.dir > 0 ? 'var(--up)' : 'var(--down)') : changeColor
  const arrow = live ? (live.dir > 0 ? '▲' : live.dir < 0 ? '▼' : '') : ''
  const flashClass =
    live && live.dir !== 0 ? (live.dir > 0 ? 'tick-flash-up' : 'tick-flash-down') : undefined
  return (
    <div
      role="region"
      aria-label={t('panel.statsTitle')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '4px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {price !== null && (
        <Item label={t('stats.lastPrice')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {live && (
              <span
                title={t('status.live')}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--up)',
                  display: 'inline-block',
                  animation: 'live-pulse 1.2s ease-in-out infinite',
                }}
              />
            )}
            <span
              data-testid="live-price"
              key={live?.ts ?? 0}
              className={flashClass}
              style={{
                fontWeight: 600,
                color: dirColor,
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 3,
                padding: '0 2px',
              }}
            >
              {arrow}
              {fmtPrice(price)}
            </span>
          </span>
        </Item>
      )}
      {stats.changePct !== null && (
        <Item label={t('stats.change24h')}>
          <span style={{ color: changeColor }}>{stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(2)}%</span>
        </Item>
      )}
      {stats.high !== null && (
        <Item label={t('stats.high24h')}>
          <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(stats.high)}</span>
        </Item>
      )}
      {stats.low !== null && (
        <Item label={t('stats.low24h')}>
          <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(stats.low)}</span>
        </Item>
      )}
      {stats.quoteVolume !== null && (
        <Item label={t('stats.volume24h')}>
          <span style={{ color: 'var(--text)' }}>{fmtVolume(stats.quoteVolume)} USDT</span>
        </Item>
      )}
      {stats.fundingRate !== null && (
        <Item label={t('stats.fundingRate')}>
          <span style={{ color: fundingColor }}>{fundingPct.toFixed(4)}%</span>
        </Item>
      )}
      {stats.openInterest !== null && (
        <Item label={t('stats.openInterest')}>
          <span style={{ color: 'var(--text)' }}>{stats.openInterest.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </Item>
      )}
      {stats.markPrice !== null && (
        <Item label={t('stats.markPrice')}>
          <span style={{ color: 'var(--text-dim)' }}>{fmtPrice(stats.markPrice)}</span>
        </Item>
      )}
    </div>
  )
}
