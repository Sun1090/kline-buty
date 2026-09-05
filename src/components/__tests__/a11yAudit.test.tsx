// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OrderBook } from '../OrderBook'
import { MarketList } from '../MarketList'

afterEach(cleanup)

/** M1 全面板 Tab 可达性审计：主要面板容器需 role=region + aria-label + tabIndex=0（键盘可聚焦滚动） */
describe('M1 面板 Tab 可达性审计', () => {
  it('订单簿容器：role=region + aria-label + tabIndex=0', () => {
    render(
      <OrderBook
        symbol="BTCUSDT"
        depth={{ bids: [], asks: [] }}
        onHoverPrice={vi.fn()}
        onMarkPrice={vi.fn()}
        onQuickOrder={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )
    const el = screen.getByTestId('order-book')
    expect(el.getAttribute('role')).toBe('region')
    expect(el.getAttribute('aria-label')).toBeTruthy()
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  it('市场列表容器：role=region + aria-label + tabIndex=0', () => {
    render(<MarketList symbol="BTCUSDT" onSelectSymbol={vi.fn()} open onToggle={vi.fn()} />)
    const el = screen.getByTestId('market-list')
    expect(el.getAttribute('role')).toBe('region')
    expect(el.getAttribute('aria-label')).toBeTruthy()
    expect(el.getAttribute('tabindex')).toBe('0')
  })
})
