import { expect, test } from '@playwright/test'
import { dragContainerPointer, dragSelectedAnchorUntil, findDrawnLineCenter, findDrawnPixels, hitDrawnPixelUntil, openDrawing, pickDrawingTool, findHorizontalBandAnchor, findHorizontalLineAnchor, findVerticalBandAnchor, waitCandlesRendered } from './helpers/smoke'
/**
 * 画线工具端到端覆盖（自 smoke.spec.ts 拆出）：绘制 → 落库 → 像素校验 → 删除。
 * 锚点寻找与像素带比对来自 e2e/helpers/smoke.ts。
 *
 * 数据源：`?perf=600` 合成蜡烛（39 处 goto 全换）。它原先挂 localOnly 的理由是
 * 「40 例走真实行情页，逐条像素校验」—— 但同族的 drawing-contract / drawing-semantics 早就在 CI 里
 * 用 `?perf=600` 跑同样的鼠标绘制 + 像素比对，合成数据对此完全够用。
 * 本机实测 chromium 40/40、webkit 26/26（另 14 条按文件里既有的 browserName 条件跳过，非本次引入）。
 * firefox 本机起不来（browserType.launch 失败），三浏览器以本条 PR 的 CI 为准。
 */

test.describe('画线工具', () => {
  test.use({ acceptDownloads: true })

  test('画线：绘制水平线 → 选中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '水平线')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 在图表中部按住拖动画一条水平线
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 5 })
    await page.mouse.up()
    // 画线已提交并持久化
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d).reduce((n, arr) => n + (arr as unknown[]).length, 0)
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0)
    // 创建后自动选中 → 删除按钮出现
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：垂直线 → 选中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '垂直线')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 单点工具：单击放置（down → 微动 → up）
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.51, box!.y + box!.height * 0.4, { steps: 2 })
    await page.mouse.up()
    // 画线已提交并持久化（type = vertical）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'vertical').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0)
    // 创建后自动选中 → 删除按钮出现
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：平行通道 → 选中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '平行通道')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出两锚点（基线 + 平行线）
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.42, { steps: 4 })
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.3, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：水平通道 + XABCD 形态 + 艾略特波浪 → 绘制 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'webkit 栅格化像素列分组/颜色阈值差异——画线功能由 chromium 像素级覆盖与单测保障')
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 水平通道：拖出两条水平线（上下沿）
    await pickDrawingTool(page, '水平通道')
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.55, { steps: 5 })
    await page.mouse.up()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'hchannel').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 切回鼠标后，可见锚点必须可拖：下边框锚点对应 points[1]，拖拽后时间与价格都变化。
    await pickDrawingTool(page, '鼠标', true)
    await expect.poll(() => findHorizontalLineAnchor(page, 'max'), { timeout: 5_000 }).not.toBeNull()
    const readHchannel = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d).flat().filter((x: unknown) => (x as { type?: string }).type === 'hchannel')
          return (arr[0] as { id: string; points: { time: number; price: number }[] }) ?? null
        } catch {
          return null
        }
      })
    const beforeHchannel = await readHchannel()
    expect(beforeHchannel).not.toBeNull()
    expect(beforeHchannel!.points).toHaveLength(2)
    let hchannelAnchorDragged = false
    for (let attempt = 0; attempt < 4 && !hchannelAnchorDragged; attempt++) {
      const anchor = await findHorizontalLineAnchor(page, 'max')
      if (!anchor) {
        await page.waitForTimeout(200)
        continue
      }
      await page.evaluate(
        ({ x, y }) => {
          const chart = document.querySelector('main .chart-container') as HTMLElement | null
          if (!chart) return
          const fire = (type: string, tx: number, ty: number) =>
            chart.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                composed: true,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                clientX: chart.getBoundingClientRect().left + tx,
                clientY: chart.getBoundingClientRect().top + ty,
                button: type === 'pointermove' ? -1 : 0,
                buttons: type === 'pointerup' ? 0 : 1,
              }),
            )
          const down = new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            clientX: chart.getBoundingClientRect().left + x,
            clientY: chart.getBoundingClientRect().top + y,
            button: 0,
            buttons: 1,
          })
          chart.dispatchEvent(down)
          fire('pointermove', x + 1, y + 1)
          fire('pointermove', x + Math.max(1, chart.clientWidth * 0.05), y + chart.clientHeight * 0.06)
          fire('pointerup', x + Math.max(1, chart.clientWidth * 0.05), y + chart.clientHeight * 0.06)
        },
        { x: anchor.x, y: anchor.y },
      )
      for (let poll = 0; poll < 6 && !hchannelAnchorDragged; poll++) {
        await page.waitForTimeout(400)
        const after = await readHchannel()
        if (!after || after.id !== beforeHchannel!.id || after.points.length !== 2) continue
        // hchannel 按价格重排：被拖点低于另一端时会交换索引。
        // 实时行情平移会让多次重试前的固定索引基准过期，这里只要求快照确实变化且仍是合法升序通道。
        const changed =
          JSON.stringify(after.points) !== JSON.stringify(beforeHchannel!.points)
        const sorted = after.points[0].price <= after.points[1].price
        hchannelAnchorDragged = changed && sorted
      }
    }
    expect(hchannelAnchorDragged).toBe(true)
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // XABCD 形态：五点点击（X/A/B/C/D）集满提交
    await pickDrawingTool(page, 'XABCD 形态')
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25)
    await page.mouse.click(box!.x + box!.width * 0.42, box!.y + box!.height * 0.4)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.68, box!.y + box!.height * 0.45)
    await page.mouse.click(box!.x + box!.width * 0.8, box!.y + box!.height * 0.35)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const xs = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'xabcd')
              return xs.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 艾略特波浪：五点点击（1/2/3/4/5）集满提交
    await pickDrawingTool(page, '艾略特波浪')
    await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.4)
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.58, box!.y + box!.height * 0.4)
    await page.mouse.click(box!.x + box!.width * 0.72, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.85, box!.y + box!.height * 0.42)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'elliott').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：文本标注 → 输入文字 → 确定 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '文本')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 单击放置（down → 微动 → up）
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.52, box!.y + box!.height * 0.4, { steps: 2 })
    await page.mouse.up()
    await expect(page.getByPlaceholder('文本内容')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('文本内容').fill('关键位')
    await page.getByRole('button', { name: '确定' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：文本标注多行/字号/颜色 → 落库 → 重新编辑恢复 → 像素校验 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '文本')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 单击放置（down → 微动 → up）
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.52, box!.y + box!.height * 0.4, { steps: 2 })
    await page.mouse.up()
    await expect(page.getByPlaceholder('文本内容')).toBeVisible({ timeout: 5000 })
    // 多行文本 + 字号 +2 两次 → 18 + 蓝色
    await page.getByPlaceholder('文本内容').fill('关键位\n支撑位')
    await page.getByTestId('text-font-inc').click()
    await page.getByTestId('text-font-inc').click()
    await expect(page.getByTestId('text-font-value')).toHaveText('18')
    await page.getByTestId('text-color-blue').click()
    await expect(page.getByTestId('text-color-blue')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('text-confirm').click()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 落库：多行文本 + fontSize + color
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)[0] as { type: string; text?: string; fontSize?: number; color?: string }[]
        return arr[0] ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('text')
    expect(saved!.text).toBe('关键位\n支撑位')
    expect(saved!.fontSize).toBe(18)
    expect(saved!.color).toBe('#4e9cf5')

    // 重新编辑：恢复多行文本 / 字号 / 颜色
    await page.getByRole('button', { name: '改字' }).click()
    await expect(page.getByPlaceholder('文本内容')).toHaveValue('关键位\n支撑位')
    await expect(page.getByTestId('text-font-value')).toHaveText('18')
    await expect(page.getByTestId('text-color-blue')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('text-confirm').click()
    await page.waitForTimeout(300)

    // 像素：overlay 出现蓝色文本（18px 两行）→ 蓝色像素量明显
    const bluePx = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 100 && r < 130 && g > 110 && g < 200 && b > 190) n++
        }
        return n
      })
    await expect.poll(() => bluePx(), { timeout: 10_000 }).toBeGreaterThan(150)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(d)[0]?.length ?? -1
      } catch {
        return -2
      }
    })) === 0).toBe(true)
  })

  test('画线：文本标注快捷编辑 → 桌面双击文本本体直接打开编辑器（内容回填）→ 改字落库 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '文本')
    await page.waitForTimeout(200)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    // 单击放置文本
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.4, { steps: 2 })
    await page.mouse.up()
    await expect(page.getByPlaceholder('文本内容')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('文本内容').fill('快捷编辑')
    await page.getByTestId('text-confirm').click()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    // 桌面工具保持「文本」，切回「鼠标」只读模式后双击才走快捷编辑
    await openDrawing(page)
    await page.getByTestId('desktop-drawing-panel').getByRole('button', { name: '鼠标', exact: true }).click()
    await page.waitForTimeout(300)
    // 双击文本本体（以 overlay 实际渲染位置为准）→ 编辑器直接打开且内容回填
    const center = await findDrawnLineCenter(page)
    expect(center).not.toBeNull()
    if (!center) return
    await page.mouse.dblclick(center.x, center.y)
    await expect(page.getByPlaceholder('文本内容')).toHaveValue('快捷编辑', { timeout: 5000 })
    // 改字 → 确认 → 落库
    await page.getByPlaceholder('文本内容').fill('快捷编辑v2')
    await page.getByTestId('text-confirm').click()
    await expect(page.getByPlaceholder('文本内容')).toHaveCount(0)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)[0] as { type: string; text?: string }[]
        return arr[0] ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('text')
    expect(saved!.text).toBe('快捷编辑v2')
    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)[0]?.length ?? -1
            } catch {
              return -2
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：周期线 → A→B 定义周期 → 落库两点 → 像素校验选中蓝色周期竖线（≥3 根等比线）→ 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '周期线')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（A 为原点，B 定义周期）：横向跨度约 12% 宽 → 延伸线多根可见
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.57, box!.y + box!.height * 0.4, { steps: 5 })
    await page.mouse.up()
    // 落库：type=cycle，两点保持 A→B 原始顺序
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'cycle')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'cycle')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：刚创建处于选中态 → overlay 出现蓝色周期竖线（选中色）。
    // 断言蓝色像素量明显，且分布在 ≥3 个独立 x 列（锚点线 + 至少两根延伸虚线），证明多根等比周期线已渲染
    const blueLineStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        const cols = [...colCount.values()].filter((c) => c > 20).length
        return { n, cols }
      })
    await expect.poll(() => blueLineStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(500)
    await expect.poll(() => blueLineStats().then((s) => s.cols), { timeout: 10_000 }).toBeGreaterThanOrEqual(3)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'cycle').length
      } catch {
        return -1
      }
    })) === 0).toBe(true)
  })

  test('画线：斐波那契时间区间 → A→B 定义基期 → 落库两点 → 像素校验选中蓝色分界线（≥3 列）→ 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '斐波那契时间区间')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（A 为原点，B 定义基期）：横向跨度约 10% 宽 → 斐波那契倍数分界线多根可见
    await page.mouse.move(box!.x + box!.width * 0.42, box!.y + box!.height * 0.42)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.52, box!.y + box!.height * 0.42, { steps: 5 })
    await page.mouse.up()
    // 落库：type=fibtz，两点保持 A→B 原始顺序
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'fibtz')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'fibtz')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：刚创建处于选中态 → overlay 出现蓝色斐波那契分界线（选中色）。
    // 断言蓝色像素分布在 ≥3 个独立 x 列（n=1 实线 + n=2/3/5… 虚线），证明多根斐波那契分界线已渲染
    const blueLineStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        const cols = [...colCount.values()].filter((c) => c > 20).length
        return { n, cols }
      })
    await expect.poll(() => blueLineStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(400)
    await expect.poll(() => blueLineStats().then((s) => s.cols), { timeout: 10_000 }).toBeGreaterThanOrEqual(3)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'fibtz').length
      } catch {
        return -1
      }
    })) === 0).toBe(true)
  })

  test('画线：趋势角度 → 拖 A→B → 落库两点按时间排序 → 像素校验选中蓝色线段 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '趋势角度')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（带倾斜：横向 + 纵向都有位移 → 夹角标签非 0°）
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.5, { steps: 5 })
    await page.mouse.up()
    // 落库：type=angle，两点按时间排序（先左后右）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'angle')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'angle')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：刚创建处于选中态 → overlay 出现蓝色线段 + 角度标签/圆弧
    const bluePx = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 100 && r < 130 && g > 110 && g < 200 && b > 190) n++
        }
        return n
      })
    await expect.poll(bluePx, { timeout: 10_000 }).toBeGreaterThan(150)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'angle').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：时间区间 → 拖 A→B → 落库两点按时间排序 → 像素校验选中蓝色竖带双边框 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'webkit 栅格化像素列分组/颜色阈值差异——画线功能由 chromium 像素级覆盖与单测保障')
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '时间区间', true)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（横向跨度 → 竖带）
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 5 })
    await page.mouse.up()
    // 落库：type=timerange，两点按时间排序（先左后右）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'timerange')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const readTimerange = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)
            .flat()
            .filter((x: unknown) => (x as { type?: string }).type === 'timerange')
          return (arr[0] as { id: string; points: { time: number; price: number }[] }) ?? null
        } catch {
          return null
        }
      })
    const saved = await readTimerange()
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：刚创建处于选中态 → overlay 出现蓝色竖带双边框（≥2 个独立 x 列），且带内区域半透明填充
    const blueBandStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        const cols = [...colCount.values()].filter((c) => c > 20).length
        return { n, cols }
      })
    await expect.poll(() => blueBandStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(300)
    await expect.poll(() => blueBandStats().then((s) => s.cols), { timeout: 10_000 }).toBeGreaterThanOrEqual(2)

    // 切回鼠标后，右侧窗口锚点必须可拖：拖尾锚点后时间区间仍保持两点且时间升序。
    await pickDrawingTool(page, '鼠标', true)
    await expect.poll(() => findVerticalBandAnchor(page, 'max'), { timeout: 5_000 }).not.toBeNull()
    const beforeTimerange = await readTimerange()
    expect(beforeTimerange).toEqual(saved)
    let timerangeAnchorDragged = false
    for (let attempt = 0; attempt < 4 && !timerangeAnchorDragged; attempt++) {
      const anchor = await findVerticalBandAnchor(page, 'max')
      if (!anchor) {
        await page.waitForTimeout(200)
        continue
      }
      await dragContainerPointer(page, anchor.x, anchor.y, box!.width * 0.05, box!.height * 0.04)
      for (let poll = 0; poll < 6 && !timerangeAnchorDragged; poll++) {
        await page.waitForTimeout(500)
        const after = await readTimerange()
        timerangeAnchorDragged =
          !!after &&
          after.id === saved!.id &&
          after.points.length === 2 &&
          after.points[0].time < after.points[1].time &&
          JSON.stringify(after) !== JSON.stringify(beforeTimerange)
      }
    }
    expect(timerangeAnchorDragged).toBe(true)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'timerange').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：价格带 → 拖 A→B → 落库两点按价格排序 → 像素校验选中蓝色水平带双边框 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'webkit 栅格化像素列分组/颜色阈值差异——画线功能由 chromium 像素级覆盖与单测保障')
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '价格带')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（纵向跨度 → 水平带）
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.6, { steps: 5 })
    await page.mouse.up()
    // 落库：type=pband，两点按价格排序（低价在前）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pband')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'pband')
        return (arr[0] as { id: string; type: string; points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].price).toBeLessThan(saved!.points[1].price)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 切回鼠标 → 选中屏幕下边框锚点并向下拖拽：该锚点对应 points[0]（最低价）。
    // 被拖锚点的时间和价格都应变化；高价端保持不变，且两点仍按价格升序。
    await pickDrawingTool(page, '鼠标', true)
    await expect
      .poll(() => findHorizontalBandAnchor(page, 'max'), { timeout: 5_000 })
      .not.toBeNull()
    const readPband = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)
            .flat()
            .filter((x: unknown) => (x as { type?: string }).type === 'pband')
          return (arr[0] as { id: string; type: string; points: { time: number; price: number }[] }) ?? null
        } catch {
          return null
        }
      })
    const beforeLowerDrag = await readPband()
    expect(beforeLowerDrag).toEqual(saved)
    // 每次尝试前重新扫描当前下边框锚点；实时行情会平移图表，必须跟随最新渲染位置。
    // overlay 扫描返回的是容器坐标，而 adapter 的 pointer 判定也使用容器坐标，
    // 因此这里直接在容器上派发 PointerEvent，避免 page.mouse 的窗口坐标二次换算。
    let lowerDragged = false
    for (let attempt = 0; attempt < 4 && !lowerDragged; attempt++) {
      const anchor = await findHorizontalBandAnchor(page, 'max')
      if (!anchor) {
        await page.waitForTimeout(100)
        continue
      }
      await page.evaluate(
        ({ x, y }) => {
          const chart = document.querySelector('main .chart-container') as HTMLElement | null
          if (!chart) return false
          const fire = (type: string, tx: number, ty: number) =>
            chart.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                composed: true,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                clientX: chart.getBoundingClientRect().left + tx,
                clientY: chart.getBoundingClientRect().top + ty,
                button: type === 'pointermove' ? -1 : 0,
                buttons: type === 'pointerup' ? 0 : 1,
              }),
            )
          // adapter 使用容器坐标判定锚点；扫描已返回同一坐标系。
          // 先小步移动进入拖拽，再拖到目标点，避免 page.mouse 再次做窗口坐标换算。
          const down = new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            clientX: chart.getBoundingClientRect().left + x,
            clientY: chart.getBoundingClientRect().top + y,
            button: 0,
            buttons: 1,
          })
          chart.dispatchEvent(down)
          fire('pointermove', x + 1, y + 1)
          fire('pointermove', x + Math.max(1, chart.clientWidth * 0.06), y + chart.clientHeight * 0.07)
          fire('pointerup', x + Math.max(1, chart.clientWidth * 0.06), y + chart.clientHeight * 0.07)
        },
        { x: anchor.x, y: anchor.y },
      )
      for (let poll = 0; poll < 6 && !lowerDragged; poll++) {
        await page.waitForTimeout(500)
        const after = await readPband()
        if (!after || after.id !== saved!.id || after.points.length !== 2) continue
        lowerDragged =
          after.points[1].time === saved!.points[1].time &&
          after.points[1].price === saved!.points[1].price &&
          after.points[0].time !== saved!.points[0].time &&
          after.points[0].price !== saved!.points[0].price &&
          after.points[0].price < saved!.points[0].price &&
          after.points[0].price < after.points[1].price
      }
    }
    expect(lowerDragged).toBe(true)

    // 拖拽成功后画线仍保持选中。先点空白处取消，再按移动后的坐标重新选中，
    // 确保后续像素校验读取的是落库数据渲染出的新带体，而不是残留的拖拽预览。
    const movedLowerAnchor = await findHorizontalBandAnchor(page, 'max')
    expect(movedLowerAnchor).not.toBeNull()
    await page.mouse.click(box!.x + box!.width * 0.85, box!.y + box!.height * 0.12)
    await page.mouse.click(box!.x + movedLowerAnchor!.x, box!.y + movedLowerAnchor!.y)

    // 像素：重新选中后 → overlay 出现蓝色水平带双边框（≥2 个独立 y 行），且带内区域半透明填充
    const blueBandStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, rows: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, rows: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const rowCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const y = Math.floor((i / 4) / w)
            rowCount.set(y, (rowCount.get(y) ?? 0) + 1)
          }
        }
        const rows = [...rowCount.values()].filter((c) => c > 20).length
        return { n, rows }
      })
    await expect.poll(() => blueBandStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(300)
    await expect.poll(() => blueBandStats().then((s) => s.rows), { timeout: 10_000 }).toBeGreaterThanOrEqual(2)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pband').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：价格区间框 → 拖 A→B → 落库两点按价格排序 → 像素校验选中蓝色矩形边框 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '价格区间框')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A（左上高价）→ B（右下低价）：落库仍必须归一成低价在前
    await page.mouse.move(box!.x + box!.width * 0.38, box!.y + box!.height * 0.32)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.62, box!.y + box!.height * 0.58, { steps: 8 })
    await page.mouse.up()

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pricerange').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'pricerange')
        return (arr[0] as { id: string; points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].price).toBeLessThan(saved!.points[1].price)
    expect(saved!.points[0].time).not.toBe(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 刚创建处于选中态：矩形上下边框产生多个蓝像素行，左右边框产生多个蓝像素列
    const blueRectStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, rows: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, rows: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const rowCount = new Map<number, number>()
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            const y = Math.floor(i / 4 / w)
            rowCount.set(y, (rowCount.get(y) ?? 0) + 1)
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        return {
          n,
          rows: [...rowCount.values()].filter((c) => c > 20).length,
          cols: [...colCount.values()].filter((c) => c > 10).length,
        }
      })
    await expect.poll(() => blueRectStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(300)
    await expect.poll(() => blueRectStats().then((s) => s.rows), { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
    await expect.poll(() => blueRectStats().then((s) => s.cols), { timeout: 10_000 }).toBeGreaterThanOrEqual(2)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pricerange').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：持仓计划 → 三次点击定义入场/止损/止盈 → 落库三点 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '持仓计划')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 三次点击：入场（中上）→ 止损（左下）→ 止盈（右下）
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.35)
    await page.waitForTimeout(200)
    await page.mouse.click(box!.x + box!.width * 0.35, box!.y + box!.height * 0.65)
    await page.waitForTimeout(200)
    await page.mouse.click(box!.x + box!.width * 0.65, box!.y + box!.height * 0.55)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'position').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'position')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(3)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'position').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：预测线 → 拖 A→B → 落库两点保持原始顺序 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '预测线')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 从左上拖到右下（下跌方向）
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.55, { steps: 6 })
    await page.mouse.up()

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'forecast').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'forecast')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'forecast').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：日期范围 → 拖 A→B → 落库两点按时间排序 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '日期范围')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.6, { steps: 6 })
    await page.mouse.up()

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'daterange').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'daterange')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThanOrEqual(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'daterange').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('画线：斐波那契通道 → A→B 定义摆幅 → 落库两点保序 → 像素校验选中蓝色平行线（≥4 条）→ 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '斐波那契通道')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出 A→B（带价格摆幅）：基线 + 8 条平行分位线横贯全宽
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.57, box!.y + box!.height * 0.45, { steps: 5 })
    await page.mouse.up()
    // 落库：type=fibchannel，两点保持 A→B 原始顺序
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'fibchannel')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'fibchannel')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：刚创建处于选中态 → overlay 出现蓝色平行线（基线 + 8 条分位线，横贯全宽）。
    // 平行斜线每列都有 9 条线穿过（每列约 24px），故断言蓝色总量大 + 覆盖 ≥100 个 x 列（证明横贯全宽，而非仅锚点）
    const blueLineStats = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        let n = 0
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        const cols = [...colCount.values()].filter((c) => c > 15).length
        return { n, cols }
      })
    await expect.poll(() => blueLineStats().then((s) => s.n), { timeout: 10_000 }).toBeGreaterThan(5000)
    await expect.poll(() => blueLineStats().then((s) => s.cols), { timeout: 10_000 }).toBeGreaterThanOrEqual(100)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'fibchannel').length
      } catch {
        return -1
      }
    })) === 0).toBe(true)
  })

  test('画线：矩形 + 射线 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 矩形：拖出两对角锚点
    await pickDrawingTool(page, '矩形')
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 射线：锚点 + 方向点
    await pickDrawingTool(page, '射线', true)
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：椭圆 + 圆 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 椭圆：拖出两对角锚点（外接框）
    await pickDrawingTool(page, '椭圆')
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 圆：圆心 + 半径点
    await pickDrawingTool(page, '圆', true)
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：三角形（3 锚点）+ 圆弧 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 三角形：三点点击（A/B/C）集满提交
    await pickDrawingTool(page, '三角形')
    await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.5)
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 圆弧：拖出两点定弦
    await pickDrawingTool(page, '圆弧')
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：楔形 → 三点点击（A/B/C 收敛）→ 落库 3 锚点保序 → 像素校验选中蓝色楔形边 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '楔形')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 三点点击：A（左下起点）→ B（右上起点）→ C（收敛点，中间偏右）
    await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.55)
    await page.mouse.click(box!.x + box!.width * 0.62, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.45)
    // 落库：type=wedge，三点保留 A→B→C 原始点击顺序（方向敏感）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'wedge')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'wedge')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(3)
    // 点击 x 序：0.3 < 0.5 < 0.62 → 保序后 t0 < t2 < t1
    expect(saved!.points[0].time).toBeLessThan(saved!.points[2].time)
    expect(saved!.points[2].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：创建后处于选中态 → overlay 出现蓝色楔形边（A→C 与 B→C 两条线 + C 后虚线延伸）
    const bluePixels = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        let n = 0
        const xCols = new Set<number>()
        const w = overlay.width
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            xCols.add((i / 4) % w)
          }
        }
        return { n, cols: xCols.size }
      })
    await expect.poll(async () => (await bluePixels()).n, { timeout: 10_000 }).toBeGreaterThan(200)
    await expect.poll(async () => (await bluePixels()).cols, { timeout: 10_000 }).toBeGreaterThanOrEqual(80)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'wedge').length
            } catch {
              return -1
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(0)
  })

  test('画线：宽度通道 → 三点点击（A/B 方向 + C 定宽）→ 落库 3 锚点 → 像素校验蓝色平行线 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '宽度通道')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 三点点击：A（左下）→ B（右上）→ C（中上，第二平行线位置）
    await page.mouse.click(box!.x + box!.width * 0.2, box!.y + box!.height * 0.7)
    await page.mouse.click(box!.x + box!.width * 0.6, box!.y + box!.height * 0.25)
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.4)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pchannel')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'pchannel')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(3)
    // 方向敏感：保留 A→B→C 原始点击顺序
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：两条蓝色无限平行线（过 A/过 C）+ 宽度连线
    const bluePixels = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        let n = 0
        const xCols = new Set<number>()
        const w = overlay.width
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            xCols.add((i / 4) % w)
          }
        }
        return { n, cols: xCols.size }
      })
    await expect.poll(async () => (await bluePixels()).n, { timeout: 10_000 }).toBeGreaterThan(300)
    await expect.poll(async () => (await bluePixels()).cols, { timeout: 10_000 }).toBeGreaterThanOrEqual(120)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'pchannel').length
            } catch {
              return -1
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(0)
  })

  test('画线：斐波那契扩展（3 锚点）+ 扇形 + 价格标签 + 箭头 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 斐波那契扩展：三点点击（A/B/C）集满提交
    await pickDrawingTool(page, '斐波那契扩展')
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25)
    await page.mouse.click(box!.x + box!.width * 0.6, box!.y + box!.height * 0.45)
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 斐波那契扇形：拖出原点 + 方向点
    await pickDrawingTool(page, '斐波那契扇形')
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 价格标签：单击放置
    await pickDrawingTool(page, '价格标签')
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 箭头：拖出 A→B
    await pickDrawingTool(page, '箭头')
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：斐波那契时间线 → 拖 A→B → 7 条竖线（黄金分割）→ 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'webkit 栅格化像素列分组/颜色阈值差异——画线功能由 chromium 像素级覆盖与单测保障')
    test.setTimeout(90_000)
    // 用 ?perf 合成数据：本用例断言的是「七条竖线落在黄金分割列位」这种像素级几何，
    // 实时行情会持续平移时间轴与价格刻度，列分组数会随负载在 6/7 之间跳（本地约 1/8 红）。
    // 合成数据下同一条用例 10 次跑出完全相同的列位。
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    await pickDrawingTool(page, '斐波那契时间线')
    await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })

    // 扫描 overlay：竖线按列聚类（≥15px 纵向像素过滤标签），应得 7 组
    const lineXs = await page.evaluate(() => {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => {
        const st = getComputedStyle(c)
        return st.position === 'absolute' && st.zIndex === '5'
      })
      if (!overlay) return []
      const ctx = overlay.getContext('2d')
      if (!ctx) return []
      const { width, height } = overlay
      const img = ctx.getImageData(0, 0, width, height).data
      const dpr = window.devicePixelRatio || 1
      const count = new Map<number, number>()
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
          const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
          if (yellow || blue) {
            const cx = Math.round(x / dpr)
            count.set(cx, (count.get(cx) ?? 0) + 1)
          }
        }
      }
      // 纵向像素 ≥15 的列为竖线本体（标签仅 14px 高，抗锯齿相邻列并入同组）
      const strong = [...count.entries()].filter(([, n]) => n >= 15).map(([x]) => x).sort((p, q) => p - q)
      const groups: number[] = []
      for (const x of strong) {
        if (groups.length === 0 || x - groups[groups.length - 1] > 2) groups.push(x)
      }
      return groups
    })
    expect(lineXs).toHaveLength(7)
    const span = lineXs[6] - lineXs[0]
    expect(span).toBeGreaterThan(50)
    const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    for (let i = 0; i < lineXs.length; i++) {
      expect((lineXs[i] - lineXs[0]) / span).toBeCloseTo(ratios[i], 0)
    }

    // 切回鼠标：点任一竖线仍可选中 → 删除
    await pickDrawingTool(page, '鼠标', true)
    await page.mouse.click(box!.x + lineXs[3], box!.y + box!.height * 0.4)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：江恩角度线 → 拖 A→B → 9 条角度线（1×8…8×1，双向）→ 反向命中选中 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 切周期强制全量 fitContent：避免冷启动只渲染 1 根蜡烛时画线锚点塌缩
    await page.getByRole('button', { name: '5分', exact: true }).click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: '1分', exact: true }).click()
    await waitCandlesRendered(page)
    await page.waitForTimeout(600)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    await pickDrawingTool(page, '江恩角度线')
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.5, { steps: 8 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })

    // 数据：type=gann、2 锚点、A→B 顺序保留
    const readGann = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: { time: number; price: number }[] }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const drawing = await readGann()
    expect(drawing).not.toBeNull()
    expect(drawing!.type).toBe('gann')
    expect(drawing!.points).toHaveLength(2)

    // 像素：9 条双向角度线 → 黄色像素总量显著高于单条线段
    const yellowPx = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const { width, height } = overlay
        const img = ctx.getImageData(0, 0, width, height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
          const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
          if (yellow || blue) n++
        }
        return n
      })
    await expect.poll(() => yellowPx(), { timeout: 10_000 }).toBeGreaterThan(4000)

    // 切回鼠标：反向（A 左侧延长线）命中仍可选中 → 删除
    await pickDrawingTool(page, '鼠标', true)
    // 从 overlay 找反向侧（原点左侧）任一画线像素点（必在某条角度线延长线上），点击选中
    const hit = await page.evaluate(() => {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => {
        const st = getComputedStyle(c)
        return st.position === 'absolute' && st.zIndex === '5'
      })
      if (!overlay) return null
      const ctx = overlay.getContext('2d')
      if (!ctx) return null
      const { width, height } = overlay
      const dpr = window.devicePixelRatio || 1
      const img = ctx.getImageData(0, 0, width, height).data
      const rect = overlay.getBoundingClientRect()
      const cx = rect.left + width / dpr / 2
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
          const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
          if ((yellow || blue) && rect.left + x / dpr < cx) {
            return { x: rect.left + x / dpr, y: rect.top + y / dpr }
          }
        }
      }
      return null
    })
    expect(hit).not.toBeNull()
    await page.mouse.click(hit!.x, hit!.y)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await readGann()) === null).toBe(true)
  })

  test('画线：江恩箱 → 拖 A→B → 矩形 + 10 条角度线（1×1/1×2/2×1）→ 区域点击选中 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 切周期强制全量 fitContent：避免冷启动只渲染 1 根蜡烛时画线锚点塌缩
    await page.getByRole('button', { name: '5分', exact: true }).click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: '1分', exact: true }).click()
    await waitCandlesRendered(page)
    await page.waitForTimeout(600)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    await pickDrawingTool(page, '江恩箱')
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.55, { steps: 8 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })

    // 数据：type=gannbox、2 锚点
    const readBox = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: { time: number; price: number }[] }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const drawing = await readBox()
    expect(drawing).not.toBeNull()
    expect(drawing!.type).toBe('gannbox')
    expect(drawing!.points).toHaveLength(2)

    // 像素：矩形边框 + 10 条角度线 → 黄色像素总量显著高于单条线段
    const yellowPx = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const { width, height } = overlay
        const img = ctx.getImageData(0, 0, width, height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
          const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
          if (yellow || blue) n++
        }
        return n
      })
    await expect.poll(() => yellowPx(), { timeout: 10_000 }).toBeGreaterThan(4000)

    // 切回鼠标：点矩形内部（区域命中）→ 选中 → 删除
    await pickDrawingTool(page, '鼠标', true)
    await page.mouse.click(box!.x + box!.width * 0.42, box!.y + box!.height * 0.45)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await readBox()) === null).toBe(true)
  })

  test('画线：安德鲁叉（3 锚点）→ 三点点击 → 中轨/上下轨射线 → 选中 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 切周期强制全量 fitContent：避免冷启动只渲染 1 根蜡烛时画线锚点塌缩
    await page.getByRole('button', { name: '5分', exact: true }).click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: '1分', exact: true }).click()
    await waitCandlesRendered(page)
    await page.waitForTimeout(600)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 安德鲁叉：三点点击（A 起点 / B / C）集满提交
    await pickDrawingTool(page, '安德鲁叉')
    await page.mouse.click(box!.x + box!.width * 0.2, box!.y + box!.height * 0.4)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.25)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.55)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 10_000 })

    // 数据：type=pitchfork、3 锚点
    const readBox = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: { time: number; price: number }[] }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const drawing = await readBox()
    expect(drawing).not.toBeNull()
    expect(drawing!.type).toBe('pitchfork')
    expect(drawing!.points).toHaveLength(3)

    // 像素：中轨 + 上下轨三条向右延伸的射线 → 黄色像素量显著高于单条线段
    const yellowPx = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const { width, height } = overlay
        const img = ctx.getImageData(0, 0, width, height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
          const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
          if (yellow || blue) n++
        }
        return n
      })
    await expect.poll(() => yellowPx(), { timeout: 10_000 }).toBeGreaterThan(1200)

    // 切回鼠标后重新命中：坐标只能现扫。射线锚在 (time, price) 上，行情刷新价格刻度就会把
    // 创建像素推到别处（本用例在波动时段隔离态 3/3 红、平静时段 5/5 绿，正是这种环境依赖）
    await pickDrawingTool(page, '鼠标', true)
    const selected = () => page.getByRole('button', { name: '删除' }).count().then((n) => n > 0)
    // 提交时就是选中态：不先取消，「删除出现」这条断言从创建起一直成立，测不到命中
    const blank = { x: box!.x + box!.width * 0.05, y: box!.y + box!.height * 0.95 }
    await page.mouse.click(blank.x, blank.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    // A 点（0.2W）与尾锚点（0.55W）之间逐点尝试，避开两端锚点
    const hit = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.3, xMax: box!.x + box!.width * 0.5 })
    expect(hit, 'A 点右侧应存在可命中的射线像素').not.toBeNull()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(async () => (await readBox()) === null).toBe(true)
  })

  test('画线：趋势线 → 鼠标拖拽整线移动 → 锚点增量一致 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 趋势线工具画一条线
    await pickDrawingTool(page, '趋势线')
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标（只读）→ 定位画线实际中心 → 按住拖拽整线
    await pickDrawingTool(page, '鼠标')
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const center = (await findDrawnLineCenter(page))!
    await page.mouse.move(center.x, center.y)
    await page.mouse.down()
    await page.mouse.move(center.x + box!.width * 0.18, center.y + box!.height * 0.12, { steps: 5 })
    await page.mouse.up()

    // 提交后：同一 id，各锚点时间/价格增量一致（整线平移）且确实发生了移动
    await expect
      .poll(
        async () => {
          const after = await readFirst()
          if (!after || after.points.length !== 2) return false
          const dT0 = after.points[0].time - before!.points[0].time
          const dT1 = after.points[1].time - before!.points[1].time
          const dP0 = after.points[0].price - before!.points[0].price
          const dP1 = after.points[1].price - before!.points[1].price
          return (
            after.id === before!.id &&
            dT0 === dT1 &&
            dP0 === dP1 &&
            (Math.abs(dT0) > 0.5 || Math.abs(dP0) > 0.01)
          )
        },
        { timeout: 10_000 },
      )
      .toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：趋势线 → 拖拽尾锚点 → 仅该锚点移动 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条趋势线（左→右，锚点按时间排序）
    await pickDrawingTool(page, '趋势线')
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标 → 拖拽最右侧（尾）锚点；实时行情会平移图表，重试直到仅尾锚点移动
    await pickDrawingTool(page, '鼠标')
    const tailMoved = await dragSelectedAnchorUntil(
      page,
      'max',
      box!.width * 0.08,
      box!.height * 0.05,
      async () => {
        const after = await readFirst()
        if (!after || after.points.length !== 2) return false
        const headSame =
          after.points[0].time === before!.points[0].time && after.points[0].price === before!.points[0].price
        const tailChanged =
          after.points[1].time !== before!.points[1].time ||
          after.points[1].price !== before!.points[1].price
        return after.id === before!.id && headSame && tailChanged
      },
    )
    expect(tailMoved).toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：射线 → 拖拽锚点 → 方向点保留 + 顺序不变 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条射线：锚点 → 方向点（向右上延伸）
    await pickDrawingTool(page, '射线', true)
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标 → 拖拽最左侧（首）锚点；实时行情会平移图表，重试直到锚点移动且方向点保留
    await pickDrawingTool(page, '鼠标')
    const anchorMoved = await dragSelectedAnchorUntil(
      page,
      'min',
      -box!.width * 0.06,
      box!.height * 0.08,
      async () => {
        const after = await readFirst()
        if (!after || after.points.length !== 2) return false
        const dirSame =
          after.points[1].time === before!.points[1].time && after.points[1].price === before!.points[1].price
        const anchorChanged =
          after.points[0].time !== before!.points[0].time ||
          after.points[0].price !== before!.points[0].price
        return after.id === before!.id && dirSame && anchorChanged
      },
    )
    expect(anchorMoved).toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：垂直射线 → 向下延伸命中 + 锚点上方不命中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 创建垂直射线：A 在上，B 在下方同横坐标（方向向下）
    const ax = box!.x + box!.width * 0.35
    const ay = box!.y + box!.height * 0.35
    await pickDrawingTool(page, '垂直射线')
    await page.mouse.move(ax, ay)
    await page.mouse.down()
    await page.mouse.move(ax, box!.y + box!.height * 0.65, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: unknown[] }[]
          return arr.find((x) => x.type === 'vray') ?? null
        } catch {
          return null
        }
      })
    const created = await readFirst()
    expect(created).not.toBeNull()
    expect(created!.points).toHaveLength(2)

    // 切回鼠标后：下方射线命中；锚点上方同时间不命中
    await pickDrawingTool(page, '鼠标', true)
    await page.mouse.click(ax, box!.y + box!.height * 0.8)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 点击右侧空白处取消选择，再点锚点上方确认不会重新选中
    await page.mouse.click(box!.x + box!.width * 0.65, box!.y + box!.height * 0.5)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await page.mouse.click(ax, box!.y + box!.height * 0.2)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 通过下方命中删除
    await page.mouse.click(ax, box!.y + box!.height * 0.8)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(readFirst).toBeNull()
  })

  test('画线：水平射线 → 向右延伸命中 + 锚点后方不命中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 创建水平射线：A 在左，B 在右侧同高（方向向右）
    const ay = box!.y + box!.height * 0.4
    await pickDrawingTool(page, '水平射线')
    await page.mouse.move(box!.x + box!.width * 0.3, ay)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.65, ay, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: unknown[] }[]
          return arr.find((x) => x.type === 'hray') ?? null
        } catch {
          return null
        }
      })
    const created = await readFirst()
    expect(created).not.toBeNull()
    expect(created!.points).toHaveLength(2)
    // 切回鼠标后：右侧射线命中；锚点后方不命中。
    // 两处坐标都改为现扫：射线锚在 (time, price) 上，实时行情的自动缩放会把创建像素推走
    await pickDrawingTool(page, '鼠标', true)
    // 画线提交时就是选中态：不先取消，「删除出现」这条断言从创建起就一直成立，测不到命中
    const blank = { x: box!.x + box!.width * 0.05, y: box!.y + box!.height * 0.95 }
    const selected = () => page.getByRole('button', { name: '删除' }).count().then((n) => n > 0)
    await page.mouse.click(blank.x, blank.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    // 「右段可命中」和「射线所在行」得来自同一次定位：?perf 的价格轴在首帧之后还会重缩放一次
    // （实测 +1078ms 一次跳 15px），而行带子只有 ±8px —— 拿旧 y 画带子会整个扫空，CI run
    // 36009346405 的 [webkit] 正是这条红（原判词「射线所在行应有像素」expected length 1 /
    // received 0）。所以每轮先重新命中一次取「此刻」的像素，紧接着按它定位行，扫空就换一轮重来，
    // 不加 sleep：一次有界等待证明不了那次重缩放已经过去，按结果重扫才可以。
    let row: { x: number; y: number }[] = []
    for (let attempt = 0; attempt < 3 && !row.length; attempt++) {
      const onRay = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.6 })
      expect(onRay, '射线右段应存在可命中的像素').not.toBeNull()
      // 命中那次点击把画线选中了：定位行之前先取消，否则后面「点锚点后方」是从选中态开始的
      await page.mouse.click(blank.x, blank.y)
      await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
      row = await findDrawnPixels(page, { yMin: onRay!.y - 8, yMax: onRay!.y + 8 }, { max: 1 })
    }
    expect(row, '重扫三轮仍定位不到射线所在行：命中与扫行之间价格轴又动了').toHaveLength(1)
    const behind = { x: Math.max(box!.x + 6, row[0].x - 40), y: row[0].y }
    await page.mouse.click(behind.x, behind.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 通过右侧命中删除
    const again = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.6 })
    expect(again, '取消选中后右段仍应可命中').not.toBeNull()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(readFirst).toBeNull()
  })

  test('画线：延长线 → 两端延伸命中 + 远离直线不命中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 创建延长线：A→B 定方向，渲染和命中都应向两端无限延伸
    const ay = box!.y + box!.height * 0.35
    await pickDrawingTool(page, '延长线')
    await page.mouse.move(box!.x + box!.width * 0.4, ay)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, ay + box!.height * 0.15, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: unknown[] }[]
          return arr.find((x) => x.type === 'extended') ?? null
        } catch {
          return null
        }
      })
    const created = await readFirst()
    expect(created).not.toBeNull()
    expect(created!.points).toHaveLength(2)

    // 切回鼠标后：线体命中；远离直线处不选中。
    // 坐标全部现扫——直线锚在 (time, price) 上，实时行情会自动缩放/平移，创建像素不再可靠压线
    await pickDrawingTool(page, '鼠标', true)
    const blank = { x: box!.x + box!.width * 0.05, y: box!.y + box!.height * 0.95 }
    const selected = () => page.getByRole('button', { name: '删除' }).count().then((n) => n > 0)
    // 提交后本条画线即选中，先点空白取消，后面的「删除出现」才真的在验证命中
    await page.mouse.click(blank.x, blank.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    const onLine = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.45, xMax: box!.x + box!.width * 0.55 })
    expect(onLine, '两锚点之间应存在可命中的线体像素').not.toBeNull()

    // 远离直线处不选中：本用例只有这一条画线，垂直于线体 140px 之外必定是空白
    await page.mouse.click(blank.x, blank.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    const below = box!.y + box!.height - onLine!.y > 150
    const far = { x: onLine!.x, y: onLine!.y + (below ? 140 : -140) }
    await page.mouse.click(far.x, far.y)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 通过线体重新选中并删除，确认持久化同步清理
    const again = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.45, xMax: box!.x + box!.width * 0.55 })
    expect(again, '取消选中后线体仍应可命中').not.toBeNull()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(readFirst).toBeNull()
  })

  test('画线：十字线 → 横纵线命中 + 远离不命中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 单击创建十字线，锚点同时确定时间与价格
    const ax = box!.x + box!.width * 0.45
    const ay = box!.y + box!.height * 0.4
    await pickDrawingTool(page, '十字线')
    await page.mouse.click(ax, ay)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as { id: string; type: string; points: unknown[] }[]
          return arr.find((x) => x.type === 'cross') ?? null
        } catch {
          return null
        }
      })
    const created = await readFirst()
    expect(created).not.toBeNull()
    expect(created!.points).toHaveLength(1)

    // 切回鼠标后分别验证横线与纵线命中
    await pickDrawingTool(page, '鼠标', true)
    const selected = () => page.getByRole('button', { name: '删除' }).count().then((n) => n > 0)
    // 提交时就是选中态：不先取消，「删除出现」这条断言从创建起一直为真，测不到命中
    await page.mouse.click(box!.x + box!.width * 0.05, box!.y + box!.height * 0.95)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    // 命中坐标只能现扫：横线锚在 price 上，行情刷新价格刻度会把创建像素推到别处
    const onH = await hitDrawnPixelUntil(page, selected, {
      xMin: ax + 120,
      xMax: ax + 220,
      yMin: ay - 120,
      yMax: ay + 120,
    })
    expect(onH, '锚点右侧应存在可命中的横线像素').not.toBeNull()

    // 点击空白取消选择；再点击远离横线的纵线上仍应命中
    await page.mouse.click(box!.x + box!.width * 0.8, box!.y + box!.height * 0.82)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    const onV = await hitDrawnPixelUntil(
      page,
      async () => {
        const ok = await selected()
        if (!ok) return false
        // 必须命中纵线（横向偏移在容差内），否则是横线像素被误当成命中
        const p = await findDrawnLineCenter(page)
        return p !== null && Math.abs(p.x - ax) <= 60
      },
      { xMin: ax - 60, xMax: ax + 60, yMin: ay + 140, yMax: ay + 300 },
    )
    expect(onV, '横线下方应存在可命中的纵线像素').not.toBeNull()

    // 回到横线命中并删除
    const onH2 = await hitDrawnPixelUntil(page, selected, { xMin: box!.x + box!.width * 0.72, xMax: box!.x + box!.width * 0.9 })
    expect(onH2, '右侧横线上应再次命中').not.toBeNull()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect.poll(readFirst).toBeNull()
  })

  test('画线：多段线（多次点击 + 双击收尾）→ 选中 → 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 多段线：依次点击 3 个顶点，最后双击收尾提交
    // （Playwright 合成点击的 pointerdown.detail 恒为 0，双击收尾用 detail=2 的合成 PointerEvent 模拟真实浏览器双击）
    await pickDrawingTool(page, '多段线')
    await page.mouse.click(box!.x + box!.width * 0.2, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.5)
    await page.mouse.click(box!.x + box!.width * 0.7, box!.y + box!.height * 0.35)
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y) ?? document.body
        const opts = (detail: number) => ({
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 1,
          pointerId: 99,
          pointerType: 'mouse',
          isPrimary: true,
          detail,
        })
        el.dispatchEvent(new PointerEvent('pointerdown', opts(2)))
        el.dispatchEvent(new PointerEvent('pointerup', opts(2)))
        el.dispatchEvent(new MouseEvent('click', { ...opts(2), detail: 2 }))
      },
      { x: box!.x + box!.width * 0.85, y: box!.y + box!.height * 0.45 },
    )
    await expect.poll(() => page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        return Object.values(d).flat().some((x: unknown) => (x as { type?: string }).type === 'polyline')
      } catch { return false }
    }), { timeout: 5000 }).toBe(true)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 切回鼠标 → 点折线任一段命中选中 → 删除
    await pickDrawingTool(page, '鼠标', true)
    const selectedPoly = () => page.getByRole('button', { name: '删除' }).count().then((n) => n > 0)
    // 提交即选中态：先点空白取消，否则「删除出现」从创建起一直为真，测不到命中
    await page.mouse.click(box!.x + box!.width * 0.05, box!.y + box!.height * 0.95)
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    // 命中坐标现扫：三个顶点锚在 (time, price) 上，行情刷新刻度后 0.32W/0.4H 未必还落在段上
    const onPoly = await hitDrawnPixelUntil(page, selectedPoly, {
      xMin: box!.x + box!.width * 0.15,
      xMax: box!.x + box!.width * 0.9,
      yMin: box!.y,
      yMax: box!.y + box!.height * 0.85,
    })
    expect(onPoly, '折线段上应存在可命中的像素').not.toBeNull()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：量度（拖 A→B → Δ价格/Δ%标签）→ 删除', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 量度：拖出 A→B（与趋势线同两点手势）
    await pickDrawingTool(page, '量度')
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.55, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 落库：2 锚点（A→B 顺序）
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)[0] as { type: string; points: { time: number; price: number }[] }[]
        return arr[0] ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('measure')
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[1].time).toBeGreaterThan(saved!.points[0].time)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：速度线（拖 A→B → 4 段渲染 + 落库保方向）→ 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 速度线：拖出 A→B（与趋势线同两点手势）
    await pickDrawingTool(page, '速度线')
    await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.6, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 渲染：overlay 出现画线像素（主对角线 + 竖线 + 分位线）
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()

    // 落库：type=speedlines、2 锚点、A→B 方向保持（time 递增）
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)[0] as { type: string; points: { time: number; price: number }[] }[]
        return arr[0] ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('speedlines')
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[1].time).toBeGreaterThan(saved!.points[0].time)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：回归通道（拖 A→B → 中线+上下轨渲染 + 落库）→ 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 回归通道：拖出 A→B 定时间窗
    await pickDrawingTool(page, '回归通道')
    await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 渲染：overlay 出现画线像素（回归中线 + ±σ 上下轨）
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()

    // 落库：type=regchan、2 锚点（按时间排序）
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)[0] as { id: string; type: string; points: { time: number; price: number }[] }[]
        return arr[0] ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('regchan')
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[1].time).toBeGreaterThan(saved!.points[0].time)

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          const arr = Object.values(d)[0] as {
            id: string
            type: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })

    // 切回鼠标（只读）→ 点击中线附近可选中（命中检测走 K 线回归线段）
    await pickDrawingTool(page, '鼠标')
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const center = (await findDrawnLineCenter(page))!
    await page.mouse.click(center.x, center.y)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 拖拽最右侧（尾）锚点：窗口锚点必须可编辑；回归通道按时间排序，另一端保持不变
    const tailMoved = await dragSelectedAnchorUntil(
      page,
      'max',
      // 尾锚点通常贴近图表右缘；向左上拖回主区，避免落进价格轴导致事件丢失
      -box!.width * 0.08,
      -box!.height * 0.04,
      async () => {
        const after = await readFirst()
        if (!after || after.points.length !== 2) return false
        const headSame =
          after.points[0].time === saved!.points[0].time && after.points[0].price === saved!.points[0].price
        const tailChanged =
          after.points[1].time !== saved!.points[1].time || after.points[1].price !== saved!.points[1].price
        return (
          after.id === saved!.id &&
          after.type === 'regchan' &&
          headSame &&
          tailChanged &&
          after.points[1].time > after.points[0].time
        )
      },
    )
    expect(tailMoved).toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：图层管理 → 水平线+趋势线两行 → 隐藏（像素减少+落库）→ 锁定不可选中 → 解锁选中 → 行内删除 → 全清空', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)

    const chart = page.locator('main div').first()
    const toggle = page.getByTestId('drawing-toggle')

    /** 落库画线摘要（type/hidden/locked） */
    const storedDrawings = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
          return Object.values(d)
            .flat()
            .map((x) => ({
              type: (x as { type?: string }).type ?? '',
              hidden: !!(x as { hidden?: boolean }).hidden,
              locked: !!(x as { locked?: boolean }).locked,
            }))
        } catch {
          return []
        }
      })

    /** 画线 overlay 黄色/蓝色像素计数 + 黄色质心（CSS 坐标） */
    const yellowBlue = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { yellow: 0, blue: 0, cx: null, cy: null }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { yellow: 0, blue: 0, cx: null, cy: null }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        const dpr = window.devicePixelRatio || 1
        const rect = overlay.getBoundingClientRect()
        let y = 0
        let b = 0
        let sx = 0
        let sy = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const bl = img[i + 2]
          const a = img[i + 3]
          const yellow = a > 100 && r > 190 && g > 130 && g < 235 && bl < 110
          const blue = a > 100 && bl > 190 && g > 110 && g < 200 && r < 130
          if (yellow) {
            y++
            sx += (i / 4) % w / dpr
            sy += Math.floor(i / 4 / w) / dpr
          }
          if (blue) b++
        }
        return { yellow: y, blue: b, cx: y ? rect.left + sx / y : null, cy: y ? rect.top + sy / y : null }
      })

    /** 选工具：开面板 → 点工具 → 等面板收起 + 图表进入画线光标（生产构建直连，状态即时） */
    const pick = async (name: string) => {
      await openDrawing(page)
      await page.getByRole('button', { name, exact: true }).click()
      await page.waitForFunction(
        () => document.querySelector('[data-testid="drawing-toggle"]')?.getAttribute('aria-expanded') === 'false',
        { timeout: 5000 },
      )
      if (name !== '鼠标') {
        await page.waitForFunction(() => {
          const el = document.querySelector('.chart-container')
          return !!el && getComputedStyle(el).cursor === 'crosshair'
        }, { timeout: 8000 })
      }
    }
    const closeToggle = async () => {
      if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
    }

    // 1) 水平线（单点）——画在 0.3h，与趋势线错开
    await pick('水平线')
    let box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.51, box!.y + box!.height * 0.3, { steps: 2 })
    await page.mouse.up()
    await expect
      .poll(async () => (await storedDrawings()).filter((x) => x.type === 'horizontal').length, { timeout: 10_000 })
      .toBe(1)

    // 2) 趋势线（拖 A→B）——对角线 0.25w,0.7h → 0.75w,0.3h
    await pick('趋势线')
    box = await chart.boundingBox()
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.7)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.3, { steps: 6 })
    await page.mouse.up()
    await expect
      .poll(async () => (await storedDrawings()).filter((x) => x.type === 'trend').length, { timeout: 10_000 })
      .toBe(1)

    // 3) 切回鼠标并点空白取消选中（两线都变黄）
    await pick('鼠标')
    box = await chart.boundingBox()
    await page.mouse.click(box!.x + box!.width * 0.12, box!.y + box!.height * 0.12)
    await expect.poll(async () => (await yellowBlue()).blue, { timeout: 5000 }).toBe(0)

    // 4) 打开图层 → 2 行
    await openDrawing(page)
    await page.getByTestId('drawing-layers-open').click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(2)
    const labels = (await page.getByTestId('drawing-layer-row').allTextContents()).map((x) => x.trim())
    expect(labels.some((x) => x.startsWith('水平线'))).toBe(true)
    expect(labels.some((x) => x.startsWith('趋势线'))).toBe(true)

    // 5) 隐藏第一行（水平线）→ 黄色像素减少 + hidden 落库；再显示 → 恢复；再隐藏
    const y0 = (await yellowBlue()).yellow
    await page.getByTestId('drawing-layer-eye').first().click()
    await expect
      .poll(async () => (await storedDrawings()).find((x) => x.type === 'horizontal')?.hidden, { timeout: 5000 })
      .toBe(true)
    await expect.poll(async () => (await yellowBlue()).yellow, { timeout: 5000 }).toBeLessThan(y0)
    await page.getByTestId('drawing-layer-eye').first().click()
    await expect
      .poll(async () => (await storedDrawings()).find((x) => x.type === 'horizontal')?.hidden, { timeout: 5000 })
      .toBe(false)
    await page.getByTestId('drawing-layer-eye').first().click()
    await expect
      .poll(async () => (await storedDrawings()).find((x) => x.type === 'horizontal')?.hidden, { timeout: 5000 })
      .toBe(true)

    // 6) 锁定第二行（趋势线）→ locked 落库
    await page.getByTestId('drawing-layer-lock').nth(1).click()
    await expect
      .poll(async () => (await storedDrawings()).find((x) => x.type === 'trend')?.locked, { timeout: 5000 })
      .toBe(true)

    // 7) 返回工具视图并收起面板 → 点趋势线中心（此时水平线已隐藏，质心即趋势线）→ 锁定线不可选中（无蓝色像素）
    await page.getByTestId('drawing-layer-back').click()
    await page.waitForTimeout(300)
    await closeToggle()
    await expect.poll(async () => (await yellowBlue()).cx, { timeout: 5000 }).not.toBeNull()
    let px = await yellowBlue()
    await page.mouse.click(px.cx!, px.cy!)
    await expect.poll(async () => (await yellowBlue()).blue, { timeout: 5000 }).toBe(0)

    // 8) 解锁 → 再点趋势线 → 应选中（蓝色像素 + 行 data-selected=true）
    await openDrawing(page)
    await page.getByTestId('drawing-layers-open').click()
    await page.getByTestId('drawing-layer-lock').nth(1).click()
    await expect
      .poll(async () => (await storedDrawings()).find((x) => x.type === 'trend')?.locked, { timeout: 5000 })
      .toBe(false)
    await page.getByTestId('drawing-layer-back').click()
    await page.waitForTimeout(300)
    await closeToggle()
    px = await yellowBlue()
    await page.mouse.click(px.cx!, px.cy!)
    await expect.poll(async () => (await yellowBlue()).blue, { timeout: 5000 }).toBeGreaterThan(0)
    await openDrawing(page)
    await page.getByTestId('drawing-layers-open').click()
    await expect(page.getByTestId('drawing-layer-row').nth(1)).toHaveAttribute('data-selected', 'true')

    // 9) 行内删除第一行（隐藏的水平线）→ 剩 1 行 + 落库移除
    await page.getByTestId('drawing-layer-delete').first().click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(1)
    await expect
      .poll(async () => (await storedDrawings()).some((x) => x.type === 'horizontal'), { timeout: 5000 })
      .toBe(false)

    // 10) 全部清除 → 空态 + 落库清空
    await page.getByTestId('drawing-layer-clear').click()
    await expect(page.getByTestId('drawing-layer-empty')).toHaveCount(1)
    await expect.poll(async () => (await storedDrawings()).length, { timeout: 5000 }).toBe(0)
  })

  test('画线：备注便签 → 点击创建 → 编辑器输入落库 → 刷新后保留 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '备注')
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.42)

    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)
    await expect(page.locator('[data-testid="text-confirm"]')).toBeVisible({ timeout: 5000 })
    const textarea = page.locator('textarea').first()
    await textarea.fill('关键位备注')
    await page.getByTestId('text-confirm').click()
    await expect(page.getByTestId('text-confirm')).toHaveCount(0)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'note').length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    let saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'note')
        return (arr[0] as { text?: string }) ?? null
      } catch {
        return null
      }
    })
    expect(saved?.text).toBe('关键位备注')

    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'note')
        return (arr[0] as { text?: string }) ?? null
      } catch {
        return null
      }
    })
    expect(saved?.text).toBe('关键位备注')

    // 刷新后画线恢复为未选中态；点击便签本体重新选中，再走桌面删除链路。
    // 单次点击可能落在 overlay 完全可交互前，重试点击直到选中态出现
    await expect(async () => {
      const c = await findDrawnLineCenter(page)
      if (c) await page.mouse.click(c.x, c.y)
      await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15_000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'note').length
            } catch {
              return -1
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

})
