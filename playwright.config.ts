import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 2,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    // 生产构建 + 静态服务器（直连币安，与线上部署同构；避免 vite dev 代理长跑劣化）
    command: 'npm run build && npx serve dist -l 5173 -s',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
