import { expect, test, type CDPSession, type Page } from '@playwright/test'

/**
 * #56 双击复位的**价格轴**那一半必须有可观测的验收。
 *
 * 双击复位做两件事：`timeScale().resetTimeScale()` 与 `priceScale('right').setAutoScale(true)`。
 * 前一半看得到 —— A11 可视时间范围条的跨度会回到默认；后一半在 DOM 上**没有任何对应物**，
 * 所以「捏合把价格轴切成了手动区间，双击之后它到底回没回自适应」这句话此前无法被断言，
 * 只能靠固定价画线的 y 坐标位移间接猜（那条基线自己会在动，正是 #55 换掉口径的原因）。
 *
 * 现在读的是图表自己的状态：`.chart-container[data-price-autoscale]` 由 adapter 在每次改动
 * 这根轴之后写一次 `priceScale('right').options().autoScale`（不是回写我们刚传进去的常量），
 * 所以「捏合 → off」与「双击 → on」两条各自钉住一个调用点：
 * 少一句 setAutoScale，或者少一处发布，都会红在自己那一步。
 */

/** 两指横向张开：adapter 的纵向捏合分支据此改价格轴区间 */
async function pinchPriceScale(page: Page, cdp: CDPSession, cx: number, cy: number) {
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 40, y: cy },
      { x: cx + 40, y: cy },
    ],
  })
  for (let i = 1; i <= 6; i++) {
    const spread = 40 + i * 10
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: cx - spread, y: cy },
        { x: cx + spread, y: cy },
      ],
    })
    await page.waitForTimeout(50)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
}

/** 双击复位：300ms 内两次单指轻点（不能有位移，否则算拖动） */
async function doubleTap(page: Page, cdp: CDPSession, cx: number, cy: number) {
  for (let k = 0; k < 2; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(400)
}

const autoscale = (page: Page) =>
  page.locator('.chart-container').first().getAttribute('data-price-autoscale')

test.describe('价格轴自适应开关的可观测复位（双击复位的另一半）', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test.setTimeout(120_000)

  test('捏合切手动区间 → 双击复位回自适应', async ({ page, browserName }) => {
    // CDP 触摸派发仅 Chromium；跨浏览器的触摸覆盖由 chromium 项目承担（与 smoke-mobile 同口径）
    test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    // ?perf 合成行情：这条不碰真实端点，CI 上可重复
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 30_000 })

    const box = await page.locator('.chart-container').first().boundingBox()
    expect(box, '图表容器要有尺寸（拿不到 viewport 就是在 0 宽的画布上测）').not.toBeNull()
    if (!box) return
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const cdp = await page.context().newCDPSession(page)

    // 起始态：没人动过价格轴 ⇒ 自适应。这一条同时钉住「钩子在图表建好时就发布过一次」
    await expect.poll(() => autoscale(page), { timeout: 10_000, message: '起始态价格轴应是自适应' }).toBe('on')

    await pinchPriceScale(page, cdp, cx, cy)
    await expect
      .poll(() => autoscale(page), { timeout: 10_000, message: '捏合之后价格轴应切到手动区间（off）——否则下一步的「回自适应」没有可回的东西' })
      .toBe('off')

    await doubleTap(page, cdp, cx, cy)
    await expect
      .poll(() => autoscale(page), { timeout: 10_000, message: '双击复位必须把价格轴交回自适应（setAutoScale(true) 那一半）' })
      .toBe('on')

    expect(errors, `pageerror: ${errors.slice(0, 2).join(' | ')}`).toHaveLength(0)
  })
})
