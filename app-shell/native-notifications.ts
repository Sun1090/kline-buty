/**
 * 价格提醒的原生通知适配（Capacitor Local Notifications）。
 * 仅壳构建（VITE_CAPACITOR=1）经 vite 别名 `@shell/notifications` 引入本文件；
 * Web/测试构建使用 src/shellNotifications.ts 桩。真实行为：请求本地通知权限 →
 * 立即调度一条系统通知（foreground 即时展示）。
 */
import { LocalNotifications } from '@capacitor/local-notifications'
import type { NotificationPermissionState } from './src/hooks/usePriceAlerts'

export interface PriceNotification {
  title: string
  body: string
  tag: string
}

function toPermissionState(display: 'granted' | 'denied' | 'prompt'): NotificationPermissionState {
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default'
}

/** 原生本地通知权限：壳内无同步 API，缺省 default；由 checkNotificationPermission 异步校正 */
export function getNotificationPermission(): NotificationPermissionState {
  return 'default'
}

/** 异步读取原生权限（checkPermissions → display） */
export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const p = await LocalNotifications.checkPermissions()
    return toPermissionState(p.display)
  } catch {
    return 'unsupported'
  }
}

/** 请求原生通知权限 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const p = await LocalNotifications.requestPermissions()
    return toPermissionState(p.display)
  } catch {
    return 'unsupported'
  }
}

/** 立即调度一条本地通知（schedule 缺省 at=现在 → 即时展示）；权限未授予时静默 */
export async function showPriceNotification(n: PriceNotification): Promise<void> {
  try {
    const p = await LocalNotifications.requestPermissions()
    if (p.display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [{ id: hashTag(n.tag), title: n.title, body: n.body }],
    })
  } catch {
    /* 通知失败不阻塞 */
  }
}

/** 稳定映射 alert id → 正整数通知 id（LocalNotifications 要求 number） */
function hashTag(tag: string): number {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return (h % 0x7fffffff) + 1
}
