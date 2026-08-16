// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyTheme, COLOR_PRESETS, presetFor, themeFor, THEMES } from '../theme'

describe('COLOR_PRESETS / presetFor', () => {
  it('包含 4 套预设：classic / a-share / purple / teal', () => {
    expect(COLOR_PRESETS.map((p) => p.id)).toEqual(['classic', 'a-share', 'purple', 'teal'])
  })
  it('presetFor 按 id 返回；未知 id 回退 classic', () => {
    expect(presetFor('purple').accent).toBe('#8b5cf6')
    // @ts-expect-error 未知 id 仅测试回退分支
    expect(presetFor('unknown').id).toBe('classic')
  })
})

describe('themeFor', () => {
  it('dark + classic 保持原配色', () => {
    const t = themeFor('dark', 'classic')
    expect(t.up).toBe(THEMES.dark.up)
    expect(t.down).toBe(THEMES.dark.down)
    expect(t.accent).toBe('#2962ff')
    expect(t.background).toBe(THEMES.dark.background)
  })
  it('a-share 预设 → 红涨绿跌（up/down 互换）', () => {
    const t = themeFor('dark', 'a-share')
    expect(t.up).toBe('#ef5350')
    expect(t.down).toBe('#26a69a')
    expect(t.accent).toBe('#d4380d')
  })
  it('预设色对 light 模式同样生效', () => {
    const t = themeFor('light', 'teal')
    expect(t.up).toBe('#10b981')
    expect(t.down).toBe('#fb7185')
    expect(t.accent).toBe('#06b6d4')
    expect(t.background).toBe(THEMES.light.background)
  })
})

describe('applyTheme', () => {
  it('写入 data-theme + 内联 CSS 变量（--up/--down/--accent/--yellow）', () => {
    applyTheme('dark', 'purple')
    const html = document.documentElement
    expect(html.getAttribute('data-theme')).toBe('dark')
    expect(html.style.getPropertyValue('--up')).toBe('#22c55e')
    expect(html.style.getPropertyValue('--down')).toBe('#f43f5e')
    expect(html.style.getPropertyValue('--accent')).toBe('#8b5cf6')
    expect(html.style.getPropertyValue('--yellow')).toBe('#f5c02f')
  })
  it('切回 classic 恢复默认色', () => {
    applyTheme('light', 'classic')
    const html = document.documentElement
    expect(html.getAttribute('data-theme')).toBe('light')
    expect(html.style.getPropertyValue('--up')).toBe('#26a69a')
    expect(html.style.getPropertyValue('--down')).toBe('#ef5350')
    expect(html.style.getPropertyValue('--accent')).toBe('#2962ff')
  })
})
