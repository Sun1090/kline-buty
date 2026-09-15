/**
 * CSV/JSON 导出分享适配层（浏览器 / 单测降级实现）。
 * 壳构建（VITE_CAPACITOR=1）时 vite 把 @shell/share 别名到 app-shell/native-share.ts（Capacitor Share）；
 * Web/测试环境走本桩：恒返回 'fallback'，由调用方继续走原有下载逻辑（行为与原完全一致）。
 */

export type ShareTextResult = 'shared' | 'fallback'

/** Web 端不拦截导出：始终回退下载（保持 `<a download>` 行为；分享能力由壳内 native 实现接管） */
export async function shareTextFile(_fileName: string, _content: string): Promise<ShareTextResult> {
  return 'fallback'
}
