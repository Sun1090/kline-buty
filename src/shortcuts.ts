/**
 * 键盘快捷键：纯函数映射按键事件 → 动作，便于单测。
 * 组合键规则：Ctrl/Cmd 仅在 ⌘K（搜索）/ ⇧⌘F（全屏）/ 复制粘贴使用；
 * 其余单键快捷键要求无修饰键（避免与浏览器/系统快捷键冲突）。
 *
 * L1 可配置：每个动作可绑定多个键位（DEFAULT_BINDINGS），App 持久化覆盖后传入 shortcutFor。
 * 布局键（1/2/3）与方向键回放步进/速度保持固定，不进配置表（避免语义歧义）。
 */

export type ShortcutActionType =
  | 'period-prev'
  | 'period-next'
  | 'replay-toggle'
  | 'replay-step'
  | 'replay-speed'
  | 'delete-drawing'
  | 'escape'
  | 'open-search'
  | 'toggle-fullscreen'
  | 'set-layout'
  | 'cycle-main'
  | 'cycle-sub'
  | 'toggle-shortcuts'
  | 'copy-drawing'
  | 'paste-drawing'

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
  | { type: 'copy-drawing' }
  | { type: 'paste-drawing' }

export interface ShortcutEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/** L1 单个动作的一个键位 */
export interface ShortcutKey {
  /** 主键（字母忽略大小写比较；方向键/空格等用特殊值） */
  key: string
  /** 需要 Ctrl 或 Cmd 修饰（不区分平台） */
  mod?: boolean
  /** 需要 Shift 修饰 */
  shift?: boolean
}

/** L1 键位配置：action → 键位列表（多个绑定任一命中）。缺省动作用 DEFAULT_BINDINGS。 */
export type ShortcutKeyMap = Partial<Record<ShortcutActionType, ShortcutKey[]>>

export const DEFAULT_BINDINGS: Required<ShortcutKeyMap> = {
  'period-prev': [{ key: '[' }],
  'period-next': [{ key: ']' }],
  'replay-toggle': [{ key: ' ' }],
  'replay-step': [{ key: 'ArrowLeft' }, { key: 'ArrowRight' }],
  'replay-speed': [{ key: 'ArrowUp' }, { key: 'ArrowDown' }],
  'delete-drawing': [{ key: 'Delete' }, { key: 'Backspace' }],
  'escape': [{ key: 'Escape' }],
  'open-search': [{ key: 'k', mod: true }, { key: '/' }],
  'toggle-fullscreen': [{ key: 'f', mod: true, shift: true }, { key: 'f' }],
  'set-layout': [],
  'cycle-main': [{ key: 'm' }],
  'cycle-sub': [{ key: 'n' }],
  'toggle-shortcuts': [{ key: '?' }],
  'copy-drawing': [{ key: 'c', mod: true }],
  'paste-drawing': [{ key: 'v', mod: true }],
}

/** L1 布局动作键（单键 1/2/3），固定不配置 */
export const LAYOUT_KEYS: Record<string, ShortcutAction> = {
  '1': { type: 'set-layout', layout: 'single' },
  '2': { type: 'set-layout', layout: 'pair' },
  '3': { type: 'set-layout', layout: 'quad' },
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

/** 命中单个键位：匹配 key（忽略大小写）+ mod/shift 约束 */
function matchKey(e: ShortcutEvent, def: ShortcutKey): boolean {
  const modMatch = (def.mod ?? false) === (e.ctrlKey || e.metaKey)
  const shiftMatch = (def.shift ?? false) === e.shiftKey
  const keyMatch = e.key.length === 1 ? e.key.toLowerCase() === def.key.toLowerCase() : e.key === def.key
  return modMatch && shiftMatch && keyMatch
}

/** 遍历动作键位表找命中（按表定义顺序，首个命中返回动作） */
function actionForKey(e: ShortcutEvent, keys: ShortcutKeyMap): ShortcutAction | null {
  const merged = { ...DEFAULT_BINDINGS, ...keys }
  for (const entry of Object.entries(merged) as [ShortcutActionType, ShortcutKey[]][]) {
    const [type, defs] = entry
    if (type === 'set-layout') continue
    if (!defs || defs.length === 0) continue
    for (const def of defs) {
      if (!matchKey(e, def)) continue
      switch (type) {
        case 'replay-step':
          return { type, dir: e.key === 'ArrowLeft' ? -1 : 1 }
        case 'replay-speed':
          return { type, dir: e.key === 'ArrowUp' ? 1 : -1 }
        case 'cycle-main':
        case 'cycle-sub':
          return { type, dir: 1 }
        default:
          return { type } as ShortcutAction
      }
    }
  }
  return null
}

/**
 * L1 按键 → 动作。`keys` 为可配置键位覆盖（缺省用 DEFAULT_BINDINGS）。
 * 布局键 1/2/3 固定；输入态仅 Esc 透传。
 */
export function shortcutFor(e: ShortcutEvent, inInput: boolean, keys: ShortcutKeyMap = {}): ShortcutAction {
  // 输入态：仅 Esc 透传（关闭下拉/取消编辑）
  if (inInput) return e.key === 'Escape' ? { type: 'escape' } : { type: 'none' }

  // 布局键固定（无修饰键）
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const layout = LAYOUT_KEYS[e.key]
    if (layout) return layout
  }

  const hit = actionForKey(e, keys)
  if (hit) return hit
  return e.key === 'Escape' ? { type: 'escape' } : { type: 'none' }
}

