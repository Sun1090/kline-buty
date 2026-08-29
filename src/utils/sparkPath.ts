/** 迷你图 SVG path（纯函数，可单测）：归一化到 w×h 画布 */
export function buildSparkPath(points: number[], w: number, h: number): string {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p < min) min = p
    if (p > max) max = p
  }
  const range = max - min || 1
  const step = w / (points.length - 1)
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - 1 - ((p - min) / range) * (h - 2)).toFixed(1)}`)
    .join(' ')
}
