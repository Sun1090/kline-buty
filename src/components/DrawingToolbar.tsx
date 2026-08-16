import type { DrawingTool } from '../drawings/logic'

interface DrawingToolbarProps {
  tool: DrawingTool
  onChange: (t: DrawingTool) => void
  selected: boolean
  selectedText?: string
  onDeleteSelected: () => void
  onEditSelectedText?: () => void
}

const TOOLS: { value: DrawingTool; label: string }[] = [
  { value: 'none', label: '鼠标' },
  { value: 'horizontal', label: '水平线' },
  { value: 'trend', label: '趋势线' },
  { value: 'channel', label: '平行通道' },
  { value: 'fib', label: '斐波那契' },
  { value: 'text', label: '文本' },
]

export function DrawingToolbar({
  tool,
  onChange,
  selected,
  onDeleteSelected,
  onEditSelectedText,
}: DrawingToolbarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>画线</span>
      {TOOLS.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          title={t.label}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: t.value === tool ? 'var(--accent)' : 'transparent',
            color: t.value === tool ? '#fff' : 'var(--text-dim)',
          }}
        >
          {t.label}
        </button>
      ))}
      {selected && (
        <>
          {onEditSelectedText && (
            <button
              onClick={onEditSelectedText}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'rgba(41,98,255,0.15)',
                color: 'var(--accent)',
              }}
            >
              改字
            </button>
          )}
          <button
            onClick={onDeleteSelected}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'rgba(239,83,80,0.15)',
              color: 'var(--down)',
            }}
          >
            删除
          </button>
        </>
      )}
    </div>
  )
}
