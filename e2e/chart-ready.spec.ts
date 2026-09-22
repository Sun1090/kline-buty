import { expect, test } from '@playwright/test'
import { pickDrawingTool, waitCandlesRendered } from './helpers/smoke'

/**
 * 就绪门回归：历史 K 线迟到时，用例必须等到图表可用再动手，而不是把 gestures 丢给只有一两根柱子的图。
 * 这条是「画线偶发不生效」整族红（射线 / 平行通道 / 斐波那契扩展…）的确定性复现：压慢 klines 请求后，
 * 首根 WS tick 已经画出红绿像素，只判像素的门会放行，而 adapter 此时换不出锚点时间、正当丢弃手势。
 * 变异检查：把 `waitCandlesRendered` 的根数阈值调到 0 → 本用例红在「点击未落库」；
 * 去掉容器上的 data-candles → 红在「K 线根数未达 60，Received: 0」。
 * 本规格依赖币安实时 REST（要的就是那条真实请求迟到），CI 的 E2E 清单刻意只跑 ?perf 合成数据，故留本地。
 */

const readDrawingCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
    return Object.values(all).flat().length
  })

test.describe('图表就绪门', () => {
  test('历史 K 线迟到 6 秒时，画线仍然落库（而不是静默丢手势）', async ({ page }) => {
    test.setTimeout(150_000)
    await page.route('**/api/v3/klines**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6_000))
      await route.continue()
    })
    await page.goto('/')
    // 门禁：像素 + 根数双条件；只等像素会在这里被一根 WS tick 骗过
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '水平线')
    const box = await page.locator('.chart-container').first().boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await expect
      .poll(() => readDrawingCount(page), { message: '图表就绪后点击仍未落库', timeout: 5_000 })
      .toBeGreaterThanOrEqual(1)
  })
})
