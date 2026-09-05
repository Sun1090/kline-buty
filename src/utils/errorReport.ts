/**
 * O1 前端错误监控：捕获全局未捕获错误/未处理 Promise 拒绝 + 渲染错误，
 * 汇总为可序列化报告，通过 sendBeacon 上报到可配置端点（缺省 noop 本地降级）。
 *
 * 隐私优先：不采集用户输入/交易数据，只上报错误名、堆栈摘要、发生路径（location.hash）与时间。
 * 幂等：init 可多次调用只挂一次监听。
 */

export interface ErrorReport {
  kind: 'error' | 'rejection' | 'render'
  message: string
  stack?: string
  /** 发生时的路由（location.hash，缺省 ''） */
  route: string
  at: number
}

export interface ErrorReporterOptions {
  /** 上报端点（缺省 noop：仅本地 console 降级） */
  endpoint?: string
  /** 采样率 0–1（缺省 1） */
  sample?: number
}

const MAX_REPORTS = 20

let initialized = false
let errorHandler: ((e: ErrorEvent) => void) | null = null
let rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null
let flushHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null
let cleanupFn: (() => void) | null = null
const reports: ErrorReport[] = []

function route(): string {
  try {
    return (typeof location !== 'undefined' ? location.hash : '') || ''
  } catch {
    return ''
  }
}

function push(r: ErrorReport) {
  reports.push(r)
  if (reports.length > MAX_REPORTS) reports.shift()
  // 本地降级：无论是否配置端点都保留 console 摘要
  console.warn('[errorReport]', r.kind, r.message)
}

/** 格式化错误消息（跨 Error/unknown 归一） */
export function errorMessage(e: unknown): { message: string; stack?: string } {
  if (e instanceof Error) return { message: e.message || e.name, stack: e.stack }
  if (typeof e === 'string') return { message: e }
  try {
    return { message: JSON.stringify(e) ?? String(e) }
  } catch {
    return { message: String(e) }
  }
}

/** 挂载全局错误捕获 + 可配置上报。返回卸载函数。 */
export function initErrorReporting(opts: ErrorReporterOptions = {}): () => void {
  if (initialized) return () => {}
  initialized = true
  const { endpoint, sample = 1 } = opts

  errorHandler = (e: ErrorEvent) => {
    if (sample < 1 && Math.random() > sample) return
    const { message, stack } = errorMessage(e.error ?? e.message)
    push({ kind: 'error', message, stack, route: route(), at: Date.now() })
  }
  rejectionHandler = (e: PromiseRejectionEvent) => {
    if (sample < 1 && Math.random() > sample) return
    const { message, stack } = errorMessage(e.reason)
    push({ kind: 'rejection', message, stack, route: route(), at: Date.now() })
  }
  const flush = () => {
    if (!endpoint || reports.length === 0) return
    const payload = reports.splice(0, reports.length)
    try {
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify({ reports: payload })], { type: 'application/json' }))
    } catch {
      /* 上报失败静默 */
    }
  }
  flushHandler = flush
  visibilityHandler = () => {
    if (document.visibilityState === 'hidden') flush()
  }

  window.addEventListener('error', errorHandler)
  window.addEventListener('unhandledrejection', rejectionHandler)
  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('pagehide', flushHandler)

  const cleanup = () => {
    if (errorHandler) window.removeEventListener('error', errorHandler)
    if (rejectionHandler) window.removeEventListener('unhandledrejection', rejectionHandler)
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (flushHandler) window.removeEventListener('pagehide', flushHandler)
    errorHandler = null
    rejectionHandler = null
    visibilityHandler = null
    flushHandler = null
    initialized = false
  }
  cleanupFn = cleanup
  return cleanup
}

/** 渲染错误上报（供 ErrorBoundary 调用） */
export function reportRenderError(e: unknown): void {
  const { message, stack } = errorMessage(e)
  push({ kind: 'render', message, stack, route: route(), at: Date.now() })
}

/** 测试辅助：读取当前积压报告（不清空） */
export function _reports(): ErrorReport[] {
  return reports
}

/** 测试辅助：重置（卸载 + 清空），供测试隔离 */
export function _resetErrorReporting(): void {
  cleanupFn?.()
  cleanupFn = null
  reports.length = 0
}
