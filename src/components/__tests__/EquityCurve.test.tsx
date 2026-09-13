// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { EquityCurve, fmtCurveTime } from '../EquityCurve'
import type { EquityPoint } from '../../utils/equity'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  // jsdom 默认 getBoundingClientRect 全 0 → 悬停命中定位需给逻辑尺寸
  // svg 不是 HTMLElement，两条原型链都要 mock
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 340,
    bottom: 120,
    width: 340,
    height: 120,
    toJSON: () => ({}),
  } as DOMRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect)
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(rect)
})

const pts: EquityPoint[] = [
  { at: 1_700_000_000_000, equity: 10_000 },
  { at: 1_700_003_600_000, equity: 10_500 },
  { at: 1_700_007_200_000, equity: 9_900 },
]

describe('EquityCurve', () => {
  it('渲染折线路径与 aria-label', () => {
    render(<EquityCurve points={pts} />)
    const svg = screen.getByRole('img', { name: /权益曲线/i })
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('悬停显示 tooltip（时点权益 + 回撤）', () => {
    render(<EquityCurve points={pts} />)
    const svg = screen.getByRole('img', { name: /权益曲线/i })
    // clientX=170 → frac≈0.5 → 命中第 1 个点（10_500）
    fireEvent.mouseMove(svg, { clientX: 170, clientY: 60 })
    const tip = screen.getByTestId('equity-curve-tooltip')
    expect(tip.textContent).toContain('10500.00')
    expect(tip.textContent).toContain('0.00%')
  })

  it('空数据不渲染路径、不崩溃', () => {
    render(<EquityCurve points={[]} />)
    const svg = screen.getByRole('img', { name: /权益曲线/i })
    expect(svg.querySelectorAll('path')).toHaveLength(0)
  })

  it('终值低于初始权益用跌色类名（down 变量存在）', () => {
    const downPts: EquityPoint[] = [
      { at: 1_700_000_000_000, equity: 10_000 },
      { at: 1_700_003_600_000, equity: 9_500 },
    ]
    const { container } = render(<EquityCurve points={downPts} />)
    const stroke = container.querySelector('path[stroke]')
    expect(stroke?.getAttribute('stroke')).toBe('var(--down)')
  })

  it('fmtCurveTime 输出 MM-DD HH:mm 定长格式', () => {
    // 2000-01-02 03:04 UTC → 本地时区（断言结构与长度，不依赖时区）
    const s = fmtCurveTime(946_724_640_000)
    expect(s).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})
