// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { PeriodBar } from '../PeriodBar'

afterEach(cleanup)

describe('PeriodBar', () => {
  it('默认渲染全部周期按钮（桌面 flexWrap 换行，不产生横向滚动条）', () => {
    const onChange = vi.fn()
    const { container } = render(<PeriodBar value="15m" onChange={onChange} />)
    const bar = container.firstChild as HTMLElement
    // 14 个周期齐全
    expect(bar.querySelectorAll('button').length).toBe(14)
    expect(screen.getByText('1秒')).toBeDefined()
    expect(screen.getByText('月')).toBeDefined()
    // 桌面模式：换行布局（非 nowrap）
    expect(getComputedStyle(bar).flexWrap).toBe('wrap')
    expect(bar.className).not.toContain('scroll-toolbar')
    // 当前周期高亮
    expect(screen.getByText('15分').getAttribute('style')).toContain('var(--accent)')
  })

  it('scrollable 模式：单行 nowrap + 横向滚动（移动端不换行占两行）', () => {
    const onChange = vi.fn()
    const { container } = render(<PeriodBar value="1h" onChange={onChange} scrollable />)
    const bar = container.firstChild as HTMLElement
    expect(bar.className).toContain('scroll-toolbar')
    expect(getComputedStyle(bar).flexWrap).toBe('nowrap')
    expect(getComputedStyle(bar).overflowX).toBe('auto')
    // 按钮不收缩，可横向滚动查看全部
    for (const btn of bar.querySelectorAll('button')) {
      expect(getComputedStyle(btn).flexShrink).toBe('0')
    }
  })

  it('点击周期回调 onChange', () => {
    const onChange = vi.fn()
    render(<PeriodBar value="1m" onChange={onChange} />)
    fireEvent.click(screen.getByText('1时'))
    expect(onChange).toHaveBeenCalledWith('1h')
  })
})
