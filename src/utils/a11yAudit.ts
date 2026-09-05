/**
 * O9 纯函数 a11y 断言库（零依赖）
 *
 * 在不引入 axe / eslint-plugin-jsx-a11y 的前提下，对 React 组件渲染出的 DOM 子树做
 * 系统化可访问性静态断言。全部函数无副作用：输入 Element，输出 A11yFinding[]，
 * 便于 Vitest 逐条断言。
 *
 * 覆盖的关键模式（均为无 JSX-a11y 规则也可静态判定的）：
 * - 交互控件可访问名称（aria-label / aria-labelledby / title / 文本 / label / placeholder）
 * - aria-pressed / aria-expanded / aria-selected / aria-checked 取值合法性
 * - 互斥切换组 aria-pressed 一致性（恰一个按下；独立开关组不误报）
 * - aria-label 唯一性（默认「同父兄弟」作用域，避免误报如多个「收藏切换」星标）
 * - tabindex 范围（roving tabindex：仅 -1 / 0，正 tabindex 会破坏 Tab 顺序）
 * - role="region" + aria-label 面板语义
 *
 * 用法（组件审计测试）：
 *   const { container } = render(<PeriodBar .../>)
 *   const r = runA11yAudit(container, {
 *     pressedGroups: [screen.getByTestId('period-bar')],
 *   })
 *   expect(r.errors).toEqual([])
 */

export type A11ySeverity = 'error' | 'warning'

export type A11yRule =
  | 'interactive-name'
  | 'aria-state-value'
  | 'unique-aria-label'
  | 'tabindex-range'

export interface A11yFinding {
  rule: A11yRule | 'pressed-group' | 'region'
  severity: A11ySeverity
  /** 稳定定位描述，如 button[data-testid="period-1m"] */
  target: string
  message: string
}

/** 默认交互控件集合：按钮 / 链接 / select / 输入框 / 语义角色按钮 */
export const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'select',
  'textarea',
  'input:not([type="hidden"])',
  '[role="button"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="checkbox"]',
].join(',')

/**
 * 本阶段聚焦按钮交互控件（O9 范围），输入框的 <label> 覆盖留待 E11 残余项。
 * 需要扩展到输入框时给 auditInteractiveName 传 INTERACTIVE_SELECTOR。
 */
export const BUTTON_SELECTOR = 'button, a[href], [role="button"]'

const ARIA_STATE_ATTRS = ['aria-pressed', 'aria-expanded', 'aria-selected', 'aria-checked'] as const

/** 生成稳定的元素定位描述，便于测试失败时快速定位 */
export function describeEl(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const testId = el.getAttribute('data-testid')
  if (testId) return `${tag}[data-testid="${testId}"]`
  const label = el.getAttribute('aria-label')
  if (label) return `${tag}[aria-label="${label}"]`
  const text = el.textContent?.trim()
  if (text) return `${tag}「${text.slice(0, 16)}」`
  return tag
}

/** input/textarea/select 的名称：外层 <label> → placeholder → select 选中项 → value（checkbox/radio 需 label） */
function formControlName(el: Element): string {
  const wrap = el.closest('label')
  if (wrap?.textContent?.trim()) return wrap.textContent.trim()
  const placeholder = el.getAttribute('placeholder')
  if (placeholder?.trim()) return placeholder.trim()
  if (el.tagName === 'select') {
    const opt = (el as HTMLSelectElement).selectedOptions?.[0]
    if (opt?.textContent?.trim()) return opt.textContent.trim()
  }
  const input = el as HTMLInputElement
  if (input.type !== 'checkbox' && input.type !== 'radio' && input.value?.trim()) {
    return input.value.trim()
  }
  return ''
}

/**
 * 解析元素可访问名称，来源优先级：
 * aria-labelledby → aria-label → title → 关联 <label> / placeholder → 文本内容 → alt
 */
export function getAccessibleName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby')
  if (labelledby) {
    const owner = el.ownerDocument?.getElementById(labelledby)
    if (owner?.textContent?.trim()) return owner.textContent.trim()
  }
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel?.trim()) return ariaLabel.trim()
  const title = el.getAttribute('title')
  if (title?.trim()) return title.trim()
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const name = formControlName(el)
    if (name) return name
  }
  if (el.textContent?.trim()) return el.textContent.trim()
  const alt = el.getAttribute('alt')
  if (alt?.trim()) return alt.trim()
  return ''
}

/** 收集容器内符合选择器的交互控件 */
export function collectInteractive(container: Element, selector: string = INTERACTIVE_SELECTOR): Element[] {
  return Array.from(container.querySelectorAll<Element>(selector))
}

