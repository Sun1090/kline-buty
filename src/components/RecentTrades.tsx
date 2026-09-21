import { useMemo, useState, type CSSProperties } from 'react'
import { useRecentTrades } from '../hooks/useRecentTrades'
import { TAPE_BIG_STEPS, TAPE_FILTER_DEFAULT, fmtTradeClock, filterTape, type TapeFilter } from '../data/trades'
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

const SIDES: TapeFilter['side'][] = ['all', 'buy', 'sell']

function chipStyle(active: boolean): CSSProperties {
  return {
    border: '1px solid #2a2e39',
    borderRadius: 4,
    background: active ? 'rgba(41,98,255,0.18)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-faint)',
    cursor: 'pointer',
    fontSize: 10,
    padding: '1px 6px',
  }
}

/**
 * 最新逐笔成交（成交明细 Tape）：5s 轮询累积，按主动买/主动卖着色，最新在顶部；
 * 支持方向筛选与「大单」阈值（数量 ≥ 窗口均值 × 倍数）过滤。
 */
export function RecentTrades({ symbol, onMarkPrice }: RecentTradesProps) {
  const { t } = useI18n()
  const trades = useRecentTrades(symbol)
  const [filter, setFilter] = useState<TapeFilter>(TAPE_FILTER_DEFAULT)
  const rows = useMemo(() => filterTape(trades, filter).slice(-MAX_ROWS).reverse(), [trades, filter])
  const buyCount = useMemo(() => trades.reduce((n, tr) => n + (tr.buy ? 1 : 0), 0), [trades])
  const sideLabel: Record<TapeFilter['side'], string> = {
    all: t('tape.filterAll'),
    buy: t('tape.filterBuy'),
    sell: t('tape.filterSell'),
  }

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
      {/* v0.5.x Tape 筛选：方向 + 大单阈值（倍数循环） */}
      <div data-testid="tape-filter" style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'center' }}>
        {SIDES.map((side) => (
          <button
            key={side}
            data-testid={`tape-filter-${side}`}
            onClick={() => setFilter((f) => ({ ...f, side }))}
            aria-pressed={filter.side === side}
            title={t('tape.filterSideHint')}
            style={chipStyle(filter.side === side)}
          >
            {sideLabel[side]}
          </button>
        ))}
        <button
          data-testid="tape-filter-big"
          onClick={() =>
            setFilter((f) => {
              const idx = TAPE_BIG_STEPS.indexOf(f.bigMultiple as (typeof TAPE_BIG_STEPS)[number])
              return { ...f, bigMultiple: TAPE_BIG_STEPS[(idx + 1) % TAPE_BIG_STEPS.length] }
            })
          }
          aria-pressed={filter.bigMultiple > 0}
          title={t('tape.bigOrderHint')}
          style={chipStyle(filter.bigMultiple > 0)}
        >
          {t('tape.bigOrder')}
          {filter.bigMultiple > 0 ? ` ×${filter.bigMultiple}` : ''}
        </button>
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
      ) : rows.length === 0 ? (
        <div data-testid="tape-empty-filter" style={{ fontSize: 11, color: 'var(--text-faint)', padding: '4px 8px' }}>
          {t('tape.emptyFilter')}
        </div>
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
