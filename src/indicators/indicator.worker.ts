/// <reference lib="webworker" />
import { workerSubLines, type WorkerLineRequest, type WorkerLineResponse } from './workerLines'

/**
 * H13 指标计算 Web Worker。
 * 大数据量（> CULL_THRESHOLD）时副图指标线在 worker 内计算，主线程不阻塞。
 * 纯函数：入参可结构化克隆，返回结果可 postMessage。
 */
self.onmessage = (e: MessageEvent<WorkerLineRequest>) => {
  const { id, kind, candles, params } = e.data
  let resp: WorkerLineResponse
  try {
    const lines = workerSubLines(kind, candles, params)
    resp = { id, lines }
  } catch (err) {
    resp = { id, lines: null, error: err instanceof Error ? err.message : String(err) }
  }
  ;(self as unknown as Worker).postMessage(resp)
}