/** 规则一：交互控件必须有可访问名称 */
export function auditInteractiveName(container: Element, selector: string = INTERACTIVE_SELECTOR): A11yFinding[] {
  const out: A11yFinding[] = []
  for (const el of collectInteractive(container, selector)) {
    if (!getAccessibleName(el)) {
      out.push({
        rule: 'interactive-name',
        severity: 'error',
        target: describeEl(el),
        message: '交互控件缺少可访问名称（aria-label / aria-labelledby / title / 文本 / <label> / placeholder）',
      })
    }
  }
  return out
}

/**
 * 规则二：aria-pressed / aria-expanded / aria-selected / aria-checked 取值必须合法。
 * 合法值：true / false；pressed、checked、selected 额外允许 mixed（三态）。
 */
export function auditAriaStateValues(container: Element): A11yFinding[] {
  const out: A11yFinding[] = []
  const selector = ARIA_STATE_ATTRS.map((a) => `[${a}]`).join(',')
  for (const el of container.querySelectorAll<Element>(selector)) {
    for (const attr of ARIA_STATE_ATTRS) {
      const v = el.getAttribute(attr)
      if (v === null) continue
      const allowsMixed = attr === 'aria-pressed' || attr === 'aria-checked' || attr === 'aria-selected'
      if (v !== 'true' && v !== 'false' && !(allowsMixed && v === 'mixed')) {
        out.push({
          rule: 'aria-state-value',
          severity: 'error',
          target: describeEl(el),
          message: `${attr}="${v}" 非法：须为 true/false${allowsMixed ? '（可 mixed）' : ''}`,
        })
      }
    }
  }
  return out
}

/**
 * 规则三：互斥切换组 aria-pressed 一致性——组内 ≥2 个按钮带 aria-pressed 时，
 * 必须恰好一个为 true。只检查显式传入的组根（避免把独立开关误当互斥组）。
 *
 * @param groupRoot  组容器（如 role="toolbar" / 排序按钮行）
 * @param childSelector 组内按钮选择器，默认直接子 button
 */
export function auditPressedGroup(groupRoot: Element, childSelector: string = ':scope > button'): A11yFinding[] {
  const out: A11yFinding[] = []
  const buttons = Array.from(groupRoot.querySelectorAll<Element>(childSelector)).filter((el) => el.tagName === 'BUTTON')
  const withPressed = buttons.filter((el) => el.hasAttribute('aria-pressed'))
  // 单切换 / 未声明 pressed → 不判定互斥
  if (withPressed.length < 2) return out
  const pressed = withPressed.filter((el) => el.getAttribute('aria-pressed') === 'true')
  if (pressed.length === 0) {
    out.push({
      rule: 'pressed-group',
      severity: 'error',
      target: describeEl(groupRoot),
      message: `互斥切换组内 ${withPressed.length} 个按钮均 aria-pressed=false，应恰好一个 true`,
    })
  } else if (pressed.length > 1) {
    out.push({
      rule: 'pressed-group',
      severity: 'error',
      target: describeEl(groupRoot),
      message: `互斥切换组内有 ${pressed.length} 个按钮 aria-pressed=true，应恰好一个`,
    })
  }
  return out
}

export interface UniqueLabelOptions {
  /** siblings（默认）= 仅同父兄弟重复才告警；all = 容器内全局重复 */
  scope?: 'siblings' | 'all'
}

/**
 * 规则四：aria-label 唯一性。
 * 默认仅检查「同父兄弟重复」（同一互斥组/同一工具栏内同名会无法区分），
 * 跨区重复（如多个「收藏切换」星标）不误报；需要全局扫可传 scope: 'all'。
 */
export function auditUniqueAriaLabels(container: Element, options: UniqueLabelOptions = {}): A11yFinding[] {
  const scope = options.scope ?? 'siblings'
  const out: A11yFinding[] = []
  const els = Array.from(container.querySelectorAll<Element>('[aria-label]'))
  if (scope === 'all') {
    const byLabel = new Map<string, Element[]>()
    for (const el of els) {
      const label = el.getAttribute('aria-label')?.trim()
      if (!label) continue
      const arr = byLabel.get(label) ?? []
      arr.push(el)
      byLabel.set(label, arr)
    }
    for (const [label, arr] of byLabel) {
      if (arr.length > 1) {
        for (const el of arr) {
          out.push({
            rule: 'unique-aria-label',
            severity: 'warning',
            target: describeEl(el),
            message: `aria-label「${label}」在容器内重复 ${arr.length} 次`,
          })
        }
      }
    }
    return out
  }
  for (const el of els) {
    const label = el.getAttribute('aria-label')?.trim()
    const parent = el.parentElement
    if (!label || !parent) continue
    const twins = Array.from(parent.children).filter((s) => s !== el && s.getAttribute('aria-label') === label)
    if (twins.length > 0) {
      out.push({
        rule: 'unique-aria-label',
        severity: 'warning',
        target: describeEl(el),
        message: `aria-label「${label}」与同父 ${twins.length} 个兄弟重复`,
      })
    }
  }
  return out
}

