// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PnlBars } from '../PnlBars'
import type { PnlBarDatum } from '../../trade/perf'

afterEach(() => cleanup())

const data: PnlBarDatum[] = [
  { at: 1_000, pnl: 25, side: 'sell' },
  { at: 2_000, pnl: -10, side: 'buy' },
  { at: 3_000, pnl: 5, side: 'sell' },
]

describe('PnlBars', () => {
  it('空数据不渲染', () => {
    const { container } = render(<PnlBars data={[]} />)
    expect(container.querySelector('[data-testid="pnl-bars"]')).toBeNull()
  })

  it('渲染零轴 + 每笔一根柱（3 根）', () => {
    render(<PnlBars data={data} />)
    const bars = screen.getByTestId('pnl-bars')
    expect(bars.querySelectorAll('rect')).toHaveLength(3)
    expect(bars.querySelectorAll('line')).toHaveLength(1) // 零轴
  })

  it('盈利柱向上（y < 零轴）、亏损柱向下（y > 零轴）', () => {
    const { container } = render(<PnlBars data={data} />)
    const zeroY = 4 + (56 - 4 - 12) / 2 // PAD_TOP + plotH/2
    const rects = container.querySelectorAll('rect')
    expect(Number(rects[0].getAttribute('y'))).toBeLessThan(zeroY) // +25
    expect(Number(rects[1].getAttribute('y'))).toBeGreaterThanOrEqual(zeroY) // -10
    expect(Number(rects[2].getAttribute('y'))).toBeLessThan(zeroY) // +5
  })

  it('盈利/亏损柱分色（up/down 变量）', () => {
    const { container } = render(<PnlBars data={data} />)
    const rects = container.querySelectorAll('rect')
    expect(rects[0].getAttribute('fill')).toBe('var(--up)')
    expect(rects[1].getAttribute('fill')).toBe('var(--down)')
  })

  it('aria-label 指向逐笔盈亏文案', () => {
    render(<PnlBars data={data} />)
    expect(screen.getByRole('img', { name: /逐笔盈亏/i })).toBeTruthy()
  })
})
