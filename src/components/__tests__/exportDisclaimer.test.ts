// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { drawExportDisclaimer, exportDisclaimerLayout, exportScreenshotWithDisclaimer } from '../exportDisclaimer'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('exportDisclaimerLayout（导出声明布局）', () => {
  it('常规宽度使用 12px 字号，角标贴右下并保留边距', () => {
    const textWidth = 180
    const size = exportDisclaimerLayout(1200, 800, textWidth)
    expect(size.fontSize).toBe(12)
    expect(size.badge.w).toBe(textWidth + size.paddingX * 2)
    expect(size.badge.x).toBe(1200 - size.badge.w - 8)
    expect(size.badge.y).toBe(800 - size.badge.h - 6)
  })

  it('窄截图收敛到最小字号，避免遮挡主图', () => {
    const textWidth = 160
    const size = exportDisclaimerLayout(220, 120, textWidth)
    expect(size.fontSize).toBe(9)
    expect(size.badge.w).toBeGreaterThan(0)
    expect(size.badge.x).toBeGreaterThanOrEqual(6)
    expect(size.badge.y).toBeGreaterThanOrEqual(6)
  })

  it('零尺寸或空文案不产生越界角标', () => {
    const size = exportDisclaimerLayout(0, 0, 100)
    expect(size.badge.w).toBeGreaterThan(0)
    expect(size.badge.x).toBe(6)
    expect(size.badge.y).toBe(6)

    const empty = exportDisclaimerLayout(300, 200, 0)
    expect(empty.badge.w).toBe(empty.paddingX * 2)
  })
})

/** jsdom 无 2d 上下文，构造带 mock ctx 的画布以覆盖绘制路径 */
function mockCtx() {
  return {
    save: vi.fn(),
    setTransform: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
    measureText: (t: string) => ({ width: t.length * 8 }),
  }
}

function mockCanvas() {
  const ctx = mockCtx()
  const canvas = {
    width: 2400,
    height: 1600,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/png;base64,PNGOUT'),
  }
  return { canvas, ctx }
}

describe('drawExportDisclaimer（画布绘制声明角标）', () => {
  it('无 2d 上下文 → 直接返回不抛错', () => {
    const canvas = { width: 100, height: 100, getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement
    expect(() => drawExportDisclaimer(canvas, '免责声明')).not.toThrow()
  })

  it('空文案 / dpr<=0 → 返回不绘制', () => {
    const { canvas, ctx } = mockCanvas()
    drawExportDisclaimer(canvas as unknown as HTMLCanvasElement, '', 2)
    drawExportDisclaimer(canvas as unknown as HTMLCanvasElement, '免责声明', 0)
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('零尺寸画布 → 返回', () => {
    const { ctx } = mockCanvas()
    const tiny = { width: 0, height: 100, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement
    drawExportDisclaimer(tiny, '免责声明', 2)
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('正常绘制：按 devicePixelRatio 还原 CSS 尺寸并写文案', () => {
    const { canvas, ctx } = mockCanvas()
    drawExportDisclaimer(canvas as unknown as HTMLCanvasElement, '免责声明', 2)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(ctx.textAlign).toBe('right')
    expect(ctx.fillText).toHaveBeenCalledWith('免责声明', expect.any(Number), expect.any(Number))
    expect(ctx.restore).toHaveBeenCalled()
  })
})

function mockImage(behavior: { fire?: 'load' | 'error'; w?: number; h?: number } = {}) {
  const { fire = 'load', w = 100, h = 100 } = behavior
  class FakeImage {
    naturalWidth = 0
    naturalHeight = 0
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) {
      this.naturalWidth = w
      this.naturalHeight = h
      if (fire === 'load') this.onload?.()
      else this.onerror?.()
    }
  }
  vi.stubGlobal('Image', FakeImage)
}

/** 截获 document.createElement('canvas') 与 <a>.click，返回点击到的锚点 */
function mockCanvasAndClick() {
  const originalCreate = Document.prototype.createElement
  const clicked: HTMLAnchorElement[] = []
  vi.spyOn(Document.prototype, 'createElement').mockImplementation(function (this: Document, tag: string) {
    if (tag === 'canvas') return mockCanvas().canvas as unknown as HTMLCanvasElement
    return originalCreate.call(this, tag)
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this)
  })
  return clicked
}

describe('exportScreenshotWithDisclaimer（截图补声明并下载）', () => {
  it('解码成功 → 合成画布补声明 → 触发下载', async () => {
    mockImage({ fire: 'load', w: 100, h: 100 })
    const clicked = mockCanvasAndClick()
    await exportScreenshotWithDisclaimer('data:image/png;base64,ORIG', 'chart.png', '免责声明')
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('chart.png')
    expect(clicked[0].href).toContain('PNGOUT') // 走 canvas.toDataURL 合成
  })

  it('解码失败 → 回退原始截图，不阻断下载', async () => {
    mockImage({ fire: 'error' })
    const clicked = mockCanvasAndClick()
    await exportScreenshotWithDisclaimer('data:image/png;base64,ORIG', 'chart.png', '免责声明')
    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toContain('ORIG')
  })

  it('图片尺寸为 0 → 跳过绘制，直接下载原图', async () => {
    mockImage({ fire: 'load', w: 0, h: 0 })
    const clicked = mockCanvasAndClick()
    await exportScreenshotWithDisclaimer('data:image/png;base64,ORIG', 'chart.png', '免责声明')
    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toContain('ORIG')
  })
})
