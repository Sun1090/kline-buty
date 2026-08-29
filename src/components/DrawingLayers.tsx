import type { CSSProperties, ReactNode } from 'react'
import type { Drawing } from '../drawings/logic'
import { useI18n } from '../i18n/useI18n'
import { DRAWING_TOOLS, optionLabel } from './headerOptions'

interface DrawingLayersProps {
  /** 当前交易对全部画线（含隐藏/锁定） */
  drawings: Drawing[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleHidden: (id: string) => void
  onToggleLocked: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  /** 返回画线工具选择视图 */
  onBack: () => void
}

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  padding: 0,
  fontSize: 13,
  lineHeight: 1,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  flex: '0 0 auto',
}

export function DrawingLayers({
  drawings,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onDelete,
  onClearAll,
  onBack,
}: DrawingLayersProps) {
  const { t } = useI18n()
  return (
    <div
      data-testid="drawing-layers"
      role="region"
      aria-label={t('layers.title')}
      style={{ minWidth: 260 }}
    >
      {/* 头部：返回 + 标题（含数量）+ 全部清除 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <button
          data-testid="drawing-layer-back"
          onClick={onBack}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-dim)',
          }}
        >
          ← {t('layers.back')}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {t('layers.title')}（{drawings.length}）
        </span>
        <div style={{ flex: 1 }} />
        {drawings.length > 0 && (
          <button
            data-testid="drawing-layer-clear"
            onClick={onClearAll}
            style={{
              flex: '0 0 auto',
              padding: '4px 8px',
              fontSize: 11,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'rgba(239,83,80,0.15)',
              color: 'var(--down)',
            }}
          >
            {t('layers.clearAll')}
          </button>
        )}
      </div>

      {/* 列表 / 空状态 */}
      {drawings.length === 0 ? (
        <div
          data-testid="drawing-layer-empty"
          style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}
        >
          {t('layers.empty')}
        </div>
      ) : (
        <div
          role="listbox"
          aria-label={t('layers.title')}
          style={{ maxHeight: 'min(40vh, 320px)', overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          {drawings.map((d) => {
            const opt = DRAWING_TOOLS.find((o) => o.value === d.type)
            const label = opt ? optionLabel(opt, t) : d.type
            const selected = d.id === selectedId
            return (
              <div
                key={d.id}
                data-testid="drawing-layer-row"
                role="option"
                aria-selected={selected}
                data-selected={selected}
                data-type={d.type}
                onClick={() => onSelect(d.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selected ? 'rgba(41,98,255,0.18)' : 'transparent',
                  border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: selected ? 'var(--accent)' : 'var(--text-dim)',
                  }}
                >
                  {label}
                </span>
                {rowBtn(
                  'drawing-layer-eye',
                  d.hidden ? t('layers.show') : t('layers.hide'),
                  !d.hidden,
                  (e) => {
                    e.stopPropagation()
                    onToggleHidden(d.id)
                  },
                  d.hidden ? '🚫' : '👁',
                  d.hidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                )}
                {rowBtn(
                  'drawing-layer-lock',
                  d.locked ? t('layers.unlock') : t('layers.lock'),
                  !!d.locked,
                  (e) => {
                    e.stopPropagation()
                    onToggleLocked(d.id)
                  },
                  d.locked ? '🔒' : '🔓',
                  d.locked ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.10)',
                )}
                {rowBtn(
                  'drawing-layer-delete',
                  t('common.delete'),
                  false,
                  (e) => {
                    e.stopPropagation()
                    onDelete(d.id)
                  },
                  '🗑',
                  'rgba(239,83,80,0.12)',
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** 行内图标按钮（眼睛/锁定/删除） */
function rowBtn(
  testId: string,
  title: string,
  active: boolean,
  onClick: (e: { stopPropagation(): void }) => void,
  children: ReactNode,
  bg: string,
) {
  return (
    <button
      data-testid={testId}
      data-active={active}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        ...btnBase,
        background: bg,
        color: active ? 'var(--accent)' : 'var(--text-faint)',
        opacity: active ? 1 : 0.65,
      }}
    >
      {children}
    </button>
  )
}
