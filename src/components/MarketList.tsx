import { useI18n } from '../i18n'
import { useTickerList, type TickerSortKey } from '../hooks/useTickerList'
import type { TickerRow } from '../data/binance/rest'

/** 价格格式化：≥1000 两位小数、≥1 四位、否则六位（与行情信息条一致） */
export function fmtPrice(v: number): string {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
}

/** 成交额缩写：B/M 单位 */
export function fmtVolume(v: number): string {
  return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toFixed(0)
}

const COLS: { key: TickerSortKey; labelKey: 'pair' | 'lastPrice' | 'change24h'; align: 'left' | 'right' }[] = [
  { key: 'symbol', labelKey: 'pair', align: 'left' },
  { key: 'price', labelKey: 'lastPrice', align: 'right' },
  { key: 'changePct', labelKey: 'change24h', align: 'right' },
]

function Row({
  row,
  active,
  onSelect,
}: {
  row: TickerRow
  active: boolean
  onSelect: (s: string) => void
}) {
  const up = row.changePct >= 0
  return (
    <button
      data-testid={`market-row-${row.symbol}`}
      onClick={() => onSelect(row.symbol)}
      title={`${row.symbol} ${fmtPrice(row.price)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: 4,
        padding: '5px 8px',
        border: 'none',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        background: active ? 'rgba(41,98,255,0.12)' : 'transparent',
        cursor: 'pointer',
        color: 'var(--text)',
        fontFamily: 'inherit',
        fontSize: 12,
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ flex: '0 0 84px', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.symbol.replace('USDT', '')}
      </span>
      <span style={{ flex: '0 0 76px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fmtPrice(row.price)}
      </span>
      <span style={{ flex: '0 0 56px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: up ? 'var(--up)' : 'var(--down)' }}>
        {up ? '+' : ''}
        {row.changePct.toFixed(2)}%
      </span>
    </button>
  )
}

interface MarketListProps {
  symbol: string
  onSelectSymbol: (s: string) => void
  open: boolean
  onToggle: () => void
  /** 移动端全屏浮层模式 */
  overlay?: boolean
}

/**
 * 行情列表侧栏（对标 OKX/币安）：实时最新价 + 24h 涨跌 + 可排序 + 点击切换主图交易对。
 * 桌面为可折叠左栏；移动端以全屏浮层展示。失败优雅降级（显示空态/保留旧数据）。
 */
export function MarketList({ symbol, onSelectSymbol, open, onToggle, overlay }: MarketListProps) {
  const { t } = useI18n()
  const { rows, loading, error, sortKey, sortDir, setSortKey, refresh } = useTickerList()

  // 折叠态：桌面窄条（仅按钮），点击展开
  if (!open && !overlay) {
    return (
      <div
        data-testid="market-list-rail"
        style={{
          flex: '0 0 30px',
          borderRight: '1px solid var(--border)',
          background: 'var(--panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          data-testid="market-list-expand"
          onClick={onToggle}
          title={t('marketList.expand')}
          aria-label={t('marketList.expand')}
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '8px 2px',
            letterSpacing: 2,
          }}
        >
          {t('marketList.title')}
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="market-list"
      style={{
        flex: overlay ? '1 1 auto' : '0 0 264px',
        width: overlay ? '100%' : 264,
        minWidth: 0,
        borderRight: overlay ? 'none' : '1px solid var(--border)',
        background: 'var(--panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{t('marketList.title')}</span>
        <button
          data-testid="market-refresh"
          onClick={refresh}
          title={t('marketList.refresh')}
          aria-label={t('marketList.refresh')}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ⟳
        </button>
        <button
          data-testid="market-list-collapse"
          onClick={onToggle}
          title={overlay ? t('common.close') : t('marketList.collapse')}
          aria-label={overlay ? t('common.close') : t('marketList.collapse')}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          {overlay ? '✕' : '‹'}
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px 8px 2px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {COLS.map((col) => {
          const activeCol = sortKey === col.key
          return (
            <button
              key={col.key}
              data-testid={`market-sort-${col.key}`}
              onClick={() => setSortKey(col.key)}
              title={t('marketList.sortTitle')}
              style={{
                flex: col.key === 'symbol' ? '0 0 84px' : '0 0 76px',
                ...(col.key === 'changePct' ? { flex: '0 0 56px' } : {}),
                border: 'none',
                background: 'transparent',
                color: activeCol ? 'var(--accent)' : 'var(--text-faint)',
                fontSize: 11,
                cursor: 'pointer',
                padding: 0,
                textAlign: col.align === 'right' ? 'right' : 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t(`marketList.${col.labelKey}`)}
              {activeCol ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          )
        })}
      </div>
      <div
        data-testid="market-list-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading && rows.length === 0 ? (
          <div style={{ padding: '16px 8px', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
            {t('marketList.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '16px 8px', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
            {error ? t('marketList.empty') : t('marketList.loading')}
          </div>
        ) : (
          rows.map((row) => (
            <Row key={row.symbol} row={row} active={row.symbol === symbol} onSelect={onSelectSymbol} />
          ))
        )}
        {rows.length > 0 && error && (
          <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--yellow)', textAlign: 'center' }}>
            {t('marketList.stale')}
          </div>
        )}
      </div>
    </div>
  )
}