export interface TabIndexOptions {
  /** 允许最小值（roving tabindex 用 -1/0，默认 -1） */
  min?: number
  /** 允许最大值（默认 0：正 tabindex 会破坏 Tab 顺序） */
  max?: number
}

/** 规则五：tabindex 必须在 [min, max] 内（默认 -1..0） */
export function auditTabIndexRange(container: Element, options: TabIndexOptions = {}): A11yFinding[] {
  const min = options.min ?? -1
  const max = options.max ?? 0
  const out: A11yFinding[] = []
  for (const el of container.querySelectorAll<Element>('[tabindex]')) {
    const raw = el.getAttribute('tabindex')
    const n = Number(raw)
    if (raw === null || !Number.isInteger(n) || n < min || n > max) {
      out.push({
        rule: 'tabindex-range',
        severity: 'error',
        target: describeEl(el),
        message: `tabindex="${raw}" 超出可访问范围 [${min}, ${max}]（roving tabindex 用 -1/0）`,
      })
    }
  }
  return out
}

/** 规则六：role="region" 容器必须有 aria-label（键盘可聚焦滚动面板的语义） */
export function auditRegion(el: Element): A11yFinding[] {
  const out: A11yFinding[] = []
  if (el.getAttribute('role') !== 'region') {
    out.push({ rule: 'region', severity: 'error', target: describeEl(el), message: '面板容器缺 role="region"' })
  }
  if (!el.getAttribute('aria-label')) {
    out.push({ rule: 'region', severity: 'error', target: describeEl(el), message: 'role="region" 容器缺 aria-label' })
  }
  return out
}

export interface A11yAuditOptions {
  /** 需要执行的容器级规则；缺省为全部四条 */
  rules?: A11yRule[]
  /** 交互控件选择器；默认 BUTTON_SELECTOR（本阶段聚焦按钮控件） */
  interactiveSelector?: string
  /** 互斥切换组：每个组须恰好一个 aria-pressed=true */
  pressedGroups?: Element[]
  /** role="region" 面板容器：须带 aria-label */
  regions?: Element[]
  /** aria-label 唯一性作用域 */
  labelScope?: UniqueLabelOptions['scope']
  /** tabindex 范围覆盖 */
  tabindex?: TabIndexOptions
}

export interface A11yAuditResult {
  findings: A11yFinding[]
  errors: A11yFinding[]
  warnings: A11yFinding[]
  /** 是否无 error 级发现（warning 不阻断） */
  clean: boolean
  byRule: Record<string, A11yFinding[]>
}

/** 组合执行容器级规则 + 显式组/区域检查，返回分类结果 */
export function runA11yAudit(container: Element, options: A11yAuditOptions = {}): A11yAuditResult {
  const rules = options.rules ?? (['interactive-name', 'aria-state-value', 'unique-aria-label', 'tabindex-range'] as A11yRule[])
  const findings: A11yFinding[] = []
  if (rules.includes('interactive-name')) {
    findings.push(...auditInteractiveName(container, options.interactiveSelector ?? BUTTON_SELECTOR))
  }
  if (rules.includes('aria-state-value')) {
    findings.push(...auditAriaStateValues(container))
  }
  if (rules.includes('unique-aria-label')) {
    findings.push(...auditUniqueAriaLabels(container, { scope: options.labelScope }))
  }
  if (rules.includes('tabindex-range')) {
    findings.push(...auditTabIndexRange(container, options.tabindex))
  }
  for (const g of options.pressedGroups ?? []) findings.push(...auditPressedGroup(g))
  for (const r of options.regions ?? []) findings.push(...auditRegion(r))

  const byRule: Record<string, A11yFinding[]> = {}
  for (const f of findings) (byRule[f.rule] ??= []).push(f)
  const errors = findings.filter((f) => f.severity === 'error')
  return {
    findings,
    errors,
    warnings: findings.filter((f) => f.severity === 'warning'),
    clean: errors.length === 0,
    byRule,
  }
}
