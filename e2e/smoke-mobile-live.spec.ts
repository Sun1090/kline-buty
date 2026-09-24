import { expect, test } from '@playwright/test'
import { waitCandlesRendered } from './helpers/smoke'

/**
 * 行情列表侧栏（自 `smoke-mobile.spec.ts` 拆出的 live 尾巴）。
 *
 * 拆法是按机制，不是按「这条走了移动端页」：`src/hooks/useTickerList.ts:50` 在
 * `isPerfMode()` 下直接 `setRows([])` 然后 return —— 也就是 `?perf` 里**一行 ticker 都不会有**，
 * `[data-testid^="market-row-"]` 是空的，而本例的判词恰恰是「行数 > 50 + 点某一行能切交易对」。
 * 同文件其余 18 例都不读 ticker 行，所以它们整批留在 `?perf` 进 CI，只有这一条离不开线上。
 *
 * 排序箭头（▲/▼）与折叠/展开那两半其实不吃行数据，但把它们单独拆一条出来会让「一次点击换交易对」
 * 这件事失去载体 —— 三条本来就是一次交互的三段，拆开只多一个 fixture 不多一份覆盖。
 */

test('桌面：行情列表侧栏——点行切交易对 + 排序升降 + 折叠/展开', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)

  // 行情列表可见且行数据已加载（内置 60+ 交易对）
  await expect(page.getByTestId('market-list')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid^="market-row-"]').first()).toBeVisible({ timeout: 20_000 })
  const rowCount = await page.locator('[data-testid^="market-row-"]').count()
  expect(rowCount).toBeGreaterThan(50)

  // 点击 ETH 行 → 主图交易对切换为 ETH/USDT + 行高亮
  await page.getByTestId('market-row-ETHUSDT').click()
  await expect(page.getByText('ETH/USDT', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  // 排序：点价格列 → ▲（升序）；再点 → ▼（降序）
  const priceSort = page.getByTestId('market-sort-price')
  await priceSort.click()
  await expect(priceSort).toContainText('▲')
  await priceSort.click()
  await expect(priceSort).toContainText('▼')

  // 折叠 → 窄竖条；展开 → 面板恢复
  await page.getByTestId('market-list-collapse').click()
  await expect(page.getByTestId('market-list-rail')).toBeVisible()
  await page.getByTestId('market-list-expand').click()
  await expect(page.getByTestId('market-list')).toBeVisible()
  expect(errors).toHaveLength(0)
})
