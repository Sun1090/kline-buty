import { test, expect, type Page } from '@playwright/test'

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

/** 确保某侧栏/浮层面板处于打开状态（菜单项是开关，重复点击会关掉） */
async function ensurePanel(page: Page, name: string, testId: string) {
  if ((await page.getByTestId(testId).count()) > 0) return
  await openMore(page)
  await page.getByRole('button', { name }).click()
  await expect(page.getByTestId(testId)).toBeVisible()
}

/** 当前最新价（?perf 合成行情，无需联网） */
async function lastPrice(page: Page): Promise<number> {
  const text = await page.getByTestId('live-price').innerText()
  const value = Number(text.replace(/[^\d.]/g, ''))
  expect(value).toBeGreaterThan(0)
  return value
}

/** 从盘口买档打开快速下单 → 切限价模式 → 按给定价格/数量提交 */
async function placeLimitBuy(page: Page, price: number, qty: number) {
  await ensurePanel(page, '盘口', 'order-book')
  await page.getByTestId('ob-bid').first().getByTestId('qo-buy').click()
  const order = page.getByTestId('quick-order')
  await expect(order).toBeVisible()
  await order.getByTestId('qo-type-limit').click()
  await order.getByTestId('qo-price').fill(String(price))
  await order.getByTestId('qo-qty').fill(String(qty))
  await order.getByTestId('qo-confirm').click()
  await expect(page.getByTestId('quick-order')).toHaveCount(0)
}

const stored = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as unknown, key)

test.describe('v0.5 模拟盘限价挂单', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('限价买入挂在现价下方：不触价，进入挂单列表并可撤销', async ({ page }) => {
    const price = await lastPrice(page)
    await placeLimitBuy(page, Number((price * 0.8).toFixed(2)), 0.001)

    await ensurePanel(page, '仓位', 'pending-orders')
    const pending = page.getByTestId('pending-orders')
    await expect(page.getByTestId('pending-orders-count')).toHaveText('1')
    await expect(pending.getByTestId('pending-order-row')).toHaveCount(1)
    // 未成交 → 账户不扣费、无流水（流水键在首次成交时才写入）
    expect(await stored(page, 'kline-buty:paperBalance')).toBe(10000)
    expect((await stored(page, 'kline-buty:paperTrades')) ?? []).toEqual([])

    await pending.getByTestId('pending-order-cancel').click()
    await expect(page.getByTestId('pending-orders-count')).toHaveText('0')
    const orders = await stored(page, 'kline-buty:paperOrders')
    expect(orders).toEqual([])
  })

  test('限价买入挂在现价上方：触价按挂单价成交、扣挂单费率并记流水', async ({ page }) => {
    const price = await lastPrice(page)
    const limit = Number((price * 1.2).toFixed(2))
    await placeLimitBuy(page, limit, 0.001)

    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')
    await ensurePanel(page, '仓位', 'pending-orders')
    await expect(page.getByTestId('pending-orders-count')).toHaveText('0')

    const trades = (await stored(page, 'kline-buty:paperTrades')) as { kind: string; price: number; qty: number; feeRate: number }[]
    expect(trades).toHaveLength(1)
    // 成交价即挂单价（Maker 无滑点），费率即挂单费率
    expect(trades[0].kind).toBe('open')
    expect(trades[0].price).toBe(limit)
    expect(trades[0].feeRate).toBeLessThan(0.001)

    await ensurePanel(page, '交易流水', 'trade-history-panel')
    await expect(page.getByTestId('trade-history-row')).toHaveCount(1)
  })

  test('挂单（Maker）费率可配置且计入成交手续费', async ({ page }) => {
    await ensurePanel(page, '交易流水', 'trade-history-panel')
    await page.getByTestId('trade-maker-fee-rate').fill('0.5')
    await expect(page.getByTestId('trade-maker-fee-rate')).toHaveValue('0.5')

    const price = await lastPrice(page)
    const limit = Number((price * 1.2).toFixed(2))
    await placeLimitBuy(page, limit, 0.001)

    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')
    const trades = (await stored(page, 'kline-buty:paperTrades')) as { feeRate: number; fee: number; price: number; qty: number }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].feeRate).toBeCloseTo(0.005, 10)
    expect(trades[0].fee).toBeCloseTo(trades[0].price * trades[0].qty * 0.005, 6)
  })

  test('图表右键挂限价单：菜单价位预填，挂单方向落在现价另一侧即挂起', async ({ page }) => {
    const current = await lastPrice(page)
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })

    const clicked = Number((await page.getByTestId('ctx-copy-price').innerText()).replace(/[^\d.]/g, ''))
    expect(clicked).toBeGreaterThan(0)
    // 高于现价的买单、低于现价的卖单会立即触价成交；反向选择方向才能验证「挂起」路径
    expect(clicked).not.toBe(current)
    const side = clicked > current ? 'sell' : 'buy'
    await page.getByTestId(`ctx-limit-${side}`).click()

    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()
    await expect(order.getByTestId('qo-type-limit')).toHaveAttribute('aria-pressed', 'true')
    await expect(order.getByTestId('qo-price')).toHaveValue(String(clicked))
    await order.getByTestId('qo-qty').fill('0.001')
    await order.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('quick-order')).toHaveCount(0)

    await ensurePanel(page, '仓位', 'pending-orders')
    await expect(page.getByTestId('pending-orders-count')).toHaveText('1')
    const orders = (await stored(page, 'kline-buty:paperOrders')) as { side: string; price: number; qty: number }[]
    expect(orders).toHaveLength(1)
    expect(orders[0].side).toBe(side)
    expect(orders[0].price).toBe(clicked)
    expect(orders[0].qty).toBe(0.001)
  })
})
