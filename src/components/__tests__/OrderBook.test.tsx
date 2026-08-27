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

  it('聚合精度切换：×10 后档位价变为桶价，循环回 ×1 恢复', () => {
    const rich: DepthSnapshot = {
      bids: [
        { price: 99.5, quantity: 1 },
        { price: 98.7, quantity: 2 },
      ],
      asks: [
        { price: 100.2, quantity: 3 },
        { price: 101.9, quantity: 4 },
      ],
    }
    render(<OrderBook symbol="BTCUSDT" depth={rich} />)
    expect(screen.getByText('99.50')).toBeDefined()
    expect(screen.getByText('100.20')).toBeDefined()

    const toggle = screen.getByTestId('ob-group-toggle')
    expect(toggle.textContent).toContain('×1')
    fireEvent.click(toggle) // → ×10
    expect(toggle.textContent).toContain('×10')
    // 桶价：99.5→90，98.7→90 合并；100.2→100，101.9→100 合并
    expect(screen.queryByText('99.50')).toBeNull()
    expect(screen.getByText('90.00')).toBeDefined()
    expect(screen.getByText('100.00')).toBeDefined()
    // 卖一桶 100 - 买一桶 90 → 价差 10
    expect(screen.getByTestId('ob-spread').textContent).toContain('10.0')

    fireEvent.click(toggle) // → ×100
    expect(toggle.textContent).toContain('×100')
    fireEvent.click(toggle) // → ×1
    expect(toggle.textContent).toContain('×1')
    expect(screen.getByText('99.50')).toBeDefined()
  })

  it('买卖各自最大挂单量档位 data-max-qty=true 强调', () => {
    const multiDepth: DepthSnapshot = {
      bids: [
        { price: 99, quantity: 2 },
        { price: 98, quantity: 5 },
        { price: 97, quantity: 1 },
      ],
      asks: [
        { price: 101, quantity: 3 },
        { price: 102, quantity: 8 },
        { price: 103, quantity: 2 },
      ],
    }
    render(<OrderBook symbol="BTCUSDT" depth={multiDepth} />)
    const bids = screen.getAllByTestId('ob-bid')
    const asks = screen.getAllByTestId('ob-ask')
    // bid 最大量是 98（5）
    expect(bids.find((b) => Number(b.dataset.price) === 98)?.dataset.maxQty).toBe('true')
    expect(bids.find((b) => Number(b.dataset.price) === 99)?.dataset.maxQty).toBe('false')
    // ask 最大量是 102（8）
    expect(asks.find((a) => Number(a.dataset.price) === 102)?.dataset.maxQty).toBe('true')
    expect(asks.find((a) => Number(a.dataset.price) === 101)?.dataset.maxQty).toBe('false')
  })
})
