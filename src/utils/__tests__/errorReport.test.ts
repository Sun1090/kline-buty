// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { _resetErrorReporting, _reports, errorMessage, initErrorReporting, reportRenderError } from '../errorReport'

afterEach(() => {
  _resetErrorReporting()
  vi.restoreAllMocks()
})

function freshInit(opts?: Parameters<typeof initErrorReporting>[0]) {
  _resetErrorReporting()
  return initErrorReporting(opts)
}

describe('errorReport（O1 错误监控）', () => {
  it('init 挂载后：全局 error 事件 → 记录错误报告', () => {
    freshInit()
    const err = new Error('boom')
    window.dispatchEvent(new ErrorEvent('error', { error: err, message: 'boom' }))
    const reports = _reports()
    expect(reports.length).toBe(1)
    expect(reports[0].kind).toBe('error')
    expect(reports[0].message).toBe('boom')
  })

  it('unhandledrejection → 记录 rejection 报告', () => {
    freshInit()
    const ev = new Event('unhandledrejection') as unknown as PromiseRejectionEvent
    Object.defineProperty(ev, 'reason', { value: new Error('rej') })
    window.dispatchEvent(ev as PromiseRejectionEvent)
    const reports = _reports()
    expect(reports.length).toBe(1)
    expect(reports[0].kind).toBe('rejection')
    expect(reports[0].message).toBe('rej')
  })

  it('reportRenderError：渲染错误报告（供 ErrorBoundary）', () => {
    freshInit()
    reportRenderError(new Error('render broke'))
    const reports = _reports()
    expect(reports[0].kind).toBe('render')
    expect(reports[0].message).toBe('render broke')
  })

  it('init 幂等：多次调用只挂一次（重复事件不累积双份）', () => {
    freshInit()
    freshInit()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('x') }))
    expect(_reports().length).toBe(1)
  })

  it('errorMessage 归一化：Error/字符串/对象', () => {
    expect(errorMessage(new Error('a')).message).toBe('a')
    expect(errorMessage('plain').message).toBe('plain')
    expect(errorMessage({ a: 1 }).message).toContain('a')
  })

  it('上限：超过 MAX_REPORTS 丢弃最旧', () => {
    freshInit()
    for (let i = 0; i < 30; i++) {
      window.dispatchEvent(new ErrorEvent('error', { error: new Error(`e${i}`) }))
    }
    const reports = _reports()
    expect(reports.length).toBe(20)
    expect(reports[reports.length - 1].message).toBe('e29')
  })

  it('配置 endpoint：离开页面前通过 sendBeacon 上报', () => {
    const beacon = vi.fn()
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    freshInit({ endpoint: 'https://example.com/report' })
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('srv') }))
    // 模拟页面隐藏触发 flush
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(String(beacon.mock.calls[0][0])).toBe('https://example.com/report')
  })
})
