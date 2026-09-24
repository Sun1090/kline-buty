import { test, expect } from '@playwright/test'
import { openMore } from './helpers/smoke'

/**
 * 从 `e2e/smoke-depth.spec.ts` 拆出来的**离不开线上行情**那一条（正文逐字搬过来，未改写）。
 *
 * 为什么只有百分比那几行离不开线上：情绪面板四类指标的数值来自 `useSentiment`，而它在
 * `isPerfMode()` 下直接 `return`（`src/hooks/useSentiment.ts:36`，「禁止真实 fapi/dapi REST，
 * 数据保持空」）。`?perf` 下实测：面板开得出、四类标题在、「多/空」标签也在，但
 * `[data-testid="sentiment-panel"]` 里等不到任何 `%` 值（报 `element(s) not found`）。
 * 「标题 + 开合」那一半留在主文件里进 CI，「数值真渲染出来」这一半留在这里。
 *
 * 这条同时是「直连 CORS 修复」的回归闸：`/futures/data` 必须走带 CORS 的 fapi 域名。
 *
 * 拆的时候有一次把正文精简成「只留一条标题 + 三条数值」，结果 `panel.getByText(/%/)` 等满 20s
 * 仍 not found，而逐字不动的整例 989ms 就过。**这条差异的成因我没有钉死**，不要当结论用：
 * 一个很硬的混淆项就是我自己反复本地跑把 fapi 打到限流（Binance 的 429/418 会让这一轮数据为空），
 * 也就是说「精简版红」可能只是撞上了节流窗口，而不是精简本身。
 * 总之这里保持逐字，一是因为它本来就是已知通过的形状，二是别在没有对照实验的情况下顺手改断言。
 */

test.describe('盘口与深度面板（线上行情）', () => {
  test('情绪面板：开合 + 四类指标标题可见 + 直连 CORS 修复后真实数据渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('大户持仓多空比')).toBeVisible()
    await expect(page.getByText('主动买卖比')).toBeVisible()
    await expect(page.getByText('未平仓 24h')).toBeVisible()
    // 直连模式下 /futures/data 必须走 fapi.binance.com（带 CORS）：
    // 有「多/空」+ 百分比即代表真实数据已渲染，而非停留在「加载中」
    const panel = page.locator('[data-testid="sentiment-panel"]')
    await expect(panel.getByText(/多/).first()).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByText(/%/).first()).toBeVisible({ timeout: 20_000 })
    await expect(panel.getByText(/^\d+\.\d+$/).first()).toBeVisible()
    await openMore(page)
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toHaveCount(0)
  })
})
