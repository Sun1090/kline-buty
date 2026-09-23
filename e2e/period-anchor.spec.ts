import { expect, test, type Page } from '@playwright/test'

/**
 * A2 ★ 周期切换右侧锚定（不跳到最新之外）：切换后视图相对位置稳定。
 *
 * 断言杠杆用「回到最新」按钮（back-to-latest）：回看历史时出现、停在最新时隐藏。
 * - 停在最新处切周期（1m→5m→1h→1m）→ 仍锚定最新，按钮保持隐藏（不越界）；
 * - 回看历史处切周期 → 仍远离最新，按钮保持可见（不跳回最新）。
 * 精确的右缘时间↔跨度映射由单测 anchorRangeForSwitch（cull.test.ts）覆盖，
 * 此处验证端到端接线（perf 合成数据确定性 + window.__klineButyPerf 就绪探针）。
 */

const PERF_COUNT = 5_000

interface PerfProbe {
  period?: string
  candles?: unknown[]
}

async function perfPeriod(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window.__klineButyPerf as PerfProbe | undefined)?.period)
}

function waitPerfReady(page: Page, period: string) {
  return expect.poll(() => perfPeriod(page), { timeout: 20_000 }).toBe(period)
}

/**
 * A11 可视范围文本 → 当前视野实际覆盖了多少根 K 线、右缘是否就是最后一根。
 *
 * 文本由 Intl.DateTimeFormat 按 locale 格式化（时区固定 UTC，与 App 默认一致），所以不去解析
 * 日期，而是用同样的规则把合成数据格式化回来做等值匹配——把「视野被压成 2~5 根」这种
 * 状态错直接钉死（按钮只能证明右缘索引算对，压扁后仍在最新，按钮不红）。
 * 只取跨度不取右缘：右缘要和「读到的这一刻的最后一根」比，而 perf 合成数据每 1.5s 就长一根，
 * 显示器上的右缘天然落后于数组末尾，比不得。
 */
async function readVisibleSpan(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const text = document.querySelector('[data-testid="chart-visible-range"]')?.textContent ?? ''
    const candles = (window.__klineButyPerf?.candles ?? []) as { time: number }[]
    if (!text || candles.length === 0) return null
    const thisYear = new Date().getUTCFullYear()
    for (const locale of ['en-US', 'zh-CN', 'en-GB']) {
      const fmt = new Intl.DateTimeFormat(locale, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      })
      let first: number | null = null
      let last: number | null = null
      for (let i = 0; i < candles.length; i++) {
        const d = new Date(candles[i].time * 1000)
        const s = d.getUTCFullYear() < thisYear
          ? new Intl.DateTimeFormat(locale, {
              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
              hour12: false, timeZone: 'UTC', year: '2-digit',
            }).format(d)
          : fmt.format(d)
        if (!text.includes(s)) continue
        if (first === null) first = i
        last = i
      }
      if (first !== null && last !== null) return last - first + 1
    }
    return null
  })
}

/** 主图拖拽向右 → 视图进入历史（复用 smoke 平移模式，靠持久视图远离最新） */async function panIntoHistory(page: Page) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= 45; i++) {
    await page.mouse.move(cx + i * 18, cy, { steps: 2 })
  }
  await page.mouse.up()
}

