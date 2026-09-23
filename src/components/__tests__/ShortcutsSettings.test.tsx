// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ShortcutsHelp, printShortcuts } from '../ShortcutsHelp'
import { ShortcutsSettings, eventToKey } from '../ShortcutsSettings'

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

  it('M10 冲突提示：撞上默认键位时点名双方，换到空闲键位不报', () => {
    render(<ShortcutsSettings keys={{}} onChange={vi.fn()} onClose={vi.fn()} />)
    // 'm' 是 cycle-main 的默认键 → 绑给 cycle-sub 必须报冲突，且点名的是这两个动作
    fireEvent.click(screen.getByTestId('shortcut-cycle-sub'))
    fireEvent.keyDown(window, { key: 'm' })
    const banner = screen.getByTestId('shortcuts-conflict')
    expect(banner.getAttribute('role')).toBe('alert')
    expect(banner.textContent).toContain('循环主图指标')
    expect(banner.textContent).toContain('循环副图指标')
    cleanup()

    render(<ShortcutsSettings keys={{}} onChange={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('shortcut-cycle-sub'))
    fireEvent.keyDown(window, { key: 'q' })
    expect(screen.queryByTestId('shortcuts-conflict')).toBeNull()
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

describe('H9 快捷键速查卡打印', () => {
  it('printShortcuts：生成打印窗口并写入快捷键表格', () => {
    const writeSpy = vi.fn()
    const closeSpy = vi.fn()
    const win = { document: { write: writeSpy, close: closeSpy } }
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    printShortcuts('Shortcuts', [
      { group: '导航', label: '搜索', keys: '⌘K' },
      { group: '画线', label: '删除', keys: 'Del' },
    ])
    expect(window.open).toHaveBeenCalled()
    const html = writeSpy.mock.calls[0][0] as string
    expect(html).toContain('Shortcuts')
    expect(html).toContain('⌘K')
    expect(html).toContain('</table>')
    expect(closeSpy).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('「打印」按钮：整表来自组件自己的分组，而不是调用方手拼', () => {
    const writeSpy = vi.fn()
    const win = { document: { write: writeSpy, close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    render(<ShortcutsHelp onConfigure={vi.fn()} />)
    fireEvent.click(screen.getByTestId('shortcuts-print'))
    expect(writeSpy).toHaveBeenCalledTimes(1)
    const html = writeSpy.mock.calls[0][0] as string
    // 分组标题 + 某个动作的键位标签都要出现在同一次写入里
    expect(html).toContain('导航')
    expect(html).toMatch(/← \/ →/)
    expect(html).toContain('<table')
    vi.restoreAllMocks()
  })
})
