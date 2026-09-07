import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createAlert, shouldTrigger, stepAlert, setAlertsDisabled as setAlertsDisabledIds, setGroupDisabled, isExpired, type PriceAlert } from '../alerts/engine'
import { fetchTickers24h } from '../data/binance/rest'
import { useI18n } from '../i18n/useI18n'
import { localeFor } from '../i18n/messages'
import { usePersistedState } from './usePersistedState'

const STORAGE_KEY = 'kline-buty:alerts'
const HISTORY_KEY = 'kline-buty:alertHistory'
const CHANNEL_KEY = 'kline-buty:alertChannel'
const TEMPLATES_KEY = 'kline-buty:alertTemplates'
/** 触发历史上限（新记录在前，超限裁剪最旧） */
export const ALERT_HISTORY_MAX = 50

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

/** E1 提醒推送渠道：系统通知 / 站内横幅 / 两者 */
export type AlertChannel = 'system' | 'web' | 'both'

/** 一次提醒触发的事件记录（跨品种共享，新记录在前） */
export interface AlertTriggerEvent {
  alertId: string
  symbol: string
  direction: 'above' | 'below'
  /** 提醒目标价 */
  price: number
  /** 触发时的最新价 */
  triggeredPrice: number
  /** 触发时间戳（ms） */
  at: number
}

/** E4 提醒模板：可复用的一组常用触发条件 */
export interface AlertTemplate {
  name: string
  direction: 'above' | 'below'
  price: number
  repeat?: boolean
  repeatInterval?: number
  time?: { start: number; end: number }
  group?: string
  note?: string
  expiresAt?: number
  pricePrecision?: number
}

export interface AlertsApi {
  alerts: PriceAlert[]
  permission: NotificationPermissionState
  addAlert: (symbol: string, direction: 'above' | 'below', price: number, repeat?: boolean, time?: { start: number; end: number }, repeatInterval?: number, group?: string, opts?: { note?: string; expiresAt?: number; pricePrecision?: number }) => void
  removeAlert: (id: string) => void
  resetAlert: (id: string) => void
  requestPermission: () => Promise<NotificationPermissionState>
  /** 触发提示音开关（持久化） */
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  /** 音效选择（持久化） */
  soundKind: AlertSoundKind
  setSoundKind: (v: AlertSoundKind) => void
  /** E1 推送渠道（持久化）：system=系统通知 / web=站内横幅 / both=两者 */
  channel: AlertChannel
  setChannel: (v: AlertChannel) => void
  /** 触发历史（新记录在前，上限 ALERT_HISTORY_MAX） */
  history: AlertTriggerEvent[]
  clearHistory: () => void
  /** E12 未触发（待触发）提醒数：桌面角标用 */
  pendingCount: number
  /** I7 语音播报开关（价格异动朗读） */
  voiceEnabled: boolean
  setVoiceEnabled: (v: boolean) => void
  /** E8 各提醒触发次数（由历史推导，alertId → 次数） */
  triggerCounts: Record<string, number>
  /** E7 批量停用/启用 */
  setAlertsDisabled: (ids: string[], disabled: boolean) => void
  /** E3 组级一键开关 */
  setGroupEnabled: (group: string, enabled: boolean) => void
  /** 局部更新单个提醒（禁用/备注/精度等） */
  updateAlert: (id: string, patch: Partial<PriceAlert>) => void
  /** E14 账户提醒 JSON 导出/导入 */
  exportAlertsJson: () => string
  importAlertsJson: (json: string) => boolean
  /** E4 模板：名称列表 + 保存/读取/删除（保存接收完整模板对象，重名/空名拒绝） */
  templates: string[]
  saveTemplate: (template: AlertTemplate) => boolean
  loadTemplate: (name: string) => AlertTemplate | null
  deleteTemplate: (name: string) => void
}

