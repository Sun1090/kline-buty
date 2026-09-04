// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ShortcutsHelp } from '../ShortcutsHelp'
import { ShortcutsSettings, eventToKey } from '../ShortcutsSettings'
import type { ShortcutKeyMap } from '../../shortcuts'

afterEach(cleanup)

describe('ShortcutsHelp（L1 帮助浮层）', () => {
  it('显示分组与默认键位，配置按钮触发 onConfigure', () => {
    const onConfigure = vi.fn()
    render(<ShortcutsHelp onConfigure={onConfigure} />)
    expect(screen.getByTestId('shortcuts-help')).toBeDefined()
    expect(screen.getByText(/导航/)).toBeDefined()
    expect(screen.getAllByText(/← \/ →/).length).toBeGreaterThan(0) // replayStep 键位
    fireEvent.click(screen.getByTestId('shortcuts-configure'))
    expect(onConfigure).toHaveBeenCalledTimes(1)
  })

  it('过滤：无匹配时显示提示', () => {
    render(<ShortcutsHelp onConfigure={vi.fn()} />)
    fireEvent.change(screen.getByTestId('shortcuts-filter'), { target: { value: '不存在的功能xyz' } })
    expect(screen.getByText(/无匹配快捷键/)).toBeDefined()
  })
})

describe('ShortcutsSettings（L1 键位配置）', () => {
  it('显示动作清单与当前键位，重置按钮触发 onChange({})', () => {
    const onChange = vi.fn()
    render(<ShortcutsSettings keys={{}} onChange={onChange} onClose={vi.fn()} />)
    expect(screen.getByTestId('shortcuts-settings')).toBeDefined()
    expect(screen.getByTestId('shortcut-cycle-main')).toBeDefined()
    fireEvent.click(screen.getByTestId('shortcuts-reset'))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('点击动作后按新键 → onChange 写入新键位', () => {
    const onChange = vi.fn()
    render(<ShortcutsSettings keys={{}} onChange={onChange} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('shortcut-cycle-main'))
    expect(screen.getByTestId('shortcuts-recording')).toBeDefined()
    fireEvent.keyDown(window, { key: 'o' })
    expect(onChange).toHaveBeenCalledWith({ 'cycle-main': [{ key: 'o', mod: false, shift: false }] })
  })

  it('关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<ShortcutsSettings keys={{}} onChange={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('eventToKey（L1 按键归一化）', () => {
  const mk = (o: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }>) => ({
    key: 'a',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...o,
  })
  it('字母键小写 + 无修饰', () => {
    expect(eventToKey(mk({ key: 'A' }))).toEqual({ key: 'a', mod: false, shift: false })
  })
  it('Ctrl 修饰标记 mod', () => {
    expect(eventToKey(mk({ key: 'k', ctrlKey: true }))).toEqual({ key: 'k', mod: true, shift: false })
  })
  it('独立修饰键被忽略', () => {
    expect(eventToKey(mk({ key: 'Control' }))).toBeNull()
    expect(eventToKey(mk({ key: 'Shift' }))).toBeNull()
  })
  it('方向键保留原值', () => {
    expect(eventToKey(mk({ key: 'ArrowLeft' }))).toEqual({ key: 'ArrowLeft', mod: false, shift: false })
  })
})
