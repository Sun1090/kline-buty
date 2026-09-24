import { expect, test } from '@playwright/test'

/**
 * 移动端行情全屏浮层里「点一行换交易对」那一半（自 `mobile.spec.ts` 拆出的 live 尾巴）。
 *
 * 拆的口径是机制，不是「这条走了移动端页」：`src/hooks/useTickerList.ts:50` 在 `isPerfMode()`
 * 下 `setRows([])` 后直接 return，所以 `?perf` 里浮层开得到、里面**一行都没有**。
 * 本例判的是「行数 > 50 + 点 SOL 行 → 主图换成 SOL/USDT + 浮层自己关掉」，
 * 三条全部以行存在为前提，必须真打行情端点。
 *
 * 同一屏的开合（更多 → 行情 → ✕ 关闭）不吃行数据，已留在 `mobile.spec.ts` 走 ?perf 进 CI；
 * 也就是说这条 live 文件只保留确实离不开线上的那一段，不是整条旧用例的副本。
 */

// 与 mobile.spec.ts 同口径：这条走的是移动端布局 + `.tap()`，
// 少了 hasTouch 就直接 `The page does not support tap`，少了 390×844 则连「更多」面板都不是移动版式。
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('移动端：行情全屏浮层点行 → 切交易对并自动关闭', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('BTC/USDT', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('mobile-more').tap()
  await page.waitForTimeout(600)
  await page.getByTestId('mobile-panel-more').getByRole('button', { name: '行情' }).tap()

  // 全屏浮层出现，行数据已加载
  await expect(page.getByTestId('market-list-overlay')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid^="market-row-"]').first()).toBeVisible({ timeout: 20_000 })
  const rowCount = await page.locator('[data-testid^="market-row-"]').count()
  expect(rowCount).toBeGreaterThan(50)

  // 点 SOL 行 → 主图切为 SOL/USDT + 浮层自动关闭
  await page.getByTestId('market-row-SOLUSDT').tap()
  await expect(page.getByText('SOL/USDT', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('market-list-overlay')).toHaveCount(0)
  expect(errors).toHaveLength(0)
})
