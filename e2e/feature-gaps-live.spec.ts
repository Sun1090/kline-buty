import { test, expect, type Page } from '@playwright/test'

/**
 * 从 e2e/feature-gaps.spec.ts 拆出来的**离不开线上行情**那两条（G4 榜单族）。
 *
 * 为什么单独一个文件而不是留在原文件里：原文件其余四条只要「有一片能画的蜡烛」，改走 `?perf=600`
 * 合成契约就能进 CI 账本；而这两条数的是 `market-row-*` —— 那是全市场 ticker 列表渲染出来的行，
 * `?perf` 只合成图表蜡烛、不动榜单，所以它们必须真的打一次行情端点，而 CI runner 出网不可靠。
 * 拆开的意义是把「不能进 CI」的面积缩到最小，而不是让四条陪着两条不进。
 *
 * ⚠️ 这一族没有任何自动化会告诉你是谁把它弄坏了：账本只回答「该不该在 CI 跑」，不保证「还跑得动」。
 * 动过 MarketList / 榜单 tab / 搜索过滤的代码，要在本机重跑本文件（前提 `api.binance.com` 可达）。
 */

/** 等待蜡烛真正渲染（canvas 出现涨跌色像素） */
async function waitCandlesRendered(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = document.querySelector<HTMLCanvasElement>('main canvas')
          if (!c) return 0
          const ctx = c.getContext('2d')
          if (!ctx) return 0
          const img = ctx.getImageData(0, 0, Math.min(240, c.width), Math.min(160, c.height)).data
          let colored = 0
          for (let i = 0; i < img.length; i += 4) {
            if (img[i] !== img[i + 1] || img[i] !== img[i + 2]) colored++
          }
          return colored
        }),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(100)
}

/** 榜单行：排除 `market-row-select-<sym>` 那族自选/选中行钩子，只数真正的行情行 */
const marketRows = (page: Page) =>
  page.locator('[data-testid^="market-row-"]:not([data-testid^="market-row-select-"])')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
})

test('G4 行情列表搜索：输入关键词过滤交易对，清空恢复', async ({ page }) => {
  // 列表可能处于折叠窄条：先展开
  const list = page.getByTestId('market-list')
  if (await page.getByTestId('market-list-rail').isVisible().catch(() => false)) {
    await page.getByTestId('market-list-expand').click()
  }
  await list.waitFor({ timeout: 15_000 })
  const search = page.getByTestId('market-search')
  await search.waitFor({ timeout: 15_000 })
  // 行情行依赖实时数据：等首行渲染后再计数
  await expect(marketRows(page).first()).toBeVisible({ timeout: 20_000 })
  const before = await marketRows(page).count()
  expect(before).toBeGreaterThan(0)
  await search.fill('ETH')
  const after = await marketRows(page).count()
  expect(after).toBeLessThan(before)
  expect(after).toBeGreaterThan(0)
  await search.fill('')
  await expect(marketRows(page)).toHaveCount(before)
})

test('G4 榜单视图：切涨幅榜 Top10，行带序号；再切成交榜', async ({ page }) => {
  const tabRank = page.getByTestId('market-tab-rank')
  await tabRank.waitFor({ timeout: 15_000 })
  await tabRank.click()
  await expect(page.getByTestId('market-rank-change')).toBeVisible()
  await page.getByTestId('market-rank-volume').click()
  const rows = marketRows(page)
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeLessThanOrEqual(10)
})
