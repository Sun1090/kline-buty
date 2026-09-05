import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelState } from './PanelState'
import { useI18n } from '../i18n/useI18n'
import { topRank, useTickerList, type TickerSortKey } from '../hooks/useTickerList'
import { useFavorites } from '../hooks/useFavorites'
import type { TickerRow } from '../data/binance/rest'

/** 价格格式化：≥1000 两位小数、≥1 四位、否则六位（与行情信息条一致） */
function fmtPrice(v: number): string {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
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
  rank,
}: {
  row: TickerRow
  active: boolean
  onSelect: (s: string) => void
  /** G4 榜单序号（非榜单视图不显示） */
  rank?: number
}) {
  const up = row.changePct >= 0
  return (
    <button
      data-testid={`market-row-${row.symbol}`}
      onClick={() => onSelect(row.symbol)}
      title={`${row.symbol} ${fmtPrice(row.price)}`}
      aria-label={`${row.symbol} ${fmtPrice(row.price)}`}
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
      {rank !== undefined && (
        <span
          style={{
            flex: '0 0 18px',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: rank <= 3 ? 'var(--yellow)' : 'var(--text-faint)',
          }}
        >
          {rank}
        </span>
      )}
      <span style={{ flex: '0 0 84px', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.symbol.replace('USDT', '')}
      </span>
      <span style={{ flex: '0 0 76px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: up ? 'var(--up)' : 'var(--down)' }}>
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
  const { favorites } = useFavorites()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'all' | 'favorites' | 'rank'>('all')
  // G4 榜单口径：涨幅榜（changePct）/ 成交榜（quoteVolume）
  const [rankKey, setRankKey] = useState<'changePct' | 'quoteVolume'>('changePct')
  // 视图过滤（自选/全部）与搜索过滤串联：先视图后搜索，排序由 hook 内排序函数处理
  const scoped = useMemo(
    () => (view === 'favorites' ? rows.filter((r) => favorites.includes(r.symbol)) : rows),
    [rows, view, favorites],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((r) => r.symbol.toLowerCase().includes(q))
  }, [scoped, query])
  // G4 榜单：按口径取 Top10（仅 rank 视图使用）
  const ranked = useMemo(() => topRank(rows, rankKey, 10), [rows, rankKey])
  // G14 自动轮播：每 5s 在可见列表（当前视图）中循环切换品种
  const [rotating, setRotating] = useState(false)
  const rotIdxRef = useRef(0)
  const rotListRef = useRef<string[]>([])
  const rotSymbolRef = useRef(symbol)
  rotSymbolRef.current = symbol
  const rotList = useMemo(
    () => (view === 'rank' ? ranked.map((r) => r.symbol) : filtered.map((r) => r.symbol)),
    [view, ranked, filtered],
  )
  rotListRef.current = rotList
  useEffect(() => {
    if (!rotating || rotList.length === 0) return
    const id = setInterval(() => {
      const list = rotListRef.current
      if (list.length === 0) return
      // 从当前品种出发推进，找不到则从头部开始
      const curIdx = list.indexOf(rotSymbolRef.current)
      const nextIdx = (curIdx < 0 ? rotIdxRef.current : curIdx + 1) % list.length
      rotIdxRef.current = nextIdx
      onSelectSymbol(list[nextIdx])
    }, 5000)
    return () => clearInterval(id)
  }, [rotating, rotList.length, onSelectSymbol])

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
      role="region"
      aria-label={t('marketList.title')}
      tabIndex={0}
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
        {overlay && (
          <button
            data-testid="market-rotate"
            onClick={() => setRotating((v) => !v)}
            aria-pressed={rotating}
            title={t('marketList.rotateTitle')}
            aria-label={t('marketList.rotate')}
            style={{
              border: 'none',
              background: 'transparent',
              color: rotating ? 'var(--up)' : 'var(--text-dim)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '2px 4px',
              lineHeight: 1,
            }}
          >
            {rotating ? '⏸' : '▶'}
          </button>
        )}
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
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          data-testid="market-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('')
          }}
          placeholder={t('marketList.searchPlaceholder')}
          aria-label={t('marketList.searchPlaceholder')}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '4px 8px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '4px 8px', flexShrink: 0 }}>
        {(
          [
            ['all', 'marketList.tabAll', 'market-tab-all'],
            ['favorites', 'marketList.tabFavorites', 'market-tab-favorites'],
            ['rank', 'marketList.tabRank', 'market-tab-rank'],
          ] as const
        ).map(([key, labelKey, testId]) => (
          <button
            key={key}
            data-testid={testId}
            onClick={() => setView(key)}
            aria-pressed={view === key}
            style={{
              border: 'none',
              background: view === key ? 'rgba(41,98,255,0.15)' : 'transparent',
              color: view === key ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {t(labelKey)}
            {key === 'favorites' && favorites.length > 0 ? ` ${favorites.length}` : ''}
          </button>
        ))}
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
              aria-label={`${t('marketList.sortTitle')}: ${t(`marketList.${col.labelKey}` as never)}`}
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
      {/* G4 榜单口径切换：仅榜单视图显示（涨幅榜 / 成交榜 Top10） */}
      {view === 'rank' && (
        <div style={{ display: 'flex', gap: 4, padding: '0 8px 4px', flexShrink: 0 }}>
          {(
            [
              ['changePct', 'marketList.rankChange', 'market-rank-change'],
              ['quoteVolume', 'marketList.rankVolume', 'market-rank-volume'],
            ] as const
          ).map(([key, labelKey, testId]) => (
            <button
              key={key}
              data-testid={testId}
              onClick={() => setRankKey(key)}
              aria-pressed={rankKey === key}
              style={{
                border: 'none',
                background: rankKey === key ? 'rgba(41,98,255,0.15)' : 'transparent',
                color: rankKey === key ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '1px 8px',
                borderRadius: 8,
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
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
          <PanelState status="loading" message={t('marketList.loading')} skeleton />
        ) : rows.length === 0 ? (
          error ? (
            <PanelState status="error" message={t('marketList.empty')} onRetry={refresh} />
          ) : (
            <PanelState status="loading" message={t('marketList.loading')} skeleton />
          )
        ) : view === 'favorites' && scoped.length === 0 ? (
          <PanelState status="empty" message={t('marketList.favoritesEmpty')} />
        ) : view === 'rank' ? (
          ranked.map((row, i) => (
            <Row key={row.symbol} row={row} active={row.symbol === symbol} onSelect={onSelectSymbol} rank={i + 1} />
          ))
        ) : filtered.length === 0 ? (
          <PanelState status="empty" message={t('marketList.noMatch')} />
        ) : (
          filtered.map((row) => (
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