/** E14 导出/导入的提醒 JSON 结构 */
interface AlertsDump {
  version: 1
  alerts: PriceAlert[]
  savedAt: number
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadAlerts(): PriceAlert[] {
  return loadList<PriceAlert>(STORAGE_KEY)
}

function loadHistory(): AlertTriggerEvent[] {
  return loadList<AlertTriggerEvent>(HISTORY_KEY)
}

function loadChannel(): AlertChannel {
  const v = localStorage.getItem(CHANNEL_KEY) as AlertChannel | null
  return v === 'system' || v === 'web' || v === 'both' ? v : 'both'
}

function loadTemplates(): Record<string, AlertTemplate> {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, AlertTemplate>) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistTemplates(templates: Record<string, AlertTemplate>) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch {
    /* noop */
  }
}

/** 音效种类 */
export type AlertSoundKind = 'beep' | 'chime' | 'ping' | 'low'

/** 各音效的频率/时长配置（WebAudio 合成，不依赖音频文件） */
const SOUND_SPECS: Record<AlertSoundKind, { freqs: number[]; dur: number }> = {
  beep: { freqs: [880], dur: 0.4 },
  chime: { freqs: [660, 880, 1320], dur: 0.12 },
  ping: { freqs: [1568], dur: 0.18 },
  low: { freqs: [330], dur: 0.5 },
}

/** 触发提示音（WebAudio 合成，不依赖音频文件；被浏览器策略拦截时静默）。kind 选择音效 */
export function playAlertBeep(kind: AlertSoundKind = 'beep') {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const spec = SOUND_SPECS[kind] ?? SOUND_SPECS.beep
    const ctx = new Ctor()
    const start = ctx.currentTime
    spec.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      const t = start + i * spec.dur
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + spec.dur)
      osc.start(t)
      osc.stop(t + spec.dur)
    })
    // 最后一个振荡器结束后关闭上下文
    window.setTimeout(() => void ctx.close().catch(() => {}), spec.freqs.length * spec.dur * 1000 + 200)
  } catch {
    /* noop */
  }
}

/**
 * 价格提醒：
 * - 持久化到 localStorage
 * - prices（多品种价格表，可选）+ latestPrice（当前品种）作为触发源
 * - 条件满足的未触发提醒 → 按渠道推送（系统通知/站内横幅）+ 提示音
 * - E2 多品种：prices 表覆盖所有提醒品种；无表时回退当前品种
 */
