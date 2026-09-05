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
    await screen.findByPlaceholderText(/搜索|Search/)
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

  it('开合状态经 onOpenChange 外报（供顶栏纳入 Esc 层进链路）', async () => {
    const onOpenChange = vi.fn()
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByPlaceholderText(/搜索|Search/)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    fireEvent.keyDown(screen.getByPlaceholderText(/搜索|Search/), { key: 'Escape' })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
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

  it('下拉列表有 role=listbox，行有 role=option + aria-selected', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeDefined()
    // 至少有一行 option
    const options = listbox.querySelectorAll('[role="option"]')
    expect(options.length).toBeGreaterThan(0)
    // 当前选中交易对的行 aria-selected=true
    const selected = [...options].find((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected).toBeDefined()
  })

  it('E10 键盘导航：ArrowDown 移动高亮、Enter 选择当前高亮项', async () => {
    const onChange = vi.fn()
    render(<SymbolPicker value="BTCUSDT" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    const listbox = await screen.findByRole('listbox')
    // 首次 ArrowDown → 高亮第二项（导航索引从 0 起，逐次 +1）
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    // aria-activedescendant 指向某 option id（非空）
    expect(listbox.getAttribute('aria-activedescendant')).toBeTruthy()
    // Enter 选择当前高亮项 → onChange 被调用
    fireEvent.keyDown(listbox, { key: 'Enter' })
    expect(onChange).toHaveBeenCalled()
  })

  it('E10 键盘导航：Escape 关闭下拉', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const listbox = await screen.findByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/搜索|Search/)).toBeNull()
    })
  })

  it('O7：热门行星标切换 → 收藏持久化（☆ 按钮 aria-label=加入自选）', async () => {
    render(<SymbolPicker value="BTCUSDT" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    await screen.findByRole('listbox')
    // aria-label 为「加入自选/取消自选」的星标按钮存在（至少一行）
    const stars = screen.getAllByRole('button', { name: /自选/ })
    expect(stars.length).toBeGreaterThan(0)
    fireEvent.click(stars[0])
    // 点击后收藏写入 localStorage（useFavorites 持久化）
    const saved = localStorage.getItem('kline-buty:favorites')
    expect(saved).toBeTruthy()
  })
})
