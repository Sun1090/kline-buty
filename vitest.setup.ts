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
