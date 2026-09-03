/**
 * 大数据量「可见窗口裁剪」纯函数。
 *
 * 当 K 线数量超过阈值时，不把全量数据塞给图表与指标引擎，
 * 只装载「可见区间 + 两侧余量」的切片，滚动到边缘时再重载，
 * 从而让 2 万根数据的滚动/缩放/实时刷新保持流畅。
 */

/** 超过该数量启用窗口裁剪 */
export const CULL_THRESHOLD = 2000
/** 可见区间两侧额外装载的 K 线数（需盖过最长指标回看窗口：Ichimoku 52 / SAR 等） */
export const CULL_MARGIN = 500

export interface CullWindow {
  /** 切片在全量数据中的起始下标（含） */
  start: number
  /** 切片在全量数据中的结束下标（不含） */
  end: number
}

export interface CullRange {
  /** 可见区间左端（全量坐标，逻辑索引） */
  from: number
  /** 可见区间右端（全量坐标，逻辑索引） */
  to: number
}

/**
 * 由可见区间计算目标装载窗口：`[from - margin, to + margin]`，clamp 到数据边界。
 * `len === 0` 时返回空窗口（start=end=0）。窗口保证至少 1 根。
 */
export function cullWindow(len: number, range: CullRange, margin = CULL_MARGIN): CullWindow {
  if (len <= 0) return { start: 0, end: 0 }
  let start = Math.max(0, Math.floor(range.from) - margin)
  let end = Math.min(len, Math.ceil(range.to) + margin)
  if (end <= start) end = Math.min(len, start + 1)
  if (start >= len) {
    start = Math.max(0, len - 1)
    end = len
  }
  return { start, end }
}

/** 是否需要裁剪：数据量超过阈值才启用 */
export function shouldCull(len: number, threshold = CULL_THRESHOLD): boolean {
  return len > threshold
}

/**
 * 判断可见区间是否已经越出当前装载窗口（需要重载）。
 * 命中窗口内部（含边界）时无需重载，滚动/缩放全程零重载。
 */
export function windowCovers(cull: CullWindow, range: CullRange): boolean {
  return range.from >= cull.start && range.to <= cull.end
}

/** 全局索引 → 局部索引（相对于窗口起点） */
export function toLocal(cull: CullWindow, index: number): number {
  return index - cull.start
}

/** 局部索引（图表当前装载切片内）→ 全局索引 */
export function toGlobal(cull: CullWindow | null, index: number): number {
  return (cull?.start ?? 0) + index
}

/** 把全局可见区间映射为局部区间（重载后保持视角用） */
export function localRange(cull: CullWindow, range: CullRange): CullRange {
  return { from: range.from - cull.start, to: range.to - cull.start }
}

/**
 * G2 周期切换锚定：把旧周期的可见区间换算到新周期数据，保持右缘时间与时间跨度。
 * 输入为新周期数据（升序，已按周期对齐）与旧视图（右缘时间戳秒级 + 可见时间跨度毫秒）。
 * 输出为新数据索引区间（局部），右缘锚定到 `≤ toTime` 的最后一根，根数 = 跨度/新周期毫秒。
 */
export function anchorRangeForSwitch(
  newCandles: { time: number }[],
  toTimeSec: number,
  spanMs: number,
  periodMs: number,
): CullRange | null {
  if (newCandles.length === 0) return null
  // 二分找新周期里右缘时间对应的索引（最后一个 time ≤ toTime）
  let lo = 0
  let hi = newCandles.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (newCandles[mid].time <= toTimeSec) lo = mid
    else hi = mid - 1
  }
  const right = lo
  const spanRoots = Math.max(1, Math.round(spanMs / periodMs))
  const left = Math.max(0, right - spanRoots + 1)
  return { from: left, to: right }
}
