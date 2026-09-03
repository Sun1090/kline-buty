import { useEffect, useState } from 'react'
import type { MarketStats } from '../hooks/useMarketStats'
import type { LiveTick } from '../hooks/useKlineData'
import type { Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { useI18n } from '../i18n/useI18n'
import { localeFor } from '../i18n/messages'
import { fmtPriceLocale, fmtPricePrecise as fmtPrice, fmtVolumeBM as fmtVolume } from '../utils/format'
import { formatRemaining } from '../utils/countdown'
import { isVolumeSurge } from '../chart/volumeSurge'

interface StatsBarProps {
  stats: MarketStats
  /** WS 实时帧（最新价 + 方向）：非空时覆盖轮询价并做跳动高亮 */
  live?: LiveTick | null
  /** 当前周期：提供 lastCandleTime 时显示周期收盘倒计时 */
  period?: Period
  /** 最新 K 线开盘时间（秒级 UTC） */
  lastCandleTime?: number | null
  /** G5 量能异动：最新成交量 / 前 N 根均量（null=数据不足） */
  volumeSurge?: number | null
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      {children}
    </span>
  )
}

export function StatsBar({ stats, live, period, lastCandleTime, volumeSurge }: StatsBarProps) {
  const { t, lang } = useI18n()
  // E8 千分位国际化：大数字（未平仓）按当前语言 locale 分组
  const locale = localeFor(lang)
  // 收盘倒计时：每秒走一次本组件（面板小，重渲染开销可忽略）
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!period || lastCandleTime == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [period, lastCandleTime])
  const remainingMs =
    period && lastCandleTime != null
      ? lastCandleTime * 1000 + PERIOD_MS[period] - now
      : null
  const empty = stats.price === null && stats.fundingRate === null && stats.openInterest === null && !live
  if (empty) return null
  const changeColor = (stats.changePct ?? 0) >= 0 ? 'var(--up)' : 'var(--down)'
  const fundingPct = (stats.fundingRate ?? 0) * 100
  const fundingColor = fundingPct >= 0 ? 'var(--up)' : 'var(--down)'
  // G3 市场类型：有合约专属字段（费率/标记价/未平仓）即视为合约，否则现货
  const isPerp = stats.fundingRate !== null || stats.openInterest !== null || stats.markPrice !== null
  const marketLabel = isPerp ? t('stats.marketPerp') : t('stats.marketSpot')
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
      {/* G3 市场类型徽标：合约/现货（现货隐藏费率/强平/未平仓口径） */}
      <span
        data-testid="market-type"
        style={{
          fontSize: 11,
          padding: '1px 6px',
          borderRadius: 4,
          flexShrink: 0,
          color: isPerp ? 'var(--accent)' : 'var(--text-dim)',
          border: isPerp ? '1px solid var(--accent)' : '1px solid var(--border)',
        }}
      >
        {marketLabel}
      </span>
      {/* G5 量能异动：最新成交量 / 前 N 根均量 ≥ 3× 时高亮警示 */}
      {volumeSurge !== null && volumeSurge !== undefined && (
        <span
          data-testid="volume-surge"
          title={t('stats.volumeSurgeTitle')}
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
            fontWeight: 600,
            color: isVolumeSurge(volumeSurge) ? 'var(--down)' : 'var(--text-dim)',
            background: isVolumeSurge(volumeSurge) ? 'rgba(239,83,80,0.12)' : 'transparent',
            border: isVolumeSurge(volumeSurge) ? '1px solid rgba(239,83,80,0.4)' : '1px solid var(--border)',
          }}
        >
          {t('stats.volumeSurge')} {volumeSurge.toFixed(1)}×
        </span>
      )}
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
      {isPerp && stats.fundingRate !== null && (
        <Item label={t('stats.fundingRate')}>
          <span style={{ color: fundingColor }}>{fundingPct.toFixed(4)}%</span>
        </Item>
      )}
      {isPerp && stats.openInterest !== null && (
        <Item label={t('stats.openInterest')}>
          <span style={{ color: 'var(--text)' }}>{fmtPriceLocale(stats.openInterest, locale)}</span>
        </Item>
      )}
      {isPerp && stats.markPrice !== null && (
        <Item label={t('stats.markPrice')}>
          <span style={{ color: 'var(--text-dim)' }}>{fmtPrice(stats.markPrice)}</span>
        </Item>
      )}
      {remainingMs != null && (
        <Item label={t('stats.countdown')}>
          <span data-testid="period-countdown" style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {formatRemaining(remainingMs)}
          </span>
        </Item>
      )}
    </div>
  )
}
