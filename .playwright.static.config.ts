import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 2,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    // 生产构建 + 极简静态服务器（直连币安，与线上 Pages/Vercel 同构；serve 内置 cleanUrls 会 301 .html 到无后缀，
    // 导致 /knowledge/ 子站本地行为与线上不一致，故用自研静态服务器：目录→index.html、真实文件直出、其余 SPA 回退）
    command: 'npm run build && node scripts/serve-static.mjs 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
