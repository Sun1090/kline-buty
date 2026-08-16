import type { Candle } from '../chart/types'

/**
 * K 线仓库：有序缓存 + 幂等合并。
 * WS 实时帧与 REST 历史补数都会进入这里，保证不重复、不丢序。
 */
export class MarketStore {
  private candles: Candle[] = []
  private latestTime = -Infinity

  /** 单根 upsert：同时间戳替换（跳动/重复），更新的追加，乱序按时间插入（补数） */
  upsert(c: Candle) {
    const last = this.candles[this.candles.length - 1]
    if (last && c.time === last.time) {
      this.candles[this.candles.length - 1] = c
      return
    }
    if (c.time > this.latestTime) {
      this.candles.push(c)
      this.latestTime = c.time
      return
    }
    const i = lowerBound(this.candles, c.time)
    if (this.candles[i]?.time === c.time) {
      this.candles[i] = c
      return
    }
    this.candles.splice(i, 0, c)
    this.latestTime = this.candles[this.candles.length - 1].time
  }

  upsertAll(list: Candle[]) {
    for (const c of list) this.upsert(c)
  }

  all(): Candle[] {
    return this.candles
  }

  reset() {
    this.candles = []
    this.latestTime = -Infinity
  }
}

/** 第一个 time >= target 的下标（二分） */
function lowerBound(arr: Candle[], target: number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid].time < target) lo = mid + 1
    else hi = mid
  }
  return lo
}
