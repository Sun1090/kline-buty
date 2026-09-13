// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  errorMessage,
  initErrorReporting,
  reportRenderError,
  _reports,
  _resetErrorReporting,
} from '../utils/errorReport'

beforeEach(() => {
  _resetErrorReporting()
  vi.restoreAllMocks()
  // jsdom 无 navigator.sendBeacon，桩为函数以支持 spy
  Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => true), configurable: true, writable: true })
})

afterEach(() => {
  _resetErrorReporting()
})

describe('errorMessage（O1 错误归一化）', () => {
  it('Error → message + stack', () => {
    const e = new Error('boom')
    const { message, stack } = errorMessage(e)
    expect(message).toBe('boom')
    expect(stack).toContain('Error: boom')
  })

  it('空 message Error → 用 name 兜底', () => {
    const e = new Error('')
    e.name = 'TypeError'
    expect(errorMessage(e).message).toBe('TypeError')
  })

  it('字符串 → message', () => {
    expect(errorMessage('oops').message).toBe('oops')
  })

  it('对象 → JSON 序列化；循环引用回退 String', () => {
    expect(errorMessage({ a: 1 }).message).toBe('{"a":1}')
    const c: Record<string, unknown> = {}
    c.self = c
    expect(errorMessage(c).message.length).toBeGreaterThan(0)
  })
})

describe('initErrorReporting（O1 全局捕获）', () => {
  it('window error 事件 → push error 报告', () => {
    initErrorReporting()
    window.dispatchEvent(new ErrorEvent('error', { message: 'ref x', error: new Error('ref x') }))
    const reps = _reports()
    expect(reps).toHaveLength(1)
    expect(reps[0].kind).toBe('error')
    expect(reps[0].message).toBe('ref x')
  })

  it('unhandledrejection → push rejection 报告', () => {
    initErrorReporting()
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('rej') }))
    const reps = _reports()
    expect(reps).toHaveLength(1)
    expect(reps[0].kind).toBe('rejection')
    expect(reps[0].message).toBe('rej')
  })

  it('reportRenderError（供 ErrorBoundary）→ push render 报告', () => {
    initErrorReporting()
    reportRenderError(new Error('render fail'))
    expect(_reports()[0]).toMatchObject({ kind: 'render', message: 'render fail' })
  })

  it('超过 MAX_REPORTS（20）裁掉最旧', () => {
    initErrorReporting()
    for (let i = 0; i < 25; i++) reportRenderError(new Error('e' + i))
    const reps = _reports()
    expect(reps).toHaveLength(20)
    expect(reps[0].message).toBe('e5')
  })

  it('init 幂等：多次调用只挂一次（25 次 error → 20 条）', () => {
    initErrorReporting()
    initErrorReporting()
    initErrorReporting()
    for (let i = 0; i < 25; i++) reportRenderError(new Error('x'))
    expect(_reports()).toHaveLength(20)
  })

  it('cleanup 后移除事件监听，且可重新 init', () => {
    const beacon = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
    const cleanup = initErrorReporting({ endpoint: 'https://r/x' })
    reportRenderError(new Error('pending'))
    cleanup()
    // cleanup 移除 pagehide flush 监听 → 不再上报
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(beacon).not.toHaveBeenCalled()
    expect(_reports()).toHaveLength(1)
    // 重新 init 可用
    initErrorReporting()
    reportRenderError(new Error('again'))
    expect(_reports()).toHaveLength(2)
  })

  it('配置 endpoint → pagehide 时 sendBeacon 上报并清空', () => {
    const beacon = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
    initErrorReporting({ endpoint: 'https://report.example/x' })
    reportRenderError(new Error('to report'))
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, blob] = beacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('https://report.example/x')
    expect(blob.type).toBe('application/json')
    expect(_reports()).toHaveLength(0)
  })

  it('未配 endpoint → pagehide 不上报（本地降级）', () => {
    const beacon = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
    initErrorReporting()
    reportRenderError(new Error('local only'))
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(beacon).not.toHaveBeenCalled()
    expect(_reports()).toHaveLength(1)
  })
})
