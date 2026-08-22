/**
 * Capacitor App 插件的浏览器 / 单测降级实现。
 * 真实插件由 app-shell 安装并通过 Vite alias 在壳构建时替换；
 * 浏览器环境没有 backButton，因此不会产生副作用。
 */
export interface AppPlugin {
  addListener(
    eventName: 'backButton',
    listener: () => void,
  ): Promise<{ remove: () => Promise<void> }>
}

export const App = {
  async addListener(eventName: 'backButton', listener: () => void) {
    void eventName
    void listener
    return { remove: async () => {} }
  },
} satisfies AppPlugin
