// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { QuickOrder } from '../QuickOrder'

afterEach(cleanup)

const BASE = {
  symbol: 'BTCUSDT',
  side: 'buy' as const,
  price: 100,
  balance: 10_000,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

function setup(overrides: Partial<Parameters<typeof QuickOrder>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onClose: vi.fn() }
  render(<QuickOrder {...BASE} {...handlers} {...overrides} />)
  return handlers
}

describe('QuickOrder 快速下单', () => {
  it('渲染标题/价格/数量/确认，默认数量 1', () => {
    setup()
    expect(screen.getByTestId('quick-order')).toBeTruthy()
    expect((screen.getByTestId('qo-qty') as HTMLInputElement).value).toBe('1')
    expect(screen.getByTestId('qo-confirm')).toBeTruthy()
  })

  it('D8 手数预设：点击预设按钮填入对应数量', () => {
    setup()
    fireEvent.click(screen.getByTestId('qo-qty-0.001'))
    expect((screen.getByTestId('qo-qty') as HTMLInputElement).value).toBe('0.001')
    fireEvent.click(screen.getByTestId('qo-qty-5'))
    expect((screen.getByTestId('qo-qty') as HTMLInputElement).value).toBe('5')
  })

  it('确认下单携带 side/price/qty', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('qo-qty'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 2.5 })
  })

  it('余额不足时确认按钮禁用', () => {
    const handlers = setup({ balance: 1 })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).not.toHaveBeenCalled()
    expect(screen.getByTestId('qo-insufficient')).toBeTruthy()
  })

  it('关闭按钮触发 onClose', () => {
    const handlers = setup()
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(handlers.onClose).toHaveBeenCalled()
  })

  it('O7：bid/ask 一键填入价格框', () => {
    setup({ bid: 99.5, ask: 100.5 })
    fireEvent.click(screen.getByTestId('qo-bid'))
    expect((screen.getByTestId('qo-price') as HTMLInputElement).value).toBe('99.5')
    fireEvent.click(screen.getByTestId('qo-ask'))
    expect((screen.getByTestId('qo-price') as HTMLInputElement).value).toBe('100.5')
  })

  it('O7：非法价格/数量 → 确认禁用（无估计值）', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('qo-price'), { target: { value: '-5' } })
    const btn = screen.getByTestId('qo-confirm') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(handlers.onConfirm).not.toHaveBeenCalled()
  })

  it('O7：sell 侧渲染卖出侧样式与标题', () => {
    setup({ side: 'sell' })
    expect(screen.getByText(/卖出|Sell|売り|매도|Vender/)).toBeTruthy()
  })

  it('O7：balance 为空时不拦截（无余额校验）', () => {
    const handlers = setup({ balance: null })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalled()
    expect(screen.queryByTestId('qo-insufficient')).toBeNull()
  })
})
