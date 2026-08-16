import { useEffect, useRef, useState } from 'react'
import { useMarketSnapshots } from '../hooks/useMarketSnapshots'
import { POPULAR_SYMBOLS, useFilteredSymbols } from '../hooks/useSymbolList'
import { useI18n } from '../i18n'

const UP = 'var(--up)'
const DOWN = 'var(--down)'

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)
}

/** 迷你图 SVG path（纯函数，可单测）：归一化到 w×h 画布 */
export function buildSparkPath(points: number[], w: number, h: number): string {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p < min) min = p
    if (p > max) max = p
  }
  const range = max - min || 1
  const step = w / (points.length - 1)
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - 1 - ((p - min) / range) * (h - 2)).toFixed(1)}`)
    .join(' ')
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span style={{ color: 'var(--text-faint)' }}>…</span>
  const w = 76
  const h = 22
  const color = points[points.length - 1] >= points[0] ? UP : DOWN
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <path d={buildSparkPath(points, w, h)} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

interface SymbolPickerProps {
  value: string
  onChange: (s: string) => void
}

export function SymbolPicker({ value, onChange }: SymbolPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { snapshots } = useMarketSnapshots(POPULAR_SYMBOLS)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // 打开时聚焦搜索框
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useFilteredSymbols(query)

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '5px 10px',
          fontSize: 13,
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: 'var(--text)',
          cursor: 'pointer',
          minWidth: 96,
        }}
      >
        {value.replace('USDT', '/USDT')} ▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
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
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {query === '' && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 6px' }}>{t('symbol.popular')}</div>
            )}
            {query === '' &&
              POPULAR_SYMBOLS.map((s) => {
                const snap = snapshots[s]
                const changeColor = snap && snap.changePct >= 0 ? UP : DOWN
                return (
                  <div
                    key={s}
                    onClick={() => {
                      onChange(s)
                      setOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: s === value ? 'rgba(41,98,255,0.15)' : 'transparent',
                    }}
                  >
                    <span style={{ width: 74, fontWeight: 600, fontSize: 13 }}>{s.replace('USDT', '/USDT')}</span>
                    <span style={{ width: 64, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {snap ? fmtPrice(snap.price) : '—'}
                    </span>
                    <span style={{ width: 56, textAlign: 'right', fontSize: 12, color: changeColor }}>
                      {snap ? `${snap.changePct.toFixed(2)}%` : '—'}
                    </span>
                    {snap ? <Sparkline points={snap.spark} /> : <span style={{ width: 76 }} />}
                  </div>
                )
              })}
            {query !== '' && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 6px' }}>
                {t('symbol.searchResults', { count: filtered.length })}
              </div>
            )}
            {query !== '' &&
              filtered.map((s) => (
                <div
                  key={s}
                  onClick={() => {
                    onChange(s)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    background: s === value ? 'rgba(41,98,255,0.15)' : 'transparent',
                  }}
                >
                  {s.replace('USDT', '/USDT')}
                </div>
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
