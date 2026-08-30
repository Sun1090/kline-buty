import type { Drawing } from './logic'

const FORMAT_VERSION = 1

interface DrawingFile {
  version: number
  symbol: string
  drawings: Drawing[]
}

/** 序列化当前品种画线为 JSON 文本（含版本与品种，供导入校验） */
export function serializeDrawings(symbol: string, drawings: Drawing[]): string {
  const file: DrawingFile = { version: FORMAT_VERSION, symbol, drawings }
  return JSON.stringify(file, null, 2)
}

export type ParseDrawingsResult =
  | { ok: true; drawings: Drawing[]; imported: number }
  | { ok: false; error: 'format' | 'symbol' }

const isPoint = (v: unknown): v is { time: number; price: number } =>
  typeof v === 'object' && v !== null &&
  Number.isFinite((v as { time: unknown }).time as number) &&
  Number.isFinite((v as { price: unknown }).price as number)

/** 解析画线文件：格式/版本/品种校验 + 结构过滤 + 按 id 去重（已存在的 id 跳过） */
export function parseDrawingsFile(
  json: string,
  symbol: string,
  existingIds: Set<string>,
): ParseDrawingsResult {
  let file: unknown
  try {
    file = JSON.parse(json)
  } catch {
    return { ok: false, error: 'format' }
  }
  if (typeof file !== 'object' || file === null) return { ok: false, error: 'format' }
  const f = file as { version?: unknown; symbol?: unknown; drawings?: unknown }
  if (f.version !== FORMAT_VERSION || typeof f.symbol !== 'string' || !Array.isArray(f.drawings)) {
    return { ok: false, error: 'format' }
  }
  if (f.symbol !== symbol) return { ok: false, error: 'symbol' }

  const seen = new Set<string>()
  const out: Drawing[] = []
  for (const raw of f.drawings) {
    if (typeof raw !== 'object' || raw === null) continue
    const d = raw as Partial<Drawing>
    if (typeof d.id !== 'string' || d.id.length === 0) continue
    if (typeof d.type !== 'string' || d.type.length === 0) continue
    if (!Array.isArray(d.points) || d.points.length === 0 || !d.points.every(isPoint)) continue
    if (existingIds.has(d.id) || seen.has(d.id)) continue
    seen.add(d.id)
    out.push({
      id: d.id,
      type: d.type as Drawing['type'],
      points: d.points.map((pt) => ({ time: pt.time, price: pt.price })),
      ...(typeof d.text === 'string' ? { text: d.text } : {}),
      ...(typeof d.fontSize === 'number' ? { fontSize: d.fontSize } : {}),
      ...(typeof d.color === 'string' ? { color: d.color } : {}),
      ...(d.hidden === true ? { hidden: true } : {}),
      ...(d.locked === true ? { locked: true } : {}),
    })
  }
  return { ok: true, drawings: out, imported: out.length }
}
