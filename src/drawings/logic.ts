export type DrawingTool = 'none' | 'horizontal' | 'trend' | 'fib'

export interface Drawing {
  id: string
  type: 'horizontal' | 'trend' | 'fib'
  points: { time: number; price: number }[]
}

export interface Point {
  x: number
  y: number
}

/** 坐标投影：逻辑坐标(time/price) → 屏幕坐标，失败返回 null */
export type Project = (time: number, price: number) => Point | null

const HIT_THRESHOLD_PX = 8

/** 斐波那契回撤分位（从高位向低位） */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

export function fibPrices(from: number, to: number): number[] {
  const hi = Math.max(from, to)
  const lo = Math.min(from, to)
  return FIB_LEVELS.map((l) => hi - (hi - lo) * l)
}

/** 归一化锚点：水平线只保留一点，趋势/斐波那契按时间排序 */
export function normalizePoints(type: Drawing['type'], pts: { time: number; price: number }[]) {
  if (type === 'horizontal') return [pts[0]]
  const [a, b] = pts
  if (!a || !b) return pts
  return a.time <= b.time ? [a, b] : [b, a]
}

export function createDrawing(
  type: Drawing['type'],
  pts: { time: number; price: number }[],
  id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): Drawing {
  return { id, type, points: normalizePoints(type, pts) }
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** 命中检测：返回命中的绘图 id（最近的优先），未命中 null */
export function hitTestDrawings(
  drawings: Drawing[],
  px: number,
  py: number,
  project: Project,
): string | null {
  let bestId: string | null = null
  let bestDist = Infinity
  for (const d of drawings) {
    let dist = Infinity
    if (d.type === 'horizontal') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a) dist = Math.abs(py - a.y)
    } else {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        if (d.type === 'fib') {
          // 命中矩形内（两点横坐标之间、分位区间内）
          const inX = px >= Math.min(a.x, b.x) && px <= Math.max(a.x, b.x)
          if (inX) dist = Math.min(Math.abs(py - a.y), Math.abs(py - b.y))
        } else {
          dist = distToSegment({ x: px, y: py }, a, b)
        }
      }
    }
    if (dist < HIT_THRESHOLD_PX && dist < bestDist) {
      bestDist = dist
      bestId = d.id
    }
  }
  return bestId
}
