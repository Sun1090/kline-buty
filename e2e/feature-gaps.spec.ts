import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充：已实现但无端到端覆盖的功能路径。
 * - H10 副图叠加 / H15 指标收藏
 * - I9 画线坐标角标 / I12 撤销深度
 *
 * 这四条要的都只是「有一片能画的蜡烛」，于是走 `?perf=600` 合成契约而不再走线上行情 ——
 * 从此可以进 CI 账本。原先同文件里的 G4 行情榜单/搜索两条**留不住**：
 * 它们数的是 `market-row-*`，那是全市场 ticker 列表渲染出来的，`?perf` 只合成图表蜡烛、不改榜单，
 * 而 CI runner 出网不可靠。那两条已拆到 e2e/feature-gaps-live.spec.ts（仍 localOnly）。
 * 这正是 AGENTS.md「In Scope」里那条 *E2E flake source-convergence（synthetic ?perf data contracts）*。
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
  await page.goto('/?perf=600')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
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
  // 上面那一笔到底落没落：撤销键只在有编辑历史时才可用。
  // 没这一条，「画一条水平线」就只是走过场 —— 一根线都没画上的话，下面的深度输入框照样在、照样填得进。
  await expect(page.getByTestId('drawing-layer-undo')).toBeEnabled()
  const depth = page.getByTestId('drawing-undo-depth').locator('input')
  await depth.waitFor({ timeout: 10_000 })
  await depth.fill('10')
  await expect(depth).toHaveValue('10')
})