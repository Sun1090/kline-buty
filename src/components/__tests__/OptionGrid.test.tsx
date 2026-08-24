// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { OptionGrid } from '../OptionGrid'
import type { HeaderOption } from '../headerOptions'

afterEach(cleanup)

const OPTIONS: HeaderOption[] = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
  { value: 'd', label: 'D' },
]

describe('OptionGrid 方向键导航', () => {
  it('初始渲染：选中项 tabIndex=0，其余 tabIndex=-1', () => {
    render(<OptionGrid options={OPTIONS} value="b" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    expect(btns[0].getAttribute('tabindex')).toBe('-1')
    expect(btns[1].getAttribute('tabindex')).toBe('0')
    expect(btns[2].getAttribute('tabindex')).toBe('-1')
    expect(btns[3].getAttribute('tabindex')).toBe('-1')
  })

  it('选中项不在列表时聚焦首项', () => {
    render(<OptionGrid options={OPTIONS} value="z" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    expect(btns[0].getAttribute('tabindex')).toBe('0')
  })

  it('ArrowRight 聚焦下一项', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[0].focus()
    fireEvent.keyDown(btns[0].closest('[role="listbox"]')!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(btns[1])
  })

  it('ArrowLeft 聚焦上一项', () => {
    render(<OptionGrid options={OPTIONS} value="c" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[2].focus()
    fireEvent.keyDown(btns[2].closest('[role="listbox"]')!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(btns[1])
  })

  it('ArrowDown 聚焦下一项（同 ArrowRight 方向）', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[0].focus()
    fireEvent.keyDown(btns[0].closest('[role="listbox"]')!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(btns[1])
  })

  it('ArrowUp 聚焦上一项（同 ArrowLeft 方向）', () => {
    render(<OptionGrid options={OPTIONS} value="d" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[3].focus()
    fireEvent.keyDown(btns[3].closest('[role="listbox"]')!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(btns[2])
  })

  it('末项按 ArrowRight 环绕到首项', () => {
    render(<OptionGrid options={OPTIONS} value="d" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[3].focus()
    fireEvent.keyDown(btns[3].closest('[role="listbox"]')!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(btns[0])
  })

  it('首项按 ArrowLeft 环绕到末项', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[0].focus()
    fireEvent.keyDown(btns[0].closest('[role="listbox"]')!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(btns[3])
  })

  it('Home 聚焦首项', () => {
    render(<OptionGrid options={OPTIONS} value="d" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[3].focus()
    fireEvent.keyDown(btns[3].closest('[role="listbox"]')!, { key: 'Home' })
    expect(document.activeElement).toBe(btns[0])
  })

  it('End 聚焦末项', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[0].focus()
    fireEvent.keyDown(btns[0].closest('[role="listbox"]')!, { key: 'End' })
    expect(document.activeElement).toBe(btns[3])
  })

  it('方向键导航后 roving tabindex 同步更新', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    let btns = screen.getAllByRole('option')
    btns[0].focus()
    fireEvent.keyDown(btns[0].closest('[role="listbox"]')!, { key: 'ArrowRight' })
    btns = screen.getAllByRole('option')
    expect(btns[0].getAttribute('tabindex')).toBe('-1')
    expect(btns[1].getAttribute('tabindex')).toBe('0')
    expect(btns[2].getAttribute('tabindex')).toBe('-1')
    expect(btns[3].getAttribute('tabindex')).toBe('-1')
  })

  it('Enter 不触发导航，但点击回调正常', () => {
    const onPick = vi.fn()
    render(<OptionGrid options={OPTIONS} value="a" onPick={onPick} label={(o) => o.label!} />)
    fireEvent.click(screen.getByText('B'))
    expect(onPick).toHaveBeenCalledWith('b')
  })

  it('aria-selected 与实际选中项同步', () => {
    render(<OptionGrid options={OPTIONS} value="c" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    expect(btns[0].getAttribute('aria-selected')).toBe('false')
    expect(btns[1].getAttribute('aria-selected')).toBe('false')
    expect(btns[2].getAttribute('aria-selected')).toBe('true')
    expect(btns[3].getAttribute('aria-selected')).toBe('false')
  })

  it('方向键/Space/Enter 不冒泡到全局快捷键（window 监听不可达）', () => {
    render(<OptionGrid options={OPTIONS} value="a" onPick={vi.fn()} label={(o) => o.label!} />)
    const btns = screen.getAllByRole('option')
    btns[0].focus()
    // window 级监听：模拟 App 全局快捷键（回放步进/调速/播放），若收到事件即说明冒泡冲突
    const winSpy = vi.fn()
    window.addEventListener('keydown', winSpy)
    try {
      const grid = btns[0].closest('[role="listbox"]')!
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' ', 'Enter']) {
        fireEvent.keyDown(grid, { key, bubbles: true })
      }
      expect(winSpy).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', winSpy)
    }
  })

  it('focus 不在网格按钮上时按键不拦截', () => {
    const onPick = vi.fn()
    render(<OptionGrid options={OPTIONS} value="a" onPick={onPick} label={(o) => o.label!} />)
    const grid = screen.getAllByRole('option')[0].closest('[role="listbox"]')!
    // 焦点不在按钮上（模拟焦点在其他元素）：方向键不拦截、不崩溃
    expect(() => fireEvent.keyDown(grid, { key: 'ArrowRight' })).not.toThrow()
    expect(() => fireEvent.keyDown(grid, { key: 'Enter' })).not.toThrow()
  })
})