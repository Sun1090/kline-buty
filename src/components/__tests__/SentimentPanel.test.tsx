// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SentimentPanel } from '../SentimentPanel'
import type { SentimentData } from '../../hooks/useSentiment'
import type { OiPoint, RatioPoint, TakerPoint } from '../../data/binance/rest'

afterEach(cleanup)

const EMPTY: SentimentData = { globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] }

function mkRatio(long: number, ratio: number): RatioPoint[] {
  return [{ timestamp: 1, long, short: 1 - long, longShortRatio: ratio }]
}
function mkTaker(buy: number, sell: number, ratio: number): TakerPoint[] {
  return [{ timestamp: 1, buyVol: buy, sellVol: sell, buySellRatio: ratio }]
}
function mkOi(oi: number): OiPoint[] {
  return [{ timestamp: 1, oi, oiValue: oi }]
}

describe('SentimentPanel', () => {
  it('空数据 → 四块均显示 loading', () => {
    render(<SentimentPanel data={EMPTY} />)
    const panel = screen.getByTestId('sentiment-panel')
    const groups = panel.querySelectorAll('[role="group"]')
    expect(groups.length).toBe(4)
  })

  it('多空比块：显示当前比值 + 多方占比条宽度', () => {
    const data: SentimentData = {
      ...EMPTY,
      globalRatio: mkRatio(0.6, 1.5),
    }
    render(<SentimentPanel data={data} />)
    expect(screen.getByText('1.50')).toBeDefined()
    // 多方 60% → 进度条宽度 60%
    const bar = screen.getByText('60%')
    expect(bar).toBeDefined()
  })

  it('多空比块：多方占比 ≤100%', () => {
    const data: SentimentData = {
      ...EMPTY,
      globalRatio: mkRatio(0.8, 4.0),
    }
    render(<SentimentPanel data={data} />)
    expect(screen.getByText('80%')).toBeDefined()
  })

  it('主动买卖比块：买方占比 = buyVol/(buy+sell)', () => {
    const data: SentimentData = {
      ...EMPTY,
      takerRatio: mkTaker(70, 30, 2.33),
    }
    render(<SentimentPanel data={data} />)
    expect(screen.getByText('2.33')).toBeDefined()
    expect(screen.getByText('70%')).toBeDefined()
  })

  it('未平仓块：显示当前值 + 24h 变化百分比（正绿负红）', () => {
    const data: SentimentData = {
      ...EMPTY,
      oiHistory: [
        { timestamp: 1, oi: 1000, oiValue: 1000 },
        { timestamp: 2, oi: 1200, oiValue: 1200 },
      ],
    }
    render(<SentimentPanel data={data} />)
    // 变化 = (1200-1000)/1000 = +20%
    expect(screen.getByText('+20.00%')).toBeDefined()
  })

  it('未平仓块：下跌 → 负百分比', () => {
    const data: SentimentData = {
      ...EMPTY,
      oiHistory: [
        { timestamp: 1, oi: 1000, oiValue: 1000 },
        { timestamp: 2, oi: 800, oiValue: 800 },
      ],
    }
    render(<SentimentPanel data={data} />)
    expect(screen.getByText('-20.00%')).toBeDefined()
  })

  it('每个块有 role=group + aria-label', () => {
    render(<SentimentPanel data={EMPTY} />)
    const groups = screen.getAllByRole('group')
    for (const g of groups) {
      expect(g.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('panel 有 data-testid=sentiment-panel', () => {
    render(<SentimentPanel data={EMPTY} />)
    expect(screen.getByTestId('sentiment-panel')).toBeDefined()
  })
})
