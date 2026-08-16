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
  // 切换指标（副图 MACD）不报错
  await page.getByRole('button', { name: 'MACD' }).tap()
  await page.waitForTimeout(600)
  await expect(canvas).toBeVisible()
  expect(errs).toHaveLength(0)
})
