/**
 * CSV/JSON 导出的原生分享适配（Capacitor Share）。
 * 仅壳构建（VITE_CAPACITOR=1）经 vite 别名 `@shell/share` 引入本文件；
 * Web/测试构建使用 src/shellShare.ts 桩。真实行为：打开系统分享面板（文本分享），
 * 用户完成分享 → 'shared'（调用方跳过下载）；取消/失败 → 'fallback'（回退下载）。
 */
import { Share } from '@capacitor/share'
import type { ShareTextResult } from './src/shellShare'

/** 分享文本（CSV/JSON 内容）到系统分享面板；成功 → 'shared'，取消/失败 → 'fallback' */
export async function shareTextFile(fileName: string, content: string): Promise<ShareTextResult> {
  try {
    await Share.share({ title: fileName, text: content })
    return 'shared'
  } catch {
    // 用户取消分享或插件不可用 → 回退下载
    return 'fallback'
  }
}
