export type DrawingTool =
  | 'none'
  | 'horizontal'
  | 'vertical'
  | 'trend'
  | 'fib'
  | 'channel'
  | 'text'
  | 'rect'
  | 'ray'
  | 'fibext'
  | 'fibchannel'
  | 'fibfan'
  | 'fibtimed'
  | 'cycle'
  | 'gann'
  | 'gannbox'
  | 'pricelabel'
  | 'arrow'
  | 'ellipse'
  | 'circle'
  | 'triangle'
  | 'wedge'
  | 'arc'
  | 'polyline'
  | 'measure'
  | 'speedlines'
  | 'regchan'
  | 'hchannel'
  | 'xabcd'
  | 'elliott'
  | 'pitchfork'
  | 'parray'
  | 'pchannel'
  | 'angle'
  | 'timerange'

export type DrawingType = Exclude<DrawingTool, 'none'>

export interface Drawing {
  id: string
  type: DrawingType
  points: { time: number; price: number }[]
  /** 文本标注内容（仅 type === 'text'，支持 \n 多行） */
  text?: string
  /** 文本标注字号（仅 type === 'text'，缺省 14） */
  fontSize?: number
  /** 文本标注颜色（仅 type === 'text'，缺省跟随主题黄） */
  color?: string
}

export interface Point {
  x: number
  y: number
}

/** 坐标投影：逻辑坐标(time/price) → 屏幕坐标，失败返回 null */
export type Project = (time: number, price: number) => Point | null

const HIT_THRESHOLD_PX = 8
/** 多段折线最大锚点数（集满自动提交，实际交互靠双击收尾，故设大值） */
export const POLYLINE_MAX_POINTS = 64
/** 文本标注默认字号（px） */
export const DEFAULT_TEXT_FONT_SIZE = 14
/** 文本标注最小/最大字号（px） */
export const TEXT_FONT_SIZE_MIN = 10
export const TEXT_FONT_SIZE_MAX = 32
/** 文本标注颜色可选色板（含「默认=跟随主题」） */
export const TEXT_COLOR_OPTIONS: { id: string; color: string }[] = [
  { id: 'default', color: '' },
  { id: 'yellow', color: '#f5c02f' },
  { id: 'blue', color: '#4e9cf5' },
  { id: 'red', color: '#ef4444' },
  { id: 'green', color: '#22c55e' },
  { id: 'white', color: '#ffffff' },
  { id: 'purple', color: '#a855f7' },
]
/** 文本标注固定命中框下限（px） */
const TEXT_HIT_HALF_W = 24
const TEXT_HIT_HALF_H = 12

/** 文本标注命中框（按行数/字号动态放大，半宽/半高 px） */
export function textHitExtents(d: Drawing): { halfW: number; halfH: number } {
  const fontSize = d.fontSize ?? DEFAULT_TEXT_FONT_SIZE
  const lines = (d.text ?? '').split('\n')
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 1)
  // 平均字宽按 0.8×字号估算（中英混排取中），左右各留 6px 内边距
  const halfW = Math.max(TEXT_HIT_HALF_W, (fontSize * longest * 0.8) / 2 + 6)
  const halfH = Math.max(TEXT_HIT_HALF_H, (fontSize * 1.4 * Math.max(lines.length, 1)) / 2 + 6)
  return { halfW, halfH }
}

/** 斐波那契回撤分位（从高位向低位） */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

export function fibPrices(from: number, to: number): number[] {
  const hi = Math.max(from, to)
  const lo = Math.min(from, to)
  return FIB_LEVELS.map((l) => hi - (hi - lo) * l)
}

/** 各画线工具所需锚点数（用于多段点击交互） */
export function requiredPoints(type: DrawingTool | DrawingType): number {
  if (type === 'horizontal' || type === 'vertical' || type === 'text' || type === 'pricelabel') return 1
  if (type === 'polyline' || type === 'xabcd' || type === 'elliott') return type === 'polyline' ? POLYLINE_MAX_POINTS : 5
  if (type === 'fibext' || type === 'triangle' || type === 'wedge' || type === 'pitchfork' || type === 'parray' || type === 'pchannel') return 3
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

/** 斐波那契通道分位（相对 A→B 摆幅的平行线偏移，0=基线，向 B 方向延伸） */
export const FIB_CHANNEL_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618]

export interface FibChannelLevel {
  level: number
  price: number
}

