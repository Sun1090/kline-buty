// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PendingOrders } from '../PendingOrders'
import type { PendingOrder } from '../../trade/pending'

afterEach(cleanup)

const orders: PendingOrder[] = [
  { id: 'a', symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 0.5, createdAt: 1, marketable: false },
  { id: 'b', symbol: 'ETHUSDT', side: 'sell', price: 3_500, qty: 2, createdAt: 2, marketable: false },
]

describe('PendingOrders 挂单列表', () => {
  it('渲染方向/挂单价/数量与条数徽标', () => {
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} />)
    expect(screen.getAllByTestId('pending-order-row')).toHaveLength(2)
    expect(screen.getByTestId('pending-orders-count').textContent).toBe('2')
    expect(screen.getAllByTestId('pending-order-row')[0].textContent).toContain('买入')
    expect(screen.getAllByTestId('pending-order-row')[1].textContent).toContain('卖出')
  })

  it('点撤销只上报该条 id，不触发切品种', () => {
    const onCancel = vi.fn()
    const onSwitchSymbol = vi.fn()
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={onCancel} onSwitchSymbol={onSwitchSymbol} />)
    fireEvent.click(screen.getAllByTestId('pending-order-cancel')[1])
    expect(onCancel).toHaveBeenCalledWith('b')
    expect(onSwitchSymbol).not.toHaveBeenCalled()
  })

  it('点击其他品种的行切主图，点击当前品种行不切换', () => {
    const onSwitchSymbol = vi.fn()
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} onSwitchSymbol={onSwitchSymbol} />)
    fireEvent.click(screen.getAllByTestId('pending-order-row')[0])
    expect(onSwitchSymbol).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByTestId('pending-order-row')[1])
    expect(onSwitchSymbol).toHaveBeenCalledWith('ETHUSDT')
  })

  it('空列表展示空态与 0 计数', () => {
    render(<PendingOrders orders={[]} symbol="BTCUSDT" onCancel={vi.fn()} />)
    expect(screen.queryAllByTestId('pending-order-row')).toHaveLength(0)
    expect(screen.getByTestId('pending-orders-count').textContent).toBe('0')
  })
})
