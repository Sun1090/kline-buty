import { test, expect, type Page } from '@playwright/test'

/**
 * v0.5.x 止盈止损结算路径（?perf 合成行情，全程不联网）：
 * - 当前图表品种由 K 线级结算负责：命中只结算一次（新的跨品种守护不得重复接管）；
 * - 其他品种由 useTpSlGuard 负责，但价源 useSymbolPrices 在压测模式静默 → 不得凭空平仓。
 */

const POSITIONS_KEY = 'kline-buty:positionsBySymbol'
const TRADES_KEY = 'kline-buty:paperTrades'

interface TradeRow {
  symbol: string
  kind: string
  side: string
  price: number
}

function stored(page: Page, key: string) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as unknown, key)
}

/** 压测合成序列基准价 50000（±5000 漂移）：止盈设在此之下即首帧命中 */
const LONG_WITH_LOW_TP = {
  entry: 40_000,
  quantity: 0.001,
  direction: 'long',
  takeProfit: 1_000,
  stopLoss: 500,
}

test.describe('v0.5 止盈止损结算', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('当前品种触止盈：按最新价结算一次并写流水（无跨品种重复结算）', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [POSITIONS_KEY, LONG_WITH_LOW_TP] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    await expect
      .poll(() => stored(page, TRADES_KEY), { timeout: 20_000 })
      .toBeTruthy()
    const trades = (await stored(page, TRADES_KEY)) as TradeRow[]
    expect(trades).toHaveLength(1)
    // 流水 side 记被平掉的方向：平多记 buy（面板按此显示「多」）
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
    expect(trades[0].price).toBeGreaterThan(40_000)

    // 再等若干实时帧：同一持仓不得被重复结算
    await page.waitForTimeout(5_000)
    expect((await stored(page, TRADES_KEY)) as TradeRow[]).toHaveLength(1)
    const positions = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: unknown } }
    expect(positions.BTCUSDT.long).toBeNull()
  })

  test('其他品种持仓在压测模式下保持挂账：无价源时守护静默', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ ETHUSDT: { long: payload, short: null } })),
      [POSITIONS_KEY, LONG_WITH_LOW_TP] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    // 覆盖若干个实时帧周期：非当前品种既无 tick 价也无轮询价 → 不应产生任何平仓
    await page.waitForTimeout(8_000)
    const trades = ((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]
    expect(trades).toHaveLength(0)
    const positions = (await stored(page, POSITIONS_KEY)) as { ETHUSDT: { long: { entry: number } } }
    expect(positions.ETHUSDT.long.entry).toBe(40_000)
  })

  test('面板改止盈价到现价下方：保存即触价结算并留一条流水', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.001, direction: 'long', takeProfit: 90_000, stopLoss: 30_000 },
      ] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const current = Number((await page.getByTestId('live-price').innerText()).replace(/[^\d.]/g, ''))
    // 止盈改到现价之下（仍高于开仓价 → 校验通过）→ 保存后必然触价
    const nextTp = Math.round(current * 0.98)
    expect(nextTp).toBeGreaterThan(40_000)

    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '仓位' }).click()
    const panel = page.getByRole('region', { name: '模拟仓位' })
    await expect(panel).toBeVisible()
    await panel.getByTestId('position-edit-levels-long').click()
    await expect(panel.getByTestId('position-level-tp-long')).toHaveValue('90000')
    await panel.getByTestId('position-level-tp-long').fill(String(nextTp))
    await panel.getByTestId('position-level-save-long').click()
    await expect(panel.getByTestId('position-levels-editor-long')).toHaveCount(0)

    await expect
      .poll(() => stored(page, TRADES_KEY), { timeout: 20_000 })
      .toBeTruthy()
    const trades = (await stored(page, TRADES_KEY)) as TradeRow[]
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
    expect(trades[0].price).toBeGreaterThanOrEqual(nextTp)
    await expect
      .poll(async () => {
        const p = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: unknown } }
        return p.BTCUSDT.long
      })
      .toBeNull()
  })

  test('窄屏 320px：价位编辑器换行展示，面板不产生横向滚动', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.001, direction: 'long', takeProfit: 90_000, stopLoss: 30_000 },
      ] as const,
    )
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '仓位' }).click()
    const panel = page.getByRole('region', { name: '模拟仓位' })
    await expect(panel).toBeVisible()
    await panel.getByTestId('position-edit-levels-long').click()

    const editor = panel.getByTestId('position-levels-editor-long')
    await expect(editor).toBeVisible()
    // 编辑器独占一行（flex-wrap 后宽度≈面板内容宽），两个价位输入可见
    await expect(panel.getByTestId('position-level-tp-long')).toBeInViewport()
    await expect(panel.getByTestId('position-level-sl-long')).toBeInViewport()
    const editorBox = await editor.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(editorBox && panelBox ? editorBox.width / panelBox.width : 0).toBeGreaterThan(0.6)
    // 移动端功能区不得横向溢出
    const overflow = await panel.evaluate((node) => node.scrollWidth - node.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await panel.getByTestId('position-level-save-long').click()
    await expect(editor).toHaveCount(0)
    const saved = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: { takeProfit: number } } }
    expect(saved.BTCUSDT.long.takeProfit).toBe(90_000)
  })
})