/** 斐波那契通道：基线 A→B（level 0），其余平行线过 (A.time, A.price + swing×L)，L 取 FIB_CHANNEL_LEVELS（摆动向下时为负偏移） */
export function fibChannelLevels(a: { price: number }, b: { price: number }): FibChannelLevel[] {
  const swing = b.price - a.price
  return [
    { level: 0, price: a.price },
    ...FIB_CHANNEL_LEVELS.map((level) => ({ level, price: a.price + swing * level })),
  ]
}

/** 点到无限直线距离（平行线命中检测用）：过 p0、方向 dir 的直线，取垂直距离 */
export function distToLine(px: number, py: number, p0: Point, dir: Point): number {
  const lenSq = dir.x * dir.x + dir.y * dir.y
  if (lenSq === 0) return Math.hypot(px - p0.x, py - p0.y)
  return Math.abs((px - p0.x) * dir.y - (py - p0.y) * dir.x) / Math.sqrt(lenSq)
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

/** 江恩角度线倍率（价格变化相对 A→B 竖直摆幅的倍数；1 为 1×1 主对角线） */
export const GANN_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 1 / 8, label: '1×8' },
  { ratio: 1 / 4, label: '1×4' },
  { ratio: 1 / 3, label: '1×3' },
  { ratio: 1 / 2, label: '1×2' },
  { ratio: 1, label: '1×1' },
  { ratio: 2, label: '2×1' },
  { ratio: 3, label: '3×1' },
  { ratio: 4, label: '4×1' },
  { ratio: 8, label: '8×1' },
]

export interface GannRay {
  ratio: number
  label: string
  dir: { time: number; price: number }
}

/** 江恩角度线：A 为原点，射线方向 = A→B 竖直摆幅 × 各倍率（1×1 即 A→B 本身），双向延伸由渲染层负责 */
export function gannFanRays(
  a: { time: number; price: number },
  b: { time: number; price: number },
): GannRay[] {
  const dy = b.price - a.price
  return GANN_RATIOS.map(({ ratio, label }) => ({
    ratio,
    label,
    dir: { time: b.time, price: a.price + dy * ratio },
  }))
}

/** 江恩箱：A→B 两点定矩形（屏幕投影），内部从四角发出 1×1 / 1×2 / 2×1 角度线。
 * 1×1 = 对角全幅；1×2 = 到对边中点（半速）；2×1 = 到邻边中点（双速）。
 * 返回屏幕空间线段数组（渲染与命中检测共用）。 */
export function gannBoxSegments(
  a: { time: number; price: number },
  b: { time: number; price: number },
  project: Project,
): { from: Point; to: Point }[] {
  const pa = project(a.time, a.price)
  const pb = project(b.time, b.price)
  if (!pa || !pb) return []
  const left = Math.min(pa.x, pb.x)
  const right = Math.max(pa.x, pb.x)
  const top = Math.min(pa.y, pb.y)
  const bottom = Math.max(pa.y, pb.y)
  if (right - left < 1 || bottom - top < 1) return []
  const midX = (left + right) / 2
  const midY = (top + bottom) / 2
  const BL = { x: left, y: bottom }
  const TL = { x: left, y: top }
  const BR = { x: right, y: bottom }
  const TR = { x: right, y: top }
  const midTop = { x: midX, y: top }
  const midBottom = { x: midX, y: bottom }
  const midLeft = { x: left, y: midY }
  const midRight = { x: right, y: midY }
  return [
    // 1×1 主对角线（两条）
    { from: BL, to: TR },
    { from: TL, to: BR },
    // 1×2：左下/左上/右下/右上 → 对边中点
    { from: BL, to: midRight },
    { from: TL, to: midRight },
    { from: BR, to: midLeft },
    { from: TR, to: midLeft },
    // 2×1：四角 → 邻边中点
    { from: BL, to: midTop },
    { from: BR, to: midTop },
    { from: TR, to: midBottom },
    { from: TL, to: midBottom },
  ]
}

/** 江恩箱矩形范围（屏幕投影），null 表示投影失败 */
export function gannBoxRect(
  a: { time: number; price: number },
  b: { time: number; price: number },
  project: Project,
): { left: number; top: number; right: number; bottom: number } | null {
  const pa = project(a.time, a.price)
  const pb = project(b.time, b.price)
  if (!pa || !pb) return null
  return {
    left: Math.min(pa.x, pb.x),
    right: Math.max(pa.x, pb.x),
    top: Math.min(pa.y, pb.y),
    bottom: Math.max(pa.y, pb.y),
  }
}

