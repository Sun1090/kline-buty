/**
 * 导出 PNG 强制免责声明角标：
 * 图表水印是用户可关闭的视觉偏好，但外发截图属于传播产物，
 * 因此导出时始终补一层轻量合规提示，不依赖水印开关状态。
 */
export interface ExportDisclaimerLayout {
  fontSize: number
  paddingX: number
  paddingY: number
  badge: { x: number; y: number; w: number; h: number }
}

/** 纯布局计算：小图收敛到 9px，大图最高 12px；角标贴右下且保留最小安全边距 */
export function exportDisclaimerLayout(
  width: number,
  height: number,
  textWidth: number,
): ExportDisclaimerLayout {
  const safeW = Math.max(0, width)
  const safeH = Math.max(0, height)
  const safeTextWidth = Math.max(0, textWidth)
  const fontSize = Math.max(9, Math.min(12, safeW * 0.022))
  const paddingX = Math.max(8, fontSize)
  const paddingY = Math.max(4, fontSize * 0.35)
  const margin = 6
  const gap = 8
  const w = safeTextWidth + paddingX * 2
  const h = fontSize + paddingY * 2
  return {
    fontSize,
    paddingX,
    paddingY,
    badge: {
      x: Math.max(margin, safeW - w - gap),
      y: Math.max(margin, safeH - h - margin),
      w,
      h,
    },
  }
}

/** 在已合成图表画布上绘制右下角声明；画布尺寸按 devicePixelRatio 还原为 CSS 尺寸 */
export function drawExportDisclaimer(
  canvas: HTMLCanvasElement,
  text: string,
  devicePixelRatio = window.devicePixelRatio || 1,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || !text || devicePixelRatio <= 0) return

  const width = canvas.width / devicePixelRatio
  const height = canvas.height / devicePixelRatio
  if (width <= 0 || height <= 0) return

  const dpr = devicePixelRatio
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const fontSize = Math.max(9, Math.min(12, width * 0.022))
  ctx.font = `500 ${fontSize}px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'

  const layout = exportDisclaimerLayout(width, height, ctx.measureText(text).width)

  ctx.fillStyle = 'rgba(19,23,34,0.62)'
  ctx.beginPath()
  ctx.roundRect(layout.badge.x, layout.badge.y, layout.badge.w, layout.badge.h, Math.min(7, layout.badge.h / 2))
  ctx.fill()

  ctx.fillStyle = '#d1d4dc'
  ctx.fillText(
    text,
    layout.badge.x + layout.badge.w - layout.paddingX,
    layout.badge.y + layout.badge.h - layout.paddingY,
  )
  ctx.restore()
}

/** 解码截图 → 补声明角标 → 触发下载；解码失败时退回原始截图，不阻断用户导出 */
export async function exportScreenshotWithDisclaimer(
  dataUrl: string,
  fileName: string,
  disclaimer: string,
): Promise<void> {
  let output = dataUrl
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('screenshot decode failed'))
      image.src = dataUrl
    })
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas unavailable')
      ctx.drawImage(image, 0, 0)
      drawExportDisclaimer(canvas, disclaimer)
      output = canvas.toDataURL('image/png')
    }
  } catch {
    output = dataUrl
  }

  const a = document.createElement('a')
  a.href = output
  a.download = fileName
  a.click()
}
