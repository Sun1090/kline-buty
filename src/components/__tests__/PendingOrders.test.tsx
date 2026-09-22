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

  it('未提供 onEdit 时不渲染改价入口', () => {
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} />)
    expect(screen.queryByTestId('pending-order-edit-a')).toBeNull()
  })

  it('改价：展开即预填该单的价格与数量，确认按解析后的数值回调并收起', () => {
    const onEdit = vi.fn(() => true)
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(screen.getByTestId('pending-order-edit-a'))
    const editor = screen.getByTestId('pending-order-editor-a')
    expect(editor).toBeTruthy()
    const price = screen.getByTestId('pending-order-price-a') as HTMLInputElement
    const qty = screen.getByTestId('pending-order-qty-a') as HTMLInputElement
    expect(price.value).toBe('60000')
    expect(qty.value).toBe('0.5')
    fireEvent.change(price, { target: { value: '58000' } })
    fireEvent.change(qty, { target: { value: '0.25' } })
    fireEvent.click(screen.getByTestId('pending-order-edit-confirm-a'))
    expect(onEdit).toHaveBeenCalledWith('a', { price: 58000, qty: 0.25 })
    expect(screen.queryByTestId('pending-order-editor-a')).toBeNull()
  })

  it('改价：数量非法直接拦截，不回调', () => {
    const onEdit = vi.fn(() => true)
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(screen.getByTestId('pending-order-edit-a'))
    fireEvent.change(screen.getByTestId('pending-order-qty-a'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('pending-order-edit-confirm-a'))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-order-edit-error')).toBeTruthy()
    expect(screen.getByTestId('pending-order-editor-a')).toBeTruthy()
  })

  it('改价：onEdit 返回 false（单已被撮合/撤销）→ 报错且编辑器仍在', () => {
    const onEdit = vi.fn(() => false)
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(screen.getByTestId('pending-order-edit-a'))
    fireEvent.click(screen.getByTestId('pending-order-edit-confirm-a'))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-order-edit-error')).toBeTruthy()
  })

  it('改价：取消按钮收起编辑器且不回调', () => {
    const onEdit = vi.fn(() => true)
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(screen.getByTestId('pending-order-edit-b'))
    fireEvent.click(screen.getByTestId('pending-order-edit-cancel-b'))
    expect(screen.queryByTestId('pending-order-editor-b')).toBeNull()
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('空列表展示空态与 0 计数', () => {
    render(<PendingOrders orders={[]} symbol="BTCUSDT" onCancel={vi.fn()} />)
    expect(screen.queryAllByTestId('pending-order-row')).toHaveLength(0)
    expect(screen.getByTestId('pending-orders-count').textContent).toBe('0')
  })
})
