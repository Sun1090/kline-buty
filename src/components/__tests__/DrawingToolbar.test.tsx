// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { DrawingToolbar } from '../DrawingToolbar'
import type { DrawingTool } from '../../drawings/logic'

afterEach(cleanup)

const BASE = { tool: 'none' as DrawingTool, onChange: vi.fn(), selected: false, onDeleteSelected: vi.fn() }

describe('DrawingToolbar', () => {
  it('渲染所有画线工具按钮', () => {
    render(<DrawingToolbar {...BASE} />)
    // DRAWING_TOOLS 至少含 none/horizontal/vertical 等
    const toolbar = screen.getByRole('toolbar')
    const btns = toolbar.querySelectorAll('button')
    expect(btns.length).toBeGreaterThan(5)
  })

  it('当前工具按钮有激活态样式（背景 accent）', () => {
    render(<DrawingToolbar {...BASE} tool="none" />)
    const btns = screen.getByRole('toolbar').querySelectorAll('button')
    const active = btns[0] // none 是第一个
    expect(active.style.background).toContain('var(--accent)')
  })

  it('点击工具按钮触发 onChange', () => {
    const onChange = vi.fn()
    render(<DrawingToolbar {...BASE} onChange={onChange} />)
    const btns = screen.getByRole('toolbar').querySelectorAll('button')
    fireEvent.click(btns[1])
    expect(onChange).toHaveBeenCalled()
  })

  it('selected=false → 不渲染删除/编辑按钮', () => {
    render(<DrawingToolbar {...BASE} selected={false} />)
    const btns = screen.getByRole('toolbar').querySelectorAll('button')
    // 只有工具按钮，无删除/编辑
    const labels = [...btns].map((b) => b.textContent)
    expect(labels.some((l) => l === '删除')).toBe(false)
  })

  it('selected=true → 渲染删除按钮，点击触发 onDeleteSelected', () => {
    const onDelete = vi.fn()
    render(<DrawingToolbar {...BASE} selected={true} onDeleteSelected={onDelete} />)
    const delBtn = screen.getByText('删除')
    fireEvent.click(delBtn)
    expect(onDelete).toHaveBeenCalled()
  })

  it('selected=true + onEditSelectedText → 渲染改字按钮', () => {
    const onEdit = vi.fn()
    render(<DrawingToolbar {...BASE} selected={true} onEditSelectedText={onEdit} />)
    const editBtn = screen.getByText('改字')
    fireEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalled()
  })

  it('selected=true 但无 onEditSelectedText → 不渲染改字按钮', () => {
    render(<DrawingToolbar {...BASE} selected={true} />)
    expect(screen.queryByText('改字')).toBeNull()
  })

  it('toolbar 有 role=toolbar 与 aria-label', () => {
    render(<DrawingToolbar {...BASE} />)
    const toolbar = screen.getByRole('toolbar')
    expect(toolbar).toBeDefined()
    expect(toolbar.getAttribute('aria-label')).toBeTruthy()
  })

  it('当前工具按钮 aria-pressed=true，其余 false', () => {
    render(<DrawingToolbar {...BASE} tool="none" />)
    const btns = screen.getByRole('toolbar').querySelectorAll('button')
    const active = btns[0] // none 是首项
    expect(active.getAttribute('aria-pressed')).toBe('true')
    const inactive = btns[1]
    expect(inactive.getAttribute('aria-pressed')).toBe('false')
  })
})
