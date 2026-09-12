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
