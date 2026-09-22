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
  it('低价标的：入场价、推导止盈止损与占位提示给足小数位，不塌成 0.00', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={0.125} onChange={vi.fn()} />)
    // 占位提示走价段档位（<1 六位），此前是 toFixed(2) 的「0.13」——把 0.125 直接读成 0.13
    expect(screen.getByPlaceholderText('0.125000')).toBeDefined()
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '0.123456' } })
    fireEvent.change(inputs[1], { target: { value: '100' } })
    // 百分比模式（默认 3% / 2%）推导出的价位：0.123456×1.03 与 ×0.98
    expect(screen.getByText('0.127160')).toBeDefined()
    expect(screen.getByText('0.120987')).toBeDefined()
    // 强平价同样不该被压成两位
    expect(screen.getByTestId('position-liq').textContent).toMatch(/0\.\d{4,}/)
  })

  it('已持低价仓位：槽位摘要里的开仓均价按价段展示完整', () => {
    const pos: Position = { entry: 0.123456, quantity: 1000, direction: 'long', takeProfit: 0.13, stopLoss: 0.12 }
    render(<PositionPanel positions={{ long: pos, short: null }} currentPrice={0.125} onChange={vi.fn()} />)
    expect(screen.getByText(/@ 0\.123456/)).toBeDefined()
  })

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

  it('已有同方向持仓再开仓 → 加仓合并：均价与数量相加，价位线沿用既有持仓', () => {
    const onChange = vi.fn()
    const held: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 130, stopLoss: 118, trailPct: 1.5 }
    render(<PositionPanel positions={{ long: held, short: null }} currentPrice={63000} onChange={onChange} />)
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '200' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByText('开仓'))
    const p = onChange.mock.calls[0][0] as { long: Position | null }
    // 表单默认 3%/2% 会给出 206/196：合并按既有持仓的线，不按新均价重算
    expect(p.long).toEqual({ entry: 150, quantity: 4, direction: 'long', takeProfit: 130, stopLoss: 118, trailPct: 1.5 })
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

  it('J2 其他品种持仓：显示一览，切品种与全平触发回调', () => {
    const onChange = vi.fn()
    const onSwitchSymbol = vi.fn()
    const onSettleSymbol = vi.fn()
    render(
      <PositionPanel
        positions={EMPTY_POSITIONS}
        currentPrice={105}
        onChange={onChange}
        otherSymbols={{ ETHUSDT: { long: longPosition, short: null } }}
        onSwitchSymbol={onSwitchSymbol}
        onSettleSymbol={onSettleSymbol}
      />,
    )
    expect(screen.getByTestId('position-other-ETHUSDT')).toBeDefined()
    fireEvent.click(screen.getByText(/ETHUSDT/))
    expect(onSwitchSymbol).toHaveBeenCalledWith('ETHUSDT')
    fireEvent.click(screen.getByLabelText('全部平仓 ETHUSDT'))
    expect(onSettleSymbol).toHaveBeenCalledWith('ETHUSDT')
  })

  it('J2 无其他品种时不显示一览区', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={105} onChange={vi.fn()} />)
    expect(screen.queryByTestId('position-other-symbols')).toBeNull()
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

  it('D9 开仓记录所选杠杆（强平预警数据源）', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={63000} onChange={onChange} />)
    fireEvent.click(screen.getByText('20x'))
    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByText('开仓'))
    const p = onChange.mock.calls[0][0] as { long: Position | null }
    expect(p.long!.leverage).toBe(20)
  })

  it('D9 强平预警：低保证金率显示警示徽标；安全时不显示', () => {
    // 100x 杠杆 long 持仓 entry=100 qty=2：现价 99 → 保证金率 0（临界）
    const risky: Position = { entry: 100, quantity: 2, direction: 'long', leverage: 100 }
    render(<PositionPanel positions={{ long: risky, short: null }} currentPrice={99} onChange={vi.fn()} />)
    expect(screen.getByTestId('position-liq-warn-long')).toBeTruthy()
  })

  it('D9 高保证金率持仓不显示强平预警', () => {
    const safe: Position = { entry: 100, quantity: 2, direction: 'long', leverage: 10 }
    render(<PositionPanel positions={{ long: safe, short: null }} currentPrice={100} onChange={vi.fn()} />)
    expect(screen.queryByTestId('position-liq-warn-long')).toBeNull()
  })

  it('v0.5 账户总览：显示可用余额与当前品种浮动盈亏', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={{ long: longPosition, short: null }} currentPrice={110} balance={9500} onChange={onChange} />)
    const summary = screen.getByTestId('position-account-summary')
    expect(summary.textContent).toContain('9500.00')
    // long：entry 100 × 2，现价 110 → (110-100)×2 = 20 → +20.00
    expect(summary.textContent).toContain('+20.00')
  })

  it('v0.5 账户总览：无持仓显示浮动盈亏占位 —', () => {
    const onChange = vi.fn()
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} balance={10000} onChange={onChange} />)
    const summary = screen.getByTestId('position-account-summary')
    expect(summary.textContent).toContain('10000.00')
    expect(summary.textContent).toContain('—')
  })

  it('v0.5 账户总览：未传 balance 不渲染汇总', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} onChange={vi.fn()} />)
    expect(screen.queryByTestId('position-account-summary')).toBeNull()
  })

  it('v0.5.x 反手：点击反手按钮回调对应方向槽位', () => {
    const onReverse = vi.fn()
    render(<PositionPanel positions={{ long: longPosition, short: null }} currentPrice={105} onChange={vi.fn()} onReverse={onReverse} />)
    fireEvent.click(screen.getByTestId('position-reverse-long'))
    expect(onReverse).toHaveBeenCalledWith('long')
  })

  it('v0.5.x 反手：short 槽点击回调 short', () => {
    const onReverse = vi.fn()
    render(<PositionPanel positions={{ long: null, short: shortPosition }} currentPrice={105} onChange={vi.fn()} onReverse={onReverse} />)
    fireEvent.click(screen.getByTestId('position-reverse-short'))
    expect(onReverse).toHaveBeenCalledWith('short')
  })

  it('v0.5.x 反手：无现价时禁用', () => {
    const onReverse = vi.fn()
    render(<PositionPanel positions={{ long: longPosition, short: null }} currentPrice={null} onChange={vi.fn()} onReverse={onReverse} />)
    expect((screen.getByTestId('position-reverse-long') as HTMLButtonElement).disabled).toBe(true)
  })

  it('v0.5.x 反手：余额不足（名义金额 ≥ 可用余额）时禁用，充足时可用', () => {
    const onReverse = vi.fn()
    const { rerender } = render(
      <PositionPanel positions={{ long: longPosition, short: null }} currentPrice={1000} balance={100} onChange={vi.fn()} onReverse={onReverse} />,
    )
    // currentPrice × qty = 2000 ≥ balance 100 → 禁用
    expect((screen.getByTestId('position-reverse-long') as HTMLButtonElement).disabled).toBe(true)
    rerender(<PositionPanel positions={{ long: longPosition, short: null }} currentPrice={10} balance={100} onChange={vi.fn()} onReverse={onReverse} />)
    // currentPrice × qty = 20 < balance 100 → 可用
    expect((screen.getByTestId('position-reverse-long') as HTMLButtonElement).disabled).toBe(false)
  })

  it('v0.5.x 账户总览：显示今日已实现盈亏（含正负号）', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} balance={10000} todayPnl={12.5} onChange={vi.fn()} />)
    const pnl = screen.getByTestId('position-today-pnl')
    expect(pnl.textContent).toBe('+12.50')
  })

  it('v0.5.x 账户总览：今日亏损显示负号', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} balance={10000} todayPnl={-3.2} onChange={vi.fn()} />)
    expect(screen.getByTestId('position-today-pnl').textContent).toBe('-3.20')
  })

  it('v0.5.x 账户总览：未传 todayPnl 不渲染今日盈亏', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} balance={10000} onChange={vi.fn()} />)
    expect(screen.queryByTestId('position-today-pnl')).toBeNull()
  })

  it('v0.5.x 限价挂单：传入列表即渲染挂单区，撤销回调上报 id', () => {
    const onCancelOrder = vi.fn()
    render(
      <PositionPanel
        positions={EMPTY_POSITIONS}
        currentPrice={110}
        onChange={vi.fn()}
        symbol="BTCUSDT"
        pendingOrders={[{ id: 'a', symbol: 'BTCUSDT', side: 'buy', price: 100, qty: 1, createdAt: 1, marketable: false }]}
        onCancelOrder={onCancelOrder}
      />,
    )
    expect(screen.getByTestId('pending-orders')).toBeTruthy()
    fireEvent.click(screen.getByTestId('pending-order-cancel'))
    expect(onCancelOrder).toHaveBeenCalledWith('a')
  })

  it('v0.5.x 限价挂单：未传挂单属性则不渲染挂单区', () => {
    render(<PositionPanel positions={EMPTY_POSITIONS} currentPrice={110} onChange={vi.fn()} />)
    expect(screen.queryByTestId('pending-orders')).toBeNull()
  })

  describe('v0.5.x 持仓止盈止损行内编辑', () => {
    const held = { long: longPosition, short: null }

    it('展开编辑器：以当前止盈/止损预填', () => {
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} />)
      expect(screen.queryByTestId('position-levels-editor-long')).toBeNull()
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      expect((screen.getByTestId('position-level-tp-long') as HTMLInputElement).value).toBe('103')
      expect((screen.getByTestId('position-level-sl-long') as HTMLInputElement).value).toBe('98')
    })

    it('保存：回调收到更新后的两条线，其余字段不变', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-tp-long'), { target: { value: '150' } })
      fireEvent.change(screen.getByTestId('position-level-sl-long'), { target: { value: '95' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as { long: Position }
      expect(next.long).toEqual({ ...longPosition, takeProfit: 150, stopLoss: 95 })
      expect(screen.queryByTestId('position-levels-editor-long')).toBeNull()
    })

    it('留空即清除该线', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-tp-long'), { target: { value: '' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      const next = onChange.mock.calls[0][0] as { long: Position }
      expect('takeProfit' in next.long).toBe(false)
      expect(next.long.stopLoss).toBe(98)
    })

    it('非法价位：显示错误且不回调', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-tp-long'), { target: { value: '80' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByTestId('position-level-error')).toBeTruthy()
      // 取消可收起编辑器
      fireEvent.click(screen.getByTestId('position-level-cancel-long'))
      expect(screen.queryByTestId('position-levels-editor-long')).toBeNull()
    })

    it('保本止损：立即把止损写到开仓价', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.click(screen.getByTestId('position-level-breakeven-long'))
      const next = onChange.mock.calls[0][0] as { long: Position }
      expect(next.long.stopLoss).toBe(100)
      expect(next.long.takeProfit).toBe(103)
      expect((screen.getByTestId('position-level-sl-long') as HTMLInputElement).value).toBe('100')
    })

    it('空头编辑器独立：编辑 short 不影响 long', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={{ long: longPosition, short: shortPosition }} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-short'))
      fireEvent.change(screen.getByTestId('position-level-sl-short'), { target: { value: '120' } })
      fireEvent.click(screen.getByTestId('position-level-save-short'))
      const next = onChange.mock.calls[0][0] as { long: Position; short: Position }
      expect(next.short.stopLoss).toBe(120)
      expect(next.long).toEqual(longPosition)
    })

    it('移动止损：预填已设百分比，保存后写回 trailPct 并显示徽标', () => {
      const onChange = vi.fn()
      const { unmount } = render(
        <PositionPanel positions={{ long: { ...longPosition, trailPct: 2 }, short: null }} currentPrice={110} onChange={onChange} />,
      )
      expect(screen.getByTestId('position-trail-long').textContent).toContain('2')
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      expect((screen.getByTestId('position-level-trail-long') as HTMLInputElement).value).toBe('2')
      fireEvent.change(screen.getByTestId('position-level-trail-long'), { target: { value: '1.5' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      const next = onChange.mock.calls[0][0] as { long: Position }
      expect(next.long).toEqual({ ...longPosition, trailPct: 1.5 })
      unmount()

      // 未设移动止损时不显示徽标，编辑格里也是空
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} />)
      expect(screen.queryByTestId('position-trail-long')).toBeNull()
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      expect((screen.getByTestId('position-level-trail-long') as HTMLInputElement).value).toBe('')
    })

    it('移动止损：留空即关闭该档', () => {
      const onChange = vi.fn()
      render(
        <PositionPanel positions={{ long: { ...longPosition, trailPct: 2 }, short: null }} currentPrice={110} onChange={onChange} />,
      )
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-trail-long'), { target: { value: '' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      const next = onChange.mock.calls[0][0] as { long: Position }
      expect('trailPct' in next.long).toBe(false)
      expect(next.long.takeProfit).toBe(103)
    })

    it('移动止损：百分比越界（0 / 120）→ 报错且不回调', () => {
      const onChange = vi.fn()
      render(
        <PositionPanel positions={{ long: { ...longPosition, trailPct: 2 }, short: null }} currentPrice={110} onChange={onChange} />,
      )
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-trail-long'), { target: { value: '120' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByTestId('position-level-error')).toBeTruthy()
    })

    it('止损可保存到现价之下的盈利区（跟随推进后的值），超过现价仍报错', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={130} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      // 止盈留在 103 会与 128 的止损交叉 → 一并清除，只保留推进后的止损
      fireEvent.change(screen.getByTestId('position-level-tp-long'), { target: { value: '' } })
      fireEvent.change(screen.getByTestId('position-level-sl-long'), { target: { value: '128' } })
      fireEvent.change(screen.getByTestId('position-level-trail-long'), { target: { value: '2' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange.mock.calls[0][0]).toEqual({
        long: { entry: 100, quantity: 2, direction: 'long', stopLoss: 128, trailPct: 2 },
        short: null,
      })
    })

    it('止损高于现价仍为非法', () => {
      const onChange = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('position-edit-levels-long'))
      fireEvent.change(screen.getByTestId('position-level-sl-long'), { target: { value: '115' } })
      fireEvent.click(screen.getByTestId('position-level-save-long'))
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByTestId('position-level-error')).toBeTruthy()
    })
  })
  describe('v0.5.x 部分平仓（减仓）', () => {
    const held = { long: longPosition, short: null }

    it('展开减仓编辑器：默认预填一半数量', () => {
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} />)
      expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      expect((screen.getByTestId('position-reduce-qty-long') as HTMLInputElement).value).toBe('1')
      // 再点一次收起
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
    })

    it('确认减仓：回调收到减仓量并收起编辑器', () => {
      const onReduce = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} onReduce={onReduce} />)
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '0.75' } })
      fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
      expect(onReduce).toHaveBeenCalledTimes(1)
      expect(onReduce).toHaveBeenCalledWith('long', 0.75)
      expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
    })

    it('比例芯片直接按量回调（25% → 2 × 25% = 0.5）', () => {
      const onReduce = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} onReduce={onReduce} />)
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      fireEvent.click(screen.getByTestId('position-reduce-ratio-long-25'))
      expect(onReduce).toHaveBeenCalledWith('long', 0.5)
    })

    it('数量非法（0 / 文本 / 超过持仓量）→ 报错且不回调', () => {
      const onReduce = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} onReduce={onReduce} />)
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      for (const bad of ['0', '-1', 'abc', '2.5']) {
        fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: bad } })
        fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
        expect(onReduce).not.toHaveBeenCalled()
        expect(screen.getByTestId('position-reduce-error')).toBeTruthy()
        // 编辑器保持展开，等用户改数
        expect(screen.getByTestId('position-reduce-editor-long')).toBeTruthy()
      }
    })

    it('改数即清掉错误提示', () => {
      const onReduce = vi.fn()
      render(<PositionPanel positions={held} currentPrice={110} onChange={vi.fn()} onReduce={onReduce} />)
      fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
      fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '9' } })
      fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
      expect(screen.getByTestId('position-reduce-error')).toBeTruthy()
      fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '1' } })
      expect(screen.queryByTestId('position-reduce-error')).toBeNull()
    })

    it('多空各自独立：只展开 short 时 long 没有编辑器', () => {
      const onReduce = vi.fn()
      render(
        <PositionPanel
          positions={{ long: longPosition, short: shortPosition }}
          currentPrice={110}
          onChange={vi.fn()}
          onReduce={onReduce}
        />,
      )
      fireEvent.click(screen.getByTestId('position-reduce-toggle-short'))
      expect(screen.getByTestId('position-reduce-editor-short')).toBeTruthy()
      expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
      // short 数量 3 → 一半 1.5
      fireEvent.click(screen.getByTestId('position-reduce-ratio-short-25'))
      expect(onReduce).toHaveBeenCalledWith('short', 0.75)
    })
  })
})

