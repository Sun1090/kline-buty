// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
import { TradeHistoryPanel } from '../TradeHistoryPanel'
import { tradeStats } from '../../trade/stats'
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
    onExportEquity: vi.fn(),
    onReset: vi.fn(),
    onTakerFeeRatePctChange: vi.fn(),
    onSlippagePctChange: vi.fn(),
    onProfitTargetChange: vi.fn(),
    onSaveSnapshot: vi.fn(() => true),
    onLoadSnapshot: vi.fn(),
    onDeleteSnapshot: vi.fn(),
    onExportJson: vi.fn(),
    onImportJson: vi.fn(() => true),
  }
  const props: Parameters<typeof TradeHistoryPanel>[0] = {
    trades: [],
    stats: tradeStats([]),
    takerFeeRatePct: 0.1,
    slippagePct: 0.02,
    profitTarget: 0,
    snapshots: [],
    ...handlers,
    ...overrides,
  }
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

  it('J6 导出权益曲线按钮：触发 onExportEquity', () => {
    const handlers = setup({ trades })
    fireEvent.click(screen.getByTestId('trade-history-export-equity'))
    expect(handlers.onExportEquity).toHaveBeenCalled()
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

  it('D14 收益目标：输入目标显示进度，达标显示达成提示', () => {
    const handlers = setup({ trades, stats: tradeStats(trades), profitTarget: 100 })
    // trades 中平仓 pnl 18.58 → 进度约 19%
    expect(screen.getByTestId('trade-target-progress')).toBeTruthy()
    expect(screen.queryByTestId('trade-target-achieved')).toBeNull()
    fireEvent.change(screen.getByTestId('trade-target-input'), { target: { value: '50' } })
    expect(handlers.onProfitTargetChange).toHaveBeenCalledWith(50)
    // 重设为小目标 → 累计 18.58 未达 50，仍无达成徽标；用已达成状态渲染验证
  })

  it('D14 收益目标达成时显示达成徽标', () => {
    setup({ trades, stats: tradeStats(trades), profitTarget: 10 }) // 累计 18.58 ≥ 10
    expect(screen.getByTestId('trade-target-achieved')).toBeTruthy()
  })

  it('D13 账户快照：保存触发 onSaveSnapshot 并清空输入；载入/删除触发回调', () => {
    const handlers = setup({ snapshots: ['快照A'] })
    fireEvent.change(screen.getByTestId('trade-snapshot-name'), { target: { value: '快照B' } })
    fireEvent.click(screen.getByTestId('trade-snapshot-save'))
    expect(handlers.onSaveSnapshot).toHaveBeenCalledWith('快照B')
    expect((screen.getByTestId('trade-snapshot-name') as HTMLInputElement).value).toBe('') // 成功后清空
    expect(screen.getByTestId('trade-snapshot-load-快照A')).toBeTruthy()
    fireEvent.click(screen.getByTestId('trade-snapshot-load-快照A'))
    expect(handlers.onLoadSnapshot).toHaveBeenCalledWith('快照A')
    fireEvent.click(screen.getByTestId('trade-snapshot-del-快照A'))
    expect(handlers.onDeleteSnapshot).toHaveBeenCalledWith('快照A')
  })

  it('D13 保存失败（重名/空名）时输入保留', () => {
    const handlers = setup()
    handlers.onSaveSnapshot.mockReturnValue(false)
    fireEvent.change(screen.getByTestId('trade-snapshot-name'), { target: { value: '重复' } })
    fireEvent.click(screen.getByTestId('trade-snapshot-save'))
    expect(handlers.onSaveSnapshot).toHaveBeenCalledWith('重复')
    expect((screen.getByTestId('trade-snapshot-name') as HTMLInputElement).value).toBe('重复')
  })

  it('D15 JSON 导出/导入按钮：导出触发 onExportJson；导入走文件', () => {
    const handlers = setup()
    fireEvent.click(screen.getByTestId('trade-history-export-json'))
    expect(handlers.onExportJson).toHaveBeenCalled()
    expect(screen.getByTestId('trade-history-import-json')).toBeTruthy()
    expect(screen.getByTestId('trade-history-import-file')).toBeTruthy()
  })

  it('D10 手续费拆分：点击行展开按钮显示明细', () => {
    setup({ trades })
    expect(screen.queryByTestId('trade-history-detail')).toBeNull()
    const toggle = screen.getAllByTestId('trade-history-detail-toggle-open')[0]
    fireEvent.click(toggle)
    expect(screen.getByTestId('trade-history-detail')).toBeTruthy()
    // 明细含费率与手续费标签
    expect(screen.getByText('手续费')).toBeTruthy()
    expect(screen.getByText('费率')).toBeTruthy()
  })
})
