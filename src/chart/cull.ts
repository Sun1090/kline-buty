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

/**
 * 下一次该装载哪个窗口：`null` 表示不裁剪；返回入参 `cur` 本身（同一引用）表示保持不动。
 *
 * - `cur`：React 侧已生效的窗口（用来判断「要不要再迁移动一次状态」）。
 * - `loaded`：图表里**当前真正装载着**的区间 `{start, end}`（end 不含）。判覆盖必须用它——
 *   贴尾沿时装载区间的右端会跟着实时数据一起生长，比 `cur.end` 宽，按 `cur.end` 判会每根新 K 线
 *   都误判「越界」而迁移窗口、进而整窗重载。
 *
 * 迁移条件只有两条：视角越出装载区间，或装载区间的左缘空转超过一个余量（尾部跟随时需按批回收左侧，
 * 否则窗口随数据无限膨胀）。
 * 关键：窗口内滚动/缩放一律不迁移。若每次可见区间变化都重算 `[from-margin, to+margin]`，
 * `start` 会随视角逐根漂移 → 整窗重载 → 图表按逻辑索引保视图 → 视角又漂移，形成自锁振荡；
 * 振荡期间 `start` 与图表实际装载的切片错位，换算出的全局索引被 clamp 成 2~5 根的窄区间，
 * 「回到最新」误红、周期切换锚定的时间跨度被压成几分钟（A2 的稳定性缺陷即源于此）。
 */
export function nextCullWindow(
  cur: CullWindow | null,
  loaded: CullWindow,
  view: CullRange,
  len: number,
  margin = CULL_MARGIN,
): CullWindow | null {
  if (!shouldCull(len)) return null
  const target = cullWindow(len, view, margin)
  if (!cur) return target
  if (windowCovers(loaded, view)) return target.start - loaded.start >= margin ? target : cur
  return target
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
 * 升序 K 线里「最后一个 `time ≤ at`」的下标（二分）。全部更晚时返回 0，空数组返回 0。
 * 秒 → 索引的换算入口：`setVisibleRange` 吃的是索引，而跨图表广播、流水定位拿到的都是时间，
 * 各格周期不同 ⇒ 同一个索引对应完全不同的时间跨度，必须先换算再落位（issue #186）。
 */
export function floorIndexByTime(candles: { time: number }[], at: number): number {
  if (candles.length === 0) return 0
  let lo = 0
  let hi = candles.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (candles[mid].time <= at) lo = mid
    else hi = mid - 1
  }
  return lo
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
  const right = floorIndexByTime(newCandles, toTimeSec)
  const spanRoots = Math.max(1, Math.round(spanMs / periodMs))
  // 目标时间早于全部数据（回看跨周期后新数据未覆盖到该时点）→ 从最左展示 spanRoots 根，
  // 避免 right clamp 到 0 后 span 丢失退化成单根（也不应跳到最新之外）
  if (right === 0 && newCandles[0].time > toTimeSec) {
    return { from: 0, to: Math.min(newCandles.length - 1, spanRoots - 1) }
  }
  let left = Math.max(0, right - spanRoots + 1)
  // 单根区间（跨度远小于新周期，如 1m→5m 的 60s 窗口）在 lightweight-charts 的
  // setVisibleLogicalRange 下不稳定（内部归一化引发裁剪窗口竞态振荡），保底扩展为至少 2 根
  if (left === right) left = Math.max(0, left - 1)
  return { from: left, to: right }
}
