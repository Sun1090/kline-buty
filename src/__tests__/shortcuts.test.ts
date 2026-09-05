import { describe, expect, it } from 'vitest'
import { shortcutFor, cycleValue, isTypingTarget, findConflicts, hasConflicts, type ShortcutKeyMap } from '../shortcuts'

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

  it('回放步进 ← / →，倍速 ↑ / ↓（带修饰键不触发）', () => {
    expect(shortcutFor(ev('ArrowRight'), false)).toEqual({ type: 'replay-step', dir: 1 })
    expect(shortcutFor(ev('ArrowLeft'), false)).toEqual({ type: 'replay-step', dir: -1 })
    expect(shortcutFor(ev('ArrowUp'), false)).toEqual({ type: 'replay-speed', dir: 1 })
    expect(shortcutFor(ev('ArrowDown'), false)).toEqual({ type: 'replay-speed', dir: -1 })
    expect(shortcutFor(ev('ArrowRight', { metaKey: true }), false).type).toBe('none')
    expect(shortcutFor(ev('ArrowUp', { ctrlKey: true }), false).type).toBe('none')
  })

  it('删除画线 Delete / Backspace', () => {
    expect(shortcutFor(ev('Delete'), false)).toEqual({ type: 'delete-drawing' })
    expect(shortcutFor(ev('Backspace'), false)).toEqual({ type: 'delete-drawing' })
  })

  it('Ctrl/Cmd+C 复制画线、Ctrl/Cmd+V 粘贴画线（大小写兼容）', () => {
    expect(shortcutFor(ev('c', { ctrlKey: true }), false)).toEqual({ type: 'copy-drawing' })
    expect(shortcutFor(ev('C', { metaKey: true }), false)).toEqual({ type: 'copy-drawing' })
    expect(shortcutFor(ev('v', { ctrlKey: true }), false)).toEqual({ type: 'paste-drawing' })
    expect(shortcutFor(ev('V', { metaKey: true }), false)).toEqual({ type: 'paste-drawing' })
  })

  it('Shift+Ctrl/Cmd+C 不触发复制（保留系统文本复制语义保护）', () => {
    expect(shortcutFor(ev('c', { ctrlKey: true, shiftKey: true }), false).type).toBe('none')
    expect(shortcutFor(ev('v', { metaKey: true, shiftKey: true }), false).type).toBe('none')
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

  it('L1 可配置：覆盖键位后按新键触发', () => {
    const keys = { 'open-search': [{ key: 'o' }] }
    // 旧键 k（mod）不再触发（已被覆盖且无 mod 匹配新键）
    expect(shortcutFor(ev('k', { ctrlKey: true }), false, keys).type).toBe('none')
    // 新键 o 触发
    expect(shortcutFor(ev('o'), false, keys)).toEqual({ type: 'open-search' })
    // 其他默认键不受影响
    expect(shortcutFor(ev('['), false, keys)).toEqual({ type: 'period-prev' })
  })

  it('L1 可配置：mod 键覆盖生效', () => {
    const keys = { 'replay-toggle': [{ key: 'r', mod: true }] }
    expect(shortcutFor(ev(' '), false, keys).type).toBe('none') // 旧空格被覆盖
    expect(shortcutFor(ev('r', { ctrlKey: true }), false, keys)).toEqual({ type: 'replay-toggle' })
  })

  it('L1 可配置：布局键 1/2/3 固定不受覆盖影响', () => {
    const keys = { 'open-search': [{ key: '1' }] }
    expect(shortcutFor(ev('1'), false, keys)).toEqual({ type: 'set-layout', layout: 'single' })
  })

  it('M12 语言切换：⇧⌘L 触发 cycle-lang', () => {
    expect(shortcutFor(ev('l', { metaKey: true, shiftKey: true }), false)).toEqual({ type: 'cycle-lang' })
    expect(shortcutFor(ev('L', { ctrlKey: true, shiftKey: true }), false)).toEqual({ type: 'cycle-lang' })
  })

  it('L1 默认多绑定：/ 与 ⌘K 都触发搜索', () => {
    expect(shortcutFor(ev('/'), false)).toEqual({ type: 'open-search' })
    expect(shortcutFor(ev('k', { metaKey: true }), false)).toEqual({ type: 'open-search' })
  })

  it('L1 默认多绑定：Delete 与 Backspace 都触发删除', () => {
    expect(shortcutFor(ev('Delete'), false)).toEqual({ type: 'delete-drawing' })
    expect(shortcutFor(ev('Backspace'), false)).toEqual({ type: 'delete-drawing' })
  })
})

describe('findConflicts（M10 快捷键冲突检测）', () => {
  it('默认配置：无冲突（多绑定是同一动作的备选，不计为跨动作冲突）', () => {
    expect(findConflicts({})).toEqual([])
  })

  it('自定义配置：两个动作共用一个键 → 冲突', () => {
    const keys: ShortcutKeyMap = {
      'open-search': [{ key: 'm' }], // 与 cycle-main 默认 m 冲突
    }
    const conflicts = findConflicts(keys)
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].key.key).toBe('m')
    expect(conflicts[0].actions).toContain('open-search')
    expect(conflicts[0].actions).toContain('cycle-main')
    expect(hasConflicts(keys)).toBe(true)
  })

  it('自定义配置：覆盖后无冲突（原默认键不再命中）', () => {
    const keys: ShortcutKeyMap = {
      'open-search': [{ key: 'o' }],
    }
    expect(hasConflicts(keys)).toBe(false)
  })

  it('自定义键位与布局键冲突也被检测（如设为 1）', () => {
    const keys: ShortcutKeyMap = {
      'open-search': [{ key: '1' }],
    }
    const conflicts = findConflicts(keys)
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].actions).toContain('set-layout')
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
