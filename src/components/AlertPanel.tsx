import { useMemo, useState } from 'react'
import type { AlertsApi, AlertSoundKind } from '../hooks/usePriceAlerts'
import { playAlertBeep } from '../hooks/usePriceAlerts'
import { useI18n } from '../i18n/useI18n'

interface AlertPanelProps {
  symbol: string
  currentPrice: number | null
  alertsApi: AlertsApi
}

const inputStyle: React.CSSProperties = {
  width: 80,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

export function AlertPanel({ symbol, currentPrice, alertsApi }: AlertPanelProps) {
  const { t } = useI18n()
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [price, setPrice] = useState('')
  const [repeat, setRepeat] = useState(false)
  /** K10 重复间隔（分钟）：repeat 开启时生效，0=不限 */
  const [repeatInterval, setRepeatInterval] = useState('0')
  /** K2 提醒分组（空=未分组） */
  const [group, setGroup] = useState('')
  /** K13 排序：price=按价格 / time=按创建时间 / symbol=按品种 */
  const [sortKey, setSortKey] = useState<'price' | 'time' | 'symbol'>('time')
  /** D9 时间窗口：空=全天；格式 HH:MM（本地时区） */
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const { alerts, permission, addAlert, removeAlert, resetAlert, requestPermission, soundEnabled, setSoundEnabled, soundKind, setSoundKind, history, clearHistory } = alertsApi

  /** HH:MM → 分钟自 0:00；非法返回 null */
  const parseHm = (v: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
    if (!m) return null
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return null
    return h * 60 + min
  }
  const timeWindow =
    timeFrom.trim() === '' && timeTo.trim() === ''
      ? undefined
      : (() => {
          const s = parseHm(timeFrom)
          const e = parseHm(timeTo)
          // 仅起点或仅终点：另一端取 0 点，视为即时生效窗口
          const start = s ?? 0
          const end = e ?? (s !== null ? s : 1440)
          return s !== null || e !== null ? { start, end } : undefined
        })()

  const priceNum = Number(price)
  const valid = Number.isFinite(priceNum) && priceNum > 0
  const intervalNum = Number(repeatInterval)
  const intervalValid = Number.isFinite(intervalNum) && intervalNum >= 0

  // K13 排序：按价格 / 创建时间 / 品种
  const symbolAlerts = [...alerts.filter((a) => a.symbol === symbol)].sort((x, y) => {
    if (sortKey === 'price') return x.price - y.price
    if (sortKey === 'symbol') return x.symbol.localeCompare(y.symbol)
    // time：按 id 时间戳（id 前缀为 Date.now()）降序 → 新在前
    return Number(y.id.split('-')[0]) - Number(x.id.split('-')[0])
  })
  // K2 分组：按 group 分组渲染（未分组排最后）
  const groupedAlerts = useMemo(() => {
    const map = new Map<string, typeof symbolAlerts>()
    for (const a of symbolAlerts) {
      const g = a.group ?? ''
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(a)
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === '') return 1
      if (b[0] === '') return -1
      return a[0].localeCompare(b[0])
    })
  }, [symbolAlerts])

  return (
    <div
      role="region"
      aria-label={t('alert.title', { symbol: symbol.replace('USDT', '/USDT') })}
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
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('alert.title', { symbol: symbol.replace('USDT', '/USDT') })}</span>
        <button
          data-testid="alert-sound-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
          aria-pressed={soundEnabled}
          title={t('alert.sound')}
          aria-label={t('alert.sound')}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            marginLeft: 6,
            color: soundEnabled ? 'var(--up)' : 'var(--text-faint)',
          }}
        >
          {soundEnabled ? '🔔' : '🔕'}
        </button>
        {soundEnabled && (
          <>
          <select
            data-testid="alert-sound-kind"
            value={soundKind}
            onChange={(e) => setSoundKind(e.target.value as typeof soundKind)}
            aria-label={t('alert.soundKind')}
            title={t('alert.soundKind')}
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid #2a2e39',
              borderRadius: 4,
              fontSize: 11,
              padding: '2px 4px',
              marginLeft: 6,
            }}
          >
            {(['beep', 'chime', 'ping', 'low'] as const).map((k) => (
              <option key={k} value={k}>
                {t(`alert.sound${k[0].toUpperCase()}${k.slice(1)}` as never)}
              </option>
            ))}
          </select>
          <button
            data-testid="alert-sound-preview"
            onClick={() => playAlertBeep(soundKind as AlertSoundKind)}
            title={t('alert.soundPreview')}
            aria-label={t('alert.soundPreview')}
            style={{ background: 'none', border: 'none', color: '#4e9cf5', cursor: 'pointer', fontSize: 12, marginLeft: 4 }}
          >
            {t('alert.soundPreview')}
          </button>
          </>
        )}
        {permission === 'granted' ? (
          <span style={{ color: 'var(--up)', fontSize: 11 }}>{t('alert.granted')}</span>
        ) : permission === 'unsupported' ? (
          <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('alert.unsupported')}</span>
        ) : (
          <button
            onClick={() => void requestPermission()}
            style={{ background: 'none', border: '1px solid #2a2e39', borderRadius: 4, color: '#4e9cf5', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}
          >
            {t('alert.enable')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {(['above', 'below'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: d === direction ? 'var(--accent)' : 'transparent',
              color: d === direction ? '#fff' : 'var(--text-dim)',
            }}
          >
            {d === 'above' ? t('alert.above') : t('alert.below')}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input
          style={inputStyle}
          placeholder={currentPrice ? String(currentPrice.toFixed(2)) : t('common.price')}
          value={price}
          aria-invalid={!valid && price !== ''}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          onClick={() => {
            if (valid && intervalValid) {
              addAlert(symbol, direction, priceNum, repeat, timeWindow, repeat ? intervalNum || undefined : undefined, group.trim() || undefined)
              setPrice('')
              setRepeat(false)
              setRepeatInterval('0')
              setGroup('')
              setTimeFrom('')
              setTimeTo('')
            }
          }}
          disabled={!valid || !intervalValid}
          style={{
            flex: 1,
            padding: '4px 0',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: valid ? 'pointer' : 'not-allowed',
            background: valid ? 'var(--accent)' : 'var(--border)',
            color: valid ? '#fff' : 'var(--text-faint)',
          }}
        >
          {t('alert.add')}
        </button>
      </div>
      <label
        data-testid="alert-repeat-toggle"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, cursor: 'pointer' }}
      >
        <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
        {t('alert.repeat')}
      </label>
      {/* K10 重复间隔（分钟）：repeat 开启时显示，0=不限 */}
      {repeat && (
        <div data-testid="alert-repeat-interval" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
          <span>{t('alert.repeatInterval')}</span>
          <input
            data-testid="alert-repeat-interval-input"
            type="number"
            min={0}
            value={repeatInterval}
            onChange={(e) => setRepeatInterval(e.target.value)}
            style={{ ...inputStyle, width: 56 }}
          />
          <span>{t('alert.minutes')}</span>
        </div>
      )}
      {/* K2 提醒分组：可选命名分组 */}
      <div data-testid="alert-group-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.group')}</span>
        <input
          data-testid="alert-group-input"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder={t('alert.groupPlaceholder')}
          style={{ ...inputStyle, width: 110 }}
        />
      </div>
      {/* K13 排序：价格 / 时间 / 品种 */}
      <div data-testid="alert-sort" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.sort')}</span>
        {(['time', 'price', 'symbol'] as const).map((k) => (
          <button
            key={k}
            data-testid={`alert-sort-${k}`}
            onClick={() => setSortKey(k)}
            aria-pressed={sortKey === k}
            style={{
              padding: '2px 6px',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: sortKey === k ? 'rgba(41,98,255,0.18)' : 'transparent',
              color: sortKey === k ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {t(`alert.sort${k[0].toUpperCase()}${k.slice(1)}` as never)}
          </button>
        ))}
      </div>
      {/* D9 时间窗口：HH:MM–HH:MM（本地时区），留空=全天 */}
      <div data-testid="alert-time-window" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.timeWindow')}</span>
        <input
          data-testid="alert-time-from"
          type="time"
          value={timeFrom}
          onChange={(e) => setTimeFrom(e.target.value)}
          aria-label={`${t('alert.timeWindow')} ${t('alert.timeFrom')}`}
          style={{ ...inputStyle, width: 84, fontSize: 11 }}
        />
        <span>–</span>
        <input
          data-testid="alert-time-to"
          type="time"
          value={timeTo}
          onChange={(e) => setTimeTo(e.target.value)}
          aria-label={`${t('alert.timeWindow')} ${t('alert.timeTo')}`}
          style={{ ...inputStyle, width: 84, fontSize: 11 }}
        />
      </div>
      {price !== '' && !valid && (
        <div style={{ color: 'var(--down)', fontSize: 11, marginBottom: 8 }} role="alert">
          {t('alert.invalid')}
        </div>
      )}

      {symbolAlerts.length === 0 ? (
        <div style={{ color: 'var(--text-faint)' }}>{t('alert.none')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {groupedAlerts.map(([g, items]) => (
            <div key={g || '__ungrouped__'}>
              {/* K2 分组头 */}
              {g !== '' && (
                <div data-testid={`alert-group-${g}`} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, margin: '2px 0' }}>
                  {g}
                </div>
              )}
              {items.map((a) => (
                <div
                  key={a.id}
                  data-testid="alert-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 6,
                    marginBottom: 4,
                    background: a.triggered ? 'rgba(245,192,47,0.08)' : 'transparent',
                    border: '1px solid #2a2e39',
                  }}
                >
                  <span style={{ color: a.triggered ? 'var(--yellow)' : 'var(--text)' }}>
                    {a.direction === 'above' ? '≥' : '≤'} {a.price.toFixed(2)}
                    {a.repeat && <span style={{ color: 'var(--accent)', fontSize: 10 }}> ↻</span>}
                    {a.repeatInterval ? <span style={{ color: 'var(--text-faint)', fontSize: 10 }}> {a.repeatInterval}′</span> : null}
                    {a.triggered && ` · ${t('alert.triggered')}`}
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {a.triggered && (
                      <button onClick={() => resetAlert(a.id)} style={{ background: 'none', border: 'none', color: '#4e9cf5', cursor: 'pointer', fontSize: 11 }}>
                        {t('alert.reset')}
                      </button>
                    )}
                    <button onClick={() => removeAlert(a.id)} style={{ background: 'none', border: 'none', color: 'var(--down)', cursor: 'pointer', fontSize: 11 }}>
                      {t('common.delete')}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid #2a2e39', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
              {t('alert.history')}（{history.length}）
            </span>
            <button
              onClick={clearHistory}
              style={{ background: 'none', border: 'none', color: 'var(--down)', cursor: 'pointer', fontSize: 11 }}
            >
              {t('alert.clearHistory')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            {history.map((h, i) => (
              <div key={`${h.alertId}-${h.at}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: 11 }}>
                <span>
                  {h.symbol.replace('USDT', '/USDT')} {h.direction === 'above' ? '≥' : '≤'} {h.price.toFixed(2)} → {h.triggeredPrice.toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>
                  {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
