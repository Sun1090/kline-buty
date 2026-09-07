// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DocsIndexModal } from '../DocsIndexModal'

afterEach(cleanup)

describe('DocsIndexModal（H3 应用内文档索引）', () => {
  it('渲染文档条目链接；关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<DocsIndexModal onClose={onClose} />)
    expect(screen.getByTestId('docs-index-modal')).toBeTruthy()
    expect(screen.getByTestId('docs-index-list')).toBeTruthy()
    // 知识库链接使用 BASE_URL（相对）
    const kb = screen.getByTestId('docs-link-交易知识库')
    expect(kb.getAttribute('href')).toContain('knowledge/')
    // 外部链接新标签打开
    const repo = screen.getByTestId('docs-link-GitHub 仓库')
    expect(repo.getAttribute('target')).toBe('_blank')
    fireEvent.click(screen.getByTestId('docs-index-close'))
    expect(onClose).toHaveBeenCalled()
  })
})