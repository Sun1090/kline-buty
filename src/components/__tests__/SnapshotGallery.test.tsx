// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SnapshotGallery } from '../SnapshotGallery'
import { saveSnapshot } from '../../utils/snapshotGallery'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const snap = (name: string, symbol = 'BTCUSDT') => ({
  dataUrl: `data:image/png;base64,${'A'.repeat(40)}`,
  name,
  symbol,
  period: '1m',
  width: 800,
  height: 400,
})

describe('SnapshotGallery（I14 图表快照画廊）', () => {
  it('空状态提示', () => {
    render(<SnapshotGallery onClose={() => {}} />)
    expect(screen.getByTestId('snapshot-gallery')).toBeTruthy()
    expect(screen.getByTestId('snapshot-empty')).toBeTruthy()
  })

  it('展示已保存快照并可预览全图', () => {
    saveSnapshot(snap('my-short'), localStorage)
    saveSnapshot(snap('other', 'ETHUSDT'), localStorage)
    render(<SnapshotGallery onClose={() => {}} />)
    expect(screen.getByText('my-short')).toBeTruthy()
    expect(screen.getByText('other')).toBeTruthy()
    fireEvent.click(screen.getByAltText('my-short'))
    expect(screen.getByTestId('snapshot-preview')).toBeTruthy()
  })

  it('删除单张与清空全部', () => {
    const id = saveSnapshot(snap('keep'), localStorage)!
    saveSnapshot(snap('drop'), localStorage)
    render(<SnapshotGallery onClose={() => {}} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    fireEvent.click(screen.getByTestId(`snapshot-delete-${id}`))
    expect(screen.getAllByRole('img')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('snapshot-clear'))
    expect(screen.getByTestId('snapshot-empty')).toBeTruthy()
  })

  it('关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<SnapshotGallery onClose={onClose} />)
    fireEvent.click(screen.getByTestId('snapshot-close'))
    expect(onClose).toHaveBeenCalled()
  })
})