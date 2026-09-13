/**
 * 价格提醒的系统通知适配层（浏览器 / 单测降级实现）。
 * 壳构建（VITE_CAPACITOR=1）时 vite 把 @shell/notifications 别名到 app-shell/native-notifications.ts（真实 LocalNotifications）；
 * Web/测试环境走本桩：行为与原 `new Notification(...)` 完全一致。
 */
import type { NotificationPermissionState } from './hooks/usePriceAlerts'

export interface PriceNotification {
  title: string
  body: string
  tag: string
}

/** 同步读取当前通知权限（浏览器 Notification API；不可用 → unsupported） */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotificationPermissionState
}

/** 异步读取当前通知权限（浏览器下与同步读取一致；壳内实现走原生 checkPermissions） */
export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  return getNotificationPermission()
}

/** 请求通知权限（浏览器 API） */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  const result = await Notification.requestPermission()
  return result as NotificationPermissionState
}

/** 弹出一条系统通知；权限非 granted 或构造失败时静默跳过（与原行为一致，不阻塞） */
export function showPriceNotification(n: PriceNotification): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(n.title, { body: n.body, tag: n.tag })
  } catch {
    /* 通知失败不阻塞 */
  }
}