test.describe('A2 周期切换右侧锚定', () => {
  // webkit 在重负载 CI runner 下合成数据大窗口切周期锚定收敛可达数十秒（v0.5.13 复现）。
  // 预算必须盖得住本用例自己声明的每步上限之和：初始就绪 30s + 5 次 waitPerfReady 20s
  // + 45s×2 + 8s×3 + 15s×2 ≈ 266s；原先写 150s，慢机上必然在某个动作上被全局超时打断
  // （CI 上就红在最后的 back-to-latest 点击）。取 280s 留一点拖拽余量。
  test.setTimeout(280_000)
  test('停在最新切周期不越界；回看切周期不跳最新（双向稳定 + 范围显示）', async ({ page, browserName }) => {
    // firefox：Playwright 合成鼠标事件与 lightweight-charts pressedMouseMove 不兼容（真机正常），
    // 拖拽平移在 firefox CI 无法合成；回看→切周期锚定由 chromium/webkit 覆盖
    test.skip(browserName === 'firefox', 'firefox 下合成鼠标拖拽平移不可用（Playwright+轻量级图表限制）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const back = page.getByTestId('back-to-latest')
    const visibleRange = page.getByTestId('chart-visible-range')

    await page.addInitScript(() => localStorage.clear())
    await page.goto(`/?perf=${PERF_COUNT}&period=1m`)
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
    await waitPerfReady(page, '1m')
    // 初始停在最新 → 无「回到最新」；可视范围已渲染（A11 数据正确性连带修复）
    await expect(back).toHaveCount(0)
    await expect(visibleRange).toBeVisible()

    // 停在最新处切 5m → 仍锚定最新（不越界），范围显示随之更新
    // 切之前记下视野宽度（合成数据约千根量级），用来验证「切周期不会把视野压扁」
    const beforeSpan = await readVisibleSpan(page)
    expect(beforeSpan ?? 0).toBeGreaterThan(50)
    // 合成数据大窗口切周期锚定在慢机/高负载下可达数十秒，放宽到 45s 防负载抖动误报（v0.5.13 二次硬化）
    await page.getByTestId('period-5m').click()
    await waitPerfReady(page, '5m')
    await expect(back).toHaveCount(0, { timeout: 45000 }) // 关键：停在最新处切周期不跳出最新
    await expect(visibleRange).toBeVisible()
    // 关键：锚定后视野宽度量级不变、右缘仍是最新一根。历史缺陷是窗口迁移自锁振荡 +
    // setData 期间补发的陈旧可见区间把视野压成 2~5 根——那时右缘仍在最新，按钮不红，只有跨度能抓住
    await expect
      .poll(async () => (await readVisibleSpan(page)) ?? 0, { timeout: 20_000, message: '切周期后视野不应塌缩' })
      .toBeGreaterThan(50)

    // 最新处切 1h → 仍最新
    await page.getByTestId('period-1h').click()
    await waitPerfReady(page, '1h')
    await expect(back).toHaveCount(0, { timeout: 45000 })

    // 回看历史 → 「回到最新」出现（firefox 拖拽事件时序不同，必要时多拖几次）
    for (let attempt = 0; attempt < 5 && !(await back.isVisible().catch(() => false)); attempt++) {
      await panIntoHistory(page)
    }
    await expect(back).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(300) // 惯性停稳后再切周期

    // 回看处切 5m → 右侧锚定，仍远离最新（不跳回最新）
    await page.getByTestId('period-5m').click()
    await waitPerfReady(page, '5m')
    await expect(back).toBeVisible({ timeout: 8000 }) // 关键：回看跨周期保持历史
    await expect(visibleRange).toBeVisible()

    // 点「回到最新」→ 回到最新，按钮消失；再切 1m 仍最新（稳定往返）
    // 合成 tick（1.5s 间隔）+ 周期切换让按钮所在的重渲染窗口反复出现，单次 click 的
    // 稳定性等待可能一直吃预算；有界重试既保留真实点击语义，又不会把整测时间耗在同一等待上
    await expect
      .poll(
        async () => {
          if (!(await back.isVisible().catch(() => false))) return true
          await back.click({ force: true, timeout: 4_000 }).catch(() => undefined)
          return false
        },
        { timeout: 30_000, message: '点「回到最新」应让按钮消失' },
      )
      .toBe(true)
    await page.getByTestId('period-1m').click()
    await waitPerfReady(page, '1m')
    await expect(back).toHaveCount(0, { timeout: 15000 })

    expect(errors).toHaveLength(0)
  })
})