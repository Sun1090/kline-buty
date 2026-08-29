import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMarketSnapshots } from '../hooks/useMarketSnapshots'
import { POPULAR_SYMBOLS, useFilteredSymbols } from '../hooks/useSymbolList'
import { useFavorites } from '../hooks/useFavorites'
import { useI18n } from '../i18n/useI18n'
import { Sparkline } from './Sparkline'
import { fmtPriceMedium as fmtPrice } from '../utils/format'

const UP = 'var(--up)'
const DOWN = 'var(--down)'

interface SymbolPickerProps {
  value: string
  onChange: (s: string) => void
  /** 开合状态外报：让宿主（顶栏）把搜索下拉纳入 Esc 层进链路 */
  onOpenChange?: (open: boolean) => void
}

function StarButton({
  starred,
  onToggle,
  title,
}: {
  starred: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      title={title}
      aria-label={title}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        padding: '2px 4px',
        color: starred ? 'var(--yellow)' : 'var(--text-faint)',
        flexShrink: 0,
      }}
    >
      {starred ? '★' : '☆'}
    </button>
  )
}

interface RowProps {
  symbol: string
  snap?: { price: number; changePct: number; spark: number[] } | undefined
  selected: boolean
  starred: boolean
  onSelect: () => void
  onToggleStar: () => void
  starTitle: string
}

/** 交易对行：名称 + 价格 + 24h 涨跌 + 迷你图 + 收藏星标 */
function SymbolRow({ symbol, snap, selected, starred, onSelect, onToggleStar, starTitle }: RowProps) {
  const changeColor = snap && snap.changePct >= 0 ? UP : DOWN
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: selected ? 'rgba(41,98,255,0.15)' : 'transparent',
      }}
    >
      <span style={{ width: 74, fontWeight: 600, fontSize: 13 }}>{symbol.replace('USDT', '/USDT')}</span>
      <span style={{ width: 64, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        {snap ? fmtPrice(snap.price) : '—'}
      </span>
      <span style={{ width: 56, textAlign: 'right', fontSize: 12, color: changeColor }}>
        {snap ? `${snap.changePct.toFixed(2)}%` : '—'}
      </span>
      {snap ? <Sparkline points={snap.spark} /> : <span style={{ width: 76 }} />}
      <StarButton starred={starred} onToggle={onToggleStar} title={starTitle} />
    </div>
  )
}

export function SymbolPicker({ value, onChange, onOpenChange }: SymbolPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const updateOpen = useCallback(
    (v: boolean) => {
      setOpen(v)
      onOpenChange?.(v)
    },
    [onOpenChange],
  )
  const [query, setQuery] = useState('')
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { favorites, toggleFavorite } = useFavorites()
  const snapSymbols = useMemo(() => Array.from(new Set([...POPULAR_SYMBOLS, ...favorites])), [favorites])
  const { snapshots } = useMarketSnapshots(snapSymbols)
  const filtered = useFilteredSymbols(query)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) updateOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [updateOpen])

  // 键盘快捷键 Ctrl/Cmd+K 或 / → 打开搜索并聚焦（App 派发 window 事件）
  useEffect(() => {
    const onOpen = () => {
      // 下拉需同时具备 open + menuPos 才渲染，按按钮位置计算定位
      const r = rootRef.current?.getBoundingClientRect()
      if (r) {
        setMenuPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 328)), top: r.bottom + 6 })
      }
      updateOpen(true)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
    window.addEventListener('open-symbol-picker', onOpen)
    return () => window.removeEventListener('open-symbol-picker', onOpen)
  }, [updateOpen])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const select = (s: string) => {
    onChange(s)
    updateOpen(false)
  }

  /** 打开下拉：fixed 定位，按按钮位置动态取 left，保证 320px 面板不超出视口 */
  const toggleOpen = () => {
    if (open) {
      updateOpen(false)
      return
    }
    updateOpen(true)
    const r = rootRef.current?.getBoundingClientRect()
    if (r) {
      const left = Math.min(r.left, window.innerWidth - 328)
      setMenuPos({ left: Math.max(8, left), top: r.bottom + 6 })
    }
  }
  const favTitle = (s: string) => (favorites.includes(s) ? t('symbol.favoriteRemove') : t('symbol.favoriteAdd'))

  return (
    <div style={{ position: 'relative', flexShrink: 1, minWidth: 0 }} ref={rootRef}>
      <button
        onClick={toggleOpen}
        style={{
          padding: '3px 10px',
          fontSize: 12,
          border: '1px solid var(--border)',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value.replace('USDT', '/USDT')} ▾
      </button>
      {open && menuPos && (
        <div
          style={{
            position: 'fixed',
            left: menuPos.left,
            top: menuPos.top,
            zIndex: 100,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: 320,
          }}
        >
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                updateOpen(false)
              }
            }}
            placeholder={t('symbol.searchPlaceholder')}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              marginBottom: 6,
            }}
          />
          <div
            role="listbox"
            aria-label={t('symbol.popular')}
            style={{ maxHeight: 320, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          >
            {query === '' && favorites.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 6px' }}>{t('symbol.favorites')}</div>
                {favorites.map((s) => (
                  <SymbolRow
                    key={s}
                    symbol={s}
                    snap={snapshots[s]}
                    selected={s === value}
                    starred
                    onSelect={() => select(s)}
                    onToggleStar={() => toggleFavorite(s)}
                    starTitle={t('symbol.favoriteRemove')}
                  />
                ))}
              </>
            )}
            {query === '' && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 6px' }}>{t('symbol.popular')}</div>
            )}
            {query === '' &&
              POPULAR_SYMBOLS.map((s) => (
                <SymbolRow
                  key={s}
                  symbol={s}
                  snap={snapshots[s]}
                  selected={s === value}
                  starred={favorites.includes(s)}
                  onSelect={() => select(s)}
                  onToggleStar={() => toggleFavorite(s)}
                  starTitle={favTitle(s)}
                />
              ))}
            {query !== '' && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 6px' }}>
                {t('symbol.searchResults', { count: filtered.length })}
              </div>
            )}
            {query !== '' &&
              filtered.map((s) => (
                <SymbolRow
                  key={s}
                  symbol={s}
                  selected={s === value}
                  starred={favorites.includes(s)}
                  onSelect={() => select(s)}
                  onToggleStar={() => toggleFavorite(s)}
                  starTitle={favTitle(s)}
                />
              ))}
            {query !== '' && filtered.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 12, padding: '8px 6px' }}>{t('symbol.noMatch')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
