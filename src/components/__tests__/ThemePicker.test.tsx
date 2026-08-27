// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ThemePicker } from '../ThemePicker'
import { COLOR_PRESETS } from '../../theme'

afterEach(cleanup)

describe('ThemePicker', () => {
  it('渲染所有色预设按钮', () => {
    render(<ThemePicker value="classic" onChange={vi.fn()} />)
    const group = screen.getByRole('group')
    const btns = group.querySelectorAll('button')
    expect(btns.length).toBe(COLOR_PRESETS.length)
  })

  it('当前预设按钮 aria-pressed=true', () => {
    const first = COLOR_PRESETS[0].id
    render(<ThemePicker value={first} onChange={vi.fn()} />)
    const btn = screen.getByRole('group').querySelector<HTMLButtonElement>(`[data-preset="${first}"]`)
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('非当前预设按钮 aria-pressed=false', () => {
    const first = COLOR_PRESETS[0].id
    const second = COLOR_PRESETS[1].id
    render(<ThemePicker value={first} onChange={vi.fn()} />)
    const btn = screen.getByRole('group').querySelector(`[data-preset="${second}"]`)
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('点击色点触发 onChange', () => {
    const onChange = vi.fn()
    const target = COLOR_PRESETS[1].id
    render(<ThemePicker value={COLOR_PRESETS[0].id} onChange={onChange} />)
    const btn = screen.getByRole('group').querySelector<HTMLButtonElement>(`[data-preset="${target}"]`)!
    fireEvent.click(btn)
    expect(onChange).toHaveBeenCalledWith(target)
  })

  it('当前预设边框 2px，其余 1px', () => {
    const active = COLOR_PRESETS[0].id
    render(<ThemePicker value={active} onChange={vi.fn()} />)
    const group = screen.getByRole('group')
    const btns = group.querySelectorAll<HTMLButtonElement>('button')
    const activeBtn = group.querySelector(`[data-preset="${active}"]`) as HTMLButtonElement
    expect(activeBtn.style.border).toContain('2px')
    const inactive = [...btns].find((b) => b.dataset.preset !== active)!
    expect(inactive.style.border).toContain('1px')
  })

  it('每个按钮有 aria-label（无障碍）', () => {
    render(<ThemePicker value="classic" onChange={vi.fn()} />)
    const btns = screen.getByRole('group').querySelectorAll('button')
    for (const b of btns) {
      expect(b.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('group 有 role=group 与 aria-label', () => {
    render(<ThemePicker value="classic" onChange={vi.fn()} />)
    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-label')).toBeTruthy()
  })
})