/** 斐波那契时间线：A→B 时间区间按黄金分割分位取时间点（0 / 0.236 / 0.382 / 0.5 / 0.618 / 0.786 / 1） */
export function fibTimeLines(
  a: { time: number },
  b: { time: number },
): { level: number; time: number }[] {
  const from = Math.min(a.time, b.time)
  const to = Math.max(a.time, b.time)
  const span = to - from
  return FIB_LEVELS.map((level) => ({ level, time: from + span * level }))
}

/** 斐波那契时间线竖线屏幕 x：在 A/B 锚点 x 之间按分位线性插值。
 * 时间轴为等宽柱距，等价于时间插值；且 timeToCoordinate 只认整根蜡烛，无法直接取小数时间坐标。 */
export function fibTimeXs(aX: number, bX: number): { level: number; x: number }[] {
  const left = Math.min(aX, bX)
  const right = Math.max(aX, bX)
  return FIB_LEVELS.map((level) => ({ level, x: left + (right - left) * level }))
}
/** 周期线（Cycle Lines）默认延伸根数（含 A 锚点线） */
export const CYCLE_LINE_COUNT = 12

/** 周期线：以 A 为原点，周期 = |B.time - A.time|，向右等比延伸 count 根竖线（k=0 即 A 锚点线） */
export function cycleLines(
  a: { time: number },
  b: { time: number },
  count = CYCLE_LINE_COUNT,
): { index: number; time: number }[] {
  const span = Math.abs(b.time - a.time)
  if (span <= 0) return [{ index: 0, time: a.time }]
  return Array.from({ length: count }, (_, k) => ({ index: k, time: a.time + span * k }))
}