/** L1 校验键位配置：返回非法项（key 为空串/含空数组的动作） */
export function validateKeys(keys: ShortcutKeyMap): ShortcutActionType[] {
  return (Object.entries(keys) as [ShortcutActionType, ShortcutKey[]][]).filter(([, defs]) => !defs || defs.length === 0 || defs.some((d) => !d.key)).map(([t]) => t)
}

/**
 * M10 快捷键冲突检测：合并默认与自定义键位表，找出被多个动作共用的 (key,mod,shift) 组合。
 * 返回冲突列表 `{ key: ShortcutKey, actions: ShortcutActionType[] }`（action 数 ≥ 2 为冲突）。
 * 与布局键（1/2/3）、方向键回放（←/→/↑/↓）冲突也计入。
 */
export function findConflicts(keys: ShortcutKeyMap): { key: ShortcutKey; actions: ShortcutActionType[] }[] {
  const merged = { ...DEFAULT_BINDINGS, ...keys }
  const byBinding = new Map<string, { key: ShortcutKey; actions: ShortcutActionType[] }>()
  const bindingId = (k: ShortcutKey) => `${k.key}:${k.mod ?? false}:${k.shift ?? false}`

  const register = (type: ShortcutActionType, def: ShortcutKey) => {
    const id = bindingId(def)
    const hit = byBinding.get(id)
    if (hit) {
      if (!hit.actions.includes(type)) hit.actions.push(type)
    } else {
      byBinding.set(id, { key: def, actions: [type] })
    }
  }

  for (const [type, defs] of Object.entries(merged) as [ShortcutActionType, ShortcutKey[]][]) {
    if (type === 'set-layout') continue
    for (const def of defs ?? []) register(type, def)
  }
  // 布局键与方向键固定绑定（不参与配置，但可能被自定义覆盖）
  for (const [key, action] of Object.entries(LAYOUT_KEYS)) {
    if (action.type === 'set-layout') register('set-layout' as ShortcutActionType, { key })
  }

  return Array.from(byBinding.values())
    .filter((x) => x.actions.length >= 2)
    .sort((a, b) => bindingId(a.key).localeCompare(bindingId(b.key)))
}

/** M10 便捷版：冲突是否存在于某配置 */
export function hasConflicts(keys: ShortcutKeyMap): boolean {
  return findConflicts(keys).length > 0
}

/** L1 把单个按键事件格式化为可读标签（显示用） */
export function keyLabel(def: ShortcutKey): string {
  const parts: string[] = []
  if (def.mod) parts.push('⌘')
  if (def.shift) parts.push('⇧')
  const k = def.key === ' ' ? 'Space' : def.key === 'ArrowLeft' ? '←' : def.key === 'ArrowRight' ? '→' : def.key === 'ArrowUp' ? '↑' : def.key === 'ArrowDown' ? '↓' : def.key.length === 1 ? def.key.toUpperCase() : def.key
  parts.push(k)
  return parts.join('')
}
