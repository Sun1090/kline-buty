// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MarketList } from '../MarketList'
import { useTickerList, type TickerSortKey, type SortDir } from '../../hooks/useTickerList'

vi.mock('../../hooks/useTickerList', () => ({
  useTickerList: vi.fn(),
}))

const mockUseTickerList = vi.mocked(useTickerList)

const rows = [
  { symbol: 'BTCUSDT', price: 63000.5, changePct: 1.23, quoteVolume: 1.5e9 },
  { symbol: 'ETHUSDT', price: 3200.1, changePct: -0.45, quoteVolume: 5e8 },
  { symbol: 'SOLUSDT', price: 0.5, changePct: 3.45, quoteVolume: 1e5 },
]

interface HookState {
  rows: typeof rows
  loading: boolean
  error: boolean
  sortKey: TickerSortKey
  sortDir: SortDir
  // 用具体函数签名而非 ReturnType<typeof vi.fn>：vitest 4 起 vi.fn() 泛型收严，后者不再可赋给 hook 返回类型
  setSortKey: (k: TickerSortKey) => void
  refresh: () => void
}

function stubHook(overrides?: Partial<HookState>): HookState {
  const state: HookState = {
    rows,
    loading: false,
    error: false,
    sortKey: 'symbol',
    sortDir: 'asc',
    setSortKey: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  }
  mockUseTickerList.mockReturnValue(state)
  return state
}

const baseProps = {
  symbol: 'BTCUSDT',
  onSelectSymbol: vi.fn(),
  open: true,
  onToggle: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('MarketList', () => {
  it('渲染全部行情行（缩略交易对 + 价格 + 涨跌幅）', () => {
    stubHook()
    render(<MarketList {...baseProps} />)
    expect(screen.getByTestId('market-list')).toBeDefined()
    expect(screen.getByText('BTC')).toBeDefined()
    expect(screen.getByText('ETH')).toBeDefined()
    expect(screen.getByText('SOL')).toBeDefined()
    expect(screen.getByText('63000.50')).toBeDefined()
    expect(screen.getByText('3200.10')).toBeDefined()
    expect(screen.getByText('0.500000')).toBeDefined()
    expect(screen.getByText('+1.23%')).toBeDefined()
    expect(screen.getByText('-0.45%')).toBeDefined()
  })

  it('点击行情行 → 回调携带完整交易对', () => {
    stubHook()
    render(<MarketList {...baseProps} />)
    fireEvent.click(screen.getByTestId('market-row-ETHUSDT'))
    expect(baseProps.onSelectSymbol).toHaveBeenCalledWith('ETHUSDT')
  })

  it('当前交易对高亮（活跃行）', () => {
    stubHook()
    render(<MarketList {...baseProps} />)
    const active = screen.getByTestId('market-row-BTCUSDT')
    const inactive = screen.getByTestId('market-row-ETHUSDT')
    expect(active.style.borderLeft).toContain('var(--accent)')
    expect(inactive.style.borderLeft).toContain('transparent')
  })

  it('涨跌着色：涨行最新价与涨跌幅列 var(--up)，跌行 var(--down)', () => {
    stubHook()
    render(<MarketList {...baseProps} />)
    // BTC 涨 +1.23%，ETH 跌 -0.45%
    const btcRow = screen.getByTestId('market-row-BTCUSDT')
    const ethRow = screen.getByTestId('market-row-ETHUSDT')
    const btcSpans = btcRow.querySelectorAll('span')
    const ethSpans = ethRow.querySelectorAll('span')
    // 第 2 个 span 是最新价，第 3 个是涨跌幅
    expect(btcSpans[1].style.color).toContain('var(--up)')
    expect(btcSpans[2].style.color).toContain('var(--up)')
    expect(ethSpans[1].style.color).toContain('var(--down)')
    expect(ethSpans[2].style.color).toContain('var(--down)')
  })

  it('点击列头 → setSortKey，并显示当前排序列箭头', () => {
    const state = stubHook()
    render(<MarketList {...baseProps} />)
    fireEvent.click(screen.getByTestId('market-sort-price'))
    expect(state.setSortKey).toHaveBeenCalledWith('price')
    // 当前排序列（symbol）高亮带箭头
    expect(screen.getByTestId('market-sort-symbol').textContent).toContain('▲')
  })

  it('排序方向降序时显示 ▼', () => {
    stubHook({ sortKey: 'price', sortDir: 'desc' })
    render(<MarketList {...baseProps} />)
    expect(screen.getByTestId('market-sort-price').textContent).toContain('▼')
  })

  it('折叠态：仅窄条 + 点击展开触发 onToggle', () => {
    stubHook()
    render(<MarketList {...baseProps} open={false} />)
    expect(screen.getByTestId('market-list-rail')).toBeDefined()
    expect(screen.queryByTestId('market-list')).toBeNull()
    fireEvent.click(screen.getByTestId('market-list-expand'))
    expect(baseProps.onToggle).toHaveBeenCalled()
  })

  it('展开态：点击收起触发 onToggle', () => {
    stubHook()
    render(<MarketList {...baseProps} />)
    fireEvent.click(screen.getByTestId('market-list-collapse'))
    expect(baseProps.onToggle).toHaveBeenCalled()
  })

  it('加载中显示加载文案', () => {
    stubHook({ rows: [], loading: true })
    render(<MarketList {...baseProps} />)
    expect(screen.getByText('加载行情…')).toBeDefined()
  })

  it('无数据 + 出错 → 空态文案', () => {
    stubHook({ rows: [], loading: false, error: true })
    render(<MarketList {...baseProps} />)
    expect(screen.getByText('暂无行情数据')).toBeDefined()
  })

  it('有数据 + 出错 → 保留行并显示过期提示', () => {
    stubHook({ error: true })
    render(<MarketList {...baseProps} />)
    expect(screen.getByText('BTC')).toBeDefined()
    expect(screen.getByText('刷新失败，展示缓存')).toBeDefined()
  })

  it('overlay 模式：✕ 关闭按钮触发 onToggle', () => {
    stubHook()
    render(<MarketList {...baseProps} overlay />)
    expect(screen.getByTestId('market-list')).toBeDefined()
    fireEvent.click(screen.getByTestId('market-list-collapse'))
    expect(baseProps.onToggle).toHaveBeenCalled()
  })
})
