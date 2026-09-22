import { expect, test, type Page } from '@playwright/test'

/**
 * G2 视觉回归测试：Playwright 截图对比 + 基线库（基线落在 `e2e/visual.spec.ts-snapshots/`，随仓库提交）。
 *
 * - 基线按平台分文件（`<name>-chromium-darwin.png` / `-linux.png`）：截图依赖平台字体与合成器，
 *   跨平台共用一份必然常红。darwin 由本地 `npm run test:visual` 维护，linux 由
 *   `Visual baseline (Linux)` workflow 手工生成并当场复跑验证确定性；firefox+webkit 跳过本规格，
 *   仍随 `npm run e2e` 全量跑通，不阻塞多浏览器兼容。
 * - 用 `?perf=N` 合成数据保证 K 线形态确定性（不依赖交易所实时行情），
 *   `animations: 'disabled'` + `maxDiffPixelRatio: 0.02` 吸收实时帧跳动的最末根与最新价文字。
 * - 基线更新：`npx playwright test e2e/visual.spec.ts --project=chromium --update-snapshots`
 *
 * 新提交若意外改动布局/配色，本地 `npm run e2e`（以及 CI 里带 linux 基线之后的 E2E job）会在此报差异
 * ——有意的 UI 变更用上面的 update 命令重新生成基线并随提交一起记录原因。
 */

async function gotoStablePerf(page: Page) {
  await page.goto('/?perf=300')
  await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  // 等 canvas 实际布局绘制（width>200 视为已渲染）
  await page.waitForFunction(() => {
    const c = [...document.querySelectorAll('canvas')].find((x) => x.width > 200)
    return Boolean(c)
  })
  // 再等一拍，避开实时帧切换窗口（PERF_TICK_MS=1500，半拍后稳定）
  await page.waitForTimeout(600)
}

const SNAP = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.02,
}

test.describe('G2 视觉回归（chromium · ?perf 合成数据基线）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '视觉基线仅 chromium 维护')

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('首页深色主题主图表', async ({ page }) => {
    await gotoStablePerf(page)
    await expect(page).toHaveScreenshot('home-dark.png', SNAP)
  })

  test('浅色主题主图表', async ({ page }) => {
    await gotoStablePerf(page)
    // 主题切换按钮位于「更多」面板（layout · scale · theme 分区）
    await page.getByTestId('header-more').click()
    // 按钮 aria-label 为「切换主题: 浅色」，用正则匹配
    await page.getByRole('button', { name: /浅色/ }).click()
    // 纯切换类保持展开，截图前收起 More 面板
    await page.getByTestId('header-more').click()
    await page.waitForTimeout(400)
    await expect(page).toHaveScreenshot('home-light.png', SNAP)
  })

  test('指标设置面板（含推荐/画线建议按钮）', async ({ page }) => {
    await gotoStablePerf(page)
    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '参数', exact: true }).click()
    await expect(page.getByTestId('indicator-settings-panel')).toBeVisible()
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('settings-panel.png', SNAP)
  })

  test('移动端 390×844 首页', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoStablePerf(page)
    await expect(page).toHaveScreenshot('mobile-home.png', SNAP)
  })
})