/**
 * Android 返回键的浮层关闭优先级。
 * 优先级从高到低：文本编辑器 → 快速下单 → 快捷键帮助 → 指标参数 →
 * 移动端行情浮层 → 右侧面板 → 回放控制条 → 画线选中。
 */
export type BackTarget =
  | 'text-editor'
  | 'quick-order'
  | 'shortcuts'
  | 'indicator-settings'
  | 'market-list'
  | 'side-panel'
  | 'replay'
  | 'selected-drawing'

export interface BackNavigationState {
  textEditing?: boolean
  quickOrderOpen?: boolean
  shortcutsOpen?: boolean
  settingsOpen?: boolean
  marketListMobileOpen?: boolean
  sidePanelOpen?: boolean
  replayActive?: boolean
  selectedDrawing?: boolean
}

/** 返回当前最应被关闭的一层；没有可关闭浮层时返回 null（交还给系统退出应用） */
export function nextBackTarget(state: BackNavigationState): BackTarget | null {
  if (state.textEditing) return 'text-editor'
  if (state.quickOrderOpen) return 'quick-order'
  if (state.shortcutsOpen) return 'shortcuts'
  if (state.settingsOpen) return 'indicator-settings'
  if (state.marketListMobileOpen) return 'market-list'
  if (state.sidePanelOpen) return 'side-panel'
  if (state.replayActive) return 'replay'
  if (state.selectedDrawing) return 'selected-drawing'
  return null
}
