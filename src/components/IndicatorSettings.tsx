import { useState } from 'react'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from '../indicators/params'
import type { MainIndicatorKind, SubIndicatorKind } from './ChartView'
import { useI18n } from '../i18n/useI18n'
import { usePersistedState } from '../hooks/usePersistedState'
import type { TFunction } from '../i18n/translate'

/** 参数预设：命名映射，持久化在 localStorage（B15 参数预设保存/切换） */
type ParamPresets = Record<string, IndicatorParams>
const PRESETS_KEY = 'indicatorPresets'

interface Field {
  key: keyof IndicatorParams
  label: string
  kind: 'number' | 'list' | 'boolean'
}

interface IndicatorSettingsProps {
  params: IndicatorParams
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  onChange: (p: IndicatorParams) => void
  onClose: () => void
}

function fieldsFor(main: MainIndicatorKind, sub: SubIndicatorKind, t: TFunction): Field[] {
  const fields: Field[] = []
  if (main === 'ma' || main === 'ema')
    fields.push({
      key: 'maPeriods',
      label: t('indicator.maPeriods', { name: main === 'ma' ? 'MA' : 'EMA' }),
      kind: 'list',
    })
  // 主图叠加：MA 之上同时显示 EMA（复合均线系统）
  if (main === 'ma') fields.push({ key: 'maOverlayEma', label: t('indicator.maOverlayEma'), kind: 'boolean' })
  if (main === 'boll') {
    fields.push({ key: 'bollPeriod', label: t('indicator.bollPeriod'), kind: 'number' })
    fields.push({ key: 'bollMult', label: t('indicator.bollMult'), kind: 'number' })
  }
  if (main === 'sar') {
    fields.push({ key: 'sarAfStart', label: t('indicator.sarAfStart'), kind: 'number' })
    fields.push({ key: 'sarAfStep', label: t('indicator.sarAfStep'), kind: 'number' })
    fields.push({ key: 'sarAfMax', label: t('indicator.sarAfMax'), kind: 'number' })
  }
  if (main === 'ichimoku') {
    fields.push({ key: 'ichimokuTenkan', label: t('indicator.ichimokuTenkan'), kind: 'number' })
    fields.push({ key: 'ichimokuKijun', label: t('indicator.ichimokuKijun'), kind: 'number' })
    fields.push({ key: 'ichimokuSpanB', label: t('indicator.ichimokuSpanB'), kind: 'number' })
    fields.push({ key: 'ichimokuDisplacement', label: t('indicator.ichimokuDisplacement'), kind: 'number' })
  }
  if (sub === 'macd') {
    fields.push({ key: 'macdFast', label: t('indicator.macdFast'), kind: 'number' })
    fields.push({ key: 'macdSlow', label: t('indicator.macdSlow'), kind: 'number' })
    fields.push({ key: 'macdSignal', label: t('indicator.macdSignal'), kind: 'number' })
  }
  if (sub === 'kdj') {
    fields.push({ key: 'kdjN', label: t('indicator.kdjN'), kind: 'number' })
    fields.push({ key: 'kdjM1', label: t('indicator.kdjM1'), kind: 'number' })
    fields.push({ key: 'kdjM2', label: t('indicator.kdjM2'), kind: 'number' })
  }
  if (sub === 'volume') fields.push({ key: 'volMaPeriod', label: t('indicator.volMaPeriod'), kind: 'number' })
  if (sub === 'rsi') fields.push({ key: 'rsiPeriod', label: t('indicator.rsiPeriod'), kind: 'number' })
  if (sub === 'wr') fields.push({ key: 'wrPeriod', label: t('indicator.wrPeriod'), kind: 'number' })
  if (sub === 'obv') fields.push({ key: 'obvMaPeriod', label: t('indicator.obvMaPeriod'), kind: 'number' })
  if (sub === 'atr') fields.push({ key: 'atrPeriod', label: t('indicator.atrPeriod'), kind: 'number' })
  if (sub === 'dmi') fields.push({ key: 'dmiPeriod', label: t('indicator.dmiPeriod'), kind: 'number' })
  if (sub === 'cci') fields.push({ key: 'cciPeriod', label: t('indicator.cciPeriod'), kind: 'number' })
  if (sub === 'psy') fields.push({ key: 'psyPeriod', label: t('indicator.psyPeriod'), kind: 'number' })
  if (sub === 'stoch') {
    fields.push({ key: 'stochK', label: t('indicator.stochK'), kind: 'number' })
    fields.push({ key: 'stochSmooth', label: t('indicator.stochSmooth'), kind: 'number' })
    fields.push({ key: 'stochD', label: t('indicator.stochD'), kind: 'number' })
  }
  if (main === 'supertrend') {
    fields.push({ key: 'stPeriod', label: t('indicator.stPeriod'), kind: 'number' })
    fields.push({ key: 'stMult', label: t('indicator.stMult'), kind: 'number' })
  }
  if (sub === 'bbw') {
    fields.push({ key: 'bbwPeriod', label: t('indicator.bbwPeriod'), kind: 'number' })
    fields.push({ key: 'bbwMult', label: t('indicator.bbwMult'), kind: 'number' })
  }
  if (sub === 'roc') fields.push({ key: 'rocPeriod', label: t('indicator.rocPeriod'), kind: 'number' })
  if (sub === 'mom') fields.push({ key: 'momPeriod', label: t('indicator.momPeriod'), kind: 'number' })
  if (sub === 'mfi') fields.push({ key: 'mfiPeriod', label: t('indicator.mfiPeriod'), kind: 'number' })
  if (sub === 'trix') fields.push({ key: 'trixPeriod', label: t('indicator.trixPeriod'), kind: 'number' })
  if (sub === 'dpo') fields.push({ key: 'dpoPeriod', label: t('indicator.dpoPeriod'), kind: 'number' })
  if (sub === 'ao') {
    fields.push({ key: 'aoFast', label: t('indicator.aoFast'), kind: 'number' })
    fields.push({ key: 'aoSlow', label: t('indicator.aoSlow'), kind: 'number' })
  }
  if (sub === 'cmf') fields.push({ key: 'cmfPeriod', label: t('indicator.cmfPeriod'), kind: 'number' })
  if (sub === 'donchian') fields.push({ key: 'donchianPeriod', label: t('indicator.donchianPeriod'), kind: 'number' })
  if (sub === 'aroon') fields.push({ key: 'aroonPeriod', label: t('indicator.aroonPeriod'), kind: 'number' })
  return fields
}

