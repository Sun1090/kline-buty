import { expect, test, type Page } from '@playwright/test'

/**
 * A4 ★ 多周期同屏十字光标时间同步（quad）：四格十字光标按时间同步。
 *
 * 断言（颜色无关的 canvas 快照差异法）：quad 布局下 hover BTC 格 →
 * ① BTC 自格十字光标层出现绘制（快照变化）；② 其余三格（ETH/SOL/BNB）
 * 十字光标层出现同步绘制。时间经 adapter 按时间戳在本地数据上定位，跨周期对齐。
 * 依赖 ?perf 合成确定性数据，不依赖网络。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

/**
 * 单元格图表的粗粒度快照签名：扫描格内所有 canvas，统计非空像素数；
 * 目标 = 绘制内容最多的 canvas（蜡烛图本体，十字光标画在其上），
 * 返回其内容指纹，只比较「是否有新绘制」（颜色无关）。
 */
function cellSnapshot(page: Page, symbol: string) {
  return page.evaluate((sym) => {
    const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`) as HTMLElement | null
    const cell = sel?.parentElement
    if (!cell) return { canvasFound: false, pixels: 0, fingerprint: 0, center: null }
    let best: HTMLCanvasElement | null = null
    let bestPainted = 0
    let bestFingerprint = 0
    for (const c of cell.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect()
      if (r.width < 20 || r.height < 20) continue
      const ctx = c.getContext('2d')
      if (!ctx) continue
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let painted = 0
      let fingerprint = 0
      for (let i = 0; i < d.length; i += 16) {
        const rr = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        if (rr > 40 || g > 40 || b > 40) painted++
        fingerprint = (fingerprint + rr * 31 + g * 7 + b * 13) % 1_000_000_007
      }
      if (painted > bestPainted) {
        bestPainted = painted
        bestFingerprint = fingerprint
        best = c as HTMLCanvasElement
      }
    }
    if (!best) return { canvasFound: false, pixels: 0, fingerprint: 0, center: null }
    const rect = best.getBoundingClientRect()
    return {
      canvasFound: true,
      pixels: bestPainted,
      fingerprint: bestFingerprint,
      center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    }
  }, symbol)
}

test.describe('A4 多周期十字光标时间同步（quad）', () => {
  test('hover 一格十字光标 → 其余格按时间同步出现绘制', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=1500')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 「更多」菜单里切布局：single → pair → quad
    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByTestId('layout-toggle').click()
    await page.getByTestId('layout-toggle').click()
    await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 15_000 })

    // 基线快照（各格均需有 canvas）
    const base = new Map<string, Awaited<ReturnType<typeof cellSnapshot>>>()
    for (const sym of CELLS) base.set(sym, await cellSnapshot(page, sym))
    for (const sym of CELLS) expect(base.get(sym)!.canvasFound, `${sym} 格应有十字光标层 canvas`).toBe(true)

    // hover BTC 格中心（鼠标落位后再微移，确保 mousemove 派发到图表）
    const center = (await cellSnapshot(page, 'BTCUSDT')).center
    expect(center).not.toBeNull()
    if (!center) return
    await page.mouse.move(center.x, center.y)
    await page.mouse.move(center.x + 2, center.y)
    await page.waitForTimeout(600)

    // ① BTC 自格出现十字光标绘制（快照指纹变化）
    await expect
      .poll(async () => (await cellSnapshot(page, 'BTCUSDT')).fingerprint, { timeout: 8000 })
      .not.toBe(base.get('BTCUSDT')!.fingerprint)

    // ② 其余三格被同步：十字光标层快照指纹均变化
    for (const sym of CELLS.slice(1)) {
      await expect
        .poll(async () => (await cellSnapshot(page, sym)).fingerprint, { timeout: 8000 })
        .not.toBe(base.get(sym)!.fingerprint)
    }

    expect(errors).toHaveLength(0)
  })
})