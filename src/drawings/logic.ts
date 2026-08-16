export type DrawingTool =
  | 'none'
  | 'horizontal'
  | 'trend'
  | 'fib'
  | 'channel'
  | 'text'
  | 'rect'
  | 'ray'
  | 'fibext'
  | 'fibfan'
  | 'pricelabel'
  | 'arrow'

export type DrawingType = Exclude<DrawingTool, 'none'>

export interface Drawing {
  id: string
  type: DrawingType
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

/** 各画线工具所需锚点数（用于多段点击交互） */
export function requiredPoints(type: DrawingTool | DrawingType): number {
  if (type === 'horizontal' || type === 'text' || type === 'pricelabel') return 1
  if (type === 'fibext') return 3
  return 2
}

/** 斐波那契扩展分位（<1 为回撤区，≥1 为向 B 外侧延伸区） */
export const FIB_EXT_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2.618]

export interface FibLevel {
  level: number
  price: number
}

/** 斐波那契扩展：A→B 为主摆幅；回撤区在 A/B 之间，延伸区在 B 之外 */
export function fibExtPrices(a: { price: number }, b: { price: number }): FibLevel[] {
  const swing = b.price - a.price
  return FIB_EXT_LEVELS.map((level) => ({
    level,
    price: level < 1 ? a.price + swing * level : b.price + swing * (level - 1),
  }))
}

/** 斐波那契扇形分位（射线从 A 原点发出，方向点取 A→B 竖直距离的分位） */
export const FIB_FAN_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786, 1]

export interface FibFanRay {
  level: number
  dir: { time: number; price: number }
}

export function fibFanRays(
  a: { time: number; price: number },
  b: { time: number; price: number },
): FibFanRay[] {
  const span = b.price - a.price
  return FIB_FAN_LEVELS.map((level) => ({
    level,
    dir: { time: b.time, price: a.price + span * level },
  }))
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

/** 归一化锚点：单点工具只保留一点；方向敏感工具（射线/扇形/箭头/斐波那契扩展）保持原始顺序；其余两点工具按时间排序 */
export function normalizePoints(type: DrawingType, pts: { time: number; price: number }[]) {
  if (type === 'horizontal' || type === 'text' || type === 'pricelabel') return [pts[0]]
  const [a, b] = pts
  if (!a || !b) return pts
  if (type === 'ray' || type === 'fibfan' || type === 'arrow') return [a, b]
  if (type === 'fibext') return pts.slice(0, 3)
  return a.time <= b.time ? [a, b] : [b, a]
}

export function createDrawing(
  type: Drawing['type'],
  pts: { time: number; price: number }[],
  id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): Drawing {
  return { id, type, points: normalizePoints(type, pts) }
}

/** 整图平移：所有锚点按 (dTime 秒, dPrice) 偏移，保留 id/type/text */
export function moveDrawing(d: Drawing, dTime: number, dPrice: number): Drawing {
  return { ...d, points: d.points.map((p) => ({ time: p.time + dTime, price: p.price + dPrice })) }
}

/** 拖动单个锚点到新位置（射线保持锚点顺序，其余按时间重排） */
export function moveAnchor(d: Drawing, idx: number, point: { time: number; price: number }): Drawing {
  const points = d.points.map((p, i) => (i === idx ? point : p))
  return { ...d, points: normalizePoints(d.type, points) }
}

/** 命中锚点：返回最近的锚点下标（阈值内），未命中 null */
export function nearestAnchor(d: Drawing, px: number, py: number, project: Project): number | null {
  let best: number | null = null
  let bestDist = Infinity
  d.points.forEach((p, i) => {
    const pt = project(p.time, p.price)
    if (!pt) return
    const dist = Math.hypot(px - pt.x, py - pt.y)
    if (dist < HIT_THRESHOLD_PX && dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  return best
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
    } else if (d.type === 'pricelabel') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a && Math.abs(px - a.x) <= TEXT_HIT_HALF_W && Math.abs(py - a.y) <= TEXT_HIT_HALF_H) {
        dist = Math.hypot(px - a.x, py - a.y)
      }
    } else if (d.type === 'arrow') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) dist = distToSegment({ x: px, y: py }, a, b)
    } else if (d.type === 'fibfan') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        dist = Infinity
        for (const { dir } of fibFanRays(d.points[0], d.points[1])) {
          const dirPt = project(dir.time, dir.price)
          if (dirPt) dist = Math.min(dist, distToRay({ x: px, y: py }, a, dirPt))
        }
      }
    } else if (d.type === 'fibext') {
      const [pa, pb, pc] = d.points
      const a = project(pa.time, pa.price)
      const b = project(pb.time, pb.price)
      if (a && b) {
        const levels = fibExtPrices(pa, pb)
        const left = Math.min(a.x, b.x)
        const right = Math.max(a.x, b.x)
        dist = Infinity
        for (const { level, price } of levels) {
          const isExt = level >= 1
          const pt = project(isExt ? pb.time : pa.time, price)
          if (!pt) continue
          const inX = isExt ? px >= right - HIT_THRESHOLD_PX : px >= left - HIT_THRESHOLD_PX && px <= right + HIT_THRESHOLD_PX
          if (inX) dist = Math.min(dist, Math.abs(py - pt.y))
        }
        // C 回撤点竖线标记
        if (pc) {
          const c = project(pc.time, pc.price)
          if (c && Math.abs(px - c.x) <= HIT_THRESHOLD_PX) dist = Math.min(dist, Math.abs(py - c.y))
        }
      }
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
