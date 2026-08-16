import { describe, expect, it } from 'vitest'
import { shortcutFor, cycleValue, isTypingTarget } from '../shortcuts'

const ev = (k: string, o: Partial<Parameters<typeof shortcutFor>[0]> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...o,
})

describe('shortcutFor', () => {
  it('周期切换 [ / ]', () => {
    expect(shortcutFor(ev('['), false)).toEqual({ type: 'period-prev' })
    expect(shortcutFor(ev(']'), false)).toEqual({ type: 'period-next' })
  })

  it('回放播放/暂停 Space（带修饰键不触发）', () => {
    expect(shortcutFor(ev(' '), false)).toEqual({ type: 'replay-toggle' })
    expect(shortcutFor(ev(' ', { ctrlKey: true }), false).type).toBe('none')
    expect(shortcutFor(ev(' ', { metaKey: true }), false).type).toBe('none')
  })

  it('删除画线 Delete / Backspace', () => {
    expect(shortcutFor(ev('Delete'), false)).toEqual({ type: 'delete-drawing' })
    expect(shortcutFor(ev('Backspace'), false)).toEqual({ type: 'delete-drawing' })
  })

  it('Esc 取消', () => {
    expect(shortcutFor(ev('Escape'), false)).toEqual({ type: 'escape' })
  })

  it('Ctrl/Cmd+K 打开搜索（大小写兼容）', () => {
    expect(shortcutFor(ev('k', { ctrlKey: true }), false)).toEqual({ type: 'open-search' })
    expect(shortcutFor(ev('K', { metaKey: true }), false)).toEqual({ type: 'open-search' })
  })

  it('独立 / 打开搜索（Shift+/ 的 ? 不冲突）', () => {
    expect(shortcutFor(ev('/'), false)).toEqual({ type: 'open-search' })
    expect(shortcutFor(ev('?'), false)).toEqual({ type: 'toggle-shortcuts' })
  })

  it('F 全屏切换（⇧⌘F 组合亦可）', () => {
    expect(shortcutFor(ev('f'), false)).toEqual({ type: 'toggle-fullscreen' })
    expect(shortcutFor(ev('F'), false)).toEqual({ type: 'toggle-fullscreen' })
    expect(shortcutFor(ev('f', { metaKey: true, shiftKey: true }), false)).toEqual({
      type: 'toggle-fullscreen',
    })
  })

  it('1/2/3 布局切换', () => {
    expect(shortcutFor(ev('1'), false)).toEqual({ type: 'set-layout', layout: 'single' })
    expect(shortcutFor(ev('2'), false)).toEqual({ type: 'set-layout', layout: 'pair' })
    expect(shortcutFor(ev('3'), false)).toEqual({ type: 'set-layout', layout: 'quad' })
  })

  it('M/N 循环主/副图指标', () => {
    expect(shortcutFor(ev('m'), false)).toEqual({ type: 'cycle-main', dir: 1 })
    expect(shortcutFor(ev('N'), false)).toEqual({ type: 'cycle-sub', dir: 1 })
  })

  it('输入态：普通键不触发，Esc 透传', () => {
    expect(shortcutFor(ev('m'), true).type).toBe('none')
    expect(shortcutFor(ev(' '), true).type).toBe('none')
    expect(shortcutFor(ev('Escape'), true)).toEqual({ type: 'escape' })
  })

  it('未知键返回 none', () => {
    expect(shortcutFor(ev('x'), false).type).toBe('none')
  })
})

describe('cycleValue', () => {
  const list = ['a', 'b', 'c'] as const
  it('向前循环 + 尾部环绕', () => {
    expect(cycleValue(list, 'a', 1)).toBe('b')
    expect(cycleValue(list, 'c', 1)).toBe('a')
  })
  it('向后循环 + 首部环绕', () => {
    expect(cycleValue(list, 'c', -1)).toBe('b')
    expect(cycleValue(list, 'a', -1)).toBe('c')
  })
  it('未知当前值回落到第一个', () => {
    expect(cycleValue(list, 'z' as 'a', 1)).toBe('a')
  })
})

describe('isTypingTarget', () => {
  it('INPUT/SELECT/TEXTAREA 为输入态', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
