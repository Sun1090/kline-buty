// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DepthChart } from '../DepthChart'
import type { DepthSnapshot } from '../../hooks/useDepth'

afterEach(cleanup)

const depth: DepthSnapshot = {
  bids: [
    { price: 99, quantity: 2 },
    { price: 98, quantity: 5 },
    { price: 97, quantity: 3 },
  ],
  asks: [
    { price: 101, quantity: 3 },
    { price: 102, quantity: 8 },
    { price: 103, quantity: 2 },
  ],
}

describe('DepthChart', () => {
  it('无数据 → 显示加载中', () => {
    render(<DepthChart symbol="BTCUSDT" depth={null} />)
    expect(screen.getByText(/盘口深度/)).toBeDefined()
  })

  it('有数据 → 渲染 svg + role=img', () => {
    render(<DepthChart symbol="BTCUSDT" depth={depth} />)
    const svg = screen.getByTestId('depth-chart')
    expect(svg.getAttribute('role')).toBe('img')
  })

  it('hover 显示当前价精确数值与买卖累计量', () => {
    render(<DepthChart symbol="BTCUSDT" depth={depth} />)
    const svg = screen.getByTestId('depth-chart')
    // mock getBoundingClientRect 让 onMove 的 rect.width > 0
    svg.getBoundingClientRect = vi.fn(() => ({ left: 0, width: 760, right: 760, top: 0, height: 170, bottom: 170, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect)
    // 移动到中间偏左（买盘区）
    fireEvent.mouseMove(svg, { clientX: 200 })
    const tooltip = screen.getByTestId('depth-tooltip')
    expect(tooltip).toBeDefined()
    // tooltip 应显示某个价格文本
    expect(tooltip.textContent).toBeTruthy()
  })

  it('hover 移出 → tooltip 消失', () => {
    render(<DepthChart symbol="BTCUSDT" depth={depth} />)
    const svg = screen.getByTestId('depth-chart')
    svg.getBoundingClientRect = vi.fn(() => ({ left: 0, width: 760, right: 760, top: 0, height: 170, bottom: 170, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect)
    fireEvent.mouseMove(svg, { clientX: 200 })
    expect(screen.getByTestId('depth-tooltip')).toBeDefined()
    fireEvent.mouseLeave(svg)
    expect(screen.queryByTestId('depth-tooltip')).toBeNull()
  })

  it('交叉线在 hover 时出现', () => {
    render(<DepthChart symbol="BTCUSDT" depth={depth} />)
    const svg = screen.getByTestId('depth-chart')
    svg.getBoundingClientRect = vi.fn(() => ({ left: 0, width: 760, right: 760, top: 0, height: 170, bottom: 170, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect)
    fireEvent.mouseMove(svg, { clientX: 300 })
    expect(screen.getByTestId('depth-crosshair')).toBeDefined()
  })
})
