// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyTheme, COLOR_PRESETS, presetFor, themeFor, THEMES, timeToMinutes, resolveScheduledTheme, currentScheduledTheme } from '../theme'

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

describe('applyTheme F7 高对比模式', () => {
  it('highContrast=true：设置 data-hc 并用高对比强调/涨跌色', () => {
    applyTheme('dark', 'classic', true)
    const html = document.documentElement
    expect(html.getAttribute('data-hc')).toBe('')
    expect(html.style.getPropertyValue('--accent')).toBe('#4d8dff')
    expect(html.style.getPropertyValue('--up')).toBe('#2ee6d6')
    expect(html.style.getPropertyValue('--down')).toBe('#ff6b6b')
  })
  it('highContrast=false：移除 data-hc 并恢复预设色', () => {
    applyTheme('dark', 'classic', true)
    applyTheme('dark', 'classic', false)
    const html = document.documentElement
    expect(html.getAttribute('data-hc')).toBeNull()
    expect(html.style.getPropertyValue('--up')).toBe('#26a69a')
    expect(html.style.getPropertyValue('--accent')).toBe('#2962ff')
  })
})

describe('I9 timeToMinutes', () => {
  it('合法时刻 → 当日分钟数', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('07:00')).toBe(420)
    expect(timeToMinutes('18:00')).toBe(1080)
    expect(timeToMinutes('23:59')).toBe(1439)
  })
  it('单数字小时也接受', () => {
    expect(timeToMinutes('0:30')).toBe(30)
    expect(timeToMinutes('9:05')).toBe(545)
  })
  it('非法输入 → -1', () => {
    expect(timeToMinutes('')).toBe(-1)
    expect(timeToMinutes('24:00')).toBe(-1)
    expect(timeToMinutes('18:60')).toBe(-1)
    expect(timeToMinutes('abc')).toBe(-1)
    expect(timeToMinutes('6pm')).toBe(-1)
  })
})

describe('I9 resolveScheduledTheme', () => {
  it('跨午夜（dark 18:00 / light 07:00）：夜间为深色', () => {
    const config = { darkTime: '18:00', lightTime: '07:00' }
    expect(resolveScheduledTheme(timeToMinutes('19:00'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('23:59'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('00:00'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('06:00'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('08:00'), config)).toBe('light')
    expect(resolveScheduledTheme(timeToMinutes('17:00'), config)).toBe('light')
  })
  it('跨午夜边界：darkTime 起进入深色、lightTime 起回到浅色', () => {
    const config = { darkTime: '18:00', lightTime: '07:00' }
    expect(resolveScheduledTheme(timeToMinutes('17:59'), config)).toBe('light')
    expect(resolveScheduledTheme(timeToMinutes('18:00'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('06:59'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('07:00'), config)).toBe('light')
  })
  it('非跨午夜（dark 07:00 / light 18:00）：白天为深色', () => {
    const config = { darkTime: '07:00', lightTime: '18:00' }
    expect(resolveScheduledTheme(timeToMinutes('10:00'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('17:59'), config)).toBe('dark')
    expect(resolveScheduledTheme(timeToMinutes('18:00'), config)).toBe('light')
    expect(resolveScheduledTheme(timeToMinutes('20:00'), config)).toBe('light')
    expect(resolveScheduledTheme(timeToMinutes('06:00'), config)).toBe('light')
  })
  it('非法配置回退深色', () => {
    expect(resolveScheduledTheme(600, { darkTime: '', lightTime: '' })).toBe('dark')
  })
})

describe('I9 currentScheduledTheme', () => {
  it('按注入时刻解析（不依赖系统时钟）', () => {
    const config = { darkTime: '18:00', lightTime: '07:00' }
    expect(currentScheduledTheme(config, new Date(2026, 0, 1, 19, 0))).toBe('dark')
    expect(currentScheduledTheme(config, new Date(2026, 0, 1, 9, 0))).toBe('light')
  })
})
