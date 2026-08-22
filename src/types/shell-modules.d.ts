/**
 * 壳插件依赖只安装在 app-shell/。主应用通过动态 import 按环境降级，
 * 这里仅补齐类型，不把壳依赖引入根 package.json。
 */
declare module '@capacitor/status-bar' {
  export type StatusBarStyle = 'Dark' | 'Light'
  export interface StyleInfo {
    style: StatusBarStyle
  }
  export const StatusBar: {
    getStyle(): Promise<StyleInfo>
    setStyle(options: { style: StatusBarStyle }): Promise<void>
    setBackgroundColor(options: { color: string }): Promise<void>
  }
}

declare module '@capacitor/splash-screen' {
  export const SplashScreen: {
    hide(options?: { fadeDuration?: number }): Promise<void>
  }
}
