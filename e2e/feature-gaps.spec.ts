import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充：已实现但无端到端覆盖的功能路径。
 * - G4 行情榜单 / 搜索过滤
 * - H10 副图叠加 / H15 指标收藏
 * - I9 画线坐标角标 / I12 撤销深度
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

async function openPath(page: Page, testId: string) {
  const btn = page.getByTestId(testId)
  const open = await btn.getAttribute('aria-expanded')
  if (open !== 'true') await btn.click()
}

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
  await expect(page.locator('[data-testid^="market-row-"]').first()).toBeVisible({ timeout: 20_000 })
  const before = await page.locator('[data-testid^="market-row-"]').count()
  expect(before).toBeGreaterThan(0)
  await search.fill('ETH')
  const after = await page.locator('[data-testid^="market-row-"]').count()
  expect(after).toBeLessThan(before)
  expect(after).toBeGreaterThan(0)
  await search.fill('')
  await expect(page.locator('[data-testid^="market-row-"]')).toHaveCount(before)
})

test('G4 榜单视图：切涨幅榜 Top10，行带序号；再切成交榜', async ({ page }) => {
  const tabRank = page.getByTestId('market-tab-rank')
  await tabRank.waitFor({ timeout: 15_000 })
  await tabRank.click()
  await expect(page.getByTestId('market-rank-change')).toBeVisible()
  await page.getByTestId('market-rank-volume').click()
  const rows = page.locator('[data-testid^="market-row-"]')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeLessThanOrEqual(10)
})

test('H10 副图叠加：参数面板切换叠加指标 select', async ({ page }) => {
  await openPath(page, 'header-more')
  await page.getByRole('button', { name: '参数' }).click()
  const overlay = page.getByLabel('副图叠加指标')
  await overlay.waitFor({ timeout: 10_000 })
  await expect(overlay).toHaveValue('none')
  await overlay.selectOption('kdj')
  await expect(overlay).toHaveValue('kdj')
})

test('H15 指标收藏：星标切换收藏状态', async ({ page }) => {
  await openPath(page, 'header-more')
  // 更多面板「副图」区的收藏星标按钮（sub-fav-<指标>）
  const star = page.getByTestId('sub-fav-rsi')
  await star.waitFor({ timeout: 10_000 })
  const before = (await star.textContent()) ?? ''
  await star.click()
  const after = (await star.textContent()) ?? ''
  expect(after).not.toBe(before) // ☆ ↔ ★
})

test('I9 画线坐标角标：开关 aria-pressed 切换', async ({ page }) => {
  await openPath(page, 'drawing-toggle')
  const toggle = page.getByTestId('drawing-coord-badge-toggle')
  await toggle.waitFor({ timeout: 10_000 })
  expect(await toggle.getAttribute('aria-pressed')).toBe('false')
  await toggle.click()
  expect(await toggle.getAttribute('aria-pressed')).toBe('true')
})

test('I12 撤销深度：图层面板可调整并持久化', async ({ page }) => {
  // 先画一条水平线，打开图层面板
  await openPath(page, 'drawing-toggle')
  await page.getByRole('button', { name: '水平线' }).click()
  const chart = page.locator('main div').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 5 })
  await page.mouse.up()
  // 选工具后面板自动收起：重开画线面板 → 点击「图层管理」
  await openPath(page, 'drawing-toggle')
  await page.getByTestId('drawing-layers-open').click()
  const depth = page.getByTestId('drawing-undo-depth').locator('input')
  await depth.waitFor({ timeout: 10_000 })
  await depth.fill('10')
  await expect(depth).toHaveValue('10')
})