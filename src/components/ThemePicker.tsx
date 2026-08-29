import { COLOR_PRESETS, type ColorPresetId } from '../theme'
import { useI18n } from '../i18n/useI18n'

interface ThemePickerProps {
  value: ColorPresetId
  onChange: (id: ColorPresetId) => void
}

/** 主题色预设选择器：4 枚色点（accent/涨/跌 三色渐变），点击即生效 */
export function ThemePicker({ value, onChange }: ThemePickerProps) {
  const { t } = useI18n()
  return (
    <span
      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      title={t('theme.pickTitle')}
      role="group"
      aria-label={t('theme.pickTitle')}
    >
      {COLOR_PRESETS.map((p) => {
        const active = p.id === value
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            title={t(p.labelKey)}
            aria-label={t(p.labelKey)}
            aria-pressed={active}
            data-preset={p.id}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              padding: 0,
              border: active ? '2px solid var(--text)' : '1px solid var(--border)',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${p.accent} 0 34%, ${p.up} 34% 67%, ${p.down} 67% 100%)`,
            }}
          />
        )
      })}
    </span>
  )
}