/** 周期线竖线屏幕 x：以 A 的 x 为原点，周期像素 = B.x - A.x，等比延伸 count 根（命中测试用，等价于等宽柱距下的时间换算） */
export function cycleXs(aX: number, bX: number, count = CYCLE_LINE_COUNT): number[] {
  return Array.from({ length: count }, (_, k) => aX + (bX - aX) * k)
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

/** 画线线段（时间/价格坐标，渲染与命中检测共用） */
/** 安德鲁叉（Andrews Pitchfork）：A 为起点，B/C 为右侧两枢轴点。
 * 中轨：A → B/C 中点连线；上轨/下轨：过 B/C 与中轨平行（三点连线恰构成叉形）。
 * 返回屏幕空间三条射线（起点 + 方向指示点，方向点非端点，仅供求方向），渲染与命中检测共用。 */
export interface PitchforkRay {
  from: Point
  dir: Point
}

export function pitchforkRays(a: Point, b: Point, c: Point): PitchforkRay[] {
  const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
  const dx = mid.x - a.x
  const dy = mid.y - a.y
  return [
    { from: a, dir: mid },
    { from: b, dir: { x: b.x + dx, y: b.y + dy } },
    { from: c, dir: { x: c.x + dx, y: c.y + dy } },
  ]
}

/** 安德鲁叉 B/C 中点（屏幕坐标），用于渲染中轨记号 */
export function pitchforkMid(b: Point, c: Point): Point {
  return { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
}

/** 楔形（Wedge）：A/B 为两条边的起点，C 为收敛点。
 * 下边 A→C、上边 B→C 两条线段（屏幕坐标），渲染与命中检测共用。 */
export interface WedgeLine {
  from: Point
  to: Point
}

export function wedgeLines(a: Point, b: Point, c: Point): WedgeLine[] {
  return [
    { from: a, to: c },
    { from: b, to: c },
  ]
}

export interface SegmentLine {
  from: { time: number; price: number }
  to: { time: number; price: number }
}

/** 平行射线（Parallel Ray）：A→B 定义方向（屏幕坐标，投影后保持平行），C 为射线起点。
 * 渲染：A→B 方向参考虚线 + 从 C 沿 (B−A) 方向无限延伸的射线；命中：参考线段 + 射线垂距。 */
export interface ParallelRaySpec {
  helperFrom: Point
  helperTo: Point
  rayFrom: Point
  rayDir: Point
}

export function parallelRaySpec(a: Point, b: Point, c: Point): ParallelRaySpec {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return {
    helperFrom: a,
    helperTo: b,
    rayFrom: c,
    rayDir: { x: c.x + dx, y: c.y + dy },
  }
}

/** 宽度通道（Width Channel）：A→B 定义基准方向（屏幕坐标），C 定通道宽度。
 * 渲染：过 A 与过 C 的两条无限平行线 + B→C 宽度参考虚线；命中：两线垂距 + 宽度连线。 */
export interface WidthChannelSpec {
  lineA: { p0: Point; dir: Point }
  lineC: { p0: Point; dir: Point }
  widthFrom: Point
  widthTo: Point
}

export function widthChannelSpec(a: Point, b: Point, c: Point): WidthChannelSpec {
  const dir = { x: b.x - a.x, y: b.y - a.y }
  return {
    lineA: { p0: a, dir },
    lineC: { p0: c, dir },
    widthFrom: b,
    widthTo: c,
  }
}


/** 趋势角度（屏幕空间）：A→B 线段相对水平方向的夹角（度）。
 * 屏幕 y 向下，返回值按「图表直觉」取号：向右上涨为正（+），下跌为负（−），范围 (-90, 90]。 */
export function trendAngleDeg(a: Point, b: Point): number {
  return (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI
}

/** 时间区间竖带屏幕 x 范围（A→B 锚点 x 之间，左小右大） */
export function timeRangeXs(aX: number, bX: number): { left: number; right: number } {
  return { left: Math.min(aX, bX), right: Math.max(aX, bX) }
}

/** 速度线（Speed Lines）：A 为原点，B 处竖直等分 A→B 价差，1/3 与 2/3 分位连线。
 * 返回 [主对角线 A→B, B 处竖直线, A→1/3, A→2/3] 四条线段。 */
export function speedLines(
  a: { time: number; price: number },
  b: { time: number; price: number },
): SegmentLine[] {
  const lo = Math.min(a.price, b.price)
  const hi = Math.max(a.price, b.price)
  const tB = b.time
  const third = (f: number) => ({ time: tB, price: lo + (hi - lo) * f })
  return [
    { from: a, to: b },
    { from: { time: tB, price: lo }, to: { time: tB, price: hi } },
    { from: a, to: third(1 / 3) },
    { from: a, to: third(2 / 3) },
  ]
}

/** 线性回归：price = a + b·(time − x0)，x0 为首点时间（数值稳定，避免 time² 量级溢出）。数据不足返回 null */
export function linearRegression(
  pts: { time: number; price: number }[],
): { a: number; b: number; x0: number } | null {
  const n = pts.length
  if (n < 2) return null
  const x0 = pts[0].time
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (const p of pts) {
    const x = p.time - x0
    sx += x
    sy += p.price
    sxx += x * x
    sxy += x * p.price
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const b = (n * sxy - sx * sy) / denom
  const a = (sy - b * sx) / n
  return { a, b, x0 }
}

/** 回归通道：对 [a.time, b.time] 内收盘价做线性回归，
 * 返回 [回归中线, 上轨(mean+σ), 下轨(mean−σ)] 三条线段；数据不足退回 A→B 直线。 */
export function regressionSegments(
  a: { time: number; price: number },
  b: { time: number; price: number },
  closes: { time: number; price: number }[],
): SegmentLine[] {
  const t0 = Math.min(a.time, b.time)
  const t1 = Math.max(a.time, b.time)
  const pts = closes.filter((c) => c.time >= t0 && c.time <= t1)
  const fallback: SegmentLine[] = [{ from: a, to: b }]
  if (pts.length < 2) return fallback
  const reg = linearRegression(pts)
  if (!reg) return fallback
  const at = (t: number) => reg.a + reg.b * (t - reg.x0)
  let ss = 0
  for (const p of pts) {
    const pred = at(p.time)
    ss += (p.price - pred) ** 2
  }
  const stdev = Math.sqrt(ss / pts.length)
  return [
    { from: { time: t0, price: at(t0) }, to: { time: t1, price: at(t1) } },
    { from: { time: t0, price: at(t0) + stdev }, to: { time: t1, price: at(t1) + stdev } },
    { from: { time: t0, price: at(t0) - stdev }, to: { time: t1, price: at(t1) - stdev } },
  ]
}

/** 量度：A→B 价格差与涨跌幅（保留 A→B 方向符号） */
export function measureInfo(a: { price: number }, b: { price: number }): { diff: number; pct: number } {
  const diff = b.price - a.price
  const pct = a.price === 0 ? 0 : (diff / a.price) * 100
  return { diff, pct }
}

/** 归一化锚点：单点工具只保留一点；方向敏感工具（射线/扇形/箭头/斐波那契扩展）保持原始顺序；其余两点工具按时间排序 */
export function normalizePoints(type: DrawingType, pts: { time: number; price: number }[]) {
  if (type === 'horizontal' || type === 'vertical' || type === 'text' || type === 'pricelabel') return [pts[0]]
  const [a, b] = pts
  if (!a || !b) return pts
  if (type === 'ray' || type === 'fibfan' || type === 'gann' || type === 'arrow' || type === 'circle' || type === 'speedlines' || type === 'cycle' || type === 'fibchannel') return [a, b]
  if (type === 'hchannel') return a.price <= b.price ? [a, b] : [b, a]
  if (type === 'xabcd' || type === 'elliott') return pts.slice(0, 5)
  if (type === 'polyline') return pts
  if (type === 'measure') return [a, b]
  if (type === 'fibext' || type === 'triangle' || type === 'wedge' || type === 'pitchfork' || type === 'parray' || type === 'pchannel') return pts.slice(0, 3)
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

/** 点是否在三角形内（同向叉积法，含边界） */
function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y)
  const d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y)
  const d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
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

/** 画线线段解析器：为依赖外部数据（如 K 线）的工具提供渲染线段，用于命中检测 */
export type SegmentResolver = (d: Drawing) => SegmentLine[] | null

/** 命中检测：返回命中的绘图 id（最近的优先），未命中 null。
 * resolveSegments 可选：回归通道等需基于 K 线计算线段的工具传此解析器（无则退回 A→B 直线）。 */
export function hitTestDrawings(
  drawings: Drawing[],
  px: number,
  py: number,
  project: Project,
  resolveSegments?: SegmentResolver,
): string | null {
  let bestId: string | null = null
  let bestDist = Infinity
  for (const d of drawings) {
    let dist = Infinity
    if (d.type === 'horizontal') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a) dist = Math.abs(py - a.y)
    } else if (d.type === 'vertical') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a) dist = Math.abs(px - a.x)
    } else if (d.type === 'text') {
      const a = project(d.points[0].time, d.points[0].price)
      if (a) {
        const { halfW, halfH } = textHitExtents(d)
        // 文本框区域整体可选中（类似矩形区域命中），锚点附近优先
        if (Math.abs(px - a.x) <= halfW && Math.abs(py - a.y) <= halfH) {
          dist = Math.min(HIT_THRESHOLD_PX - 1, Math.hypot(px - a.x, py - a.y))
        }
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
    } else if (d.type === 'ellipse') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const left = Math.min(a.x, b.x)
        const right = Math.max(a.x, b.x)
        const top = Math.min(a.y, b.y)
        const bottom = Math.max(a.y, b.y)
        const cx = (left + right) / 2
        const cy = (top + bottom) / 2
        const rx = Math.max(1, (right - left) / 2)
        const ry = Math.max(1, (bottom - top) / 2)
        const nx = (px - cx) / rx
        const ny = (py - cy) / ry
        const r = Math.hypot(nx, ny)
        // 内部区域命中；外部按到边缘的近似距离（归一化半径差 × 短轴）
        dist = r <= 1 ? 0 : (r - 1) * Math.min(rx, ry)
      }
    } else if (d.type === 'circle') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const r = Math.hypot(b.x - a.x, b.y - a.y)
        if (r > 0) {
          const d = Math.hypot(px - a.x, py - a.y)
          // 圆内区域命中；外部按到圆周距离
          dist = d <= r ? 0 : d - r
        }
      }
    } else if (d.type === 'triangle') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      const c = d.points.length >= 3 ? project(d.points[2].time, d.points[2].price) : null
      if (a && b && c) {
        const p = { x: px, y: py }
        if (pointInTriangle(p, a, b, c)) {
          // 三角形内部任意位置都可选中（区域命中）
          dist = 0
        } else {
          dist = Math.min(distToSegment(p, a, b), distToSegment(p, b, c), distToSegment(p, c, a))
        }
      }
    } else if (d.type === 'wedge') {
      // 楔形：两条边 A→C 与 B→C（收敛于 C），命中任一条线段
      const [pa, pb, pc] = d.points
      const a = pa ? project(pa.time, pa.price) : null
      const b = pb ? project(pb.time, pb.price) : null
      const c = pc ? project(pc.time, pc.price) : null
      if (a && b && c) {
        const p = { x: px, y: py }
        dist = Math.min(distToSegment(p, a, c), distToSegment(p, b, c))
      }
    } else if (d.type === 'arc') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const r = Math.hypot(b.x - a.x, b.y - a.y) / 2
        if (r > 0) dist = Math.abs(Math.hypot(px - mx, py - my) - r)
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
    } else if (d.type === 'gann') {
      // 江恩角度线：命中任一条角度线（双向，正向射线 + A 关于方向点的镜像反向射线）
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        dist = Infinity
        for (const { dir } of gannFanRays(d.points[0], d.points[1])) {
          const dirPt = project(dir.time, dir.price)
          if (!dirPt) continue
          const back = { x: a.x - (dirPt.x - a.x), y: a.y - (dirPt.y - a.y) }
          dist = Math.min(dist, distToRay({ x: px, y: py }, a, dirPt), distToRay({ x: px, y: py }, a, back))
        }
      }
    } else if (d.type === 'gannbox') {
      // 江恩箱：矩形内部区域命中；外部按到矩形边缘/角度线的最近距离
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const left = Math.min(a.x, b.x)
        const right = Math.max(a.x, b.x)
        const top = Math.min(a.y, b.y)
        const bottom = Math.max(a.y, b.y)
        if (px >= left && px <= right && py >= top && py <= bottom) {
          dist = 0
        } else {
          const edges: [Point, Point][] = [
            [{ x: left, y: top }, { x: right, y: top }],
            [{ x: left, y: bottom }, { x: right, y: bottom }],
            [{ x: left, y: top }, { x: left, y: bottom }],
            [{ x: right, y: top }, { x: right, y: bottom }],
          ]
          dist = Math.min(...edges.map(([p, q]) => distToSegment({ x: px, y: py }, p, q)))
          for (const seg of gannBoxSegments(d.points[0], d.points[1], project)) {
            dist = Math.min(dist, distToSegment({ x: px, y: py }, seg.from, seg.to))
          }
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
    } else if (d.type === 'fibchannel') {
      // 斐波那契通道：命中基线或任一平行分位线（点到无限直线垂距）
      const pa = d.points[0]
      const pb = d.points[1]
      const a = project(pa.time, pa.price)
      const b = project(pb.time, pb.price)
      if (a && b) {
        const dir = { x: b.x - a.x, y: b.y - a.y }
        dist = Infinity
        for (const { price } of fibChannelLevels(pa, pb)) {
          const anchorPt = project(pa.time, price)
          if (anchorPt) dist = Math.min(dist, distToLine(px, py, anchorPt, dir))
        }
      }
    } else if (d.type === 'fibtimed') {
      // 斐波那契时间线：命中任一竖线（水平距离）
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        dist = Infinity
        for (const { x } of fibTimeXs(a.x, b.x)) dist = Math.min(dist, Math.abs(px - x))
      }
    } else if (d.type === 'cycle') {
      // 周期线：命中任一周期竖线（水平距离），延伸到 A 右侧
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        dist = Infinity
        for (const x of cycleXs(a.x, b.x)) dist = Math.min(dist, Math.abs(px - x))
      }
    } else if (d.type === 'polyline') {
      // 多段折线：命中任一相邻线段
      dist = Infinity
      const projected: Point[] = []
      for (const p of d.points) {
        const pt = project(p.time, p.price)
        if (pt) projected.push(pt)
      }
      if (projected.length === 1) {
        dist = Math.hypot(px - projected[0].x, py - projected[0].y)
      } else {
        for (let i = 0; i + 1 < projected.length; i++) {
          dist = Math.min(dist, distToSegment({ x: px, y: py }, projected[i], projected[i + 1]))
        }
      }
    } else if (d.type === 'measure') {
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) dist = distToSegment({ x: px, y: py }, a, b)
    } else if (d.type === 'speedlines') {
      // 速度线：命中四条线段（主对角线 + B 竖直线 + 1/3/2/3 分位线）任意一条
      dist = Infinity
      for (const seg of speedLines(d.points[0], d.points[1])) {
        const p = project(seg.from.time, seg.from.price)
        const q = project(seg.to.time, seg.to.price)
        if (p && q) dist = Math.min(dist, distToSegment({ x: px, y: py }, p, q))
      }
    } else if (d.type === 'regchan') {
      // 回归通道：优先用 K 线回归线段命中；无解析器退回 A→B 直线
      const segs = resolveSegments ? resolveSegments(d) : null
      if (segs && segs.length > 0) {
        dist = Infinity
        for (const seg of segs) {
          const p = project(seg.from.time, seg.from.price)
          const q = project(seg.to.time, seg.to.price)
          if (p && q) dist = Math.min(dist, distToSegment({ x: px, y: py }, p, q))
        }
      } else {
        const a = project(d.points[0].time, d.points[0].price)
        const b = project(d.points[1].time, d.points[1].price)
        if (a && b) dist = distToSegment({ x: px, y: py }, a, b)
      }
    } else if (d.type === 'hchannel') {
      // 水平通道：命中上下任一条水平线（与水平线一致按竖直距离）
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) dist = Math.min(Math.abs(py - a.y), Math.abs(py - b.y))
    } else if (d.type === 'angle') {
      // 趋势角度：命中 A→B 线段（点到线段距离，与趋势线一致）
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) dist = distToSegment({ x: px, y: py }, a, b)
    } else if (d.type === 'timerange') {
      // 时间区间：竖带内部任意位置可选中（区域命中）；外部按到左右边框的水平距离
      const a = project(d.points[0].time, d.points[0].price)
      const b = project(d.points[1].time, d.points[1].price)
      if (a && b) {
        const { left, right } = timeRangeXs(a.x, b.x)
        if (px >= left && px <= right) {
          dist = 0
        } else {
          dist = Math.min(Math.abs(px - left), Math.abs(px - right))
        }
      }
    } else if (d.type === 'pitchfork') {
      // 安德鲁叉：命中三条射线（中轨 + 上下平行轨）任一条
      const a = project(d.points[0].time, d.points[0].price)
      const b = d.points[1] ? project(d.points[1].time, d.points[1].price) : null
      const c = d.points[2] ? project(d.points[2].time, d.points[2].price) : null
      if (a && b && c) {
        dist = Infinity
        for (const ray of pitchforkRays(a, b, c)) {
          dist = Math.min(dist, distToRay({ x: px, y: py }, ray.from, ray.dir))
        }
      }
    } else if (d.type === 'parray') {
      // 平行射线：命中 A→B 方向参考线段 + 从 C 沿 (B−A) 方向的射线（垂距）
      const a = project(d.points[0].time, d.points[0].price)
      const b = d.points[1] ? project(d.points[1].time, d.points[1].price) : null
      const c = d.points[2] ? project(d.points[2].time, d.points[2].price) : null
      if (a && b && c) {
        const spec = parallelRaySpec(a, b, c)
        const p = { x: px, y: py }
        dist = Math.min(distToSegment(p, spec.helperFrom, spec.helperTo), distToRay(p, spec.rayFrom, spec.rayDir))
      }
    } else if (d.type === 'pchannel') {
      // 宽度通道：命中两条无限平行线（过 A/过 C）垂距 + B→C 宽度连线
      const a = project(d.points[0].time, d.points[0].price)
      const b = d.points[1] ? project(d.points[1].time, d.points[1].price) : null
      const c = d.points[2] ? project(d.points[2].time, d.points[2].price) : null
      if (a && b && c) {
        const spec = widthChannelSpec(a, b, c)
        const p = { x: px, y: py }
        dist = Math.min(
          distToLine(px, py, spec.lineA.p0, spec.lineA.dir),
          distToLine(px, py, spec.lineC.p0, spec.lineC.dir),
          distToSegment(p, spec.widthFrom, spec.widthTo),
        )
      }
    } else if (d.type === 'xabcd' || d.type === 'elliott') {
      // XABCD 形态 / 艾略特波浪：命中任一相邻连线
      dist = Infinity
      const projected: Point[] = []
      for (const p of d.points) {
        const pt = project(p.time, p.price)
        if (pt) projected.push(pt)
      }
      for (let i = 0; i + 1 < projected.length; i++) {
        dist = Math.min(dist, distToSegment({ x: px, y: py }, projected[i], projected[i + 1]))
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
