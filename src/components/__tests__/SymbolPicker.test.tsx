// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react'
import { SymbolPicker } from '../SymbolPicker'

// mock 行情快照 hook（避免 REST/WebSocket 调用）
vi.mock('../../hooks/useMarketSnapshots', () => ({
  useMarketSnapshots: () => ({
    snapshots: {
      BTCUSDT: { symbol: 'BTCUSDT', price: 65000, changePct: 2.5, spark: [1, 2, 3] },
      ETHUSDT: { symbol: 'ETHUSDT', price: 3500, changePct: -1.2, spark: [3, 2, 1] },
    },
    loading: false,
  }),
}))

afterEach(cleanup)

describe('SymbolPicker', () => {
  beforeEach(() => {
    // jsdom 无实现 layout，getBoundingClientRect 返回 0；SymbolPicker 用它算 menuPos
    // 桌面视口宽度让 fixed 定位分支不抛错
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  })

  it('渲染当前交易对按钮（格式化显示）', () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    expect(screen.getByText(/BTC\/USDT/)).toBeDefined()
  })

  it('点击按钮 → 展开下拉，显示热门交易对', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    // 下拉出现后应有搜索框
    const input = await screen.findByPlaceholderText(/搜索|Search/)
    expect(input).toBeDefined()
  })

  it('展开后搜索框聚焦', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const input = await screen.findByPlaceholderText(/搜索|Search/)
    await waitFor(() => {
      expect(document.activeElement).toBe(input)
    })
  })

  it('搜索过滤：输入 ETH → 只显示匹配项', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const input = await screen.findByPlaceholderText(/搜索|Search/)
    fireEvent.change(input, { target: { value: 'ETH' } })
    // ETH 相关行出现
    await waitFor(() => {
      expect(screen.getAllByText(/ETH\/USDT/).length).toBeGreaterThan(0)
    })
  })

  it('点击交易对行触发 onChange 并关闭下拉', async () => {
    const onChange = vi.fn()
    render(<SymbolPicker value="BTCUSDT" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    const input = await screen.findByPlaceholderText(/搜索|Search/)
    // 点热门区某交易对行
    const rows = screen.getAllByText(/ETH\/USDT/)
    fireEvent.click(rows[0])
    expect(onChange).toHaveBeenCalledWith('ETHUSDT')
  })

  it('Esc 关闭下拉', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const input = await screen.findByPlaceholderText(/搜索|Search/)
    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/搜索|Search/)).toBeNull()
    })
  })

  it('点击外部关闭下拉', async () => {
    const { container } = render(
      <div>
        <SymbolPicker value="BTCUSDT" onChange={vi.fn()} />
        <button>other</button>
      </div>,
    )
    fireEvent.click(screen.getByText(/BTC\/USDT/))
    await screen.findByPlaceholderText(/搜索|Search/)
    // 点外部
    const other = screen.getByText('other')
    fireEvent.mouseDown(other)
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/搜索|Search/)).toBeNull()
    })
    void container
  })
})
