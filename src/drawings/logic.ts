export type DrawingTool = 'none' | 'horizontal' | 'trend' | 'fib' | 'channel' | 'text' | 'rect' | 'ray'

export interface Drawing {
  id: string
  type: 'horizontal' | 'trend' | 'fib' | 'channel' | 'text' | 'rect' | 'ray'
  points: { time: number; price: number }[]
  /** 文本标注内容（仅 type === 'text'） */
  text?: string
}

export interface Point {
  x: number
  y: number
}

/** 坐标投影：逻辑坐标(time/price) → 屏幕坐标，失败返回 null */
export type Project = (time: number, price: number) => Point | null

const HIT_THRESHOLD_PX = 8
/** 文本标注命中框（半宽/半高，px） */
const TEXT_HIT_HALF_W = 24
const TEXT_HIT_HALF_H = 12

/** 斐波那契回撤分位（从高位向低位） */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

export function fibPrices(from: number, to: number): number[] {
  const hi = Math.max(from, to)
  const lo = Math.min(from, to)
  return FIB_LEVELS.map((l) => hi - (hi - lo) * l)
}

/** 平行通道：基线 a→b，平行线垂直偏移 delta = b.price - a.price */
export function channelLine(
  a: { time: number; price: number },
  b: { time: number; price: number },
): { time: number; price: number }[] {
  const delta = b.price - a.price
  return [
    { time: a.time, price: b.price },
    { time: b.time, price: b.price + delta },
  ]
}

/** 归一化锚点：水平线/文本只保留一点；射线保持「锚点在前」的原始顺序；其余两点工具按时间排序 */
export function normalizePoints(type: Drawing['type'], pts: { time: number; price: number }[]) {
  if (type === 'horizontal' || type === 'text') return [pts[0]]
  const [a, b] = pts
  if (!a || !b) return pts
  if (type === 'ray') return [a, b]
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

/** 点到射线距离：p 在锚点 a→方向 b 前方取垂距，在锚点后方取到锚点距离 */
function distToRay(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  if (t < 0) return Math.hypot(p.x - a.x, p.y - a.y)
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / Math.sqrt(lenSq)
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
    } else if (d.type === 'text') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a && Math.abs(px - a.x) <= TEXT_HIT_HALF_W && Math.abs(py - a.y) <= TEXT_HIT_HALF_H) {
        dist = Math.hypot(px - a.x, py - a.y)
      }
    } else if (d.type === 'channel') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const [c, e] = channelLine(d.points[0], d.points[1]).map((p) => project(p.time, p.price))
        const base = distToSegment({ x: px, y: py }, a, b)
        const parallel = c && e ? distToSegment({ x: px, y: py }, c, e) : Infinity
        dist = Math.min(base, parallel)
      }
    } else if (d.type === 'rect') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const left = Math.min(a.x, b.x)
        const right = Math.max(a.x, b.x)
        const top = Math.min(a.y, b.y)
        const bottom = Math.max(a.y, b.y)
        if (px >= left && px <= right && py >= top && py <= bottom) {
          // 矩形内部任意位置都可选中（区域命中）
          dist = 0
        } else {
          const edges: [Point, Point][] = [
            [{ x: left, y: top }, { x: right, y: top }],
            [{ x: left, y: bottom }, { x: right, y: bottom }],
            [{ x: left, y: top }, { x: left, y: bottom }],
            [{ x: right, y: top }, { x: right, y: bottom }],
          ]
          dist = Math.min(...edges.map(([p, q]) => distToSegment({ x: px, y: py }, p, q)))
        }
      }
    } else if (d.type === 'ray') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) dist = distToRay({ x: px, y: py }, a, b)
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
