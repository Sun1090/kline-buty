/** OHLC 十字光标浮层定位：贴容器右缘防横向溢出；贴近底部时翻转到手指上方防纵向溢出 */

export interface TooltipPos {
  left: number
  top: number
}

/**
 * 计算浮层左上角位置。
 * @param x 十字光标 x（相对容器）
 * @param y 十字光标 y（相对容器）
 * @param rowCount OHLC/指标行数（不含日期行）
 * @param containerW 容器宽（px）
 * @param containerH 容器高（px）
 * @param margin 距视口边缘的安全边距（px）
 */
export function clampTooltipPos(
  x: number,
  y: number,
  rowCount: number,
  containerW: number,
  containerH: number,
  margin = 8,
): TooltipPos {
  // 估算浮层高度：日期行 + 数据行 × 行高（fontSize 11 × lineHeight 1.6）+ 内边距/边框
  const estRow = 17.6
  const estH = (rowCount + 1) * estRow + 16
  // 横向：默认右移 12px，超出容器右缘时贴右缘（至少留 margin）
  const left = Math.min(x + 12, Math.max(margin, containerW - 180))
  // 纵向：默认下移 8px；若会超出容器底部且上方放得下 → 翻转到手指上方
  const rawTop = y + 8
  const top = rawTop + estH > containerH - margin && y - estH - margin >= margin ? y - estH - margin : rawTop
  return { left, top }
}
