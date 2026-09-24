import { expect, test } from '@playwright/test'

/**
 * B1 ★ 十字光标显示副图指标当前值：信息条（chart-indicator-last）跟随光标时刻取值。
 *
 * 断言：设 RSI 副图 → 悬停图表左侧（较早 K 线）→ 信息条显示该时刻的 RSI 值
 * （与「最新值」基线不同）；移出图表 → 恢复最新值（光标无值回落）。
 * 另断言信息条自身的排版边界：均线行多时换行留在图表内，不撑出文档横向滚动。
 * 依赖 ?perf 合成确定性数据（RSI 逐 bar 变化），不依赖网络。
 */

test.describe('B1 十字光标副图指标取值', () => {
  test('信息条跟随光标时刻：hover 取值、移出回落最新', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 设 RSI 副图（「更多」→「参数」面板）
    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '参数' }).click()
    const overlay = page.getByLabel('副图叠加指标')
    await overlay.waitFor({ timeout: 10_000 })
    await overlay.selectOption('rsi')
    await expect(overlay).toHaveValue('rsi')

    // 等指标信息条出现 RSI 行
    const info = page.getByTestId('chart-indicator-last')
    await expect
      .poll(() => info.textContent(), { timeout: 15_000 })
      .toMatch(/RSI/)

    // 主图容器（存量 E2E 用 .chart-container 锚定图表）
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    /**
     * 移到 frac 处，并确认「信息条读的就是光标吸附的那一根」：`crosshair-time` 报光标时刻，
     * `chart-indicator-last[data-value-time]` 报信息条**实际按哪一根取的值**，两者相等才是
     * 本条标题里「跟随光标时刻」的意思。
     *
     * 换掉的是「比较两次 hover 的文本」那套判据，它两个方向都会错：
     *  - 假红（CI 上 firefox 那两次）：光标事件没落上时，两读都是回落值，判词只说「文本相同」，
     *    看不出是「没落上」还是「两根取值恰好一样」；而原来第二次 hover 落在 0.9 —— 末根右边
     *    那段留白没有 K 线可吸附（本机实测那里根本不出现十字光标），那一读大概率就是回落值，
     *    两个回落值相撞只是时序问题。
     *  - 假绿（变异复验逼出来的）：把信息条改成**完全不读光标时刻**，文本照样会随实时 tick 漂，
     *    于是「两次不同」成立 —— 连加了「先等回落值停下来」的基线也还是绿的。
     * 文本会变是 tick 的函数，不是光标的函数；`data-value-time` 才是。
     */
    const hoverAndExpectBar = async (frac: number, label: string) => {
      await page.mouse.move(box.x + box.width * frac, box.y + box.height * 0.35)
      const cross = page.getByTestId('crosshair-time')
      await expect(
        cross,
        `${label}（图表横向 ${Math.round(frac * 100)}% 处）没有出现十字光标`,
      ).toBeVisible({ timeout: 5_000 })
      const barTime = (await cross.getAttribute('data-time')) ?? ''
      expect(barTime, `${label}：crosshair-time 没有报出 data-time`).not.toBe('')
      await expect
        .poll(() => info.getAttribute('data-value-time'), {
          timeout: 5_000,
          message: `${label}：信息条的取值时刻没跟上光标（光标=${barTime}）`,
        })
        .toBe(barTime)
      return barTime
    }

    // 悬停图表左侧（较早的 K 线区）→ 信息条切换为该时刻的指标值
    const leftBar = await hoverAndExpectBar(0.2, '第一次 hover')
    expect(((await info.textContent()) ?? '')).toMatch(/RSI/)
    // 再悬停到偏右的另一根上（**不能用 0.9**：末根右边那段是 rightOffset 留白，
    // 那里没有 K 线可吸附，十字光标本就不出现 —— 本机实测 0.9 处 `crosshair-time` 根本不存在，
    // 而 CI 上 firefox 那两次红正是这种「两读都是回落值」的形状）。
    const rightBar = await hoverAndExpectBar(0.6, '第二次 hover')
    expect(rightBar, `两次 hover 落在同一根 K 线（${leftBar}）上，取值当然相同`).not.toBe(leftBar)

    // 移出图表 → 光标无值，信息条**换回回落分支**（这正是上面那个属性的另一半契约）：
    // 取值时刻清空、内容仍渲染 RSI 行。实时 tick 会推进末根，所以文本只断言「还在渲染」。
    await page.mouse.move(box.x - 40, box.y + box.height * 0.35)
    await expect
      .poll(() => info.getAttribute('data-value-time'), {
        timeout: 8_000,
        message: '移出图表后信息条没有换回回落分支（data-value-time 应清空）',
      })
      .toBe('')
    await expect.poll(() => info.textContent(), { timeout: 8000 }).toMatch(/RSI/)

    expect(errors).toHaveLength(0)
  })

  test('H9 信息条：多周期均线取值换行留在图表内，不撑出文档横向滚动', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    // 7 条主图均线 + 叠加 EMA + VOL 行：单行排布必然宽过图表容器，只有换行才不会溢出
    await page.addInitScript(() => {
      const params = JSON.parse(localStorage.getItem('kline-buty:indicatorParams') ?? '{}')
      localStorage.setItem(
        'kline-buty:indicatorParams',
        JSON.stringify({ ...params, maPeriods: [5, 10, 20, 30, 60, 120, 250], maOverlayEma: true }),
      )
    })
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    const info = page.getByTestId('chart-indicator-last')
    await expect
      .poll(() => info.textContent(), { timeout: 15_000 })
      .toMatch(/MA250/)

    const chart = page.locator('.chart-container').first()
    const [infoBox, chartBox] = [await info.boundingBox(), await chart.boundingBox()]
    expect(infoBox && chartBox ? infoBox.width <= chartBox.width : false).toBe(true)
    expect(infoBox ? infoBox.x + infoBox.width : 1e9).toBeLessThanOrEqual((chartBox?.x ?? 0) + (chartBox?.width ?? 0) + 1)
    // 文档级：不得出现横向滚动条（移动端功能区不横向滚动是同一条硬约束）
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      )
      .toBeLessThanOrEqual(0)

    // 窄屏同一条约束：390px 触屏视口下信息条继续换行，图表与信息条都不越界
    await page.setViewportSize({ width: 390, height: 844 })
    await expect
      .poll(async () => {
        const [narrowInfo, narrowChart] = [await info.boundingBox(), await chart.boundingBox()]
        if (!narrowInfo || !narrowChart) return 1e9
        return narrowInfo.x + narrowInfo.width - (narrowChart.x + narrowChart.width)
      })
      .toBeLessThanOrEqual(1)
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      )
      .toBeLessThanOrEqual(0)
  })
})