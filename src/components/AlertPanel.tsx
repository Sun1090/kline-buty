import { useMemo, useRef, useState } from 'react'
import type { AlertsApi, AlertSoundKind, AlertChannel, AlertTemplate } from '../hooks/usePriceAlerts'
import { playAlertBeep } from '../hooks/usePriceAlerts'
import { isExpired } from '../alerts/engine'
import { useFocusTrap } from '../hooks/useFocusTrap'
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
  /** E15 备注 */
  const [note, setNote] = useState('')
  /** E6 到期时间（datetime-local；空=永久有效） */
  const [expiresAt, setExpiresAt] = useState('')
  /** E10 价格精度：空=自动；可选 2/4/6/8 位小数 */
  const [precision, setPrecision] = useState('')
  /** E7 批量模式：勾选多行后统一删除/停用/启用 */
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** E4 模板名输入 + 当前模板选中 */
  const [templateName, setTemplateName] = useState('')
  /** E14 导入结果提示 */
  const [importStatus, setImportStatus] = useState<'' | 'ok' | 'fail'>('')
  const fileRef = useRef<HTMLInputElement>(null)
  // F4 焦点陷阱：Tab 在面板内循环，关闭恢复焦点
  const rootRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, rootRef)
  const {
    alerts,
    permission,
    addAlert,
    removeAlert,
    resetAlert,
    requestPermission,
    soundEnabled,
    setSoundEnabled,
    soundKind,
    setSoundKind,
    channel,
    setChannel,
    history,
    clearHistory,
    triggerCounts,
    setAlertsDisabled,
    setGroupEnabled,
    exportAlertsJson,
    importAlertsJson,
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
  } = alertsApi

  /** HH:MM → 分钟自 0:00；非法返回 null */
  const parseHm = (v: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
    if (!m) return null
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return null
    return h * 60 + min
  }
  /** 分钟自 0:00 → HH:MM（本地，补零） */
  const toHm = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  /** 时间戳 → datetime-local 值（本地时区，供 E6 到期回填） */
  const toLocalInput = (ms: number): string => {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  // E6 到期时间戳（datetime-local → ms；空=无到期）
  const expiryMs = expiresAt.trim() === '' ? undefined : new Date(expiresAt).getTime()
  // E10 价格精度：空=自动
  const precisionNum = precision === '' ? undefined : Number(precision)
  /** 提醒目标价展示：按价格精度格式化（缺省 2 位） */
  const displayPrice = (a: { price: number; pricePrecision?: number }) => a.price.toFixed(a.pricePrecision ?? 2)
  /** 提交提醒：含 E15 备注 / E6 到期 / E10 精度 */
  const submitAlert = () => {
    if (!valid || !intervalValid) return
    addAlert(
      symbol,
      direction,
      priceNum,
      repeat,
      timeWindow,
      repeat ? intervalNum || undefined : undefined,
      group.trim() || undefined,
      { note: note.trim() || undefined, expiresAt: expiryMs, pricePrecision: precisionNum },
    )
    setPrice('')
    setRepeat(false)
    setRepeatInterval('0')
    setGroup('')
    setTimeFrom('')
    setTimeTo('')
    setNote('')
    setExpiresAt('')
    setPrecision('')
  }
  /** E4 保存当前条件为模板（重名/空名拒绝） */
  const saveCurrentTemplate = () => {
    if (!valid || !templateName.trim()) return
    const tpl: AlertTemplate = {
      name: templateName.trim(),
      direction,
      price: priceNum,
      repeat,
      repeatInterval: repeat ? intervalNum || undefined : undefined,
      group: group.trim() || undefined,
      note: note.trim() || undefined,
      expiresAt: expiryMs,
      pricePrecision: precisionNum,
      time: timeWindow,
    }
    if (saveTemplate(tpl)) setTemplateName('')
  }
  /** E4 套用模板到表单（含到期时间、时间窗口回填） */
  const applyTemplate = (name: string) => {
    const tpl = loadTemplate(name)
    if (!tpl) return
    setDirection(tpl.direction)
    setPrice(String(tpl.price))
    setRepeat(!!tpl.repeat)
    setRepeatInterval(tpl.repeatInterval ? String(tpl.repeatInterval) : '0')
    setGroup(tpl.group ?? '')
    setNote(tpl.note ?? '')
    setExpiresAt(tpl.expiresAt ? toLocalInput(tpl.expiresAt) : '')
    setPrecision(tpl.pricePrecision !== undefined ? String(tpl.pricePrecision) : '')
    if (tpl.time) {
      setTimeFrom(toHm(tpl.time.start))
      setTimeTo(toHm(tpl.time.end))
    }
  }
  /** E7 批量勾选 */
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  /** E14 导入：读文件 → 校验 → 恢复；成功/失败给短提示 */
  const handleImportFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importAlertsJson(String(reader.result ?? ''))
      setImportStatus(ok ? 'ok' : 'fail')
      window.setTimeout(() => setImportStatus(''), 2500)
    }
    reader.readAsText(file)
  }
  /** E14 导出：Blob + <a download> 触发下载 */
  const downloadAlerts = () => {
    const json = exportAlertsJson()
    if (!json) return
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'alerts.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
      ref={rootRef}
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

      {/* E1 推送渠道 + E14 JSON 导入/导出 */}
      <div data-testid="alert-tools" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('alert.channel')}</span>
        <select
          data-testid="alert-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as AlertChannel)}
          aria-label={t('alert.channel')}
          title={t('alert.channel')}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid #2a2e39', borderRadius: 4, fontSize: 11, padding: '2px 4px' }}
        >
          {(['both', 'system', 'web'] as const).map((c) => (
            <option key={c} value={c}>
              {t(`alert.channel${c[0].toUpperCase()}${c.slice(1)}` as never)}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <button
          data-testid="alert-export-json"
          onClick={downloadAlerts}
          title={t('paper.exportJson')}
          style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          {t('paper.exportJson')}
        </button>
        <button
          data-testid="alert-import-json"
          onClick={() => fileRef.current?.click()}
          title={t('paper.importJson')}
          style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          {t('paper.importJson')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          data-testid="alert-import-file"
          onChange={(e) => {
            handleImportFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {importStatus === 'ok' && <span style={{ color: 'var(--up)', fontSize: 11 }}>{t('paper.importDone')}</span>}
        {importStatus === 'fail' && <span style={{ color: 'var(--down)', fontSize: 11 }}>{t('paper.importFail')}</span>}
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
          onClick={submitAlert}
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
      {/* E15 备注字段 */}
      <div data-testid="alert-note-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.note')}</span>
        <input
          data-testid="alert-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('alert.notePlaceholder')}
          style={{ ...inputStyle, width: 170 }}
        />
      </div>
      {/* E6 到期时间：datetime-local，空=永久有效 */}
      <div data-testid="alert-expiry-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.expiresAt')}</span>
        <input
          data-testid="alert-expiry-input"
          type="datetime-local"
          value={expiresAt}
          aria-label={t('alert.expiresAt')}
          onChange={(e) => setExpiresAt(e.target.value)}
          style={{ ...inputStyle, width: 165, fontSize: 11 }}
        />
      </div>
      {/* E10 价格精度：空=自动，可选小数位 */}
      <div data-testid="alert-precision-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{t('alert.precision')}</span>
        <select
          data-testid="alert-precision"
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
          aria-label={t('alert.precision')}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid #2a2e39', borderRadius: 4, fontSize: 11, padding: '2px 4px' }}
        >
          <option value="">{t('alert.precisionAuto')}</option>
          {[2, 4, 6, 8].map((p) => (
            <option key={p} value={String(p)}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {/* E4 提醒模板：保存当前条件 / 一键套用 / 删除 */}
      <div data-testid="alert-template-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
        <span>{t('alert.template')}</span>
        <input
          data-testid="alert-template-name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder={t('alert.templateName')}
          style={{ ...inputStyle, width: 76 }}
        />
        <button
          data-testid="alert-template-save"
          onClick={saveCurrentTemplate}
          title={t('alert.saveTemplate')}
          style={{ border: 'none', background: 'rgba(41,98,255,0.15)', color: 'var(--accent)', borderRadius: 4, padding: '1px 6px', fontSize: 11, cursor: 'pointer' }}
        >
          {t('alert.saveTemplate')}
        </button>
        {templates.map((name) => (
          <span key={name} data-testid={`alert-template-${name}`} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            <button
              data-testid={`alert-template-load-${name}`}
              onClick={() => applyTemplate(name)}
              title={t('alert.applyTemplate')}
              style={{ border: 'none', background: 'rgba(38,166,154,0.12)', color: 'var(--up)', borderRadius: 3, padding: '1px 5px', fontSize: 10, cursor: 'pointer' }}
            >
              {name}
            </button>
            <button
              data-testid={`alert-template-del-${name}`}
              onClick={() => deleteTemplate(name)}
              aria-label={`${t('common.delete')} ${name}`}
              style={{ border: 'none', background: 'none', color: 'var(--text-faint)', borderRadius: 3, fontSize: 10, cursor: 'pointer', padding: '0 2px' }}
            >
              ✕
            </button>
          </span>
        ))}
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

      {/* E7 批量操作：勾选多行后统一删除/停用/启用 */}
      <div data-testid="alert-batch" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <button
          data-testid="alert-batch-toggle"
          onClick={() => {
            setBatchMode((v) => !v)
            setSelected(new Set())
          }}
          aria-pressed={batchMode}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: batchMode ? 'rgba(41,98,255,0.18)' : 'transparent',
            color: batchMode ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {t('alert.batch')}
        </button>
        {batchMode && (
          <>
            <button
              data-testid="alert-batch-select-all"
              onClick={() => setSelected(new Set(symbolAlerts.map((a) => a.id)))}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('alert.selectAll')}
            </button>
            <button
              data-testid="alert-batch-clear"
              onClick={() => setSelected(new Set())}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('alert.clearSelection')}
            </button>
            <button
              data-testid="alert-batch-enable"
              onClick={() => {
                setAlertsDisabled([...selected], false)
                setSelected(new Set())
              }}
              style={{ border: 'none', background: 'transparent', color: 'var(--up)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('alert.enableSelected')}
            </button>
            <button
              data-testid="alert-batch-disable"
              onClick={() => {
                setAlertsDisabled([...selected], true)
                setSelected(new Set())
              }}
              style={{ border: 'none', background: 'transparent', color: 'var(--yellow)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('alert.disableSelected')}
            </button>
            <button
              data-testid="alert-batch-delete"
              onClick={() => {
                selected.forEach((id) => removeAlert(id))
                setSelected(new Set())
              }}
              style={{ border: 'none', background: 'transparent', color: 'var(--down)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('alert.deleteSelected')}
            </button>
          </>
        )}
      </div>

      {symbolAlerts.length === 0 ? (
        <div style={{ color: 'var(--text-faint)' }}>{t('alert.none')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {groupedAlerts.map(([g, items]) => (
            <div key={g || '__ungrouped__'}>
              {/* K2 分组头 + E3 组级一键开关 */}
              {g !== '' && (
                <div data-testid={`alert-group-${g}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600, margin: '2px 0' }}>
                  <button
                    data-testid={`alert-group-toggle-${g}`}
                    onClick={() => setGroupEnabled(g, items.some((x) => x.disabled))}
                    title={t('alert.groupToggle')}
                    aria-pressed={!items.every((x) => x.disabled)}
                    style={{
                      border: 'none',
                      background: items.every((x) => x.disabled) ? 'rgba(239,83,80,0.2)' : 'rgba(38,166,154,0.15)',
                      color: items.every((x) => x.disabled) ? 'var(--down)' : 'var(--up)',
                      borderRadius: 3,
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: '0 5px',
                    }}
                  >
                    {items.every((x) => x.disabled) ? '🔴' : '🟢'}
                  </button>
                  {g}
                </div>
              )}
              {items.map((a) => {
                const expired = isExpired(a)
                const count = triggerCounts[a.id] ?? 0
                const checked = selected.has(a.id)
                return (
                  <div
                    key={a.id}
                    data-testid="alert-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 6,
                      marginBottom: 4,
                      background: expired ? 'rgba(245,192,47,0.05)' : a.triggered ? 'rgba(245,192,47,0.08)' : 'transparent',
                      border: '1px solid #2a2e39',
                      opacity: a.disabled ? 0.55 : 1,
                    }}
                  >
                    {batchMode && (
                      <input
                        type="checkbox"
                        data-testid={`alert-select-${a.id}`}
                        checked={checked}
                        onChange={() => toggleSelect(a.id)}
                        aria-label={t('alert.select')}
                        style={{ accentColor: 'var(--accent)', margin: 0, flexShrink: 0 }}
                      />
                    )}
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                      <span style={{ color: a.triggered ? 'var(--yellow)' : 'var(--text)', fontSize: 11 }}>
                        {a.direction === 'above' ? '≥' : '≤'} {displayPrice(a)}
                        {a.repeat && <span style={{ color: 'var(--accent)', fontSize: 10 }}> ↻</span>}
                        {a.repeatInterval ? <span style={{ color: 'var(--text-faint)', fontSize: 10 }}> {a.repeatInterval}′</span> : null}
                        {expired && <span style={{ color: 'var(--yellow)', fontSize: 10 }}> · {t('alert.expired')}</span>}
                        {a.triggered && ` · ${t('alert.triggered')}`}
                        {count > 0 && <span style={{ color: 'var(--text-faint)', fontSize: 10 }}> · {t('alert.triggerCount')} {count}</span>}
                      </span>
                      {a.note && (
                        <span
                          data-testid={`alert-note-${a.id}`}
                          style={{ color: 'var(--text-faint)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}
                        >
                          {a.note}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!batchMode && a.triggered && (
                        <button onClick={() => resetAlert(a.id)} style={{ background: 'none', border: 'none', color: '#4e9cf5', cursor: 'pointer', fontSize: 11 }}>
                          {t('alert.reset')}
                        </button>
                      )}
                      {!batchMode && (
                        <button onClick={() => removeAlert(a.id)} style={{ background: 'none', border: 'none', color: 'var(--down)', cursor: 'pointer', fontSize: 11 }}>
                          {t('common.delete')}
                        </button>
                      )}
                    </span>
                  </div>
                )
              })}
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
