import { expect, test, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'

/**
 * B2 指标信号打点（marker 渲染路径）E2E。
 *
 * 应用侧：MA 主图指标启用后，fast/slow（MA5/MA10）的每个金叉/死叉都会生成 marker——
 *   ChartView 用 annotateCrossovers(findCrossovers(...)) 计算后经 adapter.setMainIndicator
 *   渲染：带 label 的点画 B/S 文字标注（canvas drawMarkerLabels），其余画圆点序列。
 *
 * 断言三层：
 * 1. 确定性输入：从 window.__klineButyPerf.candles（?perf 合成数据）在页内重算 MA5/MA10 交叉数，
 *    断言 > 2，证明「存在待渲染 marker」是确定的（合成数据不依赖网络）。
 * 2. 视觉基线：开启 MA 后对主图 canvas 区域截图（chromium 维护基线，G2 同款
 *    animations:disabled + maxDiffPixelRatio:0.02）——marker 未绘制/布局回归会在此失败。
 * 3. 无 pageerror：drawMarkerLabels / point marker 序列渲染路径不抛异常。
 *
 * 基线更新：npx playwright test e2e/marker-render.spec.ts --project=chromium --update-snapshots
 */

const SNAP = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.02,
}

async function gotoPerf(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/?perf=600&period=1m')
  await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  // 等 canvas 实际布局绘制（width>200 视为已渲染）
  await page.waitForFunction(() => {
    const c = [...document.querySelectorAll('canvas')].find((x) => x.width > 200)
    return Boolean(c)
  })
  // 再等一拍避开实时帧切换窗口
  await page.waitForTimeout(600)
}

test.describe('B2 指标信号打点（marker 渲染）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '截图基线仅 chromium 维护')

  test('MA 金叉/死叉：交叉确定存在 + B/S 标注渲染无异常 + 视觉基线', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 打开「更多」→ 主图指标组 → 启用 MA（默认参数 [5,10,20]：fast=MA5 / slow=MA10）
    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    const maBtn = page.getByTestId('main-indicator-ma')
    await maBtn.waitFor({ timeout: 10_000 })
    await maBtn.click()

    // 等指标信息条出现 MA 行（证明主图数据已接线）
    const info = page.getByTestId('chart-indicator-last')
    await expect
      .poll(() => info.textContent(), { timeout: 15_000 })
      .toMatch(/MA5|MA10|MA20/)

    // ① 确定性：页内重算 MA5/MA10 交叉数（合成数据稳定复现）
    const crossovers = await page.evaluate(() => {
      const candles = (window as unknown as { __klineButyPerf?: { candles: { time: number; close: number }[] } })
        .__klineButyPerf?.candles ?? []
      const sma = (period: number) => {
        const out: (number | null)[] = []
        for (let i = 0; i < candles.length; i++) {
          if (i < period - 1) {
            out.push(null)
            continue
          }
          let sum = 0
          for (let j = i - period + 1; j <= i; j++) sum += candles[j].close
          out.push(sum / period)
        }
        return out
      }
      const fast = sma(5)
      const slow = sma(10)
      let count = 0
      for (let i = 1; i < fast.length; i++) {
        if (fast[i - 1] === null || slow[i - 1] === null || fast[i] === null || slow[i] === null) continue
        if ((fast[i - 1]! - slow[i - 1]!) * (fast[i]! - slow[i]!) < 0) count++
      }
      return count
    })
    expect(crossovers).toBeGreaterThan(2)

    // ② 截图基线：主图 canvas 区域（含 MA 线 + 交叉 marker 圆点 + B/S 标注文字）
    // 基线按本机平台提交（darwin）；CI（linux）无对应基线则跳过截图断言，功能断言仍执行
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.waitForTimeout(300)
    const snapPath = `e2e/marker-render.spec.ts-snapshots/ma-cross-markers-chromium-${process.platform}.png`
    if (existsSync(snapPath)) {
      await expect(page).toHaveScreenshot('ma-cross-markers.png', SNAP)
    }

    // ③ 渲染路径无异常
    expect(errors).toEqual([])

    // ④ 关闭面板清理（避免与后续用例脏状态——本文件仅此一个用例，防御性保留）
    await more.click()
  })

  test('SAR 圆点 marker：开启 + 十字光标漫游全程无异常（冒烟加固）', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await gotoPerf(page)

    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    const sarBtn = page.getByTestId('main-indicator-sar')
    await sarBtn.waitFor({ timeout: 10_000 })
    await sarBtn.click()

    // SAR 圆点走 pointMarkersVisible 序列渲染路径：等两拍让 dot 序列落图
    await page.waitForTimeout(800)
    // 十字光标横穿图表（触发 overlay/crosshair + 圆点同帧重绘路径）
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      for (const fx of [0.2, 0.5, 0.8]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * 0.4)
        await page.waitForTimeout(120)
      }
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
    }
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })
})