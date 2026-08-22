import { describe, expect, it } from 'vitest'
import { nextBackTarget } from '../backNavigation'

describe('nextBackTarget', () => {
  it('按最高优先级返回文本编辑器', () => {
    expect(nextBackTarget({ textEditing: true, quickOrderOpen: true })).toBe('text-editor')
  })

  it('覆盖快速下单、快捷键、指标参数和行情浮层', () => {
    expect(nextBackTarget({ quickOrderOpen: true })).toBe('quick-order')
    expect(nextBackTarget({ shortcutsOpen: true })).toBe('shortcuts')
    expect(nextBackTarget({ settingsOpen: true })).toBe('indicator-settings')
    expect(nextBackTarget({ marketListMobileOpen: true })).toBe('market-list')
  })

  it('多个右侧面板只返回一个面板层级', () => {
    expect(
      nextBackTarget({
        sidePanelOpen: true,
        replayActive: true,
        selectedDrawing: true,
      }),
    ).toBe('side-panel')
  })

  it('回放优先于选中画线', () => {
    expect(nextBackTarget({ replayActive: true, selectedDrawing: true })).toBe('replay')
    expect(nextBackTarget({ selectedDrawing: true })).toBe('selected-drawing')
  })

  it('没有浮层时交还系统退出', () => {
    expect(nextBackTarget({})).toBeNull()
  })
})
