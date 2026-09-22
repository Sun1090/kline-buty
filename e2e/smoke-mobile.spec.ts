import { expect, test } from '@playwright/test'
import { findDrawingAnchor, findDrawnLineCenter, openDrawing, waitCandlesRendered } from './helpers/smoke'
/**
 * 移动端触屏视口（390×844）端到端覆盖（自 smoke 拆出）：无横向溢出、捏合缩放、双击复位、触屏拖线。
 * CDP 触摸派发仅 Chromium，跨浏览器触摸覆盖由 CI 的 chromium 项目承担。
 */

test.describe('移动端（390×844 触屏视口）', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('页面无横向溢出 + 工具栏可滚动 + 触屏操作可用', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('canvas').first()).toBeVisible()
    // 无横向页面溢出（工具栏在容器内部横向滚动，不撑破页面）
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    // 移动端三行 header 紧凑：高度 < 240px（给图表留足可视区）
    const headerBox = await page.getByTestId('mobile-header').boundingBox()
    expect(headerBox).not.toBeNull()
    expect(headerBox!.height).toBeLessThan(240)
    // 触屏点击周期按钮（工具栏自动滚动到可见）
    await page.getByRole('button', { name: '1时' }).tap()
    await page.waitForTimeout(500)
    // 触屏进入画线模式（画线菜单 → 矩形）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '矩形', exact: true }).tap()
    await page.waitForTimeout(300)
    // 图表仍有足够宽度
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(300)
  })

  test('双指捏合纵向缩放：价格轴区间变化（固定价画线位移）+ 无异常', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条水平线（价格轴上部，固定价格）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '水平线', exact: true }).tap()
    await page.waitForTimeout(200)
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.3)
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const before = await findDrawnLineCenter(page)

    // CDP 双指捏合（张开 → 放大：价格区间收窄 → 固定价画线位移）
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 40, y: cy },
        { x: cx + 40, y: cy },
      ] })
    // 实时行情下价格区间随数据变化；画线完成后工具自动切回「鼠标」，
    // 捏合真正生效（总放大 ≈ 67/40 ≈ 1.68 倍），幅度取适中值保证位移可测且画线不滑出可视区
    for (let i = 1; i <= 9; i++) {
      const spread = 40 + i * 3
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - spread, y: cy },
          { x: cx + spread, y: cy },
        ] })
      await page.waitForTimeout(60)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(800)

    const after = await findDrawnLineCenter(page)
    expect(after).not.toBeNull()
    // 捏合后价格轴缩放，固定价格的线发生明显位移（>10px）
    expect(Math.abs(after!.y - before!.y)).toBeGreaterThan(8)
    expect(errors).toHaveLength(0)
  })

  test('移动端：双击复位（捏合缩放 → 快速两次拖动不误复位 → 双击恢复自适应）', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 画一条水平线（价格轴上部，固定价格）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '水平线', exact: true }).tap()
    await page.waitForTimeout(200)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42)
    // 切回鼠标（只读）→ 触屏手势（捏合/平移/双击）由图表接管
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '鼠标', exact: true }).tap()
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const orig = await findDrawnLineCenter(page)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const cx = box.x + box.width * 0.5
    const cy = box.y + box.height * 0.5

    // 捏合放大（价格区间收窄 → 固定价画线明显位移）
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 40, y: cy },
        { x: cx + 40, y: cy },
      ] })
    // 温和捏合（总放大 ≈ 100/40 = 2.5 倍，画线保持可见且位移足够大，
    // 使复位断言 resetGap < zoomGap/2 对实时行情漂移有充足余量）
    for (let i = 1; i <= 6; i++) {
      const spread = 40 + i * 10
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - spread, y: cy },
          { x: cx + spread, y: cy },
        ] })
      await page.waitForTimeout(50)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(500)
    const zoomed = await findDrawnLineCenter(page)
    expect(zoomed).not.toBeNull()
    expect(Math.abs(zoomed!.y - orig!.y)).toBeGreaterThan(10)

    // 两次快速单指拖动（平移）：不得误触发双击复位（线保持捏合后位置）
    for (let k = 0; k < 2; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
      for (let i = 1; i <= 5; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: cx - i * 14, y: cy }] })
        await page.waitForTimeout(20)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(400)
    const afterPan = await findDrawnLineCenter(page)
    expect(afterPan).not.toBeNull()
    expect(Math.abs(afterPan!.y - orig!.y)).toBeGreaterThan(10)

    // 双击（两次 300ms 内轻点）→ 复位：价格轴回自适应 → 线回到原始位置
    for (let k = 0; k < 2; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(600)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    const reset = await findDrawnLineCenter(page)
    expect(reset).not.toBeNull()
    // 复位后价格轴回自适应：线明显回到原始位置附近（须比捏合后位移收窄一半以上）
    const resetGap = Math.abs(reset!.y - orig!.y)
    const zoomGap = Math.abs(zoomed!.y - orig!.y)
    expect(resetGap).toBeLessThan(zoomGap / 2)
    expect(errors).toHaveLength(0)
  })

  test('移动端：触屏整线拖动移动画线（锚点增量一致）→ 无十字光标噪音', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 触屏拖拽画一条趋势线（画线模式由 pointer 事件驱动）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '趋势线', exact: true }).tap()
    await page.waitForTimeout(200)
    let cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.3
    const y0 = box.y + box.height * 0.5
    const x1 = box.x + box.width * 0.6
    const y1 = box.y + box.height * 0.35
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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

    // 切回鼠标（只读）→ 轻点线中心选中
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '鼠标', exact: true }).tap()
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const center = (await findDrawnLineCenter(page))!
    await page.touchscreen.tap(center.x, center.y)
    await page.waitForTimeout(300)

    // 触屏整线拖动：从线中心向下拖 70px（编辑由 pointer 事件驱动，触屏事件不再显示十字光标）
    cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x, y: center.y }] })
    for (let i = 1; i <= 7; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: center.x, y: center.y + i * 10 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    // 同一 id，各锚点时间/价格增量一致（整线平移）且确实发生了移动
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：触屏拖拽尾锚点 → 仅该锚点移动 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 触屏拖拽画趋势线（左→右）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '趋势线', exact: true }).tap()
    await page.waitForTimeout(200)
    let cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.3
    const y0 = box.y + box.height * 0.4
    const x1 = box.x + box.width * 0.6
    const y1 = box.y + box.height * 0.5
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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

    // 切回鼠标 → 定位尾锚点（最右侧蓝色簇）→ 触屏拖拽仅尾锚点。
    // 起点故意偏移 12px：超过桌面 8px 阈值，验证触屏放宽到 16px 后仍能抓住锚点。
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '鼠标', exact: true }).tap()
    await expect.poll(() => findDrawingAnchor(page, 'max'), { timeout: 5000 }).not.toBeNull()
    let tailMoved = false
    for (let attempt = 0; attempt < 4 && !tailMoved; attempt++) {
      const anchor = await findDrawingAnchor(page, 'max')
      if (!anchor) {
        const center = await findDrawnLineCenter(page)
        if (center) {
          await page.touchscreen.tap(center.x, center.y)
          await page.waitForTimeout(300)
        }
        await page.waitForTimeout(300)
        continue
      }
      cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      const grabX = anchor.x + 12
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: grabX, y: anchor.y }] })
      for (let i = 1; i <= 6; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: grabX + i * 6, y: anchor.y + i * 8 }] })
        await page.waitForTimeout(25)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      // 轮询提交结果
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(400)
        const after = await readFirst()
        if (after && after.points.length === 2) {
          const headSame =
            after.points[0].time === before!.points[0].time && after.points[0].price === before!.points[0].price
          const tailChanged =
            after.points[1].time !== before!.points[1].time || after.points[1].price !== before!.points[1].price
          if (after.id === before!.id && headSame && tailChanged) {
            tailMoved = true
            break
          }
        }
      }
    }
    expect(tailMoved).toBe(true)
    expect(errors).toHaveLength(0)
  })

  test('移动端：触屏文本标注 → 创建/确认后选中态保持（蓝框/锚点）→ 改字改字号颜色 → 落库 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 扫描画线 overlay 蓝色选中像素量（选中边框/锚点 #4e9cf5）
    const overlayBluePx = () =>
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
    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          const arr = Object.values(d)[0] as {
            type: string
            text?: string
            fontSize?: number
            color?: string
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })

    // 触屏放置文本（pointer 事件驱动，单点即建锚点并打开编辑器）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '文本', exact: true }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width * 0.4, y: box.y + box.height * 0.4 }] })
    await page.waitForTimeout(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })

    // 输入文字并确认 → 默认黄色文本 + 蓝色选中态（边框/锚点）必须保留
    // （回归：确认更新文本后，drawings 变化不能再通过 setDrawingTool 清掉 adapter 选中态）
    await page.getByTestId('mobile-text-input').fill('触屏标注')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)
    await expect.poll(() => overlayBluePx(), { timeout: 5000 }).toBeGreaterThan(0)
    expect(errors).toHaveLength(0)

    // 落库：type=text + 文本
    const saved = await readFirst()
    expect(saved).not.toBeNull()
    expect(saved!.type).toBe('text')
    expect(saved!.text).toBe('触屏标注')

    // 画线面板「改字」可见（App 选中态保持）→ 重开编辑器恢复内容 → A+ 一次 + 红色 → 确认
    await page.getByTestId('mobile-menu-drawing').tap()
    await expect(page.getByRole('button', { name: '改字' })).toBeVisible()
    await page.getByRole('button', { name: '改字' }).tap()
    await expect(page.getByTestId('mobile-text-input')).toHaveValue('触屏标注')
    await page.getByTestId('mobile-text-font-inc').tap()
    await page.getByTestId('mobile-text-color-red').tap()
    await page.getByTestId('mobile-text-confirm').tap()
    await page.waitForTimeout(400)

    const updated = await readFirst()
    expect(updated).not.toBeNull()
    expect(updated!.text).toBe('触屏标注')
    expect(updated!.fontSize).toBe(16) // 默认 14 → A+ 一次
    expect(updated!.color).toBe('#ef4444')
    // 红色文字 + 蓝色选中边框仍可见
    await expect.poll(() => overlayBluePx(), { timeout: 5000 }).toBeGreaterThan(0)
    expect(errors).toHaveLength(0)

    // 删除
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
              return Object.values(d)[0]?.length ?? -1
            } catch {
              return -2
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)
  })

  test('移动端：画线完成自动切回鼠标 → 文本确认后直接触屏拖拽本体 → 空白轻点不误建画线', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    const count = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          return Object.values(d)[0]?.length ?? -1
        } catch {
          return -2
        }
      })

    // 触屏放置文本（pointer 事件驱动）→ 移动端编辑器 → 确认
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '文本', exact: true }).tap()
    await page.waitForTimeout(200)
    // 触摸模拟一次开到底：关掉之后 locator.tap() / CDP 触摸派发都会静默掉事件，
    // 点选与菜单点击就成了碰运气
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const tapAt = async (x: number, y: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await page.waitForTimeout(60)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(200)
    }
    await tapAt(box.x + box.width * 0.4, box.y + box.height * 0.4)
    await page.waitForTimeout(400)
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('mobile-text-input').fill('自动切回')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)
    await page.waitForTimeout(400)

    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.type).toBe('text')
    expect(before!.points).toHaveLength(1)
    expect(await count()).toBe(1)

    // 工具已自动切回「鼠标」：无需手动点鼠标，直接触屏拖拽文本本体（黄字/蓝框像素中心）
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const center = (await findDrawnLineCenter(page))!
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x, y: center.y }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: center.x + i * 8, y: center.y + i * 10 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(500)

    await expect
      .poll(
        async () => {
          const after = await readFirst()
          if (!after || after.points.length !== 1) return false
          const dT = after.points[0].time - before!.points[0].time
          const dP = after.points[0].price - before!.points[0].price
          return after.id === before!.id && (Math.abs(dT) > 0.5 || Math.abs(dP) > 0.01)
        },
        { timeout: 10_000 },
      )
      .toBe(true)

    // 空白处轻点：工具是 none（已切回鼠标），不会误建新画线（仍 1 条）
    // 落点取离文本最远的对角：点得太近会正好点在本体上，「取消选中」就变成「改选」，
    // 后面再点一次反而把选中态取消掉（表现为菜单里没有「删除」）。
    const blank = {
      x: center.x < box.x + box.width / 2 ? box.x + box.width - 24 : box.x + 24,
      y: center.y < box.y + box.height / 2 ? box.y + box.height - 24 : box.y + 24 }
    await tapAt(blank.x, blank.y)
    expect(await count()).toBe(1)

    // 重新点选文本 → 菜单里的「删除」才存在（文本标注无选中描边，状态只能靠菜单项本身证明）
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const reCenter = (await findDrawnLineCenter(page))!
    await tapAt(reCenter.x, reCenter.y)
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(() => count(), { timeout: 5000 })
      .toBe(0)
    expect(errors).toHaveLength(0)
  })

  test('移动端：触屏拖拽创建价格区间框 → 落库两点按价格排序 → 选中蓝色矩形边框 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '价格区间框' }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.32
    const y0 = box.y + box.height * 0.34
    const x1 = box.x + box.width * 0.62
    const y1 = box.y + box.height * 0.58
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'pricerange')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].price).toBeLessThan(saved!.points[1].price)

    // 触摸松手后默认选中：蓝色矩形至少形成上下两行、左右两列
    const stats = () =>
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
        const rows = new Map<number, number>()
        const cols = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            const x = (i / 4) % w
            const y = Math.floor(i / 4 / w)
            rows.set(y, (rows.get(y) ?? 0) + 1)
            cols.set(x, (cols.get(x) ?? 0) + 1)
          }
        }
        return {
          n,
          rows: [...rows.values()].filter((c) => c > 12).length,
          cols: [...cols.values()].filter((c) => c > 6).length }
      })
    // 窄屏下方框本身更小：只按总像素量设阈会误红。改判「选中蓝框的结构性特征」——
    // 上下两条横边（rows≥2）+ 左右两条竖边（cols≥2），并留一个远低于量级的存在性下限。
    await expect
      .poll(() => stats().then((r) => (r.n > 60 && (r.rows >= 2 || r.cols >= 2) ? 'ok' : `${r.n}|${r.rows}|${r.cols}`)), { timeout: 10_000 })
      .toBe('ok')

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：持仓计划 → 触摸三次定义入场/止损/止盈 → 落库三点 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '持仓计划' }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    // 三次触摸点击：入场 → 止损 → 止盈
    for (const [fx, fy] of [[0.5, 0.35], [0.35, 0.65], [0.65, 0.55]]) {
      const x = box.x + box.width * fx
      const y = box.y + box.height * fy
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(300)
    }
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：预测线 → 触摸拖 A→B → 落库两点 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '预测线' }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.32
    const y0 = box.y + box.height * 0.34
    const x1 = box.x + box.width * 0.58
    const y1 = box.y + box.height * 0.56
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6 }] })
      await page.waitForTimeout(30)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：日期范围 → 触摸拖 A→B → 落库两点按时间排序 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '日期范围' }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.32
    const y0 = box.y + box.height * 0.4
    const x1 = box.x + box.width * 0.6
    const y1 = box.y + box.height * 0.55
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6 }] })
      await page.waitForTimeout(30)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：备注便签 → 触摸创建并编辑 → 长按本体回填改字 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '备注' }).tap()
    await page.waitForTimeout(200)
    let cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width * 0.42, y: box.y + box.height * 0.42 }] })
    await page.waitForTimeout(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('mobile-text-input').fill('移动备注')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)

    const center = await findDrawnLineCenter(page)
    expect(center).not.toBeNull()
    if (!center) return
    cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x, y: center.y }] })
    await page.waitForTimeout(300)
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })

    // 编辑器已接管手势：同一手指继续滑动不得再驱动横向惯性或十字光标
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: center.x + 120, y: center.y }] })
    await page.waitForTimeout(80)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('mobile-text-input')).toHaveValue('移动备注')
    await page.getByTestId('mobile-text-input').fill('移动改字')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)

    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'note')
        return (arr[0] as { text?: string }) ?? null
      } catch {
        return null
      }
    })
    expect(saved?.text).toBe('移动改字')

    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })

  test('移动端：长按文本标注本体 → 直接打开编辑器（内容回填）→ 改字落库 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          const arr = Object.values(d)[0] as { type: string; text?: string }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })

    // 触屏放置文本 → 移动端编辑器 → 确认（工具自动切回「鼠标」）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '文本', exact: true }).tap()
    await page.waitForTimeout(200)
    let cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width * 0.4, y: box.y + box.height * 0.4 }] })
    await page.waitForTimeout(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('mobile-text-input').fill('长按编辑')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)
    await page.waitForTimeout(400)

    // 长按文本本体（overlay 实际渲染位置，250ms 不动 → 快捷编辑）→ 编辑器打开且内容回填
    const center = await findDrawnLineCenter(page)
    expect(center).not.toBeNull()
    if (!center) return
    cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: center.x, y: center.y }] })
    await page.waitForTimeout(300)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await expect(page.getByTestId('mobile-text-editor')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('mobile-text-input')).toHaveValue('长按编辑')

    // 改字 → 确认 → 落库
    await page.getByTestId('mobile-text-input').fill('长按改字')
    await page.getByTestId('mobile-text-confirm').tap()
    await expect(page.getByTestId('mobile-text-editor')).toHaveCount(0)
    const updated = await readFirst()
    expect(updated).not.toBeNull()
    expect(updated!.type).toBe('text')
    expect(updated!.text).toBe('长按改字')
    expect(errors).toHaveLength(0)

    // 删除
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
              return Object.values(d)[0]?.length ?? -1
            } catch {
              return -2
            }
          }),
        { timeout: 5000 },
      )
      .toBe(0)

  })

  test('移动端：触屏拖拽创建时间区间 → 落库两点保序 → 选中蓝框双边框 → 删除', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 触摸派发仅 Chromium（跨浏览器触摸拖拽覆盖由 chromium 承担）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 触屏拖拽创建时间区间（左→右横向）
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '时间区间', exact: true }).tap()
    await page.waitForTimeout(200)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const x0 = box.x + box.width * 0.3
    const y0 = box.y + box.height * 0.4
    const x1 = box.x + box.width * 0.6
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(400)

    // 落库：type=timerange，两点按时间排序
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'timerange')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(2)
    expect(saved!.points[0].time).toBeLessThan(saved!.points[1].time)

    // 像素：选中态蓝色竖带双边框（≥2 个 x 列）
    const blueCols = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        const colCount = new Map<number, number>()
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            const x = (i / 4) % w
            colCount.set(x, (colCount.get(x) ?? 0) + 1)
          }
        }
        return [...colCount.values()].filter((c) => c > 20).length
      })
    await expect.poll(blueCols, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)

    // 删除
    await page.getByTestId('mobile-menu-drawing').tap()
    await page.getByRole('button', { name: '删除' }).tap()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
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
    expect(errors).toHaveLength(0)
  })
})

test('桌面：回看历史 → 「回到最新」按钮出现 → 点击回到最新消失', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const btn = page.getByTestId('back-to-latest')
  await expect(btn).toHaveCount(0)

  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // 鼠标按住向右拖 → 视图进入历史（pressedMouseMove 平移）
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= 45; i++) {
    await page.mouse.move(cx + i * 18, cy, { steps: 2 })
  }
  await page.mouse.up()
  await expect(btn).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(300) // 等视图停稳再点击，避免惯性滚动与点击竞争

  await btn.click()
  await expect(btn).toHaveCount(0, { timeout: 8000 })
  expect(errors).toHaveLength(0)
})

test('桌面：行情列表侧栏——点行切交易对 + 排序升降 + 折叠/展开', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)

  // 行情列表可见且行数据已加载（内置 60+ 交易对）
  await expect(page.getByTestId('market-list')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid^="market-row-"]').first()).toBeVisible({ timeout: 20_000 })
  const rowCount = await page.locator('[data-testid^="market-row-"]').count()
  expect(rowCount).toBeGreaterThan(50)

  // 点击 ETH 行 → 主图交易对切换为 ETH/USDT + 行高亮
  await page.getByTestId('market-row-ETHUSDT').click()
  await expect(page.getByText('ETH/USDT', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  // 排序：点价格列 → ▲（升序）；再点 → ▼（降序）
  const priceSort = page.getByTestId('market-sort-price')
  await priceSort.click()
  await expect(priceSort).toContainText('▲')
  await priceSort.click()
  await expect(priceSort).toContainText('▼')

  // 折叠 → 窄竖条；展开 → 面板恢复
  await page.getByTestId('market-list-collapse').click()
  await expect(page.getByTestId('market-list-rail')).toBeVisible()
  await page.getByTestId('market-list-expand').click()
  await expect(page.getByTestId('market-list')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('画线模式：触屏轻扫不触发图表平移，提交后恢复平移', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const chart = page.locator('main div').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()

  // 进入趋势线画线模式后，拖拽只创建画线，不应平移图表
  await openDrawing(page)
  await page.getByRole('button', { name: '趋势线' }).click()
  const startX = box!.x + box!.width * 0.35
  const startY = box!.y + box!.height * 0.4
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + box!.width * 0.18, startY + box!.height * 0.08, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
  const beforeCenter = await findDrawnLineCenter(page)
  expect(beforeCenter).not.toBeNull()

  // 切回鼠标模式后，同样幅度的拖拽应平移图表：画线像素中心随之移动
  await openDrawing(page)
  await page.getByRole('button', { name: '鼠标', exact: true }).click()
  // 切回鼠标不会自动取消选中，先点空白处退出选中态
  await page.mouse.click(box!.x + box!.width * 0.72, box!.y + box!.height * 0.74)
  await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  const panStartX = box!.x + box!.width * 0.5
  const panStartY = box!.y + box!.height * 0.78
  await page.mouse.move(panStartX, panStartY)
  await page.mouse.down()
  await page.mouse.move(panStartX + box!.width * 0.18, panStartY, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const afterCenter = await findDrawnLineCenter(page)
  expect(afterCenter).not.toBeNull()
  expect(Math.abs(afterCenter!.x - beforeCenter!.x)).toBeGreaterThan(10)
})

// ===== 仓位面板：开仓 → 止盈止损线 → 平仓 =====
test('仓位面板：输入开仓 → 止盈止损线落图 → 平仓清除', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('canvas', { timeout: 30_000 })
  // 开仓价靠输入框聚焦时自动填现价 → 必须先等到实时价到位，否则按钮一直禁用
  await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  // 展开「更多」面板，点「仓位」
  await page.getByTestId('header-more').click()
  await page.getByRole('button', { name: '仓位', exact: true }).click()
  // 仓位面板出现（role=region）
  await expect(page.getByRole('region', { name: '模拟仓位' })).toBeVisible()
  // 输入开仓价 + 数量，点开仓
  const inputs = page.getByRole('region', { name: '模拟仓位' }).locator('input')
  // 开仓价由输入框聚焦时自动填入现价（同上：不写死价格，也不被瞬时结算平掉）
  await inputs.nth(0).click()
  await inputs.nth(1).fill('0.05')
  await page.getByRole('button', { name: '开仓', exact: true }).click()
  // 开仓后出现持仓行且含浮动盈亏数值（「浮动盈亏」标签早已移除，改为断言数值存在）
  const posRow = page.getByTestId('position-row-long')
  await expect(posRow).toBeVisible()
  await expect(posRow).toContainText(/-?\d+(\.\d+)?/)
  // 平仓：行内现有 平仓/反手/止盈止损 三个按钮，按可及名称取「平仓」（作用域在行内，不会命中「全部平仓」）
  await posRow.getByRole('button', { name: '平仓 开多' }).click()
  // 面板回到未开仓态（开仓按钮重新出现）
  await expect(page.getByRole('button', { name: '开仓', exact: true })).toBeVisible()
})

// ===== 价格提醒：创建提醒 → 列表显示 → 删除 =====
test('价格提醒：创建提醒 → 列表显示 → 删除', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('canvas', { timeout: 30_000 })
  // 展开「更多」面板，点「提醒」
  await page.getByTestId('header-more').click()
  await page.getByRole('button', { name: '提醒', exact: true }).click()
  // 提醒面板出现
  await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
  // 输入价格，点添加（区域首 input 是隐藏的文件导入框，须按占位符定位价格输入框）
  const priceInput = page.getByRole('region', { name: /价格提醒/ }).getByPlaceholder(/[\d.,]+/).first()
  await priceInput.fill('999999')
  await page.getByRole('button', { name: '添加提醒', exact: true }).click()
  // 列表出现该提醒
  await expect(page.getByText(/999999/)).toBeVisible()
  // 删除
  await page.getByRole('button', { name: '删除', exact: true }).click()
  // 列表为空
  await expect(page.getByText('暂无提醒')).toBeVisible()
})
