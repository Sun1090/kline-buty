/**
 * 「回到最新」按钮的可见性判断（纯函数）。
 *
 * lightweight-charts 的 visibleLogicalRange 右缘 `to` 是「逻辑索引 + rightOffset」：
 * 停在最新一根 K 线时 `to ≈ len - 1 + rightOffset`；用户向左拖动（回看历史）时
 * `to` 会低于 `len - 1`。用容差避免浮点抖动与 rightOffset 余量导致的按钮闪烁。
 */

/**
 * 可见区间右缘是否已离开最新 K 线（需要显示「回到最新」按钮）。
 * @param gTo 可见区间右缘（全量坐标，逻辑索引，含 rightOffset）
 * @param len 当前全量 K 线根数
 * @param tolerance 容差（根），默认 0.5：右缘距离最新 K 线不足半根视为仍在最新
 */
export function isAwayFromLatest(gTo: number, len: number, tolerance = 0.5): boolean {
  if (len <= 1) return false
  return gTo < len - 1 - tolerance
}
