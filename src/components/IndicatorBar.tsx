interface IndicatorBarProps {
  group: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}

export function IndicatorBar({ group, options, value, onChange }: IndicatorBarProps) {
  return (
    <div className="scroll-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>{group}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: o.value === value ? 'var(--accent)' : 'transparent',
            color: o.value === value ? '#fff' : 'var(--text-dim)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
