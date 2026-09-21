import { useMemo } from 'react'
import { useRecentTrades } from '../hooks/useRecentTrades'
import { fmtTradeClock } from '../data/trades'
import { fmtCompact } from '../depth/format'
import { fmtPriceCompact as fmtPrice } from '../utils/format'
import { useI18n } from '../i18n/useI18n'
import { Skeleton } from './Skeleton'

interface RecentTradesProps {
  symbol: string
  /** 点击成交行时上报价格（再点同价清除），联动主图标记线 */
  onMarkPrice?: (price: number) => void
}

/** 列表最多渲染的行数（累积窗口由 hook 的 TAPE_CAP 决定） */
const MAX_ROWS = 20

/**
 * 最新逐笔成交（成交明细 Tape）：5s 轮询累积，按主动买/主动卖着色，最新在顶部。
 * 与盘口共用主图标记线联动。
 */
export function RecentTrades({ symbol, onMarkPrice }: RecentTradesProps) {
  const { t } = useI18n()
  const trades = useRecentTrades(symbol)
  const rows = useMemo(() => trades.slice(-MAX_ROWS).reverse(), [trades])
  const buyCount = useMemo(() => trades.reduce((n, tr) => n + (tr.buy ? 1 : 0), 0), [trades])

  return (
    <div
      data-testid="recent-trades"
      role="region"
      aria-label={t('panel.tapeTitle')}
      tabIndex={0}
      style={{
        padding: '6px 16px',
        borderTop: '1px solid #2a2e39',
        background: 'var(--panel)',
        flexShrink: 0,
        minWidth: 260,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {t('tape.title', { symbol: symbol.replace('USDT', '/USDT') })}
        </span>
        <span style={{ flex: 1 }} />
        {trades.length > 0 && (
          <span
            data-testid="tape-side-summary"
            title={t('tape.sideSummary')}
            style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
          >
            <b style={{ color: 'var(--up)' }}>{buyCount}</b>
            {' · '}
            <b style={{ color: 'var(--down)' }}>{trades.length - buyCount}</b>
          </span>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '58px minmax(0, 1fr) minmax(0, 1fr)',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          fontSize: 10,
          color: 'var(--text-faint)',
        }}
      >
        <span>{t('tape.time')}</span>
        <span>{t('common.price')}</span>
        <span style={{ textAlign: 'right' }}>{t('tape.qty')}</span>
      </div>
      {trades.length === 0 ? (
        <Skeleton rows={8} rowHeight={16} testId="tape-skeleton" />
      ) : (
        rows.map((tr) => (
          <div
            key={tr.id}
            data-testid="tape-row"
            data-side={tr.buy ? 'buy' : 'sell'}
            onClick={() => onMarkPrice?.(tr.price)}
            title={t('tape.markHint')}
            style={{
              display: 'grid',
              gridTemplateColumns: '58px minmax(0, 1fr) minmax(0, 1fr)',
              alignItems: 'center',
              gap: 4,
              padding: '1px 8px',
              fontSize: 11,
              cursor: onMarkPrice ? 'pointer' : 'default',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: 'var(--text-faint)' }}>{fmtTradeClock(tr.time)}</span>
            <span style={{ color: tr.buy ? 'var(--up)' : 'var(--down)' }}>{fmtPrice(tr.price)}</span>
            <span style={{ color: 'var(--text-dim)', textAlign: 'right' }}>{fmtCompact(tr.qty)}</span>
          </div>
        ))
      )}
    </div>
  )
}
