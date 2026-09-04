// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { PositionPanel, _fromLegacy } from '../PositionPanel'
import type { Position } from '../../position/pnl'
import { EMPTY_POSITIONS } from '../../trade/positions'

afterEach(cleanup)

const longPosition: Position = {
  entry: 100,
  quantity: 2,
  direction: 'long',
  takeProfit: 103,
  stopLoss: 98,
}
const shortPosition: Position = {
  entry: 100,
  quantity: 3,
  direction: 'short',
  takeProfit: 97,
  stopLoss: 103,
}

describe('PositionPanel', () => {
  it('开多：输入价格数量 → 开仓回调写入 long 槽（含 TP/SL）', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={63000} onChange={onChange} />)
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByText('开仓'))
    const p = onChange.mock.calls[0][0] as { long: Position | null }
    expect(p.long).toEqual(expect.objectContaining({ entry: 100, quantity: 2, direction: 'long' }))
  })

  it('开空：TP 低于入场，写入 short 槽', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={63000} onChange={onChange} />)
    fireEvent.click(screen.getByText('开空'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '1' } })
    fireEvent.click(screen.getByText('开仓'))
    const p = onChange.mock.calls[0][0] as { short: Position | null }
    expect(p.short!.direction).toBe('short')
    expect(p.short!.takeProfit!).toBeLessThan(100)
    expect(p.short!.stopLoss!).toBeGreaterThan(100)
  })

  it('J1 双向持仓列表：long/short 同时显示浮动盈亏', () => {
    render(<PositionPanel positions={{ long: longPosition, short: shortPosition }} currentPrice={105} onChange={vi.fn()} />)
    expect(screen.getByTestId('position-row-long')).toBeDefined()
    expect(screen.getByTestId('position-row-short')).toBeDefined()
    expect(screen.getByText('+10.00')).toBeDefined() // long 105-100 ×2
    expect(screen.getByText('-15.00')).toBeDefined() // short 100-105 ×3
  })

  it('持仓时显示浮动亏损（仅 long）', () => {
    render(<PositionPanel positions={{ long: longPosition, short: null }} currentPrice={95} onChange={vi.fn()} />)
    expect(screen.getByText('-10.00')).toBeDefined()
  })

  it('J1 平仓：点击平仓按钮置空对应方向槽位', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={{ long: longPosition, short: shortPosition }} currentPrice={105} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('position-row-long').querySelector('button')!)
    expect(onChange).toHaveBeenCalledWith({ long: null, short: shortPosition })
  })

  it('J8 全部平仓：一键置空两方向槽位', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={{ long: longPosition, short: shortPosition }} currentPrice={105} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('position-close-all'))
    expect(onChange).toHaveBeenCalledWith({ long: null, short: null })
  })

  it('J8 无持仓时不显示全部平仓按钮', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={105} onChange={vi.fn()} />)
    expect(screen.queryByTestId('position-close-all')).toBeNull()
  })

  it('无持仓 → 显示空态提示', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={100} onChange={vi.fn()} />)
    expect(screen.getByText('暂无持仓')).toBeDefined()
  })

  it('价位模式：手填止盈/止损价 → 开仓回调含手填价', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={63000} onChange={onChange} />)
    fireEvent.click(screen.getByText('价位'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.change(inputs[2], { target: { value: '110' } })
    fireEvent.change(inputs[3], { target: { value: '95' } })
    fireEvent.click(screen.getByText('开仓'))
    const p = onChange.mock.calls[0][0] as { long: Position | null }
    expect(p.long).toEqual(expect.objectContaining({ entry: 100, quantity: 2, takeProfit: 110, stopLoss: 95 }))
  })

  it('价位模式：止盈/止损价未填 → 开仓按钮禁用', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={63000} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('价位'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    const btn = screen.getByText('开仓') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('模式切换 aria-pressed：当前模式 true', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={100} onChange={vi.fn()} />)
    const pctBtn = screen.getByText('百分比')
    const priceBtn = screen.getByText('价位')
    expect(pctBtn.getAttribute('aria-pressed')).toBe('true')
    expect(priceBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(priceBtn)
    expect(priceBtn.getAttribute('aria-pressed')).toBe('true')
    expect(pctBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('_fromLegacy：单仓位 → Positions 容器（方向对应槽位）', () => {
    expect(_fromLegacy(null)).toEqual(EMPTY_POSITIONS)
    expect(_fromLegacy(longPosition)).toEqual({ long: longPosition, short: null })
    expect(_fromLegacy(shortPosition)).toEqual({ long: null, short: shortPosition })
  })
})
