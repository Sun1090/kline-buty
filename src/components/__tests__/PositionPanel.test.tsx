// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { PositionPanel } from '../PositionPanel'
import type { Position } from '../../position/pnl'

afterEach(cleanup)

const longPosition: Position = {
  entry: 100,
  quantity: 2,
  direction: 'long',
  takeProfit: 103,
  stopLoss: 98,
}

describe('PositionPanel', () => {
  it('开多：输入价格数量 → 开仓回调含 TP/SL', () => {
    const onChange = vi.fn()
    render(<PositionPanel position={null} currentPrice={63000} onChange={onChange} />)
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByText('开仓'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ entry: 100, quantity: 2, direction: 'long' }),
    )
  })

  it('开空：TP 低于入场', () => {
    const onChange = vi.fn()
    render(<PositionPanel position={null} currentPrice={63000} onChange={onChange} />)
    fireEvent.click(screen.getByText('开空'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '1' } })
    fireEvent.click(screen.getByText('开仓'))
    const pos = onChange.mock.calls[0][0] as Position
    expect(pos.direction).toBe('short')
    expect(pos.takeProfit!).toBeLessThan(100)
    expect(pos.stopLoss!).toBeGreaterThan(100)
  })

  it('持仓时显示浮动盈亏（多头上涨盈利）', () => {
    render(<PositionPanel position={longPosition} currentPrice={105} onChange={vi.fn()} />)
    expect(screen.getByText(/\+10\.00 USDT/)).toBeDefined()
  })

  it('持仓时显示浮动亏损', () => {
    render(<PositionPanel position={longPosition} currentPrice={95} onChange={vi.fn()} />)
    expect(screen.getByText(/-10\.00 USDT/)).toBeDefined()
  })

  it('平仓回调 null', () => {
    const onChange = vi.fn()
    render(<PositionPanel position={longPosition} currentPrice={105} onChange={onChange} />)
    fireEvent.click(screen.getByText('平仓'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
