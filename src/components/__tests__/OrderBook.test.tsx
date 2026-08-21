// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderBook } from '../OrderBook'
import type { DepthSnapshot } from '../../hooks/useDepth'

afterEach(cleanup)

const depth: DepthSnapshot = {
  bids: [{ price: 99, quantity: 2 }],
  asks: [{ price: 101, quantity: 3 }],
}

describe('OrderBook 移动端快捷下单', () => {
  it('买卖按钮无需 hover 即可见，点击打开对应方向快速下单且不触发标记', () => {
    const onQuickOrder = vi.fn()
    const onMarkPrice = vi.fn()
    render(
      <OrderBook
        symbol="BTCUSDT"
        depth={depth}
        onQuickOrder={onQuickOrder}
        onMarkPrice={onMarkPrice}
      />,
    )

    expect(screen.getByTestId('qo-buy')).toBeDefined()
    expect(screen.getByTestId('qo-sell')).toBeDefined()

    fireEvent.click(screen.getByTestId('qo-buy'))
    expect(onQuickOrder).toHaveBeenCalledWith(99, 'buy')
    expect(onMarkPrice).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('qo-sell'))
    expect(onQuickOrder).toHaveBeenCalledWith(101, 'sell')
    expect(onMarkPrice).toHaveBeenCalledTimes(0)
  })

  it('行点击仍可标记主图，hover 仍联动参考价', () => {
    const onQuickOrder = vi.fn()
    const onMarkPrice = vi.fn()
    const onHoverPrice = vi.fn()
    render(
      <OrderBook
        symbol="BTCUSDT"
        depth={depth}
        onQuickOrder={onQuickOrder}
        onMarkPrice={onMarkPrice}
        onHoverPrice={onHoverPrice}
      />,
    )
    fireEvent.click(screen.getByTestId('ob-bid'))
    expect(onMarkPrice).toHaveBeenCalledWith(99)
    fireEvent.mouseEnter(screen.getByTestId('ob-ask'))
    expect(onHoverPrice).toHaveBeenLastCalledWith(101)
  })

  it('未接快速下单时不渲染按钮', () => {
    render(<OrderBook symbol="BTCUSDT" depth={depth} />)
    expect(screen.queryByTestId('qo-buy')).toBeNull()
    expect(screen.queryByTestId('qo-sell')).toBeNull()
  })
})
