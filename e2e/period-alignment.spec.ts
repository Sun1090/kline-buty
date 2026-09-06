import { expect, test, type Page } from '@playwright/test'

/**
 * A1 ★ 周期边界对齐（openTime 归一化）：切周期后首根对齐周期边界、序列间隔稳定、往返一致。
 *
 * 依赖压测模式（?perf=N）下的 `window.__klineButyPerf` 数据钩子：
 * 非整点 startTime 传入 → synchronized 到当前周期边界；E2E 直接断言时间戳的
 * 对齐余数（%周期==0）与全序列等差间隔，确定性、不依赖网络。
 */

interface PerfProbe {
  period?: string
  candles?: { time: number }[]
}

async function probe(page: Page): Promise<PerfProbe> {
  return page.evaluate(() => window.__klineButyPerf as PerfProbe | undefined)
}

/** 断言第 i 根对齐 + 全序列等差递增；返回 { first, spacingOk, ascending } */
function inspectCandles(cs: { time: number }[], stepSec: number) {
  const first = cs[0].time
  let spacingOk = true
  let ascending = true
  for (let i = 1; i < cs.length; i++) {
    if (cs[i].time - cs[i - 1].time !== stepSec) spacingOk = false
    if (cs[i].time <= cs[i - 1].time) ascending = false
  }
  return { count: cs.length, first, spacingOk, ascending }
}

/** 等待某周期压测数据就绪（period 匹配且根数符合预期），返回该周期蜡烛快照 */
async function waitReady(page: Page, period: string, count: number): Promise<{ time: number }[]> {
  let cs: { time: number }[] | null = null
  await expect
    .poll(
      async () => {
        const p = await probe(page)
        cs = p?.period === period && p.candles?.length === count ? p.candles : null
        return cs !== null
      },
      { timeout: 20_000 },
    )
    .toBe(true)
  return cs as { time: number }[]
}

/** 主图 canvas 出现行情像素（红跌/绿涨任一），证明切周期后图表重新渲染 */
async function expectCandlesRendered(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const cs = [...document.querySelectorAll('canvas')]
          for (const c of cs) {
            try {
              const ctx = c.getContext('2d')
              if (!ctx || c.width < 100) continue
              const d = ctx.getImageData(0, 0, c.width, c.height).data
              for (let i = 0; i < d.length; i += 200) {
                const r = d[i]
                const g = d[i + 1]
                const b = d[i + 2]
                if ((g > 140 && r < 80 && b < 140) || (r > 200 && g < 120 && b < 120)) return true
              }
            } catch {
              /* noop */
            }
          }
          return false
        }),
      { timeout: 20_000 },
    )
    .toBe(true)
}

async function switchPeriod(page: Page, testId: string, period: string, count: number) {
  await page.getByTestId(testId).click()
  const cs = await waitReady(page, period, count)
  return cs!
}

test.describe('A1 周期边界对齐（openTime 归一化）', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('非整点起始 → 首根对齐周期边界，切 5m→1h→1m 序列间隔稳定且往返一致', async ({ page }) => {
    // 起始时间落在非周期边界（perf 合成 startTime 默认 now，非整 5m/1h；归一化后首根即边界）
    await page.goto('/?perf=320&period=5m')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 5m：320 根，首根 %300==0，全序列间隔 300s、严格升序
    const cs5 = await switchPeriod(page, 'period-5m', '5m', 320)
    const s5 = inspectCandles(cs5, 300)
    expect(s5.count).toBe(320)
    expect(s5.first % 300).toBe(0)
    expect(s5.spacingOk).toBe(true)
    expect(s5.ascending).toBe(true)
    await expectCandlesRendered(page)

    // 切 1h：重新生成 3600s 间隔数据并渲染
    const cs1h = await switchPeriod(page, 'period-1h', '1h', 320)
    const s1h = inspectCandles(cs1h, 3600)
    expect(s1h.first % 3600).toBe(0)
    expect(s1h.spacingOk).toBe(true)
    expect(s1h.ascending).toBe(true)
    await expectCandlesRendered(page)

    // 切 1m：间隔 60s
    const cs1m = await switchPeriod(page, 'period-1m', '1m', 320)
    const s1m = inspectCandles(cs1m, 60)
    expect(s1m.first % 60).toBe(0)
    expect(s1m.spacingOk).toBe(true)
    expect(s1m.ascending).toBe(true)
    await expectCandlesRendered(page)

    // 切回 5m：仍对齐且间隔恢复 300s（反复切换稳定）
    const cs5b = await switchPeriod(page, 'period-5m', '5m', 320)
    const s5b = inspectCandles(cs5b, 300)
    expect(s5b.first % 300).toBe(0)
    expect(s5b.spacingOk).toBe(true)
    expect(s5b.ascending).toBe(true)
    await expectCandlesRendered(page)

    // 全程无错误横幅，页面始终健康
    await expect(page.getByText('实时', { exact: false })).toBeVisible()
  })
})