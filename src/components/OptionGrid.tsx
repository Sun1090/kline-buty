import type { HeaderOption } from './headerOptions'

/** 弹层内网格选项按钮（类型/主图/副图/画线） */
export function OptionGrid({
  options,
  value,
  onPick,
  label,
}: {
  options: HeaderOption[]
  value: string
  onPick: (v: string) => void
  label: (o: HeaderOption) => string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            style={{
              flex: '0 0 auto',
              minWidth: 72,
              padding: '7px 10px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : 'var(--text-dim)',
            }}
          >
            {label(o)}
          </button>
        )
      })}
    </div>
  )
}
