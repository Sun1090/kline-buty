import { expect, test } from '@playwright/test'

/**
 * D5/D8/D6 批量验证（确定性，?perf 不依赖网络）：
 * - 交易面板费率/滑点输入可改 → localStorage 持久化 → 刷新后保留；
 * - 面板含统计与设置区块（打开面板即可见设置行）。
 */

async function openTrades(page: import('@playwright/test').Page) {
  const more = page.getByTestId('header-more')
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
  await page.getByRole('button', { name: '交易流水' }).click()
  await expect(page.getByTestId('trade-history-panel')).toBeVisible()
}

test.describe('D5/D8/D6 交易设置与统计', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('kline-buty:takerFeeRate')) localStorage.clear()
    })
  })

  test('费率/滑点可改并持久化；刷新后保留', async ({ page }) => {
    await page.goto('/?perf=300')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
    await openTrades(page)

    const fee = page.getByTestId('trade-fee-rate')
    const slip = page.getByTestId('trade-slippage')
    await expect(fee).toBeVisible()
    await expect(slip).toBeVisible()

    // 改费率 0.1% → 0.25%、滑点 0.02% → 0.1%
    await fee.fill('0.25')
    await slip.fill('0.1')
    await expect
      .poll(() =>
        page.evaluate(() => ({
          fee: localStorage.getItem('kline-buty:takerFeeRate'),
          slip: localStorage.getItem('kline-buty:slippageRatio'),
        })),
      )
      .toEqual({ fee: '0.0025', slip: '0.001' })

    // 刷新后输入框保留设置值
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
    await openTrades(page)
    await expect(page.getByTestId('trade-fee-rate')).toHaveValue('0.25')
    await expect(page.getByTestId('trade-slippage')).toHaveValue('0.1')
  })
})