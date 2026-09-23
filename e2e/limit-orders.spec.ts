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
 * 从图表右键「挂限价买入」打开快速下单并填好价格/数量（不提交，供用例继续摆弄）。
 * 不走盘口：订单簿依赖实时深度流，CI 运行器上拿不到数据（该作业只跑 ?perf 确定性规格），
 * 而图表右键入口同样直达限价模式，且只依赖合成 K 线。
 */
async function openLimitOrder(page: Page, price: number, qty: number) {
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return null
  await chart.click({ button: 'right', position: { x: box.width * 0.5, y: box.height * 0.5 } })
  await page.getByTestId('ctx-limit-buy').click()
  const order = page.getByTestId('quick-order')
  await expect(order).toBeVisible()
  // 右键入口已处于限价模式，价位随后按入参覆写
  await expect(order.getByTestId('qo-type-limit')).toHaveAttribute('aria-pressed', 'true')
  await order.getByTestId('qo-price').fill(String(price))
  await order.getByTestId('qo-qty').fill(String(qty))
  return order
}

/** 填好即提交（可选随单止盈/止损价与杠杆档位） */
async function placeLimitBuy(
  page: Page,
  price: number,
  qty: number,
  levels?: { tp?: number; sl?: number; leverage?: number },
) {
  const order = await openLimitOrder(page, price, qty)
  if (!order) return
  if (levels) {
    if (levels.tp !== undefined) await order.getByTestId('qo-tp').fill(String(levels.tp))
    if (levels.sl !== undefined) await order.getByTestId('qo-sl').fill(String(levels.sl))
    if (levels.leverage !== undefined) await order.getByTestId('qo-leverage').selectOption(String(levels.leverage))
  }
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
    const trades = (await stored(page, 'kline-buty:paperTrades')) as { kind: string; qty: number; feeRate: number }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].kind).toBe('open')
    expect(trades[0].qty).toBe(0.002)
    // 改价把买单抬过现价 → 这单从改价起就在吃单，按 Taker 费率（默认 0.1%）计
    expect(trades[0].feeRate).toBeCloseTo(0.001, 10)
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

  test('窄屏 320px：改价编辑器换行展示，四个控件都在视口内且面板不横向溢出', async ({ page }) => {
    // 重载前注册的 init script 会在 beforeEach 的 clear 之后执行，故种子数据要一起补
    await page.addInitScript(() => {
      localStorage.setItem(
        'kline-buty:paperOrders',
        JSON.stringify([
          { id: 'o1', symbol: 'BTCUSDT', side: 'buy', price: 41_000, qty: 0.001, createdAt: 1, marketable: false },
          { id: 'o2', symbol: 'ETHUSDT', side: 'sell', price: 3_900, qty: 2, createdAt: 2, marketable: false },
        ]),
      )
    })
    await page.setViewportSize({ width: 320, height: 720 })
    await page.reload()
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    const more = page.getByTestId('mobile-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '仓位', exact: true }).click()
    const panel = page.getByRole('region', { name: '模拟仓位' })
    await expect(panel).toBeVisible()

    await panel.getByTestId('pending-order-edit-o1').click()
    const editor = panel.getByTestId('pending-order-editor-o1')
    await expect(editor).toBeVisible()
    for (const id of ['pending-order-price-o1', 'pending-order-qty-o1', 'pending-order-edit-confirm-o1', 'pending-order-edit-cancel-o1']) {
      await expect(panel.getByTestId(id)).toBeInViewport()
    }
    // 去掉 flexWrap 时四个控件只是被压扁（274px 刚好塞下），视口与溢出断言照样过；
    // 真正兜住「换行展示」的是控件确实排成了两行。
    const rowCount = await editor.evaluate((node) => {
      const tops = Array.from(node.children).map((c) => Math.round((c as HTMLElement).getBoundingClientRect().y))
      return tops.filter((y, i) => !tops.slice(0, i).some((o) => Math.abs(o - y) <= 4)).length
    })
    expect(rowCount).toBeGreaterThanOrEqual(2)
    expect(await panel.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(0)

    // 窄屏下真的改一笔：价格与数量都落库，另一条挂单不受影响
    await panel.getByTestId('pending-order-price-o1').fill('42500')
    await panel.getByTestId('pending-order-qty-o1').fill('0.004')
    await panel.getByTestId('pending-order-edit-confirm-o1').click()
    await expect(editor).toHaveCount(0)
    const kept = (await stored(page, 'kline-buty:paperOrders')) as { id: string; price: number; qty: number }[]
    expect(kept.find((o) => o.id === 'o1')).toMatchObject({ price: 42_500, qty: 0.004 })
    expect(kept.find((o) => o.id === 'o2')).toMatchObject({ price: 3_900, qty: 2 })
  })
  test('挂单附带止盈/止损：列表标出 TP/SL，成交后持仓用的就是这两条线', async ({ page }) => {
    const price = await lastPrice(page)
    const low = Number((price * 0.8).toFixed(2))
    const tp = Number((price * 1.5).toFixed(2))
    const sl = Number((price * 0.75).toFixed(2))
    await placeLimitBuy(page, low, 0.001, { tp, sl })

    await ensurePanel(page, '仓位', 'pending-orders')
    const [pending] = (await stored(page, 'kline-buty:paperOrders')) as {
      id: string
      takeProfit: number
      stopLoss: number
    }[]
    expect({ takeProfit: pending.takeProfit, stopLoss: pending.stopLoss }).toEqual({ takeProfit: tp, stopLoss: sl })
    await expect(page.getByTestId(`pending-order-levels-${pending.id}`)).toBeVisible()

    // 改价抬过现价 → 触价成交（成交价取市场价，两线都仍在正确一侧）
    await page.getByTestId(`pending-order-edit-${pending.id}`).click()
    const editor = page.getByTestId(`pending-order-editor-${pending.id}`)
    await editor.getByTestId(`pending-order-price-${pending.id}`).fill(String(Number((price * 1.2).toFixed(2))))
    await editor.getByTestId(`pending-order-edit-confirm-${pending.id}`).click()
    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')

    const positions = (await stored(page, 'kline-buty:positionsBySymbol')) as Record<
      string,
      { long: { entry: number; takeProfit: number; stopLoss: number } | null }
    >
    // 参考价会是 entry×1.03/×0.98；这里是随单价位（1.5×/0.75×）赢
    expect(positions.BTCUSDT.long).toMatchObject({ takeProfit: tp, stopLoss: sl })
  })

  test('随单价位站错一侧 → 面板内报错、确认禁用，改对后才受理', async ({ page }) => {
    const price = await lastPrice(page)
    const low = Number((price * 0.8).toFixed(2))
    const order = await openLimitOrder(page, low, 0.001)
    expect(order).not.toBeNull()
    if (!order) return

    // 买单止盈必须高于挂单价：填到挂单价之下即不成立
    await order.getByTestId('qo-tp').fill(String(Number((low * 0.9).toFixed(2))))
    await expect(order.getByTestId('qo-attach-err')).toBeVisible()
    // 按钮 disabled 即已挡住提交（Playwright 对禁用按钮的 click 会一直等可用性，不去点它）
    await expect(order.getByTestId('qo-confirm')).toBeDisabled()

    // 填成文本垃圾同样拦下（不能当成「未设置」放行）
    await order.getByTestId('qo-tp').fill('abc')
    await expect(order.getByTestId('qo-confirm')).toBeDisabled()

    await order.getByTestId('qo-tp').fill(String(Number((low * 1.1).toFixed(2))))
    await expect(order.getByTestId('qo-attach-err')).toHaveCount(0)
    await expect(order.getByTestId('qo-confirm')).toBeEnabled()
    // 只填一条时谈不上风险回报；补上止损后给出隐含盈亏比（reward 0.1 / risk 0.1 → 1.00）
    await expect(order.getByTestId('qo-rr')).toHaveCount(0)
    await order.getByTestId('qo-sl').fill(String(Number((low * 0.9).toFixed(2))))
    await expect(order.getByTestId('qo-rr')).toContainText('1.00')
    await order.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('quick-order')).toHaveCount(0)

    await ensurePanel(page, '仓位', 'pending-orders')
    const [kept] = (await stored(page, 'kline-buty:paperOrders')) as { takeProfit: number; stopLoss: number }[]
    expect(kept.takeProfit).toBe(Number((low * 1.1).toFixed(2)))
    expect(kept.stopLoss).toBe(Number((low * 0.9).toFixed(2)))
  })

  test('挂单带杠杆：成交后持仓按该档算强平价（不再退回 1x 口径）', async ({ page }) => {
    const price = await lastPrice(page)
    const entry = Number((price * 0.9).toFixed(2))
    await placeLimitBuy(page, entry, 0.001, { leverage: 20 })

    await ensurePanel(page, '仓位', 'pending-orders')
    const [pending] = (await stored(page, 'kline-buty:paperOrders')) as { id: string; leverage: number }[]
    expect(pending.leverage).toBe(20)

    // 触价成交后落到持仓
    await page.getByTestId(`pending-order-edit-${pending.id}`).click()
    const editor = page.getByTestId(`pending-order-editor-${pending.id}`)
    await editor.getByTestId(`pending-order-price-${pending.id}`).fill(String(Number((price * 1.2).toFixed(2))))
    await editor.getByTestId(`pending-order-edit-confirm-${pending.id}`).click()
    await expect(page.getByTestId('order-toast')).toContainText('限价单已成交')

    const positions = (await stored(page, 'kline-buty:positionsBySymbol')) as Record<
      string,
      { long: { entry: number; leverage?: number } | null }
    >
    expect(positions.BTCUSDT.long!.leverage).toBe(20)
  })

})

/**
 * QuickOrder 的市价分支：全部交易类规格此前都从图表右键的「挂限价单」进入，
 * 市价这条主路径（面板内切类型 → 即时成交 → 计 Taker 费 → 落到持仓/流水 → 全部平仓）
 * 一条断言都没有。这里补齐，并按成交回报的实际口径断言，而不是只看按钮可点。
 */
test.describe('QuickOrder 市价单', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('市价买入 → 即时成交进流水与持仓 → 全部平仓清空', async ({ page }) => {
    const price = await lastPrice(page)
    // 右键入口打开面板（默认限价），再切市价：市价不需要填价
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await chart!.click({ button: 'right', position: { x: box!.width * 0.5, y: box!.height * 0.5 } })
    await page.getByTestId('ctx-limit-buy').click()
    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()
    await order.getByTestId('qo-type-market').click()
    await expect(order.getByTestId('qo-type-market')).toHaveAttribute('aria-pressed', 'true')
    await order.getByTestId('qo-qty').fill('0.01')
    await expect(order.getByTestId('qo-confirm')).toBeEnabled()
    await order.getByTestId('qo-confirm').click()
    await expect(order).toHaveCount(0)

    const trades = (await stored(page, 'kline-buty:paperTrades')) as {
      side: string
      qty: number
      price: number
      fee: number
    }[]
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('buy')
    expect(trades[0].qty).toBeCloseTo(0.01)
    // 市价单按当时市场价即时成交：成交价必须落在合成行情的量级上，而不是 0 或上一笔限价
    expect(trades[0].price).toBeGreaterThan(price * 0.5)
    expect(trades[0].price).toBeLessThan(price * 2)
    expect(trades[0].fee).toBeGreaterThan(0)

    const positions = (await stored(page, 'kline-buty:positionsBySymbol')) as Record<
      string,
      { long: { entry: number; quantity: number; direction: string } | null }
    >
    expect(positions.BTCUSDT.long!.quantity).toBeCloseTo(0.01)
    expect(positions.BTCUSDT.long!.direction).toBe('long')
    expect(positions.BTCUSDT.long!.entry).toBeCloseTo(trades[0].price)

    // UI 侧同一笔持仓可见并可一键清空（停靠面板默认就是开着的，菜单项是开关，重复点会关掉）
    if ((await page.getByTestId('position-account-summary').count()) === 0) {
      await openMore(page)
      await page.getByTestId('desktop-more-panel').getByText('仓位', { exact: true }).click()
    }
    await expect(page.getByRole('region', { name: '模拟仓位' })).toBeVisible()
    await expect(page.getByTestId('position-row-long')).toBeVisible()
    await page.getByTestId('position-close-all').click()
    await expect(page.getByTestId('position-row-long')).toHaveCount(0)
    await expect.poll(async () => {
      const p = (await stored(page, 'kline-buty:positionsBySymbol')) as Record<string, { long: unknown } | null>
      return p.BTCUSDT?.long ?? null
    }).toBeNull()
  })
})
