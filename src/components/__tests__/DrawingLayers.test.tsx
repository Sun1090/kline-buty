// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { DrawingLayers } from '../DrawingLayers'
import { createDrawing, type Drawing } from '../../drawings/logic'
import { createTemplate } from '../../drawings/templates'

afterEach(cleanup)

function setup(overrides: Partial<Parameters<typeof DrawingLayers>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onToggleHidden: vi.fn(),
    onToggleLocked: vi.fn(),
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
    templates: [],
    onSaveTemplate: vi.fn(),
    onApplyTemplate: vi.fn(),
    onDeleteTemplate: vi.fn(),
    onBack: vi.fn(),
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
})
