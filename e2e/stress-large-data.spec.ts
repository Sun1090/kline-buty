import { expect, test, type Page } from '@playwright/test'

/**
 * G3 ★ 大屏数据压测：`?perf=20000`（2 万根确定性合成 K 线，离线）下验证 5000+ 场景：
 *  - 大数据量加载渲染不崩、不丢数据（__klineButyPerf 保持 20000 根）
 *  - 横向拖动能流畅翻页：拖到历史 → 同一点十字光标时间倒退（视口实际滚动，走裁剪/降采样管线）
 *  - 全程无未捕获异常
 */

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

async function waitCandlesRendered(page: Page) {
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(
    () => {
      for (const c of [...document.querySelectorAll<HTMLCanvasElement>('canvas')]) {
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
    },
    { timeout: 30_000 },
  )
}

test.describe('G3 大屏数据压测', () => {
  test('?perf=20000：加载渲染 → 十字光标取时 → 多次拖动翻页 → 数据完整且无异常', async ({ page }) => {
    const errors = collectErrors(page)
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=20000')
    await waitCandlesRendered(page)

    // 数据完整：2 万根仍在（降采样只影响渲染，不丢数据）
    await expect.poll(() =>
      page.evaluate(() => (window as unknown as { __klineButyPerf?: { candles: unknown[] } }).__klineButyPerf?.candles?.length),
    ).toBe(20_000)

    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    const cy = box!.y + box!.height / 2
    const cx = box!.x + box!.width * 0.75

    // 十字光标取时（hover 后 tooltip 附带原始时间戳）
    const timeAt = async () => {
      // webkit 大数据量（20k）下首次 hover 会被 chart 初始渲染吞掉（crosshair 回调不触发），
      // 第二次 move 才稳定触发——重试式 hover 保证跨浏览器确定性
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.mouse.move(cx, cy, { steps: 3 })
        await page.mouse.move(cx + 1, cy)
        const el = page.getByTestId('crosshair-time')
        const ok = await el
          .waitFor({ timeout: 8_000 })
          .then(() => true)
          .catch(() => false)
        if (ok) return Number(await el.getAttribute('data-time'))
      }
      throw new Error('crosshair-time 未出现（多次 hover 均未触发）')
    }
    const tBefore = await timeAt()

    // 多段拖动向右（进入历史）——12 段 × 位移，验证大屏下平移平滑不卡死
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (let seg = 1; seg <= 12; seg++) {
      await page.mouse.move(cx + seg * 30, cy, { steps: 3 })
    }
    await page.mouse.up()
    await page.waitForTimeout(200)

    // 视口确实滚动到更早时间：同一点十字光标时间倒退
    const tAfter = await timeAt()
    expect(tAfter).toBeLessThan(tBefore)

    // 数据不丢 + 无异常
    await expect.poll(() =>
      page.evaluate(() => (window as unknown as { __klineButyPerf?: { candles: unknown[] } }).__klineButyPerf?.candles?.length),
    ).toBe(20_000)
    // 显式捕获的实际错误（若断言失败会在输出中列出）。
    // 排除环境性错误：CI（GitHub 运行器）到币安 WS 被 geo 阻断（HTTP 451）——
    // 应用在 ?perf 离线 K 线外仍会尝试实时盘口 WS，属环境限制非应用缺陷。
    const appErrors = errors.filter((e) => !/WebSocket connection to 'wss:\/\/stream\.binance\.com/.test(e))
    expect(appErrors).toEqual([])
  })
})