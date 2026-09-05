import { useEffect, useState } from 'react'
import type { MarketStats } from '../hooks/useMarketStats'
import type { LiveTick } from '../hooks/useKlineData'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import { useI18n } from '../i18n/useI18n'
import { localeFor } from '../i18n/messages'
import { fmtPriceLocale, fmtPricePrecise as fmtPrice, fmtVolumeBM as fmtVolume } from '../utils/format'
import { formatRemaining } from '../utils/countdown'
import { isVolumeSurge } from '../chart/volumeSurge'
import type { GapHealth } from '../chart/dataHealth'

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
  /** G6 数据健康度：缺口档位（null=不显示） */
  gapHealth?: GapHealth | null
  /** G6 缺口段数（degraded 文案用） */
  gapCount?: number
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      {children}
    </span>
  )
}

export function StatsBar({ stats, live, period, lastCandleTime, volumeSurge, gapHealth, gapCount }: StatsBarProps) {
  const { t, lang } = useI18n()
  // M7 减少动效：系统偏好开启时禁用实时跳动闪烁
  const reducedMotion = useReducedMotion()
  // E8 千分位国际化：大数字（未平仓）按当前语言 locale 分组
  const locale = localeFor(lang)
  // 收盘倒计时 + G11 数据延迟：每秒走一次本组件（面板小，重渲染开销可忽略）
  const [now, setNow] = useState(() => Date.now())
  const needTicker = (period && lastCandleTime != null) || live != null
  useEffect(() => {
    if (!needTicker) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [needTicker, period, lastCandleTime, live])
  const remainingMs =
    period && lastCandleTime != null
      ? lastCandleTime * 1000 + PERIOD_MS[period] - now
      : null
  // G11 数据延迟：最近实时帧到达 vs 当前系统时间（毫秒），无 live 时为 null
  const latencyMs = live != null ? Math.max(0, now - live.ts) : null
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
    live && live.dir !== 0 && !reducedMotion ? (live.dir > 0 ? 'tick-flash-up' : 'tick-flash-down') : undefined
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
      {/* G11 数据延迟：实时帧滞后超过 5s 显示（弱网/停更提示） */}
      {latencyMs != null && latencyMs > 5000 && (
        <span
          data-testid="data-latency"
          title={t('stats.dataLatencyTitle')}
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
            fontWeight: 600,
            color: 'var(--yellow)',
            background: 'rgba(245,192,47,0.12)',
            border: '1px solid rgba(245,192,47,0.4)',
          }}
        >
          {t('stats.dataLatency')} {Math.floor(latencyMs / 1000)}s
        </span>
      )}
      {/* G6 数据健康度：缺口档位徽标（无缺口正常显示，有缺口降级警示） */}
      {gapHealth !== null && gapHealth !== undefined && gapHealth !== 'healthy' && (
        <span
          data-testid="data-health"
          title={t('stats.gapDegraded', { n: gapCount ?? 0 })}
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
            fontWeight: 600,
            color: 'var(--yellow)',
            background: 'rgba(245,192,47,0.12)',
            border: '1px solid rgba(245,192,47,0.4)',
          }}
        >
          {gapHealth === 'partial' ? t('stats.gapPartial') : t('stats.gapDegraded', { n: gapCount ?? 0 })}
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
