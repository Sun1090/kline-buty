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

  it('确认下单携带 side/price/qty（默认市价单）', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('qo-qty'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 2.5, type: 'market', leverage: 10, takeProfit: null, stopLoss: null })
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

  it('O7：百分比仓位按钮（25/50/75/100%）按余额计算数量', () => {
    setup({ balance: 10000, price: 100 })
    // 100%：余额 10000 ÷ (100 × 1.001) ≈ 99.9 → 按步长取整为 99.9
    fireEvent.click(screen.getByTestId('qo-pct-100'))
    const qty = Number((screen.getByTestId('qo-qty') as HTMLInputElement).value)
    expect(qty).toBeGreaterThan(0)
    expect(qty).toBeLessThan(100)
    // 25%：约为 100% 的 1/4
    fireEvent.click(screen.getByTestId('qo-pct-25'))
    const qty25 = Number((screen.getByTestId('qo-qty') as HTMLInputElement).value)
    expect(qty25).toBeGreaterThan(0)
    expect(qty25).toBeLessThan(qty)
  })

  it('v0.5.x 自定义百分比仓位：输入百分比 → 应用 → 按余额+费率计算数量', () => {
    setup({ balance: 10000, price: 100 })
    // 30%：10000×0.3 / (100×1.001) = 29.970... → 步长 0.001 取整 29.97
    fireEvent.change(screen.getByTestId('qo-pct-custom-input'), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('qo-pct-custom-apply'))
    expect((screen.getByTestId('qo-qty') as HTMLInputElement).value).toBe('29.97')
  })

  it('v0.5.x 自定义百分比仓位：空/非法输入点应用不改变数量', () => {
    setup({ balance: 10000, price: 100 })
    fireEvent.change(screen.getByTestId('qo-pct-custom-input'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('qo-pct-custom-apply'))
    expect((screen.getByTestId('qo-qty') as HTMLInputElement).value).toBe('1')
  })

  it('v0.5 键盘：Enter 确认下单（有效时携带 side/price/qty）', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('qo-qty'), { target: { value: '3' } })
    fireEvent.keyDown(screen.getByTestId('quick-order'), { key: 'Enter' })
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 3, type: 'market', leverage: 10, takeProfit: null, stopLoss: null })
  })

  it('v0.5 键盘：非法值 Enter 不下单', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('qo-price'), { target: { value: '-1' } })
    fireEvent.keyDown(screen.getByTestId('quick-order'), { key: 'Enter' })
    expect(handlers.onConfirm).not.toHaveBeenCalled()
  })

  it('v0.5 键盘：Esc 关闭弹层', () => {
    const handlers = setup()
    fireEvent.keyDown(screen.getByTestId('quick-order'), { key: 'Escape' })
    expect(handlers.onClose).toHaveBeenCalled()
  })

  it('v0.5.x 限价模式：提交携带 type=limit，成交价=挂单价、按挂单费率计费', () => {
    const handlers = setup({ makerFeeRate: 0.0005 })
    fireEvent.click(screen.getByTestId('qo-type-limit'))
    fireEvent.change(screen.getByTestId('qo-qty'), { target: { value: '1' } })
    // 无滑点：估计成交价即挂单价；手续费 100×1×0.05% = 0.0500
    expect(screen.getByTestId('qo-limit-price').textContent).toContain('100.00')
    expect(screen.getByTestId('qo-fee').textContent).toBe('0.0500')
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'limit', leverage: 10, takeProfit: null, stopLoss: null })
  })

  it('v0.5.x 限价模式：挂价高于参考价（下单即吃单）按吃单费率预估', () => {
    setup({ makerFeeRate: 0.0005, takerFeeRate: 0.001 })
    fireEvent.click(screen.getByTestId('qo-type-limit'))
    // 参考价 100：贴价 100 排队（Maker 0.0500），抬到 101 就跨过价差 → Taker 0.1010
    expect(screen.getByTestId('qo-fee').textContent).toBe('0.0500')
    fireEvent.change(screen.getByTestId('qo-price'), { target: { value: '101' } })
    expect(screen.getByTestId('qo-fee').textContent).toBe('0.1010')
    fireEvent.change(screen.getByTestId('qo-price'), { target: { value: '99' } })
    expect(screen.getByTestId('qo-fee').textContent).toBe('0.0495')
  })

  it('v0.5.x 市价模式按吃单费率 + 滑点计费，切回市价即恢复', () => {
    setup({ takerFeeRate: 0.001 })
    fireEvent.click(screen.getByTestId('qo-type-limit'))
    fireEvent.click(screen.getByTestId('qo-type-market'))
    // 100 × (1+0.02%) × 0.1% ≈ 0.1000
    expect(screen.getByTestId('qo-fee').textContent).toBe('0.1000')
    expect(screen.queryByTestId('qo-limit-price')).toBeNull()
  })

  it('v0.5.x initialType=limit：打开即处于挂单模式（图表右键入口）', () => {
    const handlers = setup({ initialType: 'limit' })
    expect((screen.getByTestId('qo-type-limit') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByTestId('qo-type-market') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'limit', leverage: 10, takeProfit: null, stopLoss: null })
  })
  it('限价模式随单止盈/止损：填了就带进 onConfirm，留空即 null', () => {
    const handlers = setup({ initialType: 'limit' })
    fireEvent.change(screen.getByTestId('qo-tp'), { target: { value: '130' } })
    fireEvent.change(screen.getByTestId('qo-sl'), { target: { value: '90' } })
    expect(screen.queryByTestId('qo-attach-err')).toBeNull()
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'limit', leverage: 10, takeProfit: 130, stopLoss: 90 })
  })

  it('随单价位站错一侧 → 行内报错并禁用确认；改对后放行', () => {
    const handlers = setup({ initialType: 'limit' })
    // 买单止盈必须高于挂单价：80 不成立
    fireEvent.change(screen.getByTestId('qo-tp'), { target: { value: '80' } })
    expect(screen.getByTestId('qo-attach-err')).toBeTruthy()
    expect((screen.getByTestId('qo-confirm') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).not.toHaveBeenCalled()
    // 文本垃圾不能当成「未设置」放行
    fireEvent.change(screen.getByTestId('qo-tp'), { target: { value: 'abc' } })
    expect((screen.getByTestId('qo-confirm') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByTestId('qo-tp'), { target: { value: '130' } })
    expect((screen.getByTestId('qo-confirm') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'limit', leverage: 10, takeProfit: 130, stopLoss: null })
  })

  it('市价模式不渲染随单输入，提交携带 null', () => {
    const handlers = setup()
    expect(screen.queryByTestId('qo-tp')).toBeNull()
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'market', leverage: 10, takeProfit: null, stopLoss: null })
  })

  it('切回市价模式后，已填的随单价位不再带进订单', () => {
    const handlers = setup({ initialType: 'limit' })
    fireEvent.change(screen.getByTestId('qo-tp'), { target: { value: '130' } })
    fireEvent.click(screen.getByTestId('qo-type-market'))
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith({ side: 'buy', price: 100, qty: 1, type: 'market', leverage: 10, takeProfit: null, stopLoss: null })
  })

  it('杠杆选择器默认 10x，改档后市价单带上', () => {
    const handlers = setup()
    expect((screen.getByTestId('qo-leverage') as HTMLSelectElement).value).toBe('10')
    fireEvent.change(screen.getByTestId('qo-leverage'), { target: { value: '20' } })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ type: 'market', leverage: 20 }))
  })

  it('限价单同样带上所选杠杆（1x 也算显式选择）', () => {
    const handlers = setup({ initialType: 'limit' })
    fireEvent.change(screen.getByTestId('qo-leverage'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(handlers.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ type: 'limit', leverage: 1 }))
  })

})
