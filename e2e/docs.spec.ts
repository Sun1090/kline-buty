import { test, expect } from '@playwright/test'

/**
 * 知识库文档站（VitePress，双语）E2E：
 * - 生产构建 dist/knowledge 由 scripts/docs-build.mjs 合并，静态服务器目录→index.html、.html 直出
 * - en 为根 locale（/knowledge/），zh 全量在 /knowledge/zh/；不依赖币安网络，稳定快速
 */
test.describe('知识库文档站（双语）', () => {
  test('英文落地页 + en 章节与正文直达', async ({ page }) => {
    await page.goto('/knowledge/')
    await expect(page).toHaveTitle(/Trading Knowledge Base/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Trading Knowledge Base/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start Reading' })).toBeVisible()

    // en 已翻译章节：getting-started/
    await page.goto('/knowledge/getting-started/')
    await expect(page.getByRole('heading', { name: /Getting Started/ }).first()).toBeVisible({ timeout: 20_000 })

    await page.goto('/knowledge/getting-started/core-concepts.html')
    await expect(page.getByRole('heading', { name: /Trading Core Concepts/ }).first()).toBeVisible({ timeout: 20_000 })
  })

  test('中文落地页 + zh 章节与正文直达', async ({ page }) => {
    await page.goto('/knowledge/zh/')
    await expect(page).toHaveTitle(/交易知识库/, { timeout: 20_000 })
    await expect(page.getByRole('link', { name: '开始阅读' })).toBeVisible()

    await page.goto('/knowledge/zh/getting-started/')
    await expect(page.getByRole('heading', { name: /01 · 入门基础篇/ }).first()).toBeVisible({ timeout: 20_000 })

    await page.goto('/knowledge/zh/getting-started/core-concepts.html')
    await expect(page.getByRole('heading', { name: /02 · 交易核心概念/ }).first()).toBeVisible({ timeout: 20_000 })

    // 侧边栏客户端导航：点击「金融市场全景」→ 正文加载
    await page.getByRole('link', { name: /金融市场全景/ }).first().click()
    await expect
      .poll(() => decodeURIComponent(page.url()), { timeout: 10_000 })
      .toMatch(/market-overview\.html$/)
    await expect(page.getByRole('heading', { name: /01 · 金融市场全景/ }).first()).toBeVisible({ timeout: 20_000 })
  })

  test('语言切换器：en ↔ zh', async ({ page }) => {
    await page.goto('/knowledge/getting-started/core-concepts.html')
    // VitePress 语言切换是导航栏下拉菜单：先开菜单再点目标语言
    await page.getByRole('button', { name: 'Change language' }).click()
    await page.getByRole('link', { name: /简体中文/ }).first().click()
    await expect
      .poll(() => decodeURIComponent(page.url()), { timeout: 15_000 })
      .toMatch(/\/zh\/getting-started\/core-concepts/)
    await expect(page.getByRole('heading', { name: /02 · 交易核心概念/ }).first()).toBeVisible({ timeout: 15_000 })
  })
})