export function usePriceAlerts(
  latestPrice: { symbol: string; price: number } | null,
  prices?: Record<string, number> | null,
): AlertsApi {
  const { t, lang } = useI18n()
  const [soundEnabled, setSoundEnabled] = usePersistedState<boolean>('alertSound', true)
  const [soundKind, setSoundKind] = usePersistedState<AlertSoundKind>('alertSoundKind', 'beep')
  // I7 语音播报（WebSpeech，按当前 UI 语言朗读触发信息）
  const [voiceEnabled, setVoiceEnabled] = usePersistedState<boolean>('alertVoice', false)
  const [channel, setChannelState] = useState<AlertChannel>(loadChannel)
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts)
  const [history, setHistory] = useState<AlertTriggerEvent[]>(loadHistory)
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : (Notification.permission as NotificationPermissionState),
  )

  const priceRef = useRef(latestPrice)
  priceRef.current = latestPrice
  // E2 多品种价格源：外部 prices 优先；否则内部分钟轮询提醒品种的 ticker
  const [feedPrices, setFeedPrices] = useState<Record<string, number> | null>(null)
  const pricesRef = useRef(prices ?? feedPrices)
  pricesRef.current = prices ?? feedPrices

  const persist = (next: PriceAlert[]) => {
    setAlerts(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* noop */
    }
  }

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof Notification === 'undefined') return 'unsupported'
    const result = await Notification.requestPermission()
    const state = result as NotificationPermissionState
    setPermission(state)
    return state
  }, [])

  const addAlert = useCallback(
    (symbol: string, direction: 'above' | 'below', price: number, repeat = false, time?: { start: number; end: number }, repeatInterval?: number, group?: string, opts?: { note?: string; expiresAt?: number; pricePrecision?: number }) => {
      persist([...alertsRef.current, createAlert(symbol, direction, price, repeat, time, repeatInterval, group, opts)])
    },
    [],
  )
  const removeAlert = useCallback((id: string) => {
    persist(alertsRef.current.filter((a) => a.id !== id))
  }, [])
  const resetAlert = useCallback((id: string) => {
    persist(alertsRef.current.map((a) => (a.id === id ? { ...a, triggered: false, lastTriggeredAt: undefined } : a)))
  }, [])
  /** E7 批量停用/启用 */
  const setAlertsDisabled = useCallback((ids: string[], disabled: boolean) => {
    persist(setAlertsDisabledIds(alertsRef.current, new Set(ids), disabled))
  }, [])
  /** E3 组级一键开关 */
  const setGroupEnabled = useCallback((group: string, enabled: boolean) => {
    persist(setGroupDisabled(alertsRef.current, group, !enabled))
  }, [])
  /** 局部更新单个提醒（禁用/备注/精度等） */
  const updateAlert = useCallback((id: string, patch: Partial<PriceAlert>) => {
    persist(alertsRef.current.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const alertsRef = useRef(alerts)
  alertsRef.current = alerts
  const persistRef = useRef(persist)
  persistRef.current = persist
  const historyRef = useRef(history)
  historyRef.current = history
  const soundOnRef = useRef(soundEnabled)
  soundOnRef.current = soundEnabled
  const soundKindRef = useRef(soundKind)
  soundKindRef.current = soundKind
  const voiceRef = useRef(voiceEnabled)
  voiceRef.current = voiceEnabled
  const channelRef = useRef(channel)
  channelRef.current = channel

  // E2 多品种价格源（内部轮询）：外部传入 prices 时跳过；仅当存在提醒品种时轮询 ticker
  const alertSymbolsKey = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.symbol))).sort().join(','),
    [alerts],
  )
  useEffect(() => {
    if (prices) return
    const symbols = alertSymbolsKey === '' ? [] : alertSymbolsKey.split(',')
    if (symbols.length === 0) {
      setFeedPrices(null)
      return
    }
    let alive = true
    const load = async () => {
      try {
        const rows = await fetchTickers24h(symbols)
        if (!alive) return
        setFeedPrices(Object.fromEntries(rows.map((r) => [r.symbol, r.price])))
      } catch {
        /* 拉取失败保留旧价格 */
      }
    }
    void load()
    const id = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [prices, alertSymbolsKey])  /** E1 设置推送渠道并持久化 */
  const setChannel = useCallback((v: AlertChannel) => {
    setChannelState(v)
    try {
      localStorage.setItem(CHANNEL_KEY, v)
    } catch {
      /* noop */
    }
  }, [])

  const appendHistory = useCallback((events: AlertTriggerEvent[]) => {
    setHistory((prev) => {
      const next = [...events, ...prev].slice(0, ALERT_HISTORY_MAX)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [])
  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* noop */
    }
  }, [])

  // E8 各提醒触发次数：由历史事件按 alertId 聚合
  const triggerCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const h of history) counts[h.alertId] = (counts[h.alertId] ?? 0) + 1
    return counts
  }, [history])
  // E12 待触发提醒数（未触发 & 未停用 & 未过期）
  const pendingCount = alerts.filter((a) => !a.triggered && !a.disabled && !isExpired(a)).length

  // E14 导出：版本 + 提醒列表（JSON 文本）
  const exportAlertsJson = useCallback((): string => {
    const dump: AlertsDump = { version: 1, alerts: alertsRef.current, savedAt: Date.now() }
    return JSON.stringify(dump, null, 2)
  }, [])
  // E14 导入：严格校验提醒 shape；任一非法 → false 且不改动现有提醒
  const importAlertsJson = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as { version?: number; alerts?: unknown }
      if (!Array.isArray(parsed.alerts)) return false
      const valid = parsed.alerts.every(
        (a): a is PriceAlert =>
          a != null &&
          typeof a === 'object' &&
          typeof (a as PriceAlert).id === 'string' &&
          typeof (a as PriceAlert).symbol === 'string' &&
          ((a as PriceAlert).direction === 'above' || (a as PriceAlert).direction === 'below') &&
          typeof (a as PriceAlert).price === 'number' &&
          typeof (a as PriceAlert).triggered === 'boolean',
      )
      if (!valid) return false
      persist(parsed.alerts)
      return true
    } catch {
      return false
    }
  }, [])

  // E4 模板：持久化命名模板（权重名拒绝；保存完整条件对象）
  const [templates, setTemplates] = useState<string[]>(() => Object.keys(loadTemplates()))
  const saveTemplate = useCallback((template: AlertTemplate): boolean => {
    const trimmed = template.name.trim()
    if (!trimmed) return false
    const all = loadTemplates()
    if (all[trimmed]) return false
    all[trimmed] = { ...template, name: trimmed }
    persistTemplates(all)
    setTemplates(Object.keys(all))
    return true
  }, [])
  const loadTemplate = useCallback((name: string): AlertTemplate | null => loadTemplates()[name] ?? null, [])
  const deleteTemplate = useCallback((name: string) => {
    const all = loadTemplates()
    delete all[name]
    persistTemplates(all)
    setTemplates(Object.keys(all))
  }, [])

  // 最新价/价格表到达 → 触发（E2 多品种 + E1 渠道 + 音效 + 历史）
  useEffect(() => {
    const now = Date.now()
    const d = new Date()
    const minuteOfDay = d.getHours() * 60 + d.getMinutes()
    const lp = priceRef.current
    const map = pricesRef.current ?? {}
    const priceFor = (sym: string): number | undefined => {
      if (map[sym] !== undefined) return map[sym]
      if (lp && lp.symbol === sym) return lp.price
      return undefined
    }
    const due = alertsRef.current.filter((a) => {
      const px = priceFor(a.symbol)
      return px !== undefined && shouldTrigger(a, px, minuteOfDay, now)
    })
    if (due.length === 0) return
    const pushedSignals = new Map(due.map((a) => [a.id, priceFor(a.symbol) ?? 0]))
    // E1 渠道：system → 浏览器通知（需授权）；web → 站内横幅事件（App 监听弹 toast）
    const ch = channelRef.current
    if ((ch === 'system' || ch === 'both') && permission === 'granted') {
      for (const a of due) {
        try {
          new Notification(t('alert.notifyTitle'), {
            body: t(a.direction === 'above' ? 'alert.notifyAbove' : 'alert.notifyBelow', { symbol: a.symbol, price: a.price }),
            tag: a.id,
            data: { symbol: a.symbol },
          })
        } catch {
          /* 通知失败不阻塞 */
        }
      }
    }
    if ((ch === 'web' || ch === 'both') && typeof window !== 'undefined') {
      for (const a of due) {
        window.dispatchEvent(
          new CustomEvent('price-alert-triggered', {
            detail: { alertId: a.id, symbol: a.symbol, direction: a.direction, price: a.price, triggeredPrice: pushedSignals.get(a.id) },
          }),
        )
      }
    }
    if (soundOnRef.current) playAlertBeep(soundKindRef.current)
    // I7 语音播报：切换 UI 语言朗读触发信息（浏览器不支持的场合静默）
    if (voiceRef.current && typeof speechSynthesis !== 'undefined') {
      try {
        const first = due[0]
        const text = t(
          first.direction === 'above' ? 'alert.notifyAbove' : 'alert.notifyBelow',
          { symbol: first.symbol, price: first.price },
        )
        const utter = new SpeechSynthesisUtterance(text)
        utter.lang = localeFor(lang)
        speechSynthesis.cancel()
        speechSynthesis.speak(utter)
      } catch {
        /* 语音不可用静默 */
      }
    }
    // 统一 stepAlert 推进（含 repeatInterval 间隔保护、repeat 重新武装；停用/过期保持原样）
    persistRef.current(
      alertsRef.current.map((a) => {
        const px = priceFor(a.symbol)
        return px === undefined ? a : stepAlert(a, px, minuteOfDay, now)
      }),
    )
    appendHistory(
      due.map((a) => ({
        alertId: a.id,
        symbol: a.symbol,
        direction: a.direction,
        price: a.price,
        triggeredPrice: pushedSignals.get(a.id) ?? 0,
        at: now,
      })),
    )
  }, [latestPrice, prices, feedPrices, permission, t, lang, appendHistory])

  return {
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
    pendingCount,
    voiceEnabled,
    setVoiceEnabled,
    triggerCounts,
    setAlertsDisabled,
    setGroupEnabled,
    updateAlert,
    exportAlertsJson,
    importAlertsJson,
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
  }
}
