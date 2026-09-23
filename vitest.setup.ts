import { configure } from '@testing-library/react'

/**
 * `findBy*` / `waitFor` 的时间预算。默认 1000ms 是 testing-library 定的，它没假设整机并发。
 *
 * 全量 `vitest run` 会同时拉起 175 个 worker 文件（每文件一个 isolate）。负载下
 * `App.integration` 的「WS 面板打开渲染空态：盘口/深度/情绪」死在 `findByTestId('sentiment-panel')`
 * 上，同一文件单跑 6/6 全绿 —— 这就是 #34 那条「负载 flake」的真实形态，也是
 * `vite.config.ts` 里 `testTimeout: 15_000` 已经处理过的同一层问题（「避免把资源饥饿误读成应用回归」），
 * 只是 asyncUtil 这一层当时漏了。
 *
 * 8s 由两端夹住，不是挑的整数：
 * - 下限：把预算调到 1100ms 在同一负载下会精确复刻那条红（`Unable to find [data-testid="sentiment-panel"]`），
 *   说明单次等待实测就要 >1.1s。这条测试里只有 2 次 `await findBy*` 吃这个预算
 *   （`getByTestId('order-book')` 是同步的），而它在极限负载下总耗时 4.6s —— 这就是单次等待的上界，
 *   5s 只比它多 8%。`testTimeout` 当时是按「覆盖约 3× 的降速」抬的，同一条理由下取 8s。
 * - 上限：必须明显低于 `testTimeout`，否则真失败会先撞上「Test timed out」，丢掉
 *   TestingLibraryElementError 那份带 DOM dump 的判词。已用「永远不出现的钩子」对照组钉住：
 *   8s 预算下它在 8006ms 红，报的正是 `Unable to find an element`。
 */
configure({ asyncUtilTimeout: 8_000 })

/** 测试环境注入内存版 localStorage（jsdom 无 Storage 实现） */
const store = new Map<string, string>()

const memoryStorage: Storage = {
  get length() {
    return store.size
  },
  clear: () => store.clear(),
  getItem: (key) => store.get(key) ?? null,
  key: (index) => [...store.keys()][index] ?? null,
  removeItem: (key) => {
    store.delete(key)
  },
  setItem: (key, value) => {
    store.set(key, String(value))
  },
}

Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })

/** jsdom 无 ResizeObserver（App 用其测量 header 高度驱动右侧面板抽屉定位） */
if (!('ResizeObserver' in globalThis)) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: MockResizeObserver,
    configurable: true,
  })
}

/** jsdom 无 WebSocket（盘口/深度/情绪等 WS 面板在单测中渲染空态/加载态用；连接行为由 E2E 覆盖） */
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readyState = MockWebSocket.CONNECTING
    onopen: ((ev: unknown) => void) | null = null
    onmessage: ((ev: unknown) => void) | null = null
    onclose: ((ev: unknown) => void) | null = null
    onerror: ((ev: unknown) => void) | null = null
    constructor(_url: string | URL) {}
    send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) {}
    close(_code?: number, _reason?: string) {
      this.readyState = MockWebSocket.CLOSED
      this.onclose?.({} as unknown)
    }
    addEventListener() {}
    removeEventListener() {}
  }
  Object.defineProperty(globalThis, 'WebSocket', { value: MockWebSocket, configurable: true })
}

/** jsdom 无 matchMedia 实现（属性存在但非函数；主题自动档监听 prefers-color-scheme 用），默认浅色 */
if (typeof globalThis.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    configurable: true,
    writable: true,
  })
}
