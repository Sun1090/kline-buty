import { useCallback, useEffect, useRef, useState } from 'react'
import type { PriceAlert } from '../alerts/engine'
import { createAlert, shouldTrigger } from '../alerts/engine'

const STORAGE_KEY = 'kline-buty:alerts'

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export interface AlertsApi {
  alerts: PriceAlert[]
  permission: NotificationPermissionState
  addAlert: (symbol: string, direction: 'above' | 'below', price: number) => void
  removeAlert: (id: string) => void
  resetAlert: (id: string) => void
  requestPermission: () => Promise<NotificationPermissionState>
}

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PriceAlert[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 价格提醒：
 * - 持久化到 localStorage
 * - 外部传入最新价（symbol + price），满足条件的未触发提醒 → 浏览器通知
 * - 一次性触发（triggered 标记）
 */
export function usePriceAlerts(
  latestPrice: { symbol: string; price: number } | null,
): AlertsApi {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts)
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
    (symbol: string, direction: 'above' | 'below', price: number) => {
      persist([...alertsRef.current, createAlert(symbol, direction, price)])
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

  // 最新价到达 → 触发通知（仅当前可见品种的提醒）
  useEffect(() => {
    const lp = priceRef.current
    if (!lp || permission !== 'granted') return
    const due = alertsRef.current.filter(
      (a) => a.symbol === lp.symbol && shouldTrigger(a, lp.price),
    )
    if (due.length === 0) return
    for (const a of due) {
      try {
        new Notification('Kline Buty · 价格提醒', {
          body: `${a.symbol} ${a.direction === 'above' ? '已到达' : '已跌破'} ${a.price}`,
          tag: a.id,
        })
      } catch {
        /* 通知失败不阻塞 */
      }
    }
    const triggeredIds = new Set(due.map((a) => a.id))
    persistRef.current(
      alertsRef.current.map((a) => (triggeredIds.has(a.id) ? { ...a, triggered: true } : a)),
    )
  }, [latestPrice, permission])

  return { alerts, permission, addAlert, removeAlert, resetAlert, requestPermission }
}
