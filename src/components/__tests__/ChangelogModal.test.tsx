// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ChangelogModal } from '../ChangelogModal'

afterEach(cleanup)

describe('ChangelogModal（H5 应用内版本历史）', () => {
  it('渲染版本列表与要点；关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<ChangelogModal onClose={onClose} />)
    expect(screen.getByTestId('changelog-modal')).toBeTruthy()
    expect(screen.getByTestId('changelog-list')).toBeTruthy()
    expect(screen.getByText('v0.4')).toBeTruthy()
    expect(screen.getByText(/周期边界对齐/)).toBeTruthy()
    fireEvent.click(screen.getByTestId('changelog-close'))
    expect(onClose).toHaveBeenCalled()
  })
})