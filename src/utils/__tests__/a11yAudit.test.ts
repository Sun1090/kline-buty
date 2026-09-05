// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  auditAriaStateValues,
  auditInteractiveName,
  auditPressedGroup,
  auditRegion,
  auditTabIndexRange,
  auditUniqueAriaLabels,
  getAccessibleName,
  runA11yAudit,
} from '../a11yAudit'

/** 用 HTML 片段建容器，便于构造各种 a11y 正/反例（挂到 body 使 getElementById 可命中） */
function host(html: string): HTMLElement {
  const div = document.createElement('div')
  div.innerHTML = html
  document.body.appendChild(div)
  return div
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('getAccessibleName（可访问名称解析）', () => {
  it('aria-labelledby 优先于 aria-label', () => {
    const el = host('<button aria-label="A" aria-labelledby="lbl"></button><span id="lbl">来自Labelledby</span>').firstElementChild!
    expect(getAccessibleName(el)).toBe('来自Labelledby')
  })

  it('aria-label → title → 文本 依次回退', () => {
    expect(getAccessibleName(host('<button aria-label="标签"></button>').firstElementChild!)).toBe('标签')
    expect(getAccessibleName(host('<button title="标题"></button>').firstElementChild!)).toBe('标题')
    expect(getAccessibleName(host('<button>可见文本</button>').firstElementChild!)).toBe('可见文本')
  })

  it('输入框：外层 label / placeholder 也可作为名称', () => {
    const wrap = host('<label>用户名<input /></label>')
    expect(getAccessibleName(wrap.querySelector('input')!)).toBe('用户名')
    expect(getAccessibleName(host('<input placeholder="搜索" />').firstElementChild!)).toBe('搜索')
  })

  it('无任何名称来源 → 空串', () => {
    expect(getAccessibleName(host('<button></button>').firstElementChild!)).toBe('')
  })
})

describe('auditInteractiveName（交互控件必须有可访问名称）', () => {
  it('纯图标按钮缺名称 → error', () => {
    const c = host('<button><svg /></button>')
    const f = auditInteractiveName(c)
    expect(f).toHaveLength(1)
    expect(f[0].rule).toBe('interactive-name')
    expect(f[0].severity).toBe('error')
  })

  it('有 aria-label / 文本 / title 的按钮全部通过', () => {
    const c = host('<button aria-label="关闭">✕</button><button>确定</button><button title="提示">?</button>')
    expect(auditInteractiveName(c)).toEqual([])
  })

  it('未带 href 的 a 不算交互链接；input 用 INTERACTIVE_SELECTOR 才纳入', () => {
    const c = host('<a>纯锚点文本</a><input placeholder="搜索" />')
    expect(auditInteractiveName(c)).toEqual([]) // 默认按钮聚焦
    expect(auditInteractiveName(c, 'input')).toEqual([]) // input 有 placeholder
    expect(auditInteractiveName(host('<input />'))).toHaveLength(1) // 空 input 缺名称
  })
})

describe('auditAriaStateValues（aria 状态取值合法性）', () => {
  it('true/false 全通过；pressed/checked/selected 可 mixed', () => {
    const c = host('<button aria-pressed="true">开</button><button aria-pressed="false">关</button><button aria-pressed="mixed">三态</button><div aria-expanded="false"></div>')
    expect(auditAriaStateValues(c)).toEqual([])
  })

  it('非法取值（大小写/数字/undefined）→ error', () => {
    const c = host('<button aria-pressed="True">A</button><button aria-pressed="1">B</button><div aria-expanded="undefined"></div>')
    const f = auditAriaStateValues(c)
    expect(f).toHaveLength(3)
    expect(f.every((x) => x.rule === 'aria-state-value' && x.severity === 'error')).toBe(true)
  })

  it('aria-expanded 不允许 mixed', () => {
    const f = auditAriaStateValues(host('<div aria-expanded="mixed"></div>'))
    expect(f).toHaveLength(1)
  })
})

describe('auditPressedGroup（互斥切换组恰一个按下）', () => {
  it('恰一个 aria-pressed=true → 通过', () => {
    const c = host('<div id="g"><button aria-pressed="false">1m</button><button aria-pressed="true">15m</button><button aria-pressed="false">1h</button></div>')
    expect(auditPressedGroup(c.querySelector('#g')!)).toEqual([])
  })

  it('组内全 false → 报 no-pressed', () => {
    const c = host('<div id="g"><button aria-pressed="false">A</button><button aria-pressed="false">B</button></div>')
    const f = auditPressedGroup(c.querySelector('#g')!)
    expect(f[0].message).toContain('均 aria-pressed=false')
  })

  it('组内多个 true → 报 multi-pressed', () => {
    const c = host('<div id="g"><button aria-pressed="true">A</button><button aria-pressed="true">B</button></div>')
    const f = auditPressedGroup(c.querySelector('#g')!)
    expect(f[0].message).toContain('2 个按钮 aria-pressed=true')
  })

  it('独立开关（单按钮带 pressed）不误判为互斥组', () => {
    const c = host('<div id="g"><button aria-pressed="false">开关</button><button>其它</button></div>')
    expect(auditPressedGroup(c.querySelector('#g')!)).toEqual([])
  })
})

describe('auditUniqueAriaLabels（aria-label 唯一性）', () => {
  it('同父兄弟同名 → warning', () => {
    const c = host('<div><button aria-label="关闭">✕</button><button aria-label="关闭">✕</button></div>')
    const f = auditUniqueAriaLabels(c)
    expect(f).toHaveLength(2)
    expect(f[0].severity).toBe('warning')
  })

  it('同名但在不同父容器（如多个收藏星标）→ 默认不误报', () => {
    const c = host('<div><span><button aria-label="收藏">☆</button></span><span><button aria-label="收藏">☆</button></span></div>')
    expect(auditUniqueAriaLabels(c)).toEqual([])
    expect(auditUniqueAriaLabels(c, { scope: 'all' })).toHaveLength(2) // 全局作用域可扫出
  })
})

describe('auditTabIndexRange（tabindex 范围）', () => {
  it('roving -1/0 全通过', () => {
    const c = host('<div><button tabindex="0">A</button><button tabindex="-1">B</button></div>')
    expect(auditTabIndexRange(c)).toEqual([])
  })

  it('正 tabindex / 负大值 / 非整数 → error', () => {
    const c = host('<button tabindex="1">A</button><button tabindex="-2">B</button><button tabindex="x">C</button>')
    const f = auditTabIndexRange(c)
    expect(f).toHaveLength(3)
  })
})

describe('auditRegion（面板语义）', () => {
  it('role=region + aria-label → 通过', () => {
    expect(auditRegion(host('<div role="region" aria-label="订单簿"></div>').firstElementChild!)).toEqual([])
  })

  it('缺 role 或缺 aria-label → error', () => {
    expect(auditRegion(host('<div aria-label="订单簿"></div>').firstElementChild!)).toHaveLength(1)
    expect(auditRegion(host('<div role="region"></div>').firstElementChild!)).toHaveLength(1)
  })
})

describe('runA11yAudit（组合执行）', () => {
  it('干净组件 → errors 为空、clean=true、byRule 分组', () => {
    const c = host('<div role="toolbar" aria-label="周期"><button aria-pressed="true" aria-label="15分">15分</button><button aria-pressed="false" aria-label="1时">1时</button></div>')
    const r = runA11yAudit(c, { pressedGroups: [c.querySelector('[role="toolbar"]')!] })
    expect(r.clean).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })

  it('违规组件 → 汇总 error 并归入 byRule', () => {
    const c = host('<button tabindex="3">✕</button><button aria-pressed="1">开关</button>')
    const r = runA11yAudit(c)
    expect(r.clean).toBe(false)
    expect(r.byRule['tabindex-range']).toHaveLength(1)
    expect(r.byRule['aria-state-value']).toHaveLength(1)
  })

  it('regions 传入 role=region 容器 → 校验语义', () => {
    const c = host('<div role="region"></div>')
    const r = runA11yAudit(c, { regions: [c.firstElementChild!] })
    expect(r.byRule['region']).toHaveLength(1) // 缺 aria-label
  })
})
