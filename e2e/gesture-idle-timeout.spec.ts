import { test, expect, type Page } from '@playwright/test'

/**
 * #279：慢拖动不该把「用户正在拖」判成「手势已放弃」（OWNED_MAX_MS 的计时口径）。
 *
 * 判词实证（PR #285 的 E2E run 37396832422 之前那次红）：
 *   claim1/release1(expired×1) ⚠归属曾被超时兜底收回 settle×0
 *   末位落点: BTC/ETH/SOL/BNB report owned=false
 *
 * 根因：`lastClaimAtRef` 只在 pointerdown 写一次，于是 OWNED_MAX_MS(3s) 实际是
 * **手势时长上限**而不是空闲超时。e2e 的 `panCell` 有 24 次串行 mouse.move，
 * CI 上轻易超过 3 秒 —— 所以本机（快）复现不了，只有 CI 稳定复现。
 *
 * 这条测试把那个「只有 CI 才有的慢」**搬进本机**：每步 150ms × 24 步 ≈ 3.6 秒，
 * 确定超过 3 秒，于是修复前必然 `expired`、修复后必然不 `expired`。
 *
 * 变异验证（本机实测，webkit）：
 *   修复前 expired=1 / owned=false×16 → 红；修复后 expired=0 / owned=false×3-4 → 绿。
 */
// 复制 e2e 里 panCell 的形状，但把 24 次串行 move 拉长到 **确定超过 OWNED_MAX_MS(3s)**，
// 用来验证「慢拖动不再被判成手势放弃」。CI 上正是这个量级。
async function panSlow(page: Page, dx: number) {
  const box = await page.evaluate(() => {
    let node = document.querySelector('[data-testid="chart-root"]') as HTMLElement | null
    while (node && !node.querySelector('canvas')) node = node.parentElement
    let best: DOMRect | null = null
    for (const c of Array.from(node?.querySelectorAll('canvas') ?? [])) {
      const r = c.getBoundingClientRect()
      if (!best || r.width * r.height > best.width * best.height) best = r
    }
    return best ? { x: best.x, y: best.y, w: best.width, h: best.height } : null
  })
  expect(box).not.toBeNull()
  if (!box) return
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  const step = dx / 24
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(cx + i * step, cy, { steps: 2 })
    await page.waitForTimeout(150) // 24 × 150ms ≈ 3.6s，确定超过 3s
  }
  await page.mouse.up()
}

test('慢拖动（>3s）不应把归属判成放弃', async ({ page }) => {
  test.setTimeout(120_000)
  const writes: string[] = []
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('debugViewWrites:')) writes.push(t) })
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/?perf=3000&debugViewWrites')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
  await panSlow(page, 200)
  await page.waitForTimeout(1500)
  const expired = writes.filter((l) => l.startsWith('debugViewWrites: release ') && l.includes('"expired"'))
  const ownedFalse = writes.filter((l) => l.startsWith('debugViewWrites: report ') && l.includes('"owned":false'))
  console.log(`[慢拖动] 整段 ${writes.length} 条 · release(expired)=${expired.length} · report owned=false=${ownedFalse.length}`)
  expect(expired.length, '慢拖动期间不该出现归属超时兜底').toBe(0)
})
