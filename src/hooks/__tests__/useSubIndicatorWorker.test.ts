import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetWorkerClient, computeSubLinesRemote, WORKER_THRESHOLD } from '../useSubIndicatorWorker'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'
import type { Candle } from '../../chart/types'
import type { ValuePoint } from '../../indicators/sma'

function candles(n: number): Candle[] {
  const out: Candle[] = []
  let close = 100
  for (let i = 0; i < n; i++) {
    close += i % 2 === 0 ? 1 : -0.3
    out.push({ time: i + 1, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 100, isClosed: true })
  }
  return out
}

class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null
  postMessage(req: { id: number; kind: string; candles: Candle[]; params: typeof DEFAULT_INDICATOR_PARAMS }) {
    // 模拟 worker 计算：RSI 线（与主线程 calcRSI 一致的纯函数）
    const { id, kind } = req
    const lines = kind === 'rsi' ? [{ id: 'RSI', points: ([{ time: 1, value: 50 }] as ValuePoint[]) }] : null
    setTimeout(() => this.onmessage?.({ data: { id, lines } }), 0)
  }
  terminate() {}
}

beforeEach(() => {
  _resetWorkerClient()
  vi.restoreAllMocks()
})

describe('computeSubLinesRemote（H13 worker 客户端）', () => {
  it('小窗口（< 阈值）→ 同步计算，不走 worker', async () => {
    const small = candles(100)
    const r = await computeSubLinesRemote('rsi', small, DEFAULT_INDICATOR_PARAMS)
    expect(r.fromWorker).toBe(false)
    expect(r.lines).toHaveLength(1)
    expect(r.lines![0].id).toBe('RSI')
  })

  it('大数据量 + Worker 存在 → 走 worker，返回同协议线集', async () => {
    // 注入 FakeWorker（jsdom 通常无原生 Worker）
    vi.stubGlobal('Worker', FakeWorker)
    const big = candles(WORKER_THRESHOLD + 10)
    const r = await computeSubLinesRemote('rsi', big, DEFAULT_INDICATOR_PARAMS)
    expect(r.fromWorker).toBe(true)
    expect(r.lines).toHaveLength(1)
    expect(r.lines![0].points[0].value).toBe(50)
  })

  it('大数据量 + Worker 不可用 → 回退同步（不空白）', async () => {
    // 确保 Worker 不存在
    vi.stubGlobal('Worker', undefined)
    const big = candles(WORKER_THRESHOLD + 5)
    const r = await computeSubLinesRemote('rsi', big, DEFAULT_INDICATOR_PARAMS)
    expect(r.fromWorker).toBe(false)
    expect(r.lines).toHaveLength(1)
  })

  it('worker 报错（kind 不支持）→ 返回 null 线集不抛', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const big = candles(WORKER_THRESHOLD + 1)
    const r = await computeSubLinesRemote('bbw', big, DEFAULT_INDICATOR_PARAMS)
    expect(r.lines).toBeNull()
  })

  it('结果缓存：同 key 重复调用不重新计算', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const postSpy = vi.fn()
    class SpyWorker {
      onmessage: ((e: { data: unknown }) => void) | null = null
      postMessage(req: { id: number; kind: string }) {
        postSpy(req)
        setTimeout(() => this.onmessage?.({ data: { id: req.id, lines: [{ id: 'RSI', points: [{ time: 1, value: 55 }] }] } }), 0)
      }
    }
    vi.stubGlobal('Worker', SpyWorker)
    const big = candles(WORKER_THRESHOLD + 3)
    await computeSubLinesRemote('rsi', big, DEFAULT_INDICATOR_PARAMS)
    await computeSubLinesRemote('rsi', big, DEFAULT_INDICATOR_PARAMS)
    expect(postSpy).toHaveBeenCalledTimes(1)
  })
})
