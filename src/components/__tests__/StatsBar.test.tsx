// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { StatsBar } from '../StatsBar'

afterEach(cleanup)

const stats = {
  price: 63041.4,
  changePct: 0.074,
  high: 63170,
  low: 62890.2,
  quoteVolume: 1563729825.67,
  fundingRate: 0.00000814,
  markPrice: 63036.0,
  nextFundingTime: 1786867200000,
  openInterest: 111496.105,
}

describe('StatsBar', () => {
  it('渲染全部行情项', () => {
    render(<StatsBar stats={stats} />)
    expect(screen.getByText('最新价')).toBeDefined()
    expect(screen.getByText('63041.40')).toBeDefined()
    expect(screen.getByText('+0.07%')).toBeDefined()
    expect(screen.getByText('63170.00')).toBeDefined()
    expect(screen.getByText('62890.20')).toBeDefined()
    expect(screen.getByText('1.56B USDT')).toBeDefined()
    expect(screen.getByText('资金费率')).toBeDefined()
    expect(screen.getByText('0.0008%')).toBeDefined()
    expect(screen.getByText('111,496')).toBeDefined()
  })

  it('下跌时涨跌幅带负号', () => {
    render(<StatsBar stats={{ ...stats, changePct: -2.35 }} />)
    expect(screen.getByText('-2.35%')).toBeDefined()
  })

  it('数据未就绪时不渲染', () => {
    const { container } = render(<StatsBar stats={{ price: null, changePct: null, high: null, low: null, quoteVolume: null, fundingRate: null, markPrice: null, nextFundingTime: null, openInterest: null }} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('StatsBar 实时跳动', () => {
  it('WS 帧驱动：实时价覆盖轮询价并显示方向箭头', () => {
    render(<StatsBar stats={stats} live={{ price: 63100.5, ts: 1, dir: 1 }} />)
    const el = screen.getByTestId('live-price')
    expect(el.textContent).toContain('63100.50')
    expect(el.textContent).toContain('▲')
    expect(el.className).toContain('tick-flash-up')
    expect(el.style.color).toBe('var(--up)')
  })

  it('下跌帧：▼ 方向 + 跌色闪烁', () => {
    render(<StatsBar stats={stats} live={{ price: 62880.1, ts: 2, dir: -1 }} />)
    const el = screen.getByTestId('live-price')
    expect(el.textContent).toContain('62880.10')
    expect(el.textContent).toContain('▼')
    expect(el.className).toContain('tick-flash-down')
  })

  it('横盘帧：无箭头、无闪烁类', () => {
    render(<StatsBar stats={stats} live={{ price: 63041.4, ts: 3, dir: 0 }} />)
    const el = screen.getByTestId('live-price')
    expect(el.textContent).toBe('63041.40')
    expect(el.className).not.toContain('tick-flash')
  })

  it('仅有实时帧（轮询未就绪）时也渲染', () => {
    const empty = { price: null, changePct: null, high: null, low: null, quoteVolume: null, fundingRate: null, markPrice: null, nextFundingTime: null, openInterest: null }
    render(<StatsBar stats={empty} live={{ price: 63100.5, ts: 4, dir: 1 }} />)
    expect(screen.getByTestId('live-price')).toBeDefined()
  })
})
