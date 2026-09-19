import { useState } from 'react'
import { useMarketSnapshots } from '../hooks/useMarketSnapshots'
import { buildSparkPath } from '../utils/sparkPath'
import { fmtPricePrecise as fmtPrice } from '../utils/format'
import { useI18n } from '../i18n/useI18n'

interface PinnedPanelProps {
  symbols: string[]
  /** 当前主图品种：高亮对应行 */
  activeSymbol?: string
  onSelect: (symbol: string) => void
  onAdd: (symbol: string) => void
  onRemove: (symbol: string) => void
  onClose: () => void
}

/** 排序方式：价格（降序）/ 涨跌（降序） */
type PinnedSort = 'price' | 'change'

/** I4 自选价格实时面板：钉选品种最新价 + 24h 涨跌 + 日线迷你图；可排序、当前品种高亮 */
export function PinnedPanel({ symbols, activeSymbol, onSelect, onAdd, onRemove, onClose }: PinnedPanelProps) {
  const { t } = useI18n()
  const { snapshots } = useMarketSnapshots(symbols)
  const [newSym, setNewSym] = useState('')
  const [sortBy, setSortBy] = useState<PinnedSort>('price')
  const submitAdd = () => {
    onAdd(newSym)
    setNewSym('')
  }
  // 排序：价格降序（高价在前）/ 涨跌降序（涨幅榜在前）；无快照排末尾
  const sortedSymbols = [...symbols].sort((a, b) => {
    const sa = snapshots[a]
    const sb = snapshots[b]
    if (sortBy === 'change') {
      return (sb?.changePct ?? -Infinity) - (sa?.changePct ?? -Infinity)
    }
    return (sb?.price ?? -Infinity) - (sa?.price ?? -Infinity)
  })
  return (
    <div
      role="region"
      aria-label={t('pinned.title')}
      data-testid="pinned-panel"
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 100,
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        padding: '12px 14px',
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 260,
        maxWidth: 'min(320px, 92vw)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('pinned.title')}</span>
        <button
          data-testid="pinned-close"
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      <div data-testid="pinned-add" style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <input
          data-testid="pinned-add-input"
          value={newSym}
          onChange={(e) => setNewSym(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd()
          }}
          placeholder="BTCUSDT"
          aria-label={t('pinned.add')}
          style={{
            flex: 1,
            padding: '3px 6px',
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid #2a2e39',
            background: 'var(--bg)',
            color: 'var(--text)',
            minWidth: 60,
          }}
        />
        <button
          data-testid="pinned-add-btn"
          onClick={submitAdd}
          style={{ border: 'none', background: 'rgba(41,98,255,0.15)', color: 'var(--accent)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
        >
          {t('pinned.add')}
        </button>
      </div>
      {/* v0.5.x 排序切换：按价格 / 按涨跌（降序） */}
      {symbols.length > 1 && (
        <div data-testid="pinned-sort" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          <span>{t('pinned.sortBy')}</span>
          <button
            data-testid="pinned-sort-price"
            onClick={() => setSortBy('price')}
            aria-pressed={sortBy === 'price'}
            style={{
              border: 'none',
              background: sortBy === 'price' ? 'rgba(41,98,255,0.15)' : 'transparent',
              color: sortBy === 'price' ? 'var(--accent)' : 'var(--text-dim)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t('pinned.sortPrice')}
          </button>
          <button
            data-testid="pinned-sort-change"
            onClick={() => setSortBy('change')}
            aria-pressed={sortBy === 'change'}
            style={{
              border: 'none',
              background: sortBy === 'change' ? 'rgba(41,98,255,0.15)' : 'transparent',
              color: sortBy === 'change' ? 'var(--accent)' : 'var(--text-dim)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t('pinned.sortChange')}
          </button>
        </div>
      )}
      {symbols.length === 0 ? (
        <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('pinned.empty')}</div>
      ) : (
        <div data-testid="pinned-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {sortedSymbols.map((sym) => {
            const snap = snapshots[sym]
            const up = (snap?.changePct ?? 0) >= 0
            const d = snap ? buildSparkPath(snap.spark, 72, 24) : ''
            const active = sym === activeSymbol
            return (
              <div
                key={sym}
                data-testid={`pinned-row-${sym}`}
                data-active={active || undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  borderLeft: active ? '3px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'rgba(41,98,255,0.08)' : 'transparent',
                }}
              >
                <button
                  onClick={() => onSelect(sym)}
                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}
                >
                  {sym.replace('USDT', '/USDT')}
                </button>
                {d && (
                  <svg width={72} height={24} role="img" aria-label={sym}>
                    <path d={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth={1.5} />
                  </svg>
                )}
                <span style={{ color: snap ? (up ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', fontSize: 11, minWidth: 62, textAlign: 'right' }}>
                  {snap ? fmtPrice(snap.price) : '…'}
                </span>
                {/* v0.5.x 补齐 24h 涨跌幅显示 */}
                <span
                  data-testid={`pinned-change-${sym}`}
                  style={{
                    color: snap ? (up ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 11,
                    minWidth: 46,
                    textAlign: 'right',
                  }}
                >
                  {snap ? `${up ? '+' : ''}${snap.changePct.toFixed(2)}%` : '…'}
                </span>
                <button
                  data-testid={`pinned-remove-${sym}`}
                  onClick={() => onRemove(sym)}
                  aria-label={`${t('pinned.unpin')} ${sym}`}
                  style={{ border: 'none', background: 'none', color: 'var(--text-faint)', fontSize: 11, cursor: 'pointer', padding: '0 2px' }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}