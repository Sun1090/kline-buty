// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
import { DrawingLayers } from '../DrawingLayers'
import { createDrawing, type Drawing } from '../../drawings/logic'
import { createTemplate } from '../../drawings/templates'

afterEach(cleanup)

function setup(overrides: Partial<Parameters<typeof DrawingLayers>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onToggleHidden: vi.fn(),
    onToggleLocked: vi.fn(),
    onSetOpacity: vi.fn(),
    onSetFollowLatest: vi.fn(),
    onRename: vi.fn(),
    onGroupHidden: vi.fn(),
    onGroupLocked: vi.fn(),
    onDelete: vi.fn(),
    onClearAll: vi.fn(),
    onSetAllHidden: vi.fn(),
    onExport: vi.fn(),
    onImportFile: vi.fn(),
    importError: null,
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canPaste: false,
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    templates: [],
    onSaveTemplate: vi.fn(),
    onApplyTemplate: vi.fn(),
    onDeleteTemplate: vi.fn(),
    onBack: vi.fn(),
    onGlobalOpacityChange: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchSetHidden: vi.fn(),
  }
  const props: Parameters<typeof DrawingLayers>[0] = {
    drawings: [],
    selectedId: null,
    ...handlers,
    ...overrides,
  }
  render(<DrawingLayers {...props} />)
  return handlers
}

const h1: Drawing = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1')
const t1: Drawing = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't1')

describe('DrawingLayers（图层管理面板）', () => {
  it('空态：显示「暂无画线」与 0 计数，无清除按钮', () => {
    setup()
    expect(screen.getByTestId('drawing-layer-empty')).toBeTruthy()
    expect(screen.getByText('图层管理（0）')).toBeTruthy()
    expect(screen.queryByTestId('drawing-layer-clear')).toBeNull()
  })

  it('两行画线：标题计数、行内按钮齐全、无空态', () => {
    setup({ drawings: [h1, t1], selectedId: 'h1' })
    expect(screen.getByText('图层管理（2）')).toBeTruthy()
    expect(screen.queryByTestId('drawing-layer-empty')).toBeNull()
    const rows = screen.getAllByTestId('drawing-layer-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('水平线')
    expect(rows[1].textContent).toContain('趋势线')
    expect(screen.getByTestId('drawing-layer-clear')).toBeTruthy()
  })

  it('选中行带 data-selected=true，其余为 false', () => {
    setup({ drawings: [h1, t1], selectedId: 't1' })
    const rows = screen.getAllByTestId('drawing-layer-row')
    expect(rows[0].getAttribute('data-selected')).toBe('false')
    expect(rows[1].getAttribute('data-selected')).toBe('true')
  })

  it('点击行 → onSelect 回调携带画线 id', () => {
    const handlers = setup({ drawings: [h1, t1] })
    fireEvent.click(screen.getAllByTestId('drawing-layer-row')[1])
    expect(handlers.onSelect).toHaveBeenCalledWith('t1')
  })

  it('眼睛按钮 → onToggleHidden(id)；锁定按钮 → onToggleLocked(id)；删除按钮 → onDelete(id)（点击不触发行选中）', () => {
    const handlers = setup({ drawings: [h1, t1] })
    const rows = screen.getAllByTestId('drawing-layer-row')
    fireEvent.click(rows[0].querySelector('[data-testid="drawing-layer-eye"]')!)
    expect(handlers.onToggleHidden).toHaveBeenCalledWith('h1')
    expect(handlers.onSelect).not.toHaveBeenCalled()
    fireEvent.click(rows[1].querySelector('[data-testid="drawing-layer-lock"]')!)
    expect(handlers.onToggleLocked).toHaveBeenCalledWith('t1')
    fireEvent.click(rows[1].querySelector('[data-testid="drawing-layer-delete"]')!)
    expect(handlers.onDelete).toHaveBeenCalledWith('t1')
  })

  it('隐藏/锁定的画线在行内按钮上体现状态（data-active / 文案）', () => {
    const hidden = { ...h1, hidden: true }
    const locked = { ...t1, locked: true }
    setup({ drawings: [hidden, locked] })
    const rows = screen.getAllByTestId('drawing-layer-row')
    const eye = rows[0].querySelector('[data-testid="drawing-layer-eye"]')!
    const lock = rows[1].querySelector('[data-testid="drawing-layer-lock"]')!
    expect(eye.getAttribute('data-active')).toBe('false') // 当前隐藏 → 点击为「显示」
    expect(lock.getAttribute('data-active')).toBe('true') // 当前锁定 → 点击为「解锁」
    expect(rows[0].textContent).toContain('🚫')
    expect(rows[1].textContent).toContain('🔒')
  })

  it('全部清除 → onClearAll；返回 → onBack', () => {
    const handlers = setup({ drawings: [h1, t1] })
    fireEvent.click(screen.getByTestId('drawing-layer-clear'))
    expect(handlers.onClearAll).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('drawing-layer-back'))
    expect(handlers.onBack).toHaveBeenCalled()
  })

  it('撤销/重做按钮：可操作时触发回调，不可用时不触发', () => {
    const handlers = setup({ drawings: [h1, t1], canUndo: true, canRedo: true })
    fireEvent.click(screen.getByTestId('drawing-layer-undo'))
    expect(handlers.onUndo).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('drawing-layer-redo'))
    expect(handlers.onRedo).toHaveBeenCalled()
    expect(screen.getByTestId('drawing-layer-undo').getAttribute('aria-disabled')).toBe('false')
    expect(screen.getByTestId('drawing-layer-redo').getAttribute('aria-disabled')).toBe('false')
  })

  it('撤销/重做按钮不可用时：disabled + aria-disabled=true，点击不触发', () => {
    const handlers = setup({ drawings: [h1, t1], canUndo: false, canRedo: false })
    fireEvent.click(screen.getByTestId('drawing-layer-undo'))
    fireEvent.click(screen.getByTestId('drawing-layer-redo'))
    expect(handlers.onUndo).not.toHaveBeenCalled()
    expect(handlers.onRedo).not.toHaveBeenCalled()
    expect(screen.getByTestId('drawing-layer-undo').getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByTestId('drawing-layer-redo').getAttribute('aria-disabled')).toBe('true')
  })

  it('复制按钮：选中画线时可复制，未选中时禁用', () => {
    const handlers = setup({ drawings: [h1, t1], selectedId: 'h1' })
    fireEvent.click(screen.getByTestId('drawing-layer-copy'))
    expect(handlers.onCopy).toHaveBeenCalled()
    const copyBtn = screen.getByTestId('drawing-layer-copy') as HTMLButtonElement
    expect(copyBtn.disabled).toBe(false)
    // 未选中 → 禁用
    cleanup()
    const h2 = setup({ drawings: [h1, t1], selectedId: null })
    const btn = screen.getByTestId('drawing-layer-copy') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(h2.onCopy).not.toHaveBeenCalled()
  })

  it('粘贴按钮：剪贴板有画线时可粘贴，否则禁用', () => {
    const handlers = setup({ drawings: [h1], canPaste: true })
    fireEvent.click(screen.getByTestId('drawing-layer-paste'))
    expect(handlers.onPaste).toHaveBeenCalled()
    cleanup()
    const h2 = setup({ drawings: [h1], canPaste: false })
    const btn = screen.getByTestId('drawing-layer-paste') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(h2.onPaste).not.toHaveBeenCalled()
  })

  it('保存模板：输入名 + 有画线 → onSaveTemplate(名)', () => {
    const handlers = setup({ drawings: [h1, t1] })
    fireEvent.change(screen.getByTestId('drawing-template-name'), { target: { value: '趋势组合' } })
    fireEvent.click(screen.getByTestId('drawing-template-save'))
    expect(handlers.onSaveTemplate).toHaveBeenCalledWith('趋势组合')
  })

  it('无画线时保存按钮禁用，点击不触发', () => {
    const handlers = setup()
    fireEvent.change(screen.getByTestId('drawing-template-name'), { target: { value: 'x' } })
    const btn = screen.getByTestId('drawing-template-save') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(handlers.onSaveTemplate).not.toHaveBeenCalled()
  })

  it('空模板列表：显示空态提示，无模板行', () => {
    setup()
    expect(screen.getByTestId('drawing-template-empty')).toBeTruthy()
    expect(screen.queryAllByTestId('drawing-template-row')).toHaveLength(0)
  })

  it('C10 透明度：选中画线显示滑杆，调节触发 onSetOpacity；未选中不显示', () => {
    const handlers = setup({ drawings: [h1, t1], selectedId: 'h1' })
    const slider = screen.getByTestId('drawing-opacity-slider') as HTMLInputElement
    expect(slider).toBeTruthy()
    fireEvent.change(slider, { target: { value: '0.5' } })
    expect(handlers.onSetOpacity).toHaveBeenCalledWith('h1', 0.5)
    cleanup()
    setup({ drawings: [h1, t1], selectedId: null })
    expect(screen.queryByTestId('drawing-opacity-slider')).toBeNull()
  })

  it('I13 全局透明度：常显滑杆，调节触发 onGlobalOpacityChange', () => {
    const handlers = setup({ drawings: [h1, t1], globalOpacity: 1 })
    const slider = screen.getByTestId('drawing-global-opacity-slider') as HTMLInputElement
    expect(slider).toBeTruthy()
    fireEvent.change(slider, { target: { value: '0.4' } })
    expect(handlers.onGlobalOpacityChange).toHaveBeenCalledWith(0.4)
  })

  it('I7 批量操作：勾选两行 → 显示批量栏，删除/隐藏触发对应回调', () => {
    const handlers = setup({ drawings: [h1, t1] })
    // 初始无批量栏
    expect(screen.queryByTestId('drawing-batch-bar')).toBeNull()
    // 勾选两行
    fireEvent.click(screen.getByTestId('drawing-batch-check-h1'))
    fireEvent.click(screen.getByTestId('drawing-batch-check-t1'))
    expect(screen.getByTestId('drawing-batch-bar')).toBeDefined()
    // 批量隐藏
    fireEvent.click(screen.getByTestId('drawing-batch-hide'))
    expect(handlers.onBatchSetHidden).toHaveBeenCalledWith(['h1', 't1'], true)
    // 批量删除
    fireEvent.click(screen.getByTestId('drawing-batch-check-h1'))
    fireEvent.click(screen.getByTestId('drawing-batch-check-t1'))
    fireEvent.click(screen.getByTestId('drawing-batch-delete'))
    expect(handlers.onBatchDelete).toHaveBeenCalledWith(['h1', 't1'])
  })

  it('模板列表：套用/删除按钮触发对应回调', () => {
    const tpl = createTemplate('支撑趋势', [h1, t1])
    const handlers = setup({ drawings: [h1], templates: [tpl] })
    expect(screen.queryByTestId('drawing-template-empty')).toBeNull()
    const rows = screen.getAllByTestId('drawing-template-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('支撑趋势')
    fireEvent.click(rows[0].querySelector('[data-testid="drawing-template-apply"]')!)
    expect(handlers.onApplyTemplate).toHaveBeenCalledWith('支撑趋势')
    fireEvent.click(rows[0].querySelector('[data-testid="drawing-template-delete"]')!)
    expect(handlers.onDeleteTemplate).toHaveBeenCalledWith('支撑趋势')
  })

  it('面板有 role=region，列表 role=listbox，行 role=option + aria-selected', () => {
    setup({ drawings: [h1, t1], selectedId: 'h1' })
    const region = screen.getByTestId('drawing-layers')
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toBeTruthy()
    const listbox = region.querySelector('[role="listbox"]')
    expect(listbox).toBeDefined()
    const options = region.querySelectorAll('[role="option"]')
    expect(options.length).toBe(2)
    // h1 被选中 → 首行 aria-selected=true
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[1].getAttribute('aria-selected')).toBe('false')
  })

  it('I15 搜索：按类型标签过滤图层树', () => {
    setup({ drawings: [h1, t1] })
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(2)
    fireEvent.change(screen.getByTestId('drawing-search'), { target: { value: '趋势' } })
    // 趋势线行保留，水平线行被过滤
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(1)
    expect(screen.getByTestId('drawing-layer-row').getAttribute('data-type')).toBe('trend')
  })

  it('I15 搜索：按自定义名过滤', () => {
    const named = { ...h1, name: '关键支撑' }
    setup({ drawings: [named, t1] })
    fireEvent.change(screen.getByTestId('drawing-search'), { target: { value: '支撑' } })
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(1)
    expect(screen.getByTestId('drawing-layer-name').textContent).toBe('关键支撑')
  })

  it('I15 重命名：点击 ✎ → 行内输入 → 回车提交 onRename 并清除', () => {
    const onRename = vi.fn()
    setup({ drawings: [h1], onRename })
    fireEvent.click(screen.getByTestId('drawing-layer-rename'))
    const input = screen.getByTestId('drawing-rename-input')
    fireEvent.change(input, { target: { value: '斐波那契' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('h1', '斐波那契')
  })
  it('C4 组头：组名计数 + 组级显隐/锁定 + 折叠切换', () => {
    const h = setup({
      drawings: [
        { ...createDrawing('horizontal', [{ time: 1, price: 100 }], 'd1'), group: 'A组' },
        { ...createDrawing('trend', [{ time: 0, price: 100 }, { time: 10, price: 90 }], 'd2'), group: 'A组' },
        createDrawing('horizontal', [{ time: 1, price: 100 }], 'd3'),
      ],
    })
    const aHeader = document.querySelector('[data-group="A组"]') as HTMLElement
    expect(aHeader.textContent).toContain('A组')
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(3)
    // 组级隐藏：组内全未隐藏 → 调 onGroupHidden(group, true)
    fireEvent.click(screen.getByTestId('drawing-group-eye-A组'))
    expect(h.onGroupHidden).toHaveBeenCalledWith('A组', true)
    fireEvent.click(screen.getByTestId('drawing-group-lock-A组'))
    expect(h.onGroupLocked).toHaveBeenCalledWith('A组', true)
    // 折叠组 → 组内行不渲染（未分组仍在）
    fireEvent.click(aHeader)
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(1)
    fireEvent.click(aHeader)
    expect(screen.getAllByTestId('drawing-layer-row')).toHaveLength(3)
  })

  it('显示全部/隐藏全部按钮 → onSetAllHidden(false/true)', () => {
    const h = setup({ drawings: [h1, t1] })
    fireEvent.click(screen.getByTestId('drawing-layer-show-all'))
    expect(h.onSetAllHidden).toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByTestId('drawing-layer-hide-all'))
    expect(h.onSetAllHidden).toHaveBeenCalledWith(true)
  })

  it('I12 撤销深度输入 → onUndoDepthChange(钳制)', () => {
    const onUndoDepthChange = vi.fn()
    setup({ drawings: [h1], undoDepth: 60, onUndoDepthChange })
    const input = screen.getByLabelText('撤销步数') as HTMLInputElement
    fireEvent.change(input, { target: { value: '300' } }) // 超上限 → 钳到 200
    expect(onUndoDepthChange).toHaveBeenCalledWith(200)
  })

  it('导入错误 → 显示错误信息', () => {
    setup({ drawings: [h1], importError: '格式无效' })
    expect(screen.getByTestId('drawing-import-error').textContent).toBe('格式无效')
  })

  it('导入文件：按钮触发选择器，选文件 → onImportFile', () => {
    const h = setup({ drawings: [h1] })
    const fileClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByTestId('drawing-layer-import'))
    expect(fileClickSpy).toHaveBeenCalled()
    fileClickSpy.mockRestore()
    const file = new File(['[]'], 'd.json', { type: 'application/json' })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } })
    expect(h.onImportFile).toHaveBeenCalledWith(file)
  })

  it('C15 position 工具跟随最新价：选中时显示开关，切换触发 onSetFollowLatest', () => {
    const pos = createDrawing('position', [{ time: 1, price: 100 }], 'p1')
    const h = setup({ drawings: [pos], selectedId: 'p1' })
    expect(screen.getByTestId('drawing-follow-latest-row')).toBeDefined()
    fireEvent.click(screen.getByTestId('drawing-follow-latest-checkbox'))
    expect(h.onSetFollowLatest).toHaveBeenCalledWith('p1', true)
  })

  it('C15 position 工具：非 position 类型选中 → 不显示跟随开关', () => {
    setup({ drawings: [h1], selectedId: 'h1' })
    expect(screen.queryByTestId('drawing-follow-latest-row')).toBeNull()
  })

  it('I2 统计：线/面数量与量度汇总显示', () => {
    const len = createDrawing('measure', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'm1')
    setup({ drawings: [h1, t1, len] })
    expect(screen.getByTestId('drawing-stats')).toBeDefined()
  })

  it('C6 保存模板后闪现「已保存模板」提示', () => {
    vi.useFakeTimers()
    const h = setup({ drawings: [h1], templates: [] })
    fireEvent.change(screen.getByTestId('drawing-template-name'), { target: { value: '我的组合' } })
    fireEvent.click(screen.getByTestId('drawing-template-save'))
    expect(h.onSaveTemplate).toHaveBeenCalledWith('我的组合')
    expect(screen.getByText('已保存模板')).toBeDefined()
    act(() => vi.advanceTimersByTime(1600))
    expect(screen.queryByText('已保存模板')).toBeNull()
    vi.useRealTimers()
  })

})
