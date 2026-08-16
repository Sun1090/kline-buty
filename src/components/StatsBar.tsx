import type { MarketStats } from '../hooks/useMarketStats'
import { useI18n } from '../i18n'

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
}

function fmtVolume(v: number) {
  return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toFixed(0)
}

interface StatsBarProps {
  stats: MarketStats
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      {children}
    </span>
  )
}

export function StatsBar({ stats }: StatsBarProps) {
  const { t } = useI18n()
  const empty = stats.price === null && stats.fundingRate === null && stats.openInterest === null
  if (empty) return null
  const changeColor = (stats.changePct ?? 0) >= 0 ? 'var(--up)' : 'var(--down)'
  const fundingPct = (stats.fundingRate ?? 0) * 100
  const fundingColor = fundingPct >= 0 ? 'var(--up)' : 'var(--down)'
  return (
    <div
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
      {stats.price !== null && (
        <Item label={t('stats.lastPrice')}>
          <span style={{ fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
            {fmtPrice(stats.price)}
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
