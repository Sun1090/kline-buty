// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { PeriodBar } from '../PeriodBar'

afterEach(cleanup)

describe('PeriodBar', () => {
  it('默认渲染全部周期按钮（flexWrap 换行，不产生横向滚动条）', () => {
    const onChange = vi.fn()
    const { container } = render(<PeriodBar value="15m" onChange={onChange} />)
    const bar = container.firstChild as HTMLElement
    // 14 个周期齐全
    expect(bar.querySelectorAll('button').length).toBe(14)
    expect(screen.getByText('1秒')).toBeDefined()
    expect(screen.getByText('月')).toBeDefined()
    // 换行布局：flexWrap=wrap、无 overflow 滚动（绝不产生横向滚动条）
    expect(getComputedStyle(bar).flexWrap).toBe('wrap')
    expect(getComputedStyle(bar).overflowX).toBe('visible')
    // 当前周期高亮
    expect(screen.getByText('15分').getAttribute('style')).toContain('var(--accent)')
  })

  it('compact 模式（移动端）：仍换行、按钮更紧凑、无横向滚动条', () => {
    const onChange = vi.fn()
    const { container } = render(<PeriodBar value="1h" onChange={onChange} compact />)
    const bar = container.firstChild as HTMLElement
    expect(getComputedStyle(bar).flexWrap).toBe('wrap')
    expect(getComputedStyle(bar).overflowX).toBe('visible')
    // 14 个周期全部可见（不滚动）
    expect(bar.querySelectorAll('button').length).toBe(14)
    // 紧凑按钮：padding 更小
    const btn = bar.querySelector('button') as HTMLElement
    const pad = getComputedStyle(btn).padding
    expect(pad).toContain('3px')
  })

  it('点击周期回调 onChange', () => {
    const onChange = vi.fn()
    render(<PeriodBar value="1m" onChange={onChange} />)
    fireEvent.click(screen.getByText('1时'))
    expect(onChange).toHaveBeenCalledWith('1h')
  })

  it('当前周期按钮 aria-pressed=true，其余 false', () => {
    render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const active = screen.getByTestId('period-1m')
    expect(active.getAttribute('aria-pressed')).toBe('true')
    const inactive = screen.getByTestId('period-1h')
    expect(inactive.getAttribute('aria-pressed')).toBe('false')
  })

  it('每个周期按钮有 aria-label', () => {
    render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const btns = screen.getByTestId('period-bar').querySelectorAll('button')
    for (const b of btns) {
      expect(b.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('M9 键盘导航：roving tabindex——选中周期获焦，其余 -1', () => {
    render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const bar = screen.getByTestId('period-bar')
    const active = screen.getByTestId('period-1m')
    expect(active.getAttribute('tabindex')).toBe('0')
    expect(bar.querySelectorAll('button[tabindex="0"]').length).toBe(1)
  })

  it('M9 键盘导航：ArrowRight 移动焦点到下一周期（1m → 3m）', () => {
    render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const cur = screen.getByTestId('period-1m')
    cur.focus()
    fireEvent.keyDown(cur, { key: 'ArrowRight' })
    const next = screen.getByTestId('period-3m') // 周期顺序：1s,1m,3m,5m...
    expect(next.getAttribute('tabindex')).toBe('0')
  })

  it('M9 键盘导航：ArrowLeft 从首周期回绕到末周期', () => {
    render(<PeriodBar value="1s" onChange={vi.fn()} />)
    const cur = screen.getByTestId('period-1s')
    cur.focus()
    fireEvent.keyDown(cur, { key: 'ArrowLeft' })
    // 末周期获得焦点索引（wrap 到尾）
    const bar = screen.getByTestId('period-bar')
    expect(bar.querySelectorAll('button[tabindex="0"]').length).toBe(1)
  })

  it('O7 覆盖：ArrowDown 移动焦点 / Home 跳到首 / End 跳到尾', () => {
    render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const cur = screen.getByTestId('period-1m')
    cur.focus()
    // ArrowDown 下一周期（1m → 3m）
    fireEvent.keyDown(cur, { key: 'ArrowDown' })
    expect(screen.getByTestId('period-3m').getAttribute('tabindex')).toBe('0')
    // Home 跳首（1s）
    fireEvent.keyDown(screen.getByTestId('period-3m'), { key: 'Home' })
    expect(screen.getByTestId('period-1s').getAttribute('tabindex')).toBe('0')
    // End 跳尾（1M = 月）
    fireEvent.keyDown(screen.getByTestId('period-1s'), { key: 'End' })
    const bar = screen.getByTestId('period-bar')
    const last = bar.querySelector('button:last-of-type') as HTMLElement
    expect(last.getAttribute('tabindex')).toBe('0')
  })
})
