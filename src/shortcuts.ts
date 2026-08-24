/**
 * 键盘快捷键：纯函数映射按键事件 → 动作，便于单测。
 * 组合键规则：Ctrl/Cmd 仅在 ⌘K（搜索）/ ⇧⌘F（全屏）使用；
 * 其余单键快捷键要求无修饰键（避免与浏览器/系统快捷键冲突）。
 */

export type ShortcutAction =
  | { type: 'none' }
  | { type: 'period-prev' }
  | { type: 'period-next' }
  | { type: 'replay-toggle' }
  | { type: 'replay-step'; dir: 1 | -1 }
  | { type: 'replay-speed'; dir: 1 | -1 }
  | { type: 'delete-drawing' }
  | { type: 'escape' }
  | { type: 'open-search' }
  | { type: 'toggle-fullscreen' }
  | { type: 'set-layout'; layout: 'single' | 'pair' | 'quad' }
  | { type: 'cycle-main'; dir: 1 | -1 }
  | { type: 'cycle-sub'; dir: 1 | -1 }
  | { type: 'toggle-shortcuts' }

export interface ShortcutEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/** 是否处于文本输入态（输入框/下拉/文本域内不响应全局快捷键，Esc 除外） */
export function isTypingTarget(t: { tagName?: string } | null): boolean {
  const tag = t?.tagName ?? ''
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
}

/** 在有序选项中循环切换（dir=1 下一个 / -1 上一个，首尾环绕） */
export function cycleValue<T extends string>(values: readonly T[], current: T, dir: 1 | -1): T {
  const idx = values.indexOf(current)
  if (idx < 0) return values[0] ?? current
  return values[(idx + dir + values.length) % values.length]
}

export function shortcutFor(e: ShortcutEvent, inInput: boolean): ShortcutAction {
  const key = e.key
  const mod = e.ctrlKey || e.metaKey

  // 输入态：仅 Esc 透传（关闭下拉/取消编辑）
  if (inInput) return key === 'Escape' ? { type: 'escape' } : { type: 'none' }

  if (mod && (key === 'k' || key === 'K')) return { type: 'open-search' }
  if (mod && e.shiftKey && (key === 'f' || key === 'F')) return { type: 'toggle-fullscreen' }

  if (!mod && !e.altKey) {
    switch (key) {
      case '[':
        return { type: 'period-prev' }
      case ']':
        return { type: 'period-next' }
      case ' ':
        return { type: 'replay-toggle' }
      case '/':
        return { type: 'open-search' }
      case 'f':
      case 'F':
        return { type: 'toggle-fullscreen' }
      case '1':
        return { type: 'set-layout', layout: 'single' }
      case '2':
        return { type: 'set-layout', layout: 'pair' }
      case '3':
        return { type: 'set-layout', layout: 'quad' }
      case 'm':
      case 'M':
        return { type: 'cycle-main', dir: 1 }
      case 'n':
      case 'N':
        return { type: 'cycle-sub', dir: 1 }
      case '?':
        return { type: 'toggle-shortcuts' }
      case 'ArrowRight':
        return { type: 'replay-step', dir: 1 }
      case 'ArrowLeft':
        return { type: 'replay-step', dir: -1 }
      case 'ArrowUp':
        return { type: 'replay-speed', dir: 1 }
      case 'ArrowDown':
        return { type: 'replay-speed', dir: -1 }
    }
  }

  if (key === 'Delete' || key === 'Backspace') return { type: 'delete-drawing' }
  if (key === 'Escape') return { type: 'escape' }
  return { type: 'none' }
}
