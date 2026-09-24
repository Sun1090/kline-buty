import { test, expect } from '@playwright/test'

/**
 * `smoke.spec.ts` 拆出来的**离不开线上行情**那一条。
 *
 * 为什么只有这一条：主冒烟文件其余 19 例改走 `?perf=600` 合成契约后 chromium 19/19 全绿，
 * 已经进 CI 账本；而这一例断言的是信息条上的「资金费率」—— 它来自 `useMarketStats`，
 * 那个 hook 在 `isPerfMode()` 下直接 `return`（`src/hooks/useMarketStats.ts:40`，注释写着
 * 「数据源全合成，禁止真实 REST（stats 保持空）」）。也就是说 `?perf` 下这一行**按设计**不存在，
 * 不是没渲染出来。要验「真实端点确实喂进了界面」，就必须真的打一次行情 REST，
 * 而 CI runner 出网不可靠 —— 所以它留在 localOnly。
 *
 * 顺带记一条被推翻的推断：这一族的 `localOnly` 理由原先还写着「自选收藏依赖行情列表」。
 * 实测不成立 —— 交易对下拉里的星标用的是下拉自己的列表，`?perf` 下 `market-row-*` 侧栏为空
 * （`useTickerList` 在 perf 下 `setRows([])`）也照样能收藏，所以那一条留在了主文件里。
 */

test.describe('K 线应用冒烟（线上行情）', () => {
  test('页面加载 → 实时行情 + 图表渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('canvas').first()).toBeVisible()
    // 信息条数据（资金费率等）
    await expect(page.getByText('资金费率', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    // WS 帧驱动的实时价（无需手动刷新，帧到达即跳动更新）：
    // 默认 1 分周期帧稀疏、视觉跳动细微，切到 1 秒周期后价格应持续变动
    const livePrice = page.getByTestId('live-price')
    await expect(livePrice).toBeVisible({ timeout: 20_000 })
    await expect(livePrice).toContainText(/[\d.,]+/)
    await page.getByRole('button', { name: '1秒' }).click()
    // 先确保 WS 处于「实时」连接状态（避免重连窗口期无帧导致的假失败），再测价格变动
    await expect(page.getByTestId('conn-status')).toContainText('实时', { timeout: 30_000 })
    const p1 = (await livePrice.textContent()) ?? ''
    await expect.poll(() => livePrice.textContent(), { timeout: 30_000 }).not.toBe(p1)
  })
})
