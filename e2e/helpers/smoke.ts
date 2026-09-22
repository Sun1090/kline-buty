import { expect, type Page } from '@playwright/test'
import 'node:fs'
import { inflateSync } from 'node:zlib'

/**
 * e2e 冒烟规格的共享辅助：实时数据就绪等待、像素带比对、画线锚点寻找。
 * 从 smoke.spec.ts 拆出，供冒烟与画线两个规格共用（6000 行单文件是 E2E 腐化的温床）。
 */

/** 等待蜡烛真正渲染（canvas 出现涨跌色像素）；冷启动直连慢时刷新一次重试，避免环境抖动误报 */
/** 等待盘口数据渲染；冷启动直连慢时刷新重试一次（避免实时数据抖动误报） */
/** 等待深度图数据渲染；冷启动直连慢时刷新重试一次 */
export async function waitDepthReady(page: Page) {
  const openPanel = async () => {
    await openMore(page)
    await page.getByRole('button', { name: '深度' }).click()
    await page.getByTestId('depth-chart').waitFor({ timeout: 20_000 })
  }
  try {
    await openPanel()
  } catch {
    await page.reload()
    await page.waitForFunction(() => document.body.innerText.includes('实时'), { timeout: 30_000 })
    await waitCandlesRendered(page)
    await openPanel()
  }
}

export async function waitOrderBookReady(page: Page) {
  const openPanel = async () => {
    await openMore(page)
    await page.getByRole('button', { name: '盘口', exact: true }).click()
    await page.getByTestId('ob-bid').first().waitFor({ timeout: 20_000 })
    await page.getByTestId('ob-ask').first().waitFor({ timeout: 20_000 })
  }
  try {
    await openPanel()
  } catch {
    await page.reload()
    await page.waitForFunction(() => document.body.innerText.includes('实时'), { timeout: 30_000 })
    await waitCandlesRendered(page)
    await openPanel()
  }
}


/** 最小 PNG 解码器（仅用于测试）：支持 Chromium 截图导出的 8-bit RGBA / 非 interlace 格式 */
export function decodePng(buf: Buffer): { width: number; height: number; data: Uint8Array } {
  expect(buf.subarray(0, 8).toString('latin1')).toBe('\x89PNG\r\n\x1a\n')
  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat: Buffer[] = []
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.subarray(pos + 4, pos + 8).toString('latin1')
    const start = pos + 8
    const end = start + len
    const chunk = buf.subarray(start, end)
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      bitDepth = chunk[8]
      colorType = chunk[9]
      interlace = chunk[12]
    } else if (type === 'IDAT') {
      idat.push(chunk)
    } else if (type === 'IEND') break
    pos = end + 4
  }
  expect(bitDepth).toBe(8)
  expect(colorType).toBe(6)
  expect(interlace).toBe(0)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const data = new Uint8Array(height * stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    const row = y * stride
    for (let x = 0; x < stride; x++) {
      const rawValue = raw[rp++]
      const left = x >= 4 ? data[row + x - 4] : 0
      const up = y > 0 ? data[row - stride + x] : 0
      const upLeft = x >= 4 && y > 0 ? data[row - stride + x - 4] : 0
      let value = rawValue
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      }
      data[row + x] = value & 255
    }
  }
  return { width, height, data }
}

export async function waitCandlesRendered(page: Page) {
  const hasCandles = () =>
    page.waitForFunction(
      () => {
        const cs = [...document.querySelectorAll('canvas')]
        for (const c of cs) {
          try {
            const ctx = c.getContext('2d')
            if (!ctx || c.width < 100) continue
            const d = ctx.getImageData(0, 0, c.width, c.height).data
            for (let i = 0; i < d.length; i += 200) {
              const r = d[i]
              const g = d[i + 1]
              const b = d[i + 2]
              if ((g > 140 && r < 80 && b < 140) || (r > 200 && g < 120 && b < 120)) return true
            }
          } catch {
            /* noop */
          }
        }
        return false
      },
      { timeout: 30_000 },
    )
  try {
    await hasCandles()
  } catch {
    // 首次冷启动直连币安偶发慢：刷新页面重试一次
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await hasCandles()
  }
}


/** 读取主图 canvas 水印带（纵向中心 42% 高度 ±6px，横向 25%–75%）像素，用于验证免责声明水印显隐 */
export async function readChartBand(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')]
      .filter((c) => c.width >= 400 && c.height >= 200)
      .sort((a, b) => b.width * b.height - a.width * a.height)
    const c = cs[0]
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('main chart canvas ctx unavailable')
    const { width: w, height: h } = c
    const y0 = Math.max(0, Math.floor(h * 0.42) - 6)
    const y1 = Math.min(h, Math.floor(h * 0.42) + 6)
    const x0 = Math.floor(w * 0.25)
    const x1 = Math.floor(w * 0.75)
    return Array.from(ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data)
  })
}

/** 两个像素带之间「显著变化」的像素数（RGB 合成差 > 12 记为变化） */
export function countBandDiff(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let n = 0
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    if (d > 12) n++
  }
  return n
}

/** 打开桌面端「更多」折叠面板（其余功能按钮都在里面）；已开则不动 */
export async function openMore(page: Page) {
  const btn = page.getByTestId('header-more')
  const expanded = await btn.getAttribute('aria-expanded')
  if (expanded !== 'true') await btn.click()
}

/** 打开桌面端「画线」折叠面板（画线工具都在里面）；已开则不动 */
export async function openDrawing(page: Page) {
  const btn = page.getByTestId('drawing-toggle')
  const expanded = await btn.getAttribute('aria-expanded')
  if (expanded !== 'true') await btn.click()
}

/** 扫描画线 overlay 画布，返回黄色线条像素的几何中点（CSS 坐标，含容器偏移） */
export async function findDrawnLineCenter(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    const dpr = window.devicePixelRatio || 1
    const rect = overlay.getBoundingClientRect()
    let sx = 0
    let sy = 0
    let n = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = img[i]
        const g = img[i + 1]
        const b = img[i + 2]
        const a = img[i + 3]
        // 画线像素：主题黄 #f5c02f 或选中蓝 #4e9cf5（含抗锯齿容差）
        const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
        const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
        if (yellow || blue) {
          sx += x / dpr
          sy += y / dpr
          n++
        }
      }
    }
    if (!n) return null
    return { x: rect.left + sx / n, y: rect.top + sy / n }
  })
}

/** 扫描画线 overlay，返回蓝色选中锚点的位置：which='max' 取最右侧（尾锚点），'min' 取最左侧（首锚点） */
export async function findDrawingAnchor(
  page: Page,
  which: 'max' | 'min',
): Promise<{ x: number; y: number } | null> {
  return page.evaluate((w) => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    const dpr = window.devicePixelRatio || 1
    const rect = overlay.getBoundingClientRect()
    const pts: { x: number; y: number }[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = img[i]
        const g = img[i + 1]
        const b = img[i + 2]
        const a = img[i + 3]
        // 选中蓝 #4e9cf5（含抗锯齿容差）
        if (a > 100 && b > 190 && g > 110 && g < 200 && r < 130) pts.push({ x: x / dpr, y: y / dpr })
      }
    }
    if (!pts.length) return null

    // 选中锚点是实心半径 3px 圆点；线条通常只有 1-2px。用积分图统计每个点
    // 周围 9×9 蓝色像素数，圆形锚点会形成显著高密度中心，从而与细线区分。
    const gw = Math.ceil(width / dpr) + 1
    const gh = Math.ceil(height / dpr) + 1
    const integral = new Uint32Array(gw * gh)
    for (const p of pts) {
      const gx = Math.min(gw - 1, Math.max(0, Math.round(p.x)))
      const gy = Math.min(gh - 1, Math.max(0, Math.round(p.y)))
      integral[gy * gw + gx]++
    }
    for (let y = 1; y < gh; y++) {
      let rowSum = 0
      for (let x = 1; x < gw; x++) {
        rowSum += integral[y * gw + x]
        integral[y * gw + x] = rowSum + integral[(y - 1) * gw + x]
      }
    }
    const boxCount = (x: number, y: number) => {
      const x0 = Math.max(0, x - 4)
      const y0 = Math.max(0, y - 4)
      const x1 = Math.min(gw - 1, x + 4)
      const y1 = Math.min(gh - 1, y + 4)
      return integral[y1 * gw + x1] - integral[y0 * gw + x1] - integral[y1 * gw + x0] + integral[y0 * gw + x0]
    }
    type Candidate = { x: number; y: number; score: number }
    const candidates: Candidate[] = []
    for (const p of pts) {
      const gx = Math.round(p.x)
      const gy = Math.round(p.y)
      const score = boxCount(gx, gy)
      // 半径 3 圆点约 28+ 像素；1-2px 线条在 9×9 内通常远低于该阈值。
      if (score >= 28) candidates.push({ x: p.x, y: p.y, score })
    }
    if (!candidates.length) return null

    // 按密度排序后做贪心邻近聚类，避免固定网格把同一圆点切到两个桶。
    type Group = { sx: number; sy: number; n: number }
    const groups: Group[] = []
    for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
      const group = groups.find(
        (g) => Math.hypot(g.sx / g.n - candidate.x, g.sy / g.n - candidate.y) <= 3,
      )
      if (!group) {
        groups.push({ sx: candidate.x, sy: candidate.y, n: 1 })
        continue
      }
      group.sx += candidate.x
      group.sy += candidate.y
      group.n++
    }
    groups.sort((a, b) => (w === 'max' ? b.sx / b.n - a.sx / a.n : a.sx / a.n - b.sx / b.n))
    const target = groups[0]
    return { x: rect.left + target.sx / target.n, y: rect.top + target.sy / target.n }
  }, which)
}

/** 扫描价格带选中态锚点：先由横贯边框定位两条 y，再在边框附近找圆形锚点；which=max 取下边框，min 取上边框 */
export async function findHorizontalBandAnchor(page: Page, which: 'min' | 'max') {
  return page.evaluate((w) => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    // overlay 已按 dpr setTransform，设备像素坐标就是 adapter 的容器 CSS 坐标。
    const pts: { x: number; y: number }[] = []
    const rowCount = new Map<number, number>()
    for (let pixel = 0; pixel < width * height; pixel++) {
      const i = pixel * 4
      if (img[i + 3] > 80 && img[i] < 130 && img[i + 1] > 110 && img[i + 1] < 200 && img[i + 2] > 190) {
        const x = pixel % width
        const y = Math.floor(pixel / width)
        pts.push({ x, y })
        rowCount.set(y, (rowCount.get(y) ?? 0) + 1)
      }
    }
    if (!pts.length) {
      return null
    }

    // 横贯边框：单行蓝色像素覆盖大部分宽度；相邻行聚成上下两条边。
    const borderRows = [...rowCount.entries()]
      .filter(([, n]) => n > width * 0.35)
      .map(([y]) => y)
      .sort((a, b) => a - b)
    const groups: number[][] = []
    for (const y of borderRows) {
      const g = groups[groups.length - 1]
      if (!g || y - g[g.length - 1] > 4) groups.push([y])
      else g.push(y)
    }
    if (groups.length < 2) return null

    // 锚点不是边框端点：它画在该锚点价格的时间投影处，且是边框附近的局部圆点。
    // 按列统计边框附近像素，找显著高于横线的局部 blob；不能取最右端（那里只是边框）。
    const centers = groups.map((g) => {
      const cy = g.reduce((sum, y) => sum + y, 0) / g.length
      const near = pts.filter((p) => Math.abs(p.y - cy) <= 8)
      if (!near.length) return null
      const columns = new Map<number, number>()
      for (const p of near) columns.set(p.x, (columns.get(p.x) ?? 0) + 1)
      const candidates = [...columns.entries()]
        .filter(([, n]) => n >= 3)
        .map(([x, n]) => ({ x, n, score: n * (1 + x / width) }))
      if (!candidates.length) return null
      // 右侧优先，避免左侧价格标签干扰；阈值只排除普通 1-2px 边框线。
      candidates.sort((a, b) => b.score - a.score)
      const target = candidates[0]
      const blob = near.filter((p) => Math.abs(p.x - target.x) <= 4)
      return {
        x: blob.reduce((sum, p) => sum + p.x, 0) / blob.length,
        y: blob.reduce((sum, p) => sum + p.y, 0) / blob.length }
    }).filter((v): v is { x: number; y: number } => v !== null)
    if (centers.length < 2) return null
    return w === 'max' ? centers[centers.length - 1] : centers[0]
  }, which)
}

/** 扫描时间区间选中态锚点：先由竖贯边框定位两条 x，再在边框附近找圆形锚点；which=max 取右边框 */
export async function findVerticalBandAnchor(page: Page, which: 'min' | 'max') {
  return page.evaluate((w) => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    // overlay 已按 dpr setTransform，设备像素坐标就是 adapter 的容器 CSS 坐标。
    const pts: { x: number; y: number }[] = []
    const colCount = new Map<number, number>()
    for (let pixel = 0; pixel < width * height; pixel++) {
      const i = pixel * 4
      if (img[i + 3] > 80 && img[i] < 130 && img[i + 1] > 110 && img[i + 1] < 200 && img[i + 2] > 190) {
        const x = pixel % width
        const y = Math.floor(pixel / width)
        pts.push({ x, y })
        colCount.set(x, (colCount.get(x) ?? 0) + 1)
      }
    }
    if (!pts.length) {
      return null
    }

    // 竖贯边框：单列蓝色像素覆盖大部分高度；相邻列聚成左右两条边。
    const borderCols = [...colCount.entries()]
      .filter(([, n]) => n > height * 0.35)
      .map(([x]) => x)
      .sort((a, b) => a - b)
    const groups: number[][] = []
    for (const x of borderCols) {
      const g = groups[groups.length - 1]
      if (!g || x - g[g.length - 1] > 4) groups.push([x])
      else g.push(x)
    }
    if (groups.length < 2) return null

    // 锚点不是边框端点：它画在该锚点时间的价格投影处，且是边框附近的局部圆点。
    // 按行统计边框附近像素，找显著高于竖线的局部 blob；不能取最上端（那里只是边框）。
    const centers = groups.map((g) => {
      const cx = g.reduce((sum, x) => sum + x, 0) / g.length
      const near = pts.filter((p) => Math.abs(p.x - cx) <= 8)
      if (!near.length) return null
      const rows = new Map<number, number>()
      for (const p of near) rows.set(p.y, (rows.get(p.y) ?? 0) + 1)
      const candidates = [...rows.entries()]
        .filter(([, n]) => n >= 3)
        .map(([y, n]) => ({ y, n, score: n * (1 + y / height) }))
      if (!candidates.length) return null
      // 底部优先，避免顶部日期标签干扰；阈值只排除普通 1-2px 边框线。
      candidates.sort((a, b) => b.score - a.score)
      const target = candidates[0]
      const blob = near.filter((p) => Math.abs(p.y - target.y) <= 4)
      return {
        x: blob.reduce((sum, p) => sum + p.x, 0) / blob.length,
        y: blob.reduce((sum, p) => sum + p.y, 0) / blob.length }
    }).filter((v): v is { x: number; y: number } => v !== null)
    if (centers.length < 2) return null
    centers.sort((a, b) => a.x - b.x)
    return w === 'max' ? centers[centers.length - 1] : centers[0]
  }, which)
}

/** 在图表容器上派发鼠标 PointerEvent 手势；坐标使用容器本地坐标，避免窗口坐标二次换算。 */
export async function dragContainerPointer(page: Page, x: number, y: number, dx: number, dy: number) {
  await page.evaluate(({ x, y, dx, dy }) => {
    const chart = document.querySelector('main .chart-container') as HTMLElement | null
    if (!chart) return
    const rect = chart.getBoundingClientRect()
    const fire = (type: string, tx: number, ty: number) =>
      chart.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          clientX: rect.left + tx,
          clientY: rect.top + ty,
          button: type === 'pointermove' ? -1 : 0,
          buttons: type === 'pointerup' ? 0 : 1 }),
      )
    fire('pointermove', x, y)
    const down = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: rect.left + x,
      clientY: rect.top + y,
      button: 0,
      buttons: 1 })
    chart.dispatchEvent(down)
    fire('pointermove', x + Math.max(1, dx), y + Math.max(1, dy))
    fire('pointerup', x + Math.max(1, dx), y + Math.max(1, dy))
  }, { x, y, dx, dy })
}

/** 扫描横贯水平线上的圆形锚点：先定位横线，再在横线附近找局部蓝色圆点 */
export async function findHorizontalLineAnchor(page: Page, which: 'min' | 'max') {
  return page.evaluate((w) => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    const pts: { x: number; y: number }[] = []
    const rowCount = new Map<number, number>()
    for (let pixel = 0; pixel < width * height; pixel++) {
      const i = pixel * 4
      if (img[i + 3] > 80 && img[i] < 130 && img[i + 1] > 110 && img[i + 1] < 200 && img[i + 2] > 190) {
        const x = pixel % width
        const y = Math.floor(pixel / width)
        pts.push({ x, y })
        rowCount.set(y, (rowCount.get(y) ?? 0) + 1)
      }
    }
    // 横贯线：单行蓝色像素覆盖大部分宽度；相邻行聚成候选 y。
    const rows = [...rowCount.entries()]
      .filter(([, n]) => n > width * 0.35)
      .map(([y]) => y)
      .sort((a, b) => a - b)
    const groups: number[][] = []
    for (const y of rows) {
      const group = groups[groups.length - 1]
      if (!group || y - group[group.length - 1] > 4) groups.push([y])
      else group.push(y)
    }
    const centers = groups.map((group) => {
      const cy = group.reduce((sum, y) => sum + y, 0) / group.length
      const near = pts.filter((p) => Math.abs(p.y - cy) <= 8)
      if (!near.length) return null
      const columns = new Map<number, number>()
      for (const p of near) columns.set(p.x, (columns.get(p.x) ?? 0) + 1)
      // 圆点列高约 5-7px，普通横线只有 1-3px。
      const candidates = [...columns.entries()]
        .filter(([, n]) => n >= 4)
        .map(([x, n]) => ({ x, n, score: n * (1 + x / width) }))
      if (!candidates.length) return null
      candidates.sort((a, b) => b.score - a.score)
      const target = candidates[0]
      const blob = near.filter((p) => Math.abs(p.x - target.x) <= 4)
      return {
        x: blob.reduce((sum, p) => sum + p.x, 0) / blob.length,
        y: blob.reduce((sum, p) => sum + p.y, 0) / blob.length }
    }).filter((v): v is { x: number; y: number } => v !== null)
    if (!centers.length) return null
    centers.sort((a, b) => a.y - b.y)
    return w === 'max' ? centers[centers.length - 1] : centers[0]
  }, which)
}

/**
 * 拖拽选中画线的指定锚点（min=首锚点/max=尾锚点），直到 verify 通过或重试耗尽。
 * 实时行情会平移图表，扫描-拖拽存在竞态：失败则重新扫描（必要时点选线中心重新选中）再拖。
 */
export async function dragSelectedAnchorUntil(
  page: Page,
  which: 'min' | 'max',
  dx: number,
  dy: number,
  verify: () => Promise<boolean>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let anchor = await findDrawingAnchor(page, which)
    if (!anchor) {
      // 画线可能被取消选中：点选线中心重新选中
      const center = await findDrawnLineCenter(page)
      if (center) {
        await page.mouse.move(center.x, center.y)
        await page.mouse.click(center.x, center.y)
        await page.waitForTimeout(300)
        anchor = await findDrawingAnchor(page, which)
      }
      if (!anchor) {
        await page.waitForTimeout(500)
        continue
      }
    }
    await page.mouse.move(anchor.x, anchor.y)
    await page.mouse.down()
    await page.mouse.move(anchor.x + dx, anchor.y + dy, { steps: 4 })
    await page.mouse.up()
    // 轮询提交结果（最多 3s）
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500)
      if (await verify()) return true
    }
  }
  return false
}
