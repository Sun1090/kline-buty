import { useI18n } from '../i18n/useI18n'
import { TEXT_COLOR_OPTIONS } from '../drawings/logic'

/** 新建画线默认颜色偏好色板（桌面/移动端画线面板共用；'' = 跟随主题） */
export function DrawingColorRow({
  value,
  onChange,
  testIdPrefix,
}: {
  value: string
  onChange: (c: string) => void
  testIdPrefix?: string
}) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('drawing.defaultColor')}</span>
      {TEXT_COLOR_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          data-testid={testIdPrefix ? `${testIdPrefix}-color-${opt.id}` : undefined}
          aria-label={`${t('drawing.defaultColor')} ${opt.id}`}
          aria-pressed={value === opt.color}
          onClick={() => onChange(opt.color)}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: value === opt.color ? '2px solid #fff' : '1px solid var(--border)',
            cursor: 'pointer',
            ...(opt.color
              ? { background: opt.color }
              : {
                  background: 'transparent',
                  border: value === opt.color ? '2px solid #fff' : '1px dashed var(--border)',
                  color: 'var(--text)',
                  fontSize: 11,
                  lineHeight: '16px',
                }),
          }}
        >
          {opt.color ? '' : 'A'}
        </button>
      ))}
    </div>
  )
}
