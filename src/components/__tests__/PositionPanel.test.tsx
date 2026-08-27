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

  it('价位模式：手填止盈/止损价 → 开仓回调含手填价', () => {
    const onChange = vi.fn()
    render(<PositionPanel position={null} currentPrice={63000} onChange={onChange} />)
    // 切换到价位模式
    fireEvent.click(screen.getByText('价位'))
    // 入场价 + 数量
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } }) // entry
    fireEvent.change(inputs[1], { target: { value: '2' } }) // quantity
    // 止盈价 + 止损价（price 模式下的两个输入框）
    fireEvent.change(inputs[2], { target: { value: '110' } }) // tpPrice
    fireEvent.change(inputs[3], { target: { value: '95' } }) // slPrice
    fireEvent.click(screen.getByText('开仓'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ entry: 100, quantity: 2, takeProfit: 110, stopLoss: 95 }),
    )
  })

  it('价位模式：止盈/止损价未填 → 开仓按钮禁用', () => {
    const onChange = vi.fn()
    render(<PositionPanel position={null} currentPrice={63000} onChange={onChange} />)
    fireEvent.click(screen.getByText('价位'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    // 不填 tp/sl 价 → 按钮禁用
    const btn = screen.getByText('开仓') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('模式切换 aria-pressed：当前模式 true', () => {
    render(<PositionPanel position={null} currentPrice={100} onChange={vi.fn()} />)
    const pctBtn = screen.getByText('百分比')
    const priceBtn = screen.getByText('价位')
    expect(pctBtn.getAttribute('aria-pressed')).toBe('true') // 默认 pct
    expect(priceBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(priceBtn)
    expect(priceBtn.getAttribute('aria-pressed')).toBe('true')
    expect(pctBtn.getAttribute('aria-pressed')).toBe('false')
  })
})