const inputStyle: React.CSSProperties = {
  width: 64,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

export function IndicatorSettings({
  params,
  mainIndicator,
  subIndicator,
  onChange,
  onClose,
}: IndicatorSettingsProps) {
  const { t } = useI18n()
  const fields = fieldsFor(mainIndicator, subIndicator, t)
  const [draft, setDraft] = useState(() => ({ ...params }))
  // B15：参数预设（命名保存 + 一键加载）
  const [presets, setPresets] = usePersistedState<ParamPresets>(PRESETS_KEY, {})
  const [presetName, setPresetName] = useState('')
  const [presetSaved, setPresetSaved] = useState(false)

  const apply = (patch: Partial<IndicatorParams>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    onChange(next)
  }

  const savePreset = () => {
    const name = presetName.trim()
    if (!name) return
    setPresets((prev) => ({ ...prev, [name]: { ...draft } }))
    setPresetName('')
    setPresetSaved(true)
    window.setTimeout(() => setPresetSaved(false), 1200)
  }

  const loadPreset = (name: string) => {
    const p = presets[name]
    if (!p) return
    setDraft({ ...p })
    onChange({ ...p })
  }

  const presetNames = Object.keys(presets)

  return (
    <div
      role="region"
      aria-label={t('indicator.settings')}
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
        minWidth: 230,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('indicator.settings')}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
        >
          ✕
        </button>
      </div>
      {fields.length === 0 && <div style={{ color: 'var(--text-faint)' }}>{t('indicator.noParams')}</div>}
      {fields.map((f) => (
        <div key={String(f.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-dim)' }}>{f.label}</span>
          {f.kind === 'list' ? (
            <input
              style={{ ...inputStyle, width: 110 }}
              value={draft.maPeriods.join(',')}
              onChange={(e) =>
                apply({
                  maPeriods: e.target.value
                    .split(',')
                    .map((s) => Number(s.trim()))
                    .filter((n) => Number.isFinite(n) && n > 0),
                })
              }
            />
          ) : f.kind === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(draft[f.key] as boolean)}
              onChange={(e) => apply({ [f.key]: e.target.checked } as Partial<IndicatorParams>)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          ) : (
            <input
              style={inputStyle}
              type="number"
              value={draft[f.key] as number}
              onChange={(e) => apply({ [f.key]: Number(e.target.value) } as Partial<IndicatorParams>)}
            />
          )}
        </div>
      ))}
      <div style={{ marginTop: 12, borderTop: '1px solid #2a2e39', paddingTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <select
            aria-label={t('indicator.preset')}
            value=""
            onChange={(e) => {
              if (e.target.value) loadPreset(e.target.value)
            }}
            style={{ ...inputStyle, width: 'auto', flex: 1, cursor: 'pointer' }}
          >
            <option value="">{t('indicator.presetPlaceholder')}</option>
            {presetNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            onClick={savePreset}
            title={t('indicator.presetSave')}
            style={{
              background: 'none',
              border: '1px solid #2a2e39',
              color: presetSaved ? 'var(--up, #26a69a)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 12,
              borderRadius: 4,
              padding: '4px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {presetSaved ? t('indicator.presetSaved') : t('indicator.presetSave')}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            aria-label={t('indicator.presetName')}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') savePreset()
            }}
            placeholder={t('indicator.presetName')}
            style={{ ...inputStyle, flex: 1, width: 'auto' }}
          />
          <button
            onClick={() => {
              const next = { ...DEFAULT_INDICATOR_PARAMS }
              setDraft(next)
              onChange(next)
            }}
            style={{
              background: 'none',
              border: '1px solid #2a2e39',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 12,
              borderRadius: 4,
              padding: '4px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {t('indicator.reset')}
          </button>
        </div>
      </div>
    </div>
  )
}
