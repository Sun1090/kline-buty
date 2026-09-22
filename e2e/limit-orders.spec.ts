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

/**
 * 从图表右键「挂限价买入」打开快速下单 → 按给定价格/数量提交。
 * 不走盘口：订单簿依赖实时深度流，CI 运行器上拿不到数据（该作业只跑 ?perf 确定性规格），
 * 而图表右键入口同样直达限价模式，且只依赖合成 K 线。
 */
async function placeLimitBuy(page: Page, price: number, qty: number) {
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  await chart.click({ button: 'right', position: { x: box.width * 0.5, y: box.height * 0.5 } })
  await page.getByTestId('ctx-limit-buy').click()
  const order = page.getByTestId('quick-order')
  await expect(order).toBeVisible()
  // 右键入口已处于限价模式，价位随后按入参覆写
  await expect(order.getByTestId('qo-type-limit')).toHaveAttribute('aria-pressed', 'true')
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

  test('限价买入挂在现价上方：立即成交并按市场价改善，费率按吃单（Taker）计', async ({ page }) => {
    const price = await lastPrice(page)
    const limit = Number((price * 1.2).toFixed(2))
    await placeLimitBuy(page, limit, 0.001)

    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')
    // 成交后移出挂单队列（直接读存储，避免多层浮层互相遮挡点击）
    expect((await stored(page, 'kline-buty:paperOrders')) ?? []).toEqual([])

    const trades = (await stored(page, 'kline-buty:paperTrades')) as { kind: string; price: number; qty: number; feeRate: number; fee: number }[]
    expect(trades).toHaveLength(1)
    // 成交价取市场价（价格改善），而不是被跨过的挂单价
    expect(trades[0].kind).toBe('open')
    expect(trades[0].price).toBeLessThan(limit)
    expect(trades[0].price).toBeGreaterThan(price * 0.9)
    expect(trades[0].qty).toBe(0.001)
    // 下单即跨过价差 = 这单从提交起就在吃单，按 Taker 费率（默认 0.1%）而非挂单费率
    expect(trades[0].feeRate).toBeCloseTo(0.001, 10)
    expect(trades[0].fee).toBeCloseTo(trades[0].price * trades[0].qty * 0.001, 10)

    await ensurePanel(page, '交易流水', 'trade-history-panel')
    await expect(page.getByTestId('trade-history-row')).toHaveCount(1)
  })

  test('挂单（Maker）费率可配置，但不作用于跨过价差的即时成交', async ({ page }) => {
    await ensurePanel(page, '交易流水', 'trade-history-panel')
    await page.getByTestId('trade-maker-fee-rate').fill('0.5')
    await expect(page.getByTestId('trade-maker-fee-rate')).toHaveValue('0.5')
    // 配置确实落库（0.5% → 0.005），只是这单是 Taker，用不到它
    expect(await stored(page, 'kline-buty:makerFeeRate')).toBeCloseTo(0.005, 10)
    // 流水浮层会盖住图表（右键点不到），配置完先收起
    await openMore(page)
    await page.getByRole('button', { name: '交易流水' }).click()
    await expect(page.getByTestId('trade-history-panel')).toHaveCount(0)

    const price = await lastPrice(page)
    const limit = Number((price * 1.2).toFixed(2))
    await placeLimitBuy(page, limit, 0.001)

    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')
    const trades = (await stored(page, 'kline-buty:paperTrades')) as { feeRate: number; fee: number; price: number; qty: number }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].feeRate).toBeCloseTo(0.001, 10)
    expect(trades[0].fee).toBeCloseTo(trades[0].price * trades[0].qty * 0.001, 10)
  })

  test('挂在盘口的限价单触价成交：按改善价成交并按挂单（Maker）费率计费', async ({ page }) => {
    const price = await lastPrice(page)
    // 重载会先跑 beforeEach 注册的 clear，故费率与该单一起在 clear 之后补种
    await page.addInitScript(([limit]) => {
      localStorage.setItem('kline-buty:makerFeeRate', String(0.005))
      localStorage.setItem(
        'kline-buty:paperOrders',
        JSON.stringify([{ id: 'resting', symbol: 'BTCUSDT', side: 'buy', price: limit, qty: 0.001, createdAt: 1, marketable: false }]),
      )
    }, [Number((price * 1.2).toFixed(2))] as const)
    await page.reload()
    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交', { timeout: 20_000 })

    const trades = (await stored(page, 'kline-buty:paperTrades')) as { kind: string; price: number; qty: number; feeRate: number; fee: number }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].kind).toBe('open')
    expect(trades[0].qty).toBe(0.001)
    expect(trades[0].feeRate).toBeCloseTo(0.005, 10)
    expect(trades[0].fee).toBeCloseTo(trades[0].price * trades[0].qty * 0.005, 10)
    // 存量单重载后仍是挂单身份：重载时无从得知入单当时的最新价，只认 marketable 标记
    expect(trades[0].price).toBeGreaterThan(price * 0.9)
  })

  test('挂单改价：把挂在现价下方的买单抬到现价上方，随即触价成交', async ({ page }) => {
    const price = await lastPrice(page)
    const low = Number((price * 0.8).toFixed(2))
    await placeLimitBuy(page, low, 0.001)

    await ensurePanel(page, '仓位', 'pending-orders')
    await expect(page.getByTestId('pending-orders-count')).toHaveText('1')
    const pending = (await stored(page, 'kline-buty:paperOrders')) as { id: string; price: number; qty: number }[]
    expect(pending[0].price).toBe(low)
    const id = pending[0].id

    await page.getByTestId(`pending-order-edit-${id}`).click()
    const editor = page.getByTestId(`pending-order-editor-${id}`)
    await expect(editor).toBeVisible()
    // 展开即预填当前挂价与数量
    await expect(editor.getByTestId(`pending-order-price-${id}`)).toHaveValue(String(low))
    await expect(editor.getByTestId(`pending-order-qty-${id}`)).toHaveValue('0.001')
    await editor.getByTestId(`pending-order-price-${id}`).fill(String(Number((price * 1.2).toFixed(2))))
    await editor.getByTestId(`pending-order-qty-${id}`).fill('0.002')
    await editor.getByTestId(`pending-order-edit-confirm-${id}`).click()
    await expect(editor).toHaveCount(0)

    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')
    expect((await stored(page, 'kline-buty:paperOrders')) ?? []).toEqual([])
    const trades = (await stored(page, 'kline-buty:paperTrades')) as { kind: string; qty: number }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].kind).toBe('open')
    expect(trades[0].qty).toBe(0.002)
  })

  test('挂单改价：非法数量面板内报错，挂单原样留着', async ({ page }) => {
    const price = await lastPrice(page)
    await placeLimitBuy(page, Number((price * 0.8).toFixed(2)), 0.001)
    await ensurePanel(page, '仓位', 'pending-orders')
    const [target] = (await stored(page, 'kline-buty:paperOrders')) as { id: string }[]

    const editor = page.getByTestId(`pending-order-editor-${target.id}`)
    await page.getByTestId(`pending-order-edit-${target.id}`).click()
    await editor.getByTestId(`pending-order-qty-${target.id}`).fill('0')
    await editor.getByTestId(`pending-order-edit-confirm-${target.id}`).click()
    await expect(page.getByTestId('pending-order-edit-error')).toBeVisible()
    await expect(editor).toBeVisible()

    const kept = (await stored(page, 'kline-buty:paperOrders')) as { id: string; qty: number }[]
    expect(kept).toHaveLength(1)
    expect(kept[0].qty).toBe(0.001)
    expect((await stored(page, 'kline-buty:paperTrades')) ?? []).toEqual([])

    await editor.getByTestId(`pending-order-edit-cancel-${target.id}`).click()
    await expect(editor).toHaveCount(0)
    expect(((await stored(page, 'kline-buty:paperOrders')) as unknown[])).toHaveLength(1)
  })

  test('图表右键挂限价单：菜单价位预填，挂单方向落在现价另一侧即挂起', async ({ page }) => {
    const current = await lastPrice(page)
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 取主图偏上位置：与最新价拉开距离，避免挂单价≈现价带来的瞬时成交
    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.18 } })

    // 菜单文案按价格精度四舍五入，只用于判定方向；精确价位以面板预填值为准
    const shown = Number((await page.getByTestId('ctx-copy-price').innerText()).replace(/[^\d.]/g, ''))
    expect(shown).toBeGreaterThan(0)
    expect(Math.abs(shown - current) / current).toBeGreaterThan(0.002)
    // 高于现价的买单、低于现价的卖单会立即触价成交；反向选择方向才能验证「挂起」路径
    const side = shown > current ? 'sell' : 'buy'
    await page.getByTestId(`ctx-limit-${side}`).click()

    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()
    await expect(order.getByTestId('qo-type-limit')).toHaveAttribute('aria-pressed', 'true')
    const placed = Number(await order.getByTestId('qo-price').inputValue())
    expect(Math.abs(placed - shown)).toBeLessThan(0.01)
    await order.getByTestId('qo-qty').fill('0.001')
    await order.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('quick-order')).toHaveCount(0)

    await ensurePanel(page, '仓位', 'pending-orders')
    await expect(page.getByTestId('pending-orders-count')).toHaveText('1')
    const orders = (await stored(page, 'kline-buty:paperOrders')) as { side: string; price: number; qty: number }[]
    expect(orders).toHaveLength(1)
    expect(orders[0].side).toBe(side)
    expect(orders[0].price).toBe(placed)
    expect(orders[0].qty).toBe(0.001)
  })
})
