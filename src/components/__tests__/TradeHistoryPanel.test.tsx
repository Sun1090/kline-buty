// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
import { TradeHistoryPanel } from '../TradeHistoryPanel'
import type { TradeRecord } from '../../hooks/usePaperAccount'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.useFakeTimers()
})

const trades: TradeRecord[] = [
  { id: '1', at: Date.now(), symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 2, fee: 0.2 },
  { id: '2', at: Date.now(), symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 110, qty: 2, fee: 0.22, pnl: 18.58 },
]

function setup(overrides: Partial<Parameters<typeof TradeHistoryPanel>[0]> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onClear: vi.fn(),
    onExport: vi.fn(),
    onReset: vi.fn(),
  }
  const props: Parameters<typeof TradeHistoryPanel>[0] = { trades: [], ...handlers, ...overrides }
  render(<TradeHistoryPanel {...props} />)
  return handlers
}

describe('TradeHistoryPanel 交易流水面板', () => {
  it('空态显示提示，无导出/清空按钮', () => {
    setup()
    expect(screen.getByText('暂无成交——开仓后此处记录成交流水')).toBeTruthy()
    expect(screen.queryByTestId('trade-history-export')).toBeNull()
    expect(screen.queryByTestId('trade-history-clear')).toBeNull()
  })

  it('有流水时：导出/清空按钮可见，导出触发 onExport', () => {
    const handlers = setup({ trades })
    expect(screen.getByTestId('trade-history-export')).toBeTruthy()
    expect(screen.getByTestId('trade-history-clear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('trade-history-export'))
    expect(handlers.onExport).toHaveBeenCalled()
  })

  it('清空按钮触发 onClear', () => {
    const handlers = setup({ trades })
    fireEvent.click(screen.getByTestId('trade-history-clear'))
    expect(handlers.onClear).toHaveBeenCalled()
  })

  it('重置两步确认：首次点击进入确认态，3s 内再次点击才触发 onReset', () => {
    const handlers = setup({ trades })
    const resetBtn = screen.getByTestId('trade-history-reset')
    fireEvent.click(resetBtn)
    expect(handlers.onReset).not.toHaveBeenCalled() // 首次进入确认态
    fireEvent.click(resetBtn)
    expect(handlers.onReset).toHaveBeenCalledTimes(1)
  })

  it('重置确认态 3s 后自动复位：超时后再点需重新进入确认态', () => {
    const handlers = setup({ trades })
    const resetBtn = screen.getByTestId('trade-history-reset')
    fireEvent.click(resetBtn)
    act(() => {
      vi.advanceTimersByTime(3001) // 确认态超时复位
    })
    fireEvent.click(resetBtn) // 已复位 → 进入确认态而非触发
    expect(handlers.onReset).not.toHaveBeenCalled()
    fireEvent.click(resetBtn)
    expect(handlers.onReset).toHaveBeenCalledTimes(1)
  })

  it('关闭按钮触发 onClose', () => {
    const handlers = setup({ trades })
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(handlers.onClose).toHaveBeenCalled()
  })
})
