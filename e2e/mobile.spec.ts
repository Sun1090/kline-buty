import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// 注意：不用 isMobile（会锁定文档滚动，无法验证「拖动图表不滚动页面」）；hasTouch 已提供触摸事件
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

/** 等待蜡烛真正渲染（canvas 出现涨跌色像素）；冷启动直连慢时刷新一次重试 */
async function waitCandlesRendered(page: import('@playwright/test').Page) {
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

test('移动端：K 线渲染 + 触摸拖动图表不滚动页面', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible({ timeout: 15_000 })

  // 图表容器及其内部包装层 touch-action: none → 触摸平移/双指缩放归图表
  const ta = await canvas.locator('xpath=..').evaluate((el) => getComputedStyle(el).touchAction)
  expect(ta).toBe('none')
  const taRoot = await page.locator('.chart-container').first().evaluate((el) => getComputedStyle(el).touchAction)
  expect(taRoot).toBe('none')
  // 页面禁回弹/下拉刷新
  const ob = await page.evaluate(() => getComputedStyle(document.body).overscrollBehavior)
  expect(ob).toContain('none')

  // 模拟页面可滚动：body 拉高后滚到 100px，再在图表上垂直触摸拖动 → 页面不得被带滚
  await page.evaluate(() => { document.body.style.height = '250%' })
  await page.evaluate(() => window.scrollTo(0, 100))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cx, y: cy + i * 20 }],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
  // touch-action: none 生效 → 垂直拖动不滚动页面
  const sy = await page.evaluate(() => window.scrollY)
  expect(sy).toBe(100)
})

test('移动端：切换周期/指标按钮可点（触摸友好）', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: '1分' }).tap()
  await page.waitForTimeout(800)
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  // 切换指标（副图菜单 → MACD）不报错
  await page.getByTestId('mobile-menu-sub').tap()
  await page.getByRole('button', { name: 'MACD', exact: true }).tap()
  await page.waitForTimeout(600)
  await expect(canvas).toBeVisible()
  expect(errs).toHaveLength(0)
})

test('移动端：周期条换行展示——无横向滚动条、全部周期可见、末尾周期可点', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const bar = page.getByTestId('period-bar')
  await expect(bar).toBeVisible()
  const style = await bar.evaluate((el) => ({
    flexWrap: getComputedStyle(el).flexWrap,
    overflowX: getComputedStyle(el).overflowX,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
  }))
  // 换行展示：flexWrap=wrap、无横向滚动（不出现任何滚动条）
  expect(style.flexWrap).toBe('wrap')
  expect(style.overflowX).toBe('visible')
  // 14 个周期全部直接可见（内容不超出容器宽度，scrollW <= clientW）
  expect(bar.locator('button')).toHaveCount(14)
  expect(style.scrollW).toBeLessThanOrEqual(style.clientW)
  // 页面无横向滚动条
  const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth)
  expect(noHScroll).toBe(true)
  // 末尾周期「月」直接可见（无需滚动/翻页）→ tap 选中
  const month = page.getByRole('button', { name: '月', exact: true })
  await month.tap()
  await page.waitForTimeout(400)
  const bg = await month.evaluate((el) => (el as HTMLElement).style.background)
  expect(bg).toContain('var(--accent)')
})

test('移动端：触屏拖动十字光标（OHLC 可读；松手保留 2s，轻点立即清 / 超时自动清）', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  // 等蜡烛渲染（出现涨跌色像素）；冷启动直连慢时刷新重试一次
  const hasCandles = () =>
    page.waitForFunction(
      () => {
        for (const c of document.querySelectorAll('canvas')) {
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
    await page.reload()
    await page.waitForTimeout(4000)
  }

  // 统计主图 pane 的 z-index:2 canvas（series + 十字光标层）上十字光标色像素数
  const countCrosshair = () =>
    page.evaluate(() => {
      let best: HTMLCanvasElement | null = null
      let bestArea = 0
      for (const c of document.querySelectorAll('canvas')) {
        const st = getComputedStyle(c)
        if (st.position !== 'absolute' || st.zIndex !== '2') continue
        const r = c.getBoundingClientRect()
        const a = r.width * r.height
        if (a > bestArea) {
          bestArea = a
          best = c
        }
      }
      if (!best) return 0
      const ctx = best.getContext('2d')
      if (!ctx) return 0
      const d = ctx.getImageData(0, 0, best.width, best.height).data
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        // 默认十字光标色 rgb(149,152,161) ± 容差
        if (Math.abs(r - 149) < 12 && Math.abs(g - 152) < 12 && Math.abs(b - 161) < 12) n++
      }
      return n
    })

  const before = await countCrosshair()
  expect(before).toBeLessThan(50)
  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const dragMove = async (dx: number, dy: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx + (dx * i) / 6, y: cy + (dy * i) / 6 }],
      })
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(300)
  }

  // 第一次：拖出十字光标 → 松手保留 2s → 超时自动清除
  await dragMove(60, 0)
  const during = await countCrosshair()
  // 拖动中十字光标出现（贯穿主图，像素数明显）
  expect(during).toBeGreaterThan(200)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  // 松手 ~500ms 仍保留（便于读 OHLC）
  await page.waitForTimeout(500)
  const linger = await countCrosshair()
  expect(linger).toBeGreaterThan(200)
  // 距松手已过 ~2.7s → 自动清除
  await page.waitForTimeout(2200)
  const autoCleared = await countCrosshair()
  expect(autoCleared).toBeLessThan(50)

  // 第二次：拖出十字光标 → 松手保留期间轻点 → 立即清除
  await dragMove(60, 0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
  expect(await countCrosshair()).toBeGreaterThan(200)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(300)
  const tapCleared = await countCrosshair()
  expect(tapCleared).toBeLessThan(50)
  expect(errs).toHaveLength(0)
})

test('移动端：两次快速拖动不误判双击复位（pointer capture 提前释放防护）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const box = await page.locator('main div').first().boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const cx = box.x + box.width * 0.5
  const cy = box.y + box.height * 0.5

  // 捏合后进入手动比例；若快速拖动被误判双击，价格轴会回自适应并造成明显位移
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 40, y: cy },
      { x: cx + 40, y: cy },
    ],
  })
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: cx - 40 - i * 8, y: cy },
        { x: cx + 40 + i * 8, y: cy },
      ],
    })
    await page.waitForTimeout(25)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(300)

  // 记录两次拖动后的画线位置：水平线锚定固定价格，是比例被复位的敏感信号。
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '水平线', exact: true }).tap()
  await page.waitForTimeout(200)
  await page.mouse.click(cx, cy - box.height * 0.08)
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '鼠标', exact: true }).tap()
  await page.waitForTimeout(300)

  const lineY = () =>
    page.evaluate(() => {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => {
        const st = getComputedStyle(c)
        return st.position === 'absolute' && st.zIndex === '5'
      })
      if (!overlay) return null
      const ctx = overlay.getContext('2d')
      if (!ctx) return null
      const { width, height } = overlay
      const data = ctx.getImageData(0, 0, width, height).data
      const rect = overlay.getBoundingClientRect()
      let sum = 0
      let count = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
          // 水平线主题黄 #f5c02f；只统计画线像素，避免把图表底色计入中点
          if (a > 100 && r > 190 && g > 130 && g < 235 && b < 110) {
            sum += y / (window.devicePixelRatio || 1)
            count++
          }
        }
      }
      return count ? rect.top + sum / count : null
    })
  await expect.poll(lineY, { timeout: 5000 }).not.toBeNull()
  const before = (await lineY())!

  // 关键回归场景：触摸 pointer capture 在 touchend 前释放，两次拖动间隔仅 30ms。
  for (let k = 0; k < 2; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
    for (let i = 1; i <= 4; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx - i * 14, y: cy }],
      })
      await page.waitForTimeout(20)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(400)

  const after = await lineY()
  expect(after).not.toBeNull()
  expect(Math.abs(after! - before)).toBeLessThan(12)
  expect(errors).toHaveLength(0)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
})

test('移动端：捏合残留单指不产生十字线、不误触发双击复位', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  const chart = page.locator('main div').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const cx = box.x + box.width * 0.5
  const cy = box.y + box.height * 0.5

  const countCrosshair = () =>
    page.evaluate(() => {
      let best: HTMLCanvasElement | null = null
      let bestArea = 0
      for (const c of document.querySelectorAll('canvas')) {
        const st = getComputedStyle(c)
        if (st.position !== 'absolute' || st.zIndex !== '2') continue
        const area = c.getBoundingClientRect().width * c.getBoundingClientRect().height
        if (area > bestArea) {
          bestArea = area
          best = c
        }
      }
      if (!best) return 0
      const d = best.getContext('2d')!.getImageData(0, 0, best.width, best.height).data
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - 149) < 12 && Math.abs(d[i + 1] - 152) < 12 && Math.abs(d[i + 2] - 161) < 12) n++
      }
      return n
    })

  // 双指张开；先抬起一指，保留另一根短触后抬起
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 40, y: cy },
      { x: cx + 40, y: cy },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: cx - 70, y: cy },
      { x: cx + 70, y: cy },
    ],
  })
  await page.waitForTimeout(80)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: cx - 70, y: cy }],
  })
  await page.waitForTimeout(30)
  expect(await countCrosshair()).toBeLessThan(50)

  // 残留指快速抬起 + 立即第二次轻点：不得被误判成双击复位（用图表平移位置稳定性近似验证）
  const scrollBefore = await page.evaluate(() => {
    const pane = document.querySelector('.tv-lightweight-charts') as HTMLElement | null
    return pane ? pane.getBoundingClientRect().left : null
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(350)
  expect(await countCrosshair()).toBeLessThan(50)
  expect(errors).toHaveLength(0)
  expect(scrollBefore).not.toBeNull()
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
})

test('移动端：五语 UI 完整（html lang 同步 + MobileHeader 弹层无 i18n 键泄漏）', async ({ page }) => {
  // 语言代码 → 期望 html lang / 更多按钮文案
  const LANGS: [string, string, string][] = [
    ['zh-CN', 'zh-CN', '更多'],
    ['en', 'en', 'More'],
    ['ja', 'ja', 'その他'],
    ['ko', 'ko', '더보기'],
    ['es', 'es', 'Más'],
  ]
  // i18n 词典顶层键前缀：命中说明有未翻译键泄漏到 UI
  const leakRe =
    /\b(?:common|status|chartType|group|period|lang|theme|layout|fullscreen|panel|sentiment|share|replay|drawing|symbol|indicator|stats|position|alert|tooltip|depth|orderBook|trade|quickOrder|volumeProfile|offline|errorBoundary|shortcuts|app)\.[a-zA-Z0-9_.]+\b/

  for (const [code, htmlLang, moreLabel] of LANGS) {
    await page.goto('/')
    await page.evaluate((l) => localStorage.setItem('kline-buty:lang', l), code)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('BTC/USDT', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    // html lang 与语言同步
    expect(await page.evaluate(() => document.documentElement.lang)).toBe(htmlLang)
    // 更多弹层：含本语「更多」文案 + 无键泄漏
    await page.getByTestId('mobile-more').tap()
    await page.waitForTimeout(600)
    const moreText = await page.getByTestId('mobile-panel-more').innerText()
    expect(moreText).toContain(moreLabel)
    expect(moreText).not.toMatch(leakRe)
    // 画线弹层：无键泄漏
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.waitForTimeout(500)
    const drawText = await page.getByTestId('mobile-panel-drawing').innerText()
    expect(drawText).not.toMatch(leakRe)
    // 类型弹层：无键泄漏
    await page.getByTestId('mobile-menu-type').tap()
    await page.waitForTimeout(400)
    const typeText = await page.getByTestId('mobile-panel-type').innerText()
    expect(typeText).not.toMatch(leakRe)
    // 关闭面板（点图表区域）
    await page.touchscreen.tap(195, 700)
    await page.waitForTimeout(300)
  }
})

test('移动端：更多面板切价格坐标轴（线性 → 对数）→ 持久化', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByText('BTC/USDT', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  // 打开更多面板 → 点「线性」切到「对数」
  await page.getByTestId('mobile-more').tap()
  await page.waitForTimeout(600)
  const panel = page.getByTestId('mobile-panel-more')
  await expect(panel.getByText('线性')).toBeVisible()
  await panel.getByText('线性').tap()
  await page.waitForTimeout(400)
  // 刷新后保持对数（localStorage 持久化）
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('BTC/USDT', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('mobile-more').tap()
  await page.waitForTimeout(600)
  await expect(page.getByTestId('mobile-panel-more').getByText('对数')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('移动端：触屏拖拽绘制水平线 → 落库 + overlay 渲染 → 删除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  // 等蜡烛渲染（出现涨跌色像素）
  await page.waitForFunction(
    () => {
      for (const c of document.querySelectorAll('canvas')) {
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
  // 打开画线弹层 → 选水平线
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '水平线', exact: true }).tap()
  await page.waitForTimeout(300)
  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  // 触屏拖拽绘制（Chromium 由 touch 合成 pointer 事件 → adapter 画线提交）
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const x0 = box.x + box.width * 0.3
  const y0 = box.y + box.height * 0.35
  const x1 = box.x + box.width * 0.7
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 }],
    })
    await page.waitForTimeout(30)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(600)

  // 落库：type=horizontal、单锚点
  const saved = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      const arr = Object.values(d)[0] as { type: string; points: { time: number; price: number }[] }[]
      return arr[0] ?? null
    } catch {
      return null
    }
  })
  expect(saved).not.toBeNull()
  expect(saved!.type).toBe('horizontal')
  // 单点工具：水平线只落 1 个锚点（price 固定，time 由绘制点决定）
  expect(saved!.points).toHaveLength(1)

  // overlay 渲染：画线像素数 > 50（水平线带黄色价格标签）
  const drawnPx = await page.evaluate(() => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return 0
    const ctx = overlay.getContext('2d')
    if (!ctx) return 0
    const d = ctx.getImageData(0, 0, overlay.width, overlay.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const a = d[i + 3]
      if (a > 100 && r > 190 && g > 130 && g < 235 && b < 110) n++
    }
    return n
  })
  expect(drawnPx).toBeGreaterThan(50)

  // 重开画线弹层 → 删除（绘制完成自动选中）
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByTestId('drawing-layers-open').tap()
  await page.getByTestId('drawing-layer-clear').tap()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d)[0]?.length ?? -1
    } catch {
      return -2
    }
  })
  expect(after).toBe(0)
  expect(errors).toHaveLength(0)
})

test('移动端：触屏绘制文本标注 → 移动端浮层输入 → 确定 → 删除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  // 等蜡烛渲染（出现涨跌色像素）
  await page.waitForFunction(
    () => {
      for (const c of document.querySelectorAll('canvas')) {
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
  // 打开画线弹层 → 选文本标注
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '文本', exact: true }).tap()
  await page.waitForTimeout(300)
  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  // 触屏轻点放置（单点工具：touch 合成 pointerdown/up → 提交 → 打开移动端文本浮层）
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const x = box.x + box.width * 0.5
  const y = box.y + box.height * 0.4
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(400)

  // 移动端文本编辑浮层出现 → 输入 → 确定
  await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('mobile-text-input').fill('关键位')
  await page.getByTestId('mobile-text-confirm').tap()
  await page.waitForTimeout(300)

  // 落库：type=text + 文本内容
  const saved = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      const arr = Object.values(d)[0] as { type: string; text?: string }[]
      return arr[0] ?? null
    } catch {
      return null
    }
  })
  expect(saved).not.toBeNull()
  expect(saved!.type).toBe('text')
  expect(saved!.text).toBe('关键位')

  // 重开画线弹层 → 删除（提交后自动选中）
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByTestId('drawing-layers-open').tap()
  await page.getByTestId('drawing-layer-clear').tap()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d)[0]?.length ?? -1
    } catch {
      return -2
    }
  })
  expect(after).toBe(0)
  expect(errors).toHaveLength(0)
})

test('移动端：触屏拖拽绘制通道 → 落库（2 锚点）+ overlay 渲染 → 删除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(
    () => {
      for (const c of document.querySelectorAll('canvas')) {
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
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '平行通道', exact: true }).tap()
  await page.waitForTimeout(300)
  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  // 触屏拖拽 A→B（两点工具：按下=起点，释放=终点）
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const x0 = box.x + box.width * 0.25
  const y0 = box.y + box.height * 0.3
  const x1 = box.x + box.width * 0.7
  const y1 = box.y + box.height * 0.65
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6 }],
    })
    await page.waitForTimeout(30)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(600)

  // 落库：type=channel、2 锚点
  const saved = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      const arr = Object.values(d)[0] as { type: string; points: { time: number; price: number }[] }[]
      return arr[0] ?? null
    } catch {
      return null
    }
  })
  expect(saved).not.toBeNull()
  expect(saved!.type).toBe('channel')
  expect(saved!.points).toHaveLength(2)

  // overlay 渲染：提交后自动选中 → 选中色 #4e9cf5 画线像素数 > 50
  const drawnPx = await page.evaluate(() => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return 0
    const ctx = overlay.getContext('2d')
    if (!ctx) return 0
    const d = ctx.getImageData(0, 0, overlay.width, overlay.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const a = d[i + 3]
      // 选中色 #4e9cf5（r≈78 g≈156 b≈245，抗锯齿容差 ±12）
      if (a > 100 && r > 66 && r < 90 && g > 144 && g < 168 && b > 233 && b < 255) n++
    }
    return n
  })
  expect(drawnPx).toBeGreaterThan(50)

  // 重开画线弹层 → 删除
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByTestId('drawing-layers-open').tap()
  await page.getByTestId('drawing-layer-clear').tap()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d)[0]?.length ?? -1
    } catch {
      return -2
    }
  })
  expect(after).toBe(0)
  expect(errors).toHaveLength(0)
})

test('移动端：触屏拖拽区域截图 → 导出选区 PNG + 手势结束自动退出框选', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)

  // 进入桌面/移动共用的区域截图模式；提示条出现说明 adapter 已接管手势
  await page.getByRole('button', { name: '框选' }).tap()
  const hint = page.getByText('拖拽', { exact: false })
  await expect(hint).toBeVisible()

  // CDP 触摸更贴近真机：touchstart/move/end 应驱动区域选择，而不是图表平移
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const x0 = box.x + box.width * 0.25
  const y0 = box.y + box.height * 0.3
  const x1 = box.x + box.width * 0.65
  const y1 = box.y + box.height * 0.55
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
      for (let i = 1; i <= 6; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6 }],
        })
        await page.waitForTimeout(30)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    })(),
  ])
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })

  // 选区导出与桌面同构：文件名含周期，PNG 头有效且不是全图空导出
  expect(download.suggestedFilename()).toMatch(/^BTCUSDT_1m_region\.png$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const buf = readFileSync(path!)
  expect(buf.subarray(0, 4).toString('latin1')).toBe('\x89PNG')
  expect(buf.length).toBeGreaterThan(1024)

  // 抬起最后一指后自动退出，后续单指拖动恢复常规图表手势
  await expect(hint).toHaveCount(0)
  expect(errors).toHaveLength(0)
})


test('移动端：OHLC 十字光标浮层防溢出——长按底部区域翻转到手指上方、始终完整落在视口内', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          for (const c of document.querySelectorAll('canvas')) {
            const ctx = c.getContext('2d')
            if (!ctx || c.width < 100) continue
            const d = ctx.getImageData(0, 0, c.width, c.height).data
            for (let i = 0; i < d.length; i += 200) {
              if ((d[i + 1] > 140 && d[i] < 80 && d[i + 2] < 140) || (d[i] > 200 && d[i + 1] < 120 && d[i + 2] < 120)) return true
            }
          }
          return false
        }),
      { timeout: 30_000 },
    )
    .toBe(true)

  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

  const findTooltip = () =>
    page.evaluate(() => {
      let best: { top: number; bottom: number } | null = null
      let bestArea = Infinity
      for (const el of document.querySelectorAll('div')) {
        const st = getComputedStyle(el)
        if (st.position !== 'absolute') continue
        const txt = el.textContent || ''
        if (!txt.includes('开') || !txt.includes('收')) continue
        const r = el.getBoundingClientRect()
        const area = r.width * r.height
        if (area > 0 && area < bestArea && r.height < 400 && r.width < 400) {
          bestArea = area
          best = { top: r.top, bottom: r.bottom }
        }
      }
      return best
    })

  const probe = async (y: number) => {
    const x = box.x + box.width / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    // 长按钉线阈值 250ms；等 500ms 覆盖 CI 中触摸事件调度抖动
    await page.waitForTimeout(500)
    const tip = await findTooltip()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(2400) // 等松手保留期过期，避免串扰
    return tip
  }

  // 长按底部（贴近下沿）→ 浮层翻转在手指上方且完整可见
  const bottomTip = await probe(box.y + box.height - 30)
  expect(bottomTip).not.toBeNull()
  expect(bottomTip!.top).toBeGreaterThanOrEqual(0)
  expect(bottomTip!.bottom).toBeLessThanOrEqual(page.viewportSize()!.height)

  // 中部 → 仍位于手指下方且完整可见
  const midTip = await probe(box.y + box.height * 0.4)
  expect(midTip).not.toBeNull()
  expect(midTip!.top).toBeGreaterThanOrEqual(0)
  expect(midTip!.bottom).toBeLessThanOrEqual(page.viewportSize()!.height)

  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  expect(errs).toHaveLength(0)
})

test('移动端：回看历史 → 「回到最新」按钮出现 → 点击回到最新消失', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  const btn = page.getByTestId('back-to-latest')
  // 初始停在最新 → 无按钮
  await expect(btn).toHaveCount(0)

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // 向右拖动 → 视图进入历史
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  for (let i = 1; i <= 20; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 22, y: cy }] })
    await page.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(300) // 等视图停稳再点击
  await expect(btn).toBeVisible({ timeout: 8000 })

  await btn.tap()
  await expect(btn).toHaveCount(0, { timeout: 8000 })
  expect(errs).toHaveLength(0)
})

test('移动端：更多 → 行情全屏浮层 → 点行切交易对并自动关闭 → ✕ 关闭', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('BTC/USDT', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })

  // 更多面板 → 「行情」
  await page.getByTestId('mobile-more').tap()
  await page.waitForTimeout(600)
  await page.getByTestId('mobile-panel-more').getByRole('button', { name: '行情' }).tap()

  // 全屏浮层出现，行数据已加载
  await expect(page.getByTestId('market-list-overlay')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid^="market-row-"]').first()).toBeVisible({ timeout: 20_000 })
  const rowCount = await page.locator('[data-testid^="market-row-"]').count()
  expect(rowCount).toBeGreaterThan(50)

  // 点 SOL 行 → 主图切为 SOL/USDT + 浮层自动关闭
  await page.getByTestId('market-row-SOLUSDT').tap()
  await expect(page.getByText('SOL/USDT', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('market-list-overlay')).toHaveCount(0)

  // 再开 → ✕ 手动关闭
  await page.getByTestId('mobile-more').tap()
  await page.waitForTimeout(600)
  await page.getByTestId('mobile-panel-more').getByRole('button', { name: '行情' }).tap()
  await expect(page.getByTestId('market-list-overlay')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('market-list-collapse').tap()
  await expect(page.getByTestId('market-list-overlay')).toHaveCount(0)
  expect(errors).toHaveLength(0)
})

test('移动端：触屏三点绘制三角形 → 手势间隙保留预览 → 落库 3 锚点 → 自动切回鼠标 → 删除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  await page.evaluate(() => localStorage.removeItem('kline-buty:drawings'))

  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '三角形', exact: true }).tap()
  await page.waitForTimeout(300)

  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

  const overlayPixels = () =>
    page.evaluate(() => {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => {
        const st = getComputedStyle(c)
        return st.position === 'absolute' && st.zIndex === '5'
      })
      if (!overlay) return 0
      const ctx = overlay.getContext('2d')
      if (!ctx) return 0
      const d = ctx.getImageData(0, 0, overlay.width, overlay.height).data
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]
        if (a > 20) n++
      }
      return n
    })

  // 前两针只收集锚点；抬起后的手势间隙必须保留蓝色选中态预览，
  // 否则实时重绘会擦掉进度，用户看不到任何已点反馈。
  const taps = [
    [0.3, 0.55],
    [0.55, 0.55],
    [0.4, 0.4],
  ]
  for (const [fx, fy] of taps) {
    const x = box.x + box.width * fx
    const y = box.y + box.height * fy
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(500)
    if (fx !== 0.4) expect(await overlayPixels()).toBeGreaterThan(20)
  }
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })

  // 第三针集满提交：3 锚点保序落库
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          try {
            const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
            return Object.values(d)
              .flat()
              .filter((x: unknown) => (x as { type?: string }).type === 'triangle').length
          } catch {
            return 0
          }
        }),
      { timeout: 10_000 },
    )
    .toBe(1)
  const saved = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d)
        .flat()
        .find((x: unknown) => (x as { type?: string }).type === 'triangle') as
          | { points: { time: number; price: number }[] }
          | undefined
    } catch {
      return undefined
    }
  })
  expect(saved?.points).toHaveLength(3)
  expect(saved?.points[0].time).toBeLessThan(saved?.points[1].time ?? 0)
  expect(saved?.points[2].time).toBeLessThan(saved?.points[1].time ?? 0)

  // 提交后移动端自动切回只读；再次轻点不得误建第二条三角形
  await expect(page.locator('canvas').first()).toBeVisible()
  const cx = box.x + box.width * 0.5
  const cy = box.y + box.height * 0.5
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(500)
  const count = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d)
        .flat()
        .filter((x: unknown) => (x as { type?: string }).type === 'triangle').length
    } catch {
      return -1
    }
  })
  expect(count).toBe(1)

  // 删除并确认清空
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByTestId('drawing-layers-open').tap()
  await page.getByTestId('drawing-layer-clear').tap()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d).reduce((n, arr) => n + (arr as unknown[]).length, 0)
    } catch {
      return -2
    }
  })
  expect(after).toBe(0)
  expect(errors).toHaveLength(0)
})

test('移动端：系统取消指针 → 三角形不误提交，已确认锚点保留可继续绘制', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  await page.evaluate(() => localStorage.removeItem('kline-buty:drawings'))

  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByRole('button', { name: '三角形', exact: true }).tap()
  await page.waitForTimeout(300)

  const box = await page.locator('main').boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const savedTriangles = () =>
    page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
        return Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'triangle').length
      } catch {
        return -1
      }
    })

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const touchAt = async (fx: number, fy: number) => {
    const x = box.x + box.width * fx
    const y = box.y + box.height * fy
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(120)
  }

  // 第 1 针确认后进入手势间隙；第 2 针被系统取消，必须丢弃当前针且不能把半程图形落库。
  await touchAt(0.3, 0.58)
  expect(await savedTriangles()).toBe(0)
  const cancelX = box.x + box.width * 0.55
  const cancelY = box.y + box.height * 0.58
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cancelX, y: cancelY }] })
  await page.waitForTimeout(80)
  await page
    .locator('main div')
    .first()
    .evaluate((el) => el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true })))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(300)
  expect(await savedTriangles()).toBe(0)

  // 取消只回滚当前针；已确认的第 1 针保留，继续两针仍能正常完成三点三角形。
  await touchAt(0.62, 0.58)
  await touchAt(0.4, 0.42)
  await expect.poll(savedTriangles, { timeout: 10_000 }).toBe(1)

  const countAll = () =>
    page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
        return Object.values(d).reduce((n, arr) => n + (arr as unknown[]).length, 0)
      } catch {
        return -2
      }
    })
  await page.getByTestId('mobile-menu-drawing').tap()
  await page.getByTestId('drawing-layers-open').tap()
  await page.getByTestId('drawing-layer-clear').tap()
  await page.waitForTimeout(400)
  expect(await countAll()).toBe(0)
  expect(errors).toHaveLength(0)
})
