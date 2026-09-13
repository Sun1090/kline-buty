// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getNotificationPermission, checkNotificationPermission, requestNotificationPermission, showPriceNotification } from '../shellNotifications'

const notifyMock = vi.fn()

function stubNotification(permission: 'granted' | 'denied' | 'default') {
  ;(globalThis as Record<string, unknown>).Notification = class {
    static permission = permission
    static requestPermission = vi.fn(async () => permission)
    constructor(_title: string, _opts: unknown) {
      notifyMock(_title, _opts)
    }
  }
}

beforeEach(() => {
  localStorage.clear()
  notifyMock.mockClear()
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Notification
})

describe('shellNotifications 桩（Web 降级实现）', () => {
  it('getNotificationPermission：granted → granted；无 Notification → unsupported', () => {
    stubNotification('granted')
    expect(getNotificationPermission()).toBe('granted')
    delete (globalThis as Record<string, unknown>).Notification
    expect(getNotificationPermission()).toBe('unsupported')
  })

  it('checkNotificationPermission 与同步读取一致', async () => {
    stubNotification('denied')
    await expect(checkNotificationPermission()).resolves.toBe('denied')
  })

  it('requestNotificationPermission 返回浏览器请求结果', async () => {
    stubNotification('granted')
    await expect(requestNotificationPermission()).resolves.toBe('granted')
    const req = (globalThis as unknown as { Notification: { requestPermission: ReturnType<typeof vi.fn> } }).Notification.requestPermission
    expect(req).toHaveBeenCalledTimes(1)
  })

  it('showPriceNotification：权限 granted → 弹 Notification', () => {
    stubNotification('granted')
    showPriceNotification({ title: 'T', body: 'B', tag: 'a1' })
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledWith('T', { body: 'B', tag: 'a1' })
  })

  it('showPriceNotification：权限非 granted → 跳过', () => {
    stubNotification('denied')
    showPriceNotification({ title: 'T', body: 'B', tag: 'a1' })
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('showPriceNotification：无 Notification → 跳过', () => {
    delete (globalThis as Record<string, unknown>).Notification
    expect(() => showPriceNotification({ title: 'T', body: 'B', tag: 'a1' })).not.toThrow()
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('showPriceNotification：构造抛错 → 不阻塞', () => {
    ;(globalThis as Record<string, unknown>).Notification = class {
      static permission = 'granted'
      constructor() {
        throw new Error('boom')
      }
    }
    expect(() => showPriceNotification({ title: 'T', body: 'B', tag: 'a1' })).not.toThrow()
  })
})
