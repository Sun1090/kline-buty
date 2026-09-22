import type { DepthRow } from '../depth/aggregate'
import type { DepthSnapshot } from '../hooks/useDepth'

/**
 * 合成盘口：`?perf` 压测模式下的深度来源。
 * 压测模式的契约是「数据源全部走合成、禁止任何真实网络请求」，而订单簿深度此前仍会去连真实 WS
 * （运行器/离线环境拿不到档位 → 盘口整块空着，依赖档位下单的用例也就进不了确定性 E2E 清单）。
 * 与 K 线生成器同一套做法：纯函数 + 按下标的 sin/取模抖动，同一下标序列同进同出。
 */

/** 档位数量：与真实 `depth20` 流一致，两端各 20 档 */
export const SYNTHETIC_DEPTH_LEVELS = 20

/** 档间距离：现价量级的 0.02%（并保证不低于一个可显示的最小变动单位） */
const spreadStep = (mid: number) => Math.max(0.01, Number((mid * 0.0002).toFixed(2)))

const quantityAt = (i: number) => Number((0.8 + (i % 7) * 0.35 + Math.sin(i / 3) * 0.5 + i / 20).toFixed(4))

/**
 * 以 `mid` 为中点铺出买卖两侧档位：买价递减、卖价递增，两端各 `levels` 档。
 * 中价非正/非有限 → null（调用方保持无盘口状态，不画出假档位）。
 */
export function generateSyntheticDepth(
  mid: number | null | undefined,
  levels = SYNTHETIC_DEPTH_LEVELS,
): DepthSnapshot | null {
  if (typeof mid !== 'number' || !Number.isFinite(mid) || mid <= 0) return null
  const step = spreadStep(mid)
  const bids: DepthRow[] = []
  const asks: DepthRow[] = []
  for (let i = 0; i < levels; i++) {
    // 买侧从「中价 − 半个价差」往下排，卖侧从「中价 + 半个价差」往上排：中间留出可见价差
    const offset = step * (i + 0.5)
    bids.push({ price: Number((mid - offset).toFixed(2)), quantity: quantityAt(i) })
    asks.push({ price: Number((mid + offset).toFixed(2)), quantity: quantityAt(levels - 1 - i) })
  }
  return { bids, asks }
}
