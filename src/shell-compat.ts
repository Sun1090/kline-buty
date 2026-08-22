/**
 * 浏览器 / 单测环境的壳插件降级实现。
 * Capacitor 打包时 Vite 会把真实插件别名回 app-shell 安装的运行时。
 */
export const StatusBar = {
  async getStyle() {
    return { style: 'Dark' as const }
  },
  async setStyle() {},
  async setBackgroundColor() {},
}
export const SplashScreen = {
  async hide() {},
}
