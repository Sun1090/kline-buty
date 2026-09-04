import type { ValuePoint } from './sma'

/** H10 副图叠加比较：把叠加指标的线合并进主副图数据（同轴多线渲染，adapter 逐线 setData）。 */
export interface SubLike {
  kind?: string
  hist?: { time: number; value: number; color?: string }[]
  lines?: { id: string; points: ValuePoint[] }[]
  markers?: { price: number; color: string }[]
  zones?: { from: number; to: number; color: string }[]
}

/**
 * 合并主副图与叠加副图：lines 拼接（主图在前），hist/markers/zones 取主图。
 * 返回 null 当 main 为 null；overlay 为 null 时返回 main 原样（浅拷贝保引用）。
 * 泛型 K 保留主图 kind 字面量（叠加不改变副图身份）。
 */
export function mergeSubData<K extends string>(
  main: (SubLike & { kind: K }) | null,
  overlay: SubLike | null,
): (SubLike & { kind: K }) | null {
  if (!main) return null
  if (!overlay) return main
  const overlayLines = overlay.lines ?? []
  return {
    ...main,
    lines: [...(main.lines ?? []), ...overlayLines],
  }
}
