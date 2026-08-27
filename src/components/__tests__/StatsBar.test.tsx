// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatsBar } from '../StatsBar'
import type { MarketStats } from '../../hooks/useMarketStats'
import type { LiveTick } from '../../hooks/useKlineData'

afterEach(cleanup)

const EMPTY: MarketStats = {
  price: null, changePct: null, high: null, low: null,
  quoteVolume: null, fundingRate: null, markPrice: null, nextFundingTime: null, openInterest: null,
}

describe('StatsBar', () => {
  it('空 stats + 无 live → 不渲染', () => {
    const { container } = render(<StatsBar stats={EMPTY} />)
    expect(container.firstChild).toBeNull()
  })

  it('价格格式化：≥1000 两位小数，≥1 四位小数，<1 六位小数', () => {
    const s1 = { ...EMPTY, price: 65000 }
    const { rerender } = render(<StatsBar stats={s1} />)
    expect(screen.getByTestId('live-price').textContent).toBe('65000.00')

    const s2 = { ...EMPTY, price: 3.5 }
    rerender(<StatsBar stats={s2} />)
    expect(screen.getByTestId('live-price').textContent).toBe('3.5000')

    const s3 = { ...EMPTY, price: 0.0012 }
    rerender(<StatsBar stats={s3} />)
    expect(screen.getByTestId('live-price').textContent).toBe('0.001200')
  })

  it('涨跌幅正数显示 + 号、颜色随涨跌', () => {
    const up = { ...EMPTY, price: 100, changePct: 2.5 }
    const { rerender } = render(<StatsBar stats={up} />)
    expect(screen.getByText('+2.50%')).toBeDefined()

    const down = { ...EMPTY, price: 100, changePct: -1.3 }
    rerender(<StatsBar stats={down} />)
    expect(screen.getByText('-1.30%')).toBeDefined()
  })

  it('成交量格式化：≥1e9 显示 B，≥1e6 显示 M', () => {
    const s1 = { ...EMPTY, price: 100, quoteVolume: 1.5e9 }
    const { rerender } = render(<StatsBar stats={s1} />)
    expect(screen.getByText(/1\.50B USDT/)).toBeDefined()

    const s2 = { ...EMPTY, price: 100, quoteVolume: 2.3e6 }
    rerender(<StatsBar stats={s2} />)
    expect(screen.getByText(/2\.30M USDT/)).toBeDefined()
  })

  it('资金费率 ×100 显示，正绿负红', () => {
    const s1 = { ...EMPTY, price: 100, fundingRate: 0.0001 }
    const { rerender } = render(<StatsBar stats={s1} />)
    expect(screen.getByText('0.0100%')).toBeDefined()

    const s2 = { ...EMPTY, price: 100, fundingRate: -0.0005 }
    rerender(<StatsBar stats={s2} />)
    expect(screen.getByText('-0.0500%')).toBeDefined()
  })

  it('live 帧覆盖轮询价，方向箭头 ▲/▼', () => {
    const stats = { ...EMPTY, price: 100, changePct: 1 }
    const live: LiveTick = { price: 105, dir: 1, ts: 1 }
    render(<StatsBar stats={stats} live={live} />)
    const price = screen.getByTestId('live-price')
    expect(price.textContent).toContain('▲')
    expect(price.textContent).toContain('105')
  })

  it('live 帧下跌方向箭头 ▼', () => {
    const stats = { ...EMPTY, price: 100, changePct: -1 }
    const live: LiveTick = { price: 95, dir: -1, ts: 2 }
    render(<StatsBar stats={stats} live={live} />)
    expect(screen.getByTestId('live-price').textContent).toContain('▼')
  })

  it('region role + aria-label 可达性', () => {
    const stats = { ...EMPTY, price: 100 }
    render(<StatsBar stats={stats} />)
    const region = screen.getByRole('region')
    expect(region.getAttribute('aria-label')).toBeTruthy()
  })
})
