// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { AlertPanel } from '../AlertPanel'
import type { AlertsApi } from '../../hooks/usePriceAlerts'
import type { PriceAlert } from '../../alerts/engine'

afterEach(cleanup)

function makeApi(overrides: Partial<AlertsApi> = {}): AlertsApi {
  const alert: PriceAlert = { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false }
  return {
    alerts: [alert],
    permission: 'granted',
    addAlert: vi.fn(),
    removeAlert: vi.fn(),
    resetAlert: vi.fn(),
    history: [],
    clearHistory: vi.fn(),
    requestPermission: vi.fn(async () => 'granted' as const),
    ...overrides,
  }
}

describe('AlertPanel', () => {
  it('显示当前品种的提醒列表', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    expect(screen.getByText(/≥ 65000\.00/)).toBeDefined()
    expect(screen.getByText('删除')).toBeDefined()
  })

  it('只显示当前品种的提醒', () => {
    const api = makeApi({ alerts: [
      { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
      { id: 'a2', symbol: 'ETHUSDT', direction: 'below', price: 2900, triggered: false },
    ] })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText(/≥ 65000\.00/)).toBeDefined()
    expect(screen.queryByText(/≤ 2900\.00/)).toBeNull()
  })

  it('添加提醒回调', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('价格 ≤'))
    const input = screen.getByPlaceholderText('63000.00')
    fireEvent.change(input, { target: { value: '61000' } })
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'below', 61000)
  })

  it('删除提醒回调', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('删除'))
    expect(api.removeAlert).toHaveBeenCalledWith('a1')
  })

  it('未开启通知时显示开启按钮', () => {
    const api = makeApi({ permission: 'default' })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('开启通知'))
    expect(api.requestPermission).toHaveBeenCalled()
  })

  it('已触发提醒显示标记与重置', () => {
    const api = makeApi({ alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: true }] })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText(/已触发/)).toBeDefined()
    fireEvent.click(screen.getByText('重置'))
    expect(api.resetAlert).toHaveBeenCalledWith('a1')
  })

  it('无历史时不显示历史区块', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    expect(screen.queryByText(/触发历史/)).toBeNull()
  })

  it('显示触发历史（跨品种、含目标价与触发价）并可清空', () => {
    const api = makeApi({
      history: [
        { alertId: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggeredPrice: 65120.5, at: new Date('2026-08-24T10:00:00').getTime() },
        { alertId: 'a2', symbol: 'ETHUSDT', direction: 'below', price: 2900, triggeredPrice: 2888, at: new Date('2026-08-24T09:30:00').getTime() },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText('触发历史（2）')).toBeDefined()
    expect(screen.getByText(/BTC\/USDT ≥ 65000\.00 → 65120\.50/)).toBeDefined()
    expect(screen.getByText(/ETH\/USDT ≤ 2900\.00 → 2888\.00/)).toBeDefined()
    fireEvent.click(screen.getByText('清空记录'))
    expect(api.clearHistory).toHaveBeenCalledTimes(1)
  })
})
