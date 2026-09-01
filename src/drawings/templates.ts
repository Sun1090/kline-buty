import type { Drawing } from './logic'

/**
 * 画线模板（C6）：把常用画线组合命名保存，一键套用到任意品种/图表。
 *
 * 模板只保留「几何 + 样式」信息（type/points/text/fontSize/color），
 * 丢弃 id 与图层状态（hidden/locked）——套用时应在新图表重新生成 id 并以可见态呈现。
 *
 * 坐标语义：points 为逻辑坐标 {time, price}（绝对时间戳 + 绝对价格），
 * 因此同一模板可直接套用到任意品种（跨品种坐标天然一致，无需换算）。
 */

export interface DrawingTemplate {
  name: string
  drawings: Omit<Drawing, 'id' | 'hidden' | 'locked'>[]
  /** 创建时间（模板列表排序用） */
  createdAt: number
}

/** 从画线数组提取模板：剥离 id 与图层状态，仅保留几何与样式 */
export function createTemplate(name: string, drawings: Drawing[], now = Date.now()): DrawingTemplate {
  return {
    name,
    createdAt: now,
    drawings: drawings.map(({ id: _id, hidden: _h, locked: _l, ...rest }) => rest),
  }
}

/** 同名冲突自动序号化：foo → foo (2) → foo (3)… */
export function uniqueTemplateName(name: string, existing: Set<string>): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  if (!existing.has(trimmed)) return trimmed
  let n = 2
  while (existing.has(`${trimmed} (${n})`)) n++
  return `${trimmed} (${n})`
}

/** 默认 id 生成（与 logic.createDrawing 相同格式，避免与既有画线冲突） */
function defaultId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 应用模板：把模板画线追加到目标数组（保留原画线），每条重新生成 id。
 * createId 可注入以支持确定性测试。
 */
export function applyTemplate(
  current: Drawing[],
  template: DrawingTemplate,
  createId: () => string = defaultId,
): Drawing[] {
  const added: Drawing[] = template.drawings.map((d) => ({ ...d, id: createId() }))
  return [...current, ...added]
}

/** 模板列表按创建时间升序（先建的在前） */
export function sortTemplates(templates: Record<string, DrawingTemplate>): DrawingTemplate[] {
  return Object.values(templates).sort((a, b) => a.createdAt - b.createdAt)
}
