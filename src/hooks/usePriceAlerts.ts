import { useCallback, useEffect, useRef, useState } from 'react'
import { createAlert, shouldTrigger, stepAlert, type PriceAlert } from '../alerts/engine'
import { useI18n } from '../i18n/useI18n'
import { usePersistedState } from './usePersistedState'

const STORAGE_KEY = 'kline-buty:alerts'
const HISTORY_KEY = 'kline-buty:alertHistory'
/** 触发历史上限（新记录在前，超限裁剪最旧） */
export const ALERT_HISTORY_MAX = 50

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

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

export interface AlertsApi {
  alerts: PriceAlert[]
  permission: NotificationPermissionState
  addAlert: (symbol: string, direction: 'above' | 'below', price: number, repeat?: boolean, time?: { start: number; end: number }) => void
  removeAlert: (id: string) => void
  resetAlert: (id: string) => void
  requestPermission: () => Promise<NotificationPermissionState>
  /** 触发提示音开关（持久化） */
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  /** D11 音效选择（持久化） */
  soundKind: AlertSoundKind
  setSoundKind: (v: AlertSoundKind) => void
  /** 触发历史（新记录在前，上限 ALERT_HISTORY_MAX） */
  history: AlertTriggerEvent[]
  clearHistory: () => void
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

/** D11 提示音效种类 */
export type AlertSoundKind = 'beep' | 'chime' | 'ping' | 'low'

/** D11 各音效的频率/时长配置（WebAudio 合成，不依赖音频文件） */
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
      osc.onended = () => {}
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
 * - 外部传入最新价（symbol + price），满足条件的未触发提醒 → 浏览器通知 + 提示音
 * - 一次性触发（triggered 标记）
 */
export function usePriceAlerts(
  latestPrice: { symbol: string; price: number } | null,
): AlertsApi {
  const { t } = useI18n()
  const [soundEnabled, setSoundEnabled] = usePersistedState<boolean>('alertSound', true)
  const [soundKind, setSoundKind] = usePersistedState<AlertSoundKind>('alertSoundKind', 'beep')
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts)
  const [history, setHistory] = useState<AlertTriggerEvent[]>(loadHistory)
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : (Notification.permission as NotificationPermissionState),
  )
  const priceRef = useRef(latestPrice)
  priceRef.current = latestPrice

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
    (symbol: string, direction: 'above' | 'below', price: number, repeat = false, time?: { start: number; end: number }) => {
      persist([...alertsRef.current, createAlert(symbol, direction, price, repeat, time)])
    },
    [],
  )
  const removeAlert = useCallback((id: string) => {
    persist(alertsRef.current.filter((a) => a.id !== id))
  }, [])
  const resetAlert = useCallback((id: string) => {
    persist(alertsRef.current.map((a) => (a.id === id ? { ...a, triggered: false } : a)))
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

  // 最新价到达 → 触发通知（仅当前可见品种的提醒）
  useEffect(() => {
    const lp = priceRef.current
    if (!lp || permission !== 'granted') return
    // D9 时间窗口：以触发时刻的本地分钟参与复合判定
    const d = new Date()
    const minuteOfDay = d.getHours() * 60 + d.getMinutes()
    const due = alertsRef.current.filter(
      (a) => a.symbol === lp.symbol && shouldTrigger(a, lp.price, minuteOfDay),
    )
    if (due.length === 0) return
    for (const a of due) {
      try {
        new Notification(t('alert.notifyTitle'), {
          body: t(
            a.direction === 'above' ? 'alert.notifyAbove' : 'alert.notifyBelow',
            { symbol: a.symbol, price: a.price },
          ),
          tag: a.id,
          data: { symbol: a.symbol },
        })
      } catch {
        /* 通知失败不阻塞 */
      }
    }
    if (soundOnRef.current) playAlertBeep(soundKindRef.current)
    const triggeredIds = new Set(due.map((a) => a.id))
    persistRef.current(
      alertsRef.current.map((a) =>
        triggeredIds.has(a.id) ? { ...a, triggered: true } : stepAlert(a, lp.price, minuteOfDay),
      ),
    )
    appendHistory(
      due.map((a) => ({
        alertId: a.id,
        symbol: a.symbol,
        direction: a.direction,
        price: a.price,
        triggeredPrice: lp.price,
        at: Date.now(),
      })),
    )
  }, [latestPrice, permission, t, appendHistory])

  return { alerts, permission, addAlert, removeAlert, resetAlert, requestPermission, soundEnabled, setSoundEnabled, soundKind, setSoundKind, history, clearHistory }
}
