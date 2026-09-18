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

  it('v0.5 权益曲线：渲染交互式曲线 + 最大回撤/当前回撤指标', () => {
    // 新记录在前：亏损平仓(时间2000) → 开仓(时间1000)；权益 10000→9999.5(开仓费)→9949.5(-50)
    // 峰 max(10000,9999.5,9949.5)=10000，谷 9949.5 → 最大回撤 50.5/10000 = 0.51%
    const perfTrades: TradeRecord[] = [
      { id: 'c1', at: 2_000, symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 90, qty: 5, fee: 0.45, feeRate: 0.001, pnl: -50 },
      { id: 'o1', at: 1_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 5, fee: 0.5, feeRate: 0.001 },
    ]
    setup({ trades: perfTrades })
    const equity = screen.getByTestId('trade-history-equity')
    expect(screen.getByTestId('equity-curve')).toBeTruthy()
    expect(equity.textContent).toContain('最大回撤')
    expect(equity.textContent).toContain('0.51%')
    expect(equity.textContent).toContain('9949.50')
    expect(equity.textContent).toContain('0.51%') // 当前回撤同 0.51%（位于低谷）
    // v0.5 逐笔盈亏条形图：含一笔亏损平仓 → 1 根柱
    expect(screen.getByTestId('pnl-bars').querySelectorAll('rect')).toHaveLength(1)
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

  it('v0.5 流水过滤：多品种时按品种/方向过滤列表', () => {
    const multi: TradeRecord[] = [
      { id: 'b1', at: 3_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 60_000, qty: 1, fee: 0.6, feeRate: 0.001 },
      { id: 'e1', at: 2_000, symbol: 'ETHUSDT', side: 'sell', kind: 'close', price: 3_500, qty: 2, fee: 0.7, feeRate: 0.001, pnl: 12.3 },
      { id: 'b2', at: 1_000, symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 61_000, qty: 1, fee: 0.61, feeRate: 0.001, pnl: 999.39 },
    ]
    setup({ trades: multi })
    // 多品种 → 过滤行可见；全部 3 行
    expect(screen.getByTestId('trade-filter-row')).toBeTruthy()
    expect(screen.getAllByTestId('trade-history-row')).toHaveLength(3)
    // 按品种 BTCUSDT → 2 行
    fireEvent.change(screen.getByTestId('trade-filter-symbol'), { target: { value: 'BTCUSDT' } })
    expect(screen.getAllByTestId('trade-history-row')).toHaveLength(2)
    // 再按方向 sell → 1 行（b2）
    fireEvent.change(screen.getByTestId('trade-filter-side'), { target: { value: 'sell' } })
    expect(screen.getAllByTestId('trade-history-row')).toHaveLength(1)
    expect(screen.getByTestId('trade-history-row').textContent).toContain('999.39')
    // 清空方向 → 回到 2 行
    fireEvent.change(screen.getByTestId('trade-filter-side'), { target: { value: '' } })
    expect(screen.getAllByTestId('trade-history-row')).toHaveLength(2)
  })

  it('v0.5 流水过滤：关键词无匹配显示空态提示', () => {
    const multi: TradeRecord[] = [
      { id: 'b1', at: 2_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 60_000, qty: 1, fee: 0.6, feeRate: 0.001 },
      { id: 'e1', at: 1_000, symbol: 'ETHUSDT', side: 'sell', kind: 'close', price: 3_500, qty: 2, fee: 0.7, feeRate: 0.001, pnl: 12.3 },
    ]
    setup({ trades: multi })
    fireEvent.change(screen.getByTestId('trade-filter-query'), { target: { value: 'DOGE' } })
    expect(screen.queryAllByTestId('trade-history-row')).toHaveLength(0)
    expect(screen.getByText('无匹配记录')).toBeTruthy()
  })

  it('v0.5 按品种汇总：点击行触发 onSwitchSymbol（含品种）', () => {
    const multi: TradeRecord[] = [
      { id: 'b1', at: 2_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 60_000, qty: 1, fee: 0.6, feeRate: 0.001 },
      { id: 'e1', at: 1_000, symbol: 'ETHUSDT', side: 'sell', kind: 'close', price: 3_500, qty: 2, fee: 0.7, feeRate: 0.001, pnl: 12.3 },
    ]
    const onSwitchSymbol = vi.fn()
    setup({ trades: multi, onSwitchSymbol })
    fireEvent.click(screen.getByTestId('trade-by-symbol-toggle'))
    fireEvent.click(screen.getByTestId('trade-by-symbol-row-ETHUSDT'))
    expect(onSwitchSymbol).toHaveBeenCalledWith('ETHUSDT')
  })

  it('v0.5 按日分组：UTC 日标题 + 每日小计（笔数 / 当日盈亏）', () => {
    // 2026-01-05 与 2026-01-06 两日（新在前）
    const D0 = 1_767_571_200_000
    const multi: TradeRecord[] = [
      { id: 'd2-open', at: D0 + 26 * 3_600_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 60_000, qty: 1, fee: 0.6, feeRate: 0.001 },
      { id: 'd2-close', at: D0 + 25 * 3_600_000, symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 61_000, qty: 1, fee: 0.61, feeRate: 0.001, pnl: 999.39 },
      { id: 'd1-close', at: D0 + 3_600_000, symbol: 'ETHUSDT', side: 'sell', kind: 'close', price: 3_500, qty: 2, fee: 0.7, feeRate: 0.001, pnl: -12.3 },
      { id: 'd1-open', at: D0, symbol: 'ETHUSDT', side: 'buy', kind: 'open', price: 3_400, qty: 2, fee: 0.68, feeRate: 0.001 },
    ]
    setup({ trades: multi })
    const days = screen.getAllByTestId('trade-history-day')
    expect(days).toHaveLength(2)
    // 新日前：2026-01-06（2 笔 + 999.39）
    expect(days[0].textContent).toContain('2026-01-06')
    expect(days[0].textContent).toContain('笔数 2')
    expect(days[0].textContent).toContain('+999.39')
    // 旧日后：2026-01-05（2 笔 -12.3）
    expect(days[1].textContent).toContain('2026-01-05')
    expect(days[1].textContent).toContain('笔数 2')
    expect(days[1].textContent).toContain('-12.30')
  })

  it('v0.5.x 期间盈亏：有流水时显示今日/本周/本月条（UTC 同域时三值一致）', () => {
    setup({ trades })
    const strip = screen.getByTestId('trade-period-pnl')
    const text = strip.textContent ?? ''
    // 开仓/平仓 at 与渲染同日期 → 日/周/月键同域，pnl 都计入
    expect(text).toContain('当日盈亏')
    expect(text).toContain('本周盈亏')
    expect(text).toContain('本月盈亏')
    expect(text.match(/\+18\.58/g)?.length).toBe(3)
  })

  it('v0.5.x 期间盈亏：负盈亏显示负号', () => {
    setup({ trades: [{ ...trades[1], pnl: -5.5 }] })
    expect((screen.getByTestId('trade-period-pnl').textContent ?? '').match(/-5\.50/g)?.length).toBe(3)
  })

  it('v0.5.x 期间盈亏：无流水时不显示', () => {
    setup({ trades: [] })
    expect(screen.queryByTestId('trade-period-pnl')).toBeNull()
  })
})
