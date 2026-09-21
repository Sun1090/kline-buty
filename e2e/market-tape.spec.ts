import { test, expect, type Page } from '@playwright/test'

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openTape(page: Page) {
  await openMore(page)
  await page.getByRole('button', { name: '成交明细' }).click()
}

test.describe('v0.5 成交明细 Tape（真实行情）', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('打开成交明细 → 逐笔成交累积、方向标记、点击行不破坏列表', async ({ page }) => {
    await openTape(page)

    const tape = page.getByTestId('recent-trades')
    await expect(tape).toBeVisible()
    // 首屏骨架屏，REST 轮询（5s）后被真实成交替换
    const rows = tape.getByTestId('tape-row')
    await expect(rows.first()).toBeVisible({ timeout: 25_000 })

    await expect(rows.first()).toContainText(/\d{2}:\d{2}:\d{2}/)
    expect(['buy', 'sell']).toContain(await rows.first().getAttribute('data-side'))
    await expect(tape.getByTestId('tape-side-summary')).toContainText(/\d+ · \d+/)

    // 点击行 → 联动主图标记线（canvas 绘制，不断言像素），列表保持累积
    const count = await rows.count()
    await rows.first().click()
    await expect(tape.getByTestId('tape-row')).not.toHaveCount(0)
    expect(await rows.count()).toBeGreaterThanOrEqual(Math.min(count, 1))
  })

  test('侧栏面板顺序含成交明细，上移换位后持久化', async ({ page }) => {
    await openTape(page)
    await openMore(page)

    const chip = page.getByTestId('panel-order-tape')
    await expect(chip).toBeVisible()
    await chip.getByTestId('panel-order-up-tape').click()

    const order = await page.evaluate(
      () => JSON.parse(localStorage.getItem('kline-buty:panelOrder') ?? '[]') as string[],
    )
    expect(order.indexOf('tape')).toBeLessThan(order.indexOf('orderBook'))
  })

  test('成交明细关闭后不轮询（卸载即停）', async ({ page }) => {
    await openTape(page)
    await expect(page.getByTestId('recent-trades')).toBeVisible()

    const requests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/trades')) requests.push(req.url())
    })
    await page.waitForTimeout(6_000)
    expect(requests.length).toBeGreaterThan(0)

    await openMore(page)
    await page.getByRole('button', { name: '成交明细' }).click()
    await expect(page.getByTestId('recent-trades')).toHaveCount(0)

    requests.length = 0
    await page.waitForTimeout(11_000)
    expect(requests).toHaveLength(0)
  })
})
