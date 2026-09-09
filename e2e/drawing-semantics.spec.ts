import { expect, test, type Page } from '@playwright/test'

/**
 * I5 画线语义识别：按当前品种已画图形建议指标（semantics.ts 纯函数 + 设置面板一键应用）。
 * - 水平线（支撑/阻力）→ 建议 RSI；未画线时不出现建议按钮
 * - 点击建议 → 副图切到 RSI，信息条出现 RSI 值
 */

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openDrawings(page: Page) {
  const button = page.getByTestId('drawing-toggle')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openIndicatorSettings(page: Page) {
  await openMore(page)
  // More 面板里的「指标参数」入口（panel.settings 中文标签为「参数」）
  await page.getByRole('button', { name: '参数', exact: true }).click()
  await expect(page.getByTestId('indicator-settings-panel')).toBeVisible()
}

/** 在图表中央画一条水平线（C6 吸附默认 ohlc，水平拖动即可落线） */
async function drawHorizontalLine(page: Page) {
  await openDrawings(page)
  await page.getByRole('button', { name: '水平线', exact: true }).click()
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  const y = box!.y + box!.height * 0.4
  await page.mouse.move(box!.x + box!.width * 0.4, y)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.6, y)
  await page.mouse.up()
  await expect.poll(() =>
    page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
      return Object.values(all).flat().length
    }),
  ).toBeGreaterThan(0)
}

test.describe('I5 画线语义识别', () => {
  test.use({ acceptDownloads: true })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('未画线时设置面板不出现建议按钮', async ({ page }) => {
    await openIndicatorSettings(page)
    await expect(page.getByTestId('drawing-suggest')).toHaveCount(0)
  })

  test('画水平线 → 出现 RSI 建议 → 一键应用后副图切 RSI', async ({ page }) => {
    await drawHorizontalLine(page)

    // 建议按钮出现且文案含 RSI（水平支撑/阻力 → 超买超卖）
    await openIndicatorSettings(page)
    const suggest = page.getByTestId('drawing-suggest')
    await expect(suggest).toBeVisible({ timeout: 10_000 })
    await expect(suggest).toContainText(/RSI/)

    // 一键应用 → 副图切 RSI，信息条出现 RSI 值
    await suggest.click()
    await openMore(page)
    const info = page.getByTestId('chart-indicator-last')
    await expect(info).toContainText(/RSI\s*:/, { timeout: 15_000 })
  })

  test('画矩形 → 建议布林带 + RSI（区间语义优先）', async ({ page }) => {
    await openDrawings(page)
    await page.getByRole('button', { name: '矩形', exact: true }).click()
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.6)
    await page.mouse.up()
    await expect.poll(() =>
      page.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(all).flat().length
      }),
    ).toBeGreaterThan(0)

    await openIndicatorSettings(page)
    const suggest = page.getByTestId('drawing-suggest')
    await expect(suggest).toBeVisible({ timeout: 10_000 })
    await expect(suggest).toContainText(/BOLL/)
    await expect(suggest).toContainText(/RSI/)
  })
})
