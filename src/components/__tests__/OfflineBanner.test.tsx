// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OfflineBanner } from '../OfflineBanner'

afterEach(cleanup)

function setOnline(v: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })
}

describe('OfflineBanner（在线/离线状态条）', () => {
  it('在线 → 不渲染；断网事件 → 显示提示条；恢复 → 隐藏', () => {
    setOnline(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).toBeNull()

    setOnline(false)
    fireEvent(window, new Event('offline'))
    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('assertive')
    expect(screen.getByRole('status').textContent).toContain('网络已断开')

    setOnline(true)
    fireEvent(window, new Event('online'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('初始离线（navigator.onLine=false）→ 直接渲染提示条', () => {
    setOnline(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeDefined()
  })
})
