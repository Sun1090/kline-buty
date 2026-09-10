import type { Drawing } from './logic'
import type { DrawingTemplate } from './templates'
import { uniqueTemplateName } from './templates'

/**
 * I15 模板市场：画线模板 JSON 的导出 / 导入（社区分享）。
 *
 * 导出结构 { version, templates, savedAt }；导入做严格校验：
 * - 逐条模板校验 name / drawings 形状（type + points），非法条目整条丢弃
 * - 只保留「几何 + 样式」字段，剥离 id / hidden / locked（套用时重新生成 id、可见呈现）
 * - 文件内按 name 去重（同名后者跳过）；与本地记录合并时由 mergeTemplates 自动序号化
 */

const FORMAT_VERSION = 1

interface TemplateFile {
  version: number
  templates: DrawingTemplate[]
  savedAt: number
}

const isPoint = (v: unknown): v is { time: number; price: number } =>
  typeof v === 'object' && v !== null &&
  Number.isFinite((v as { time: unknown }).time as number) &&
  Number.isFinite((v as { price: unknown }).price as number)

/** 导出：序列化模板列表为 JSON 文本（空列表返回空串，调用方据此跳过下载） */
export function serializeTemplates(templates: DrawingTemplate[], now = Date.now()): string {
  if (templates.length === 0) return ''
  const file: TemplateFile = { version: FORMAT_VERSION, templates, savedAt: now }
  return JSON.stringify(file, null, 2)
}

export type ParseTemplatesResult =
  | { ok: true; templates: DrawingTemplate[]; imported: number }
  | { ok: false; error: 'format' }

/** 把单条画线收敛为「几何 + 样式」白名单字段（丢弃 id/hidden/locked 等图层状态） */
function sanitizeTemplateDrawing(raw: unknown): Omit<Drawing, 'id' | 'hidden' | 'locked'> | null {
  if (typeof raw !== 'object' || raw === null) return null
  const d = raw as Partial<Drawing>
  if (typeof d.type !== 'string' || d.type.length === 0) return null
  if (!Array.isArray(d.points) || d.points.length === 0 || !d.points.every(isPoint)) return null
  return {
    type: d.type as Drawing['type'],
    points: d.points.map((pt) => ({ time: pt.time, price: pt.price })),
    ...(typeof d.text === 'string' ? { text: d.text } : {}),
    ...(typeof d.fontSize === 'number' ? { fontSize: d.fontSize } : {}),
    ...(typeof d.color === 'string' ? { color: d.color } : {}),
    ...(typeof d.textBg === 'string' ? { textBg: d.textBg } : {}),
    ...(typeof d.opacity === 'number' && Number.isFinite(d.opacity) ? { opacity: d.opacity } : {}),
    ...(d.followLatest === true ? { followLatest: true } : {}),
    ...(d.textAlign === 'left' || d.textAlign === 'center' || d.textAlign === 'right'
      ? { textAlign: d.textAlign }
      : {}),
    ...(typeof d.group === 'string' ? { group: d.group } : {}),
    ...(typeof d.name === 'string' ? { name: d.name } : {}),
  }
}

/** 解析模板文件：格式/版本校验 + 逐条画线结构过滤 + 文件内按名去重；全无效视为格式错误 */
export function parseTemplatesFile(json: string): ParseTemplatesResult {
  let file: unknown
  try {
    file = JSON.parse(json)
  } catch {
    return { ok: false, error: 'format' }
  }
  if (typeof file !== 'object' || file === null) return { ok: false, error: 'format' }
  const f = file as { version?: unknown; templates?: unknown }
  if (f.version !== FORMAT_VERSION || !Array.isArray(f.templates)) {
    return { ok: false, error: 'format' }
  }
  const seen = new Set<string>()
  const out: DrawingTemplate[] = []
  for (const raw of f.templates) {
    if (typeof raw !== 'object' || raw === null) continue
    const t = raw as Partial<DrawingTemplate>
    if (typeof t.name !== 'string' || t.name.trim().length === 0) continue
    if (!Array.isArray(t.drawings) || t.drawings.length === 0) continue
    const drawings: Omit<Drawing, 'id' | 'hidden' | 'locked'>[] = []
    let valid = true
    for (const rawDrawing of t.drawings) {
      const d = sanitizeTemplateDrawing(rawDrawing)
      if (d === null) {
        valid = false
        break
      }
      drawings.push(d)
    }
    if (!valid || drawings.length === 0) continue
    if (seen.has(t.name)) continue
    seen.add(t.name)
    out.push({
      name: t.name,
      drawings,
      createdAt: typeof t.createdAt === 'number' && Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
    })
  }
  if (out.length === 0) return { ok: false, error: 'format' }
  return { ok: true, templates: out, imported: out.length }
}

/**
 * 合并导入模板到本地记录（key = 模板名）：
 * 与本地同名时自动序号化（foo → foo (2)），文件内已按名去重。
 * 返回合并后的完整记录与实际新增数量。
 */
export function mergeTemplates(
  existing: Record<string, DrawingTemplate>,
  imported: DrawingTemplate[],
): { merged: Record<string, DrawingTemplate>; added: number } {
  const merged: Record<string, DrawingTemplate> = { ...existing }
  let added = 0
  for (const tmpl of imported) {
    const name = uniqueTemplateName(tmpl.name, new Set(Object.keys(merged)))
    merged[name] = { ...tmpl, name }
    added++
  }
  return { merged, added }
}