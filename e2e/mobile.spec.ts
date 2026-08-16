import { test, expect } from '@playwright/test'

// 注意：不用 isMobile（会锁定文档滚动，无法验证「拖动图表不滚动页面」）；hasTouch 已提供触摸事件
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

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

test('移动端：触屏拖动显示十字光标（OHLC 可读，抬起清除）', async ({ page }) => {
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
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cx + i * 10, y: cy }],
    })
    await page.waitForTimeout(40)
  }
  await page.waitForTimeout(300)
  const during = await countCrosshair()
  // 拖动中十字光标出现（贯穿主图，像素数明显）
  expect(during).toBeGreaterThan(200)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.waitForTimeout(400)
  const after = await countCrosshair()
  // 抬起后清除十字光标
  expect(after).toBeLessThan(during)
  expect(errs).toHaveLength(0)
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
