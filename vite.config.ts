import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端统一走相对路径 /api /ws，由本代理转发到币安，禁止硬编码外部域名
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    // 壳插件只装在 app-shell/；主应用动态 import 仅用于壳内初始化，Web/测试环境走空实现降级。
    // VITE_CAPACITOR=1（壳构建：Android/iOS CI 打包）时指向 app-shell/node_modules 的真实插件，
    // 使状态栏/启动屏/返回键在原生 WebView 内真正生效；未设置（Web/测试）保持桩降级。
    alias: process.env.VITE_CAPACITOR
      ? [
          { find: /^@capacitor\/app$/, replacement: '/app-shell/node_modules/@capacitor/app/dist/esm/index.js' },
          { find: '@capacitor/status-bar', replacement: '/app-shell/node_modules/@capacitor/status-bar/dist/esm/index.js' },
          { find: '@capacitor/splash-screen', replacement: '/app-shell/node_modules/@capacitor/splash-screen/dist/esm/index.js' },
          { find: '@shell/notifications', replacement: '/app-shell/native-notifications.ts' },
        ]
      : [
          { find: /^@capacitor\/app$/, replacement: '/src/shell-app.ts' },
          { find: '@capacitor/status-bar', replacement: '/src/shell-compat.ts' },
          { find: '@capacitor/splash-screen', replacement: '/src/shell-compat.ts' },
          { find: '@shell/notifications', replacement: '/src/shellNotifications.ts' },
        ],
  },
  build: {
    rollupOptions: {
      output: {
        // vite 8（rolldown 内核）不再支持对象形式 manualChunks，改函数形式；
        // 第三方库按域拆为独立 chunk，利用浏览器缓存减少重复下载（O6 体积优化）
        manualChunks(id: string) {
          if (id.includes('lightweight-charts')) return 'vendor-charts'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 保留原始路径转发：/api/v3/klines → https://data-api.binance.vision/api/v3/klines
      '/api': {
        target: 'https://data-api.binance.vision',
        changeOrigin: true,
      },
      // /ws/btcusdt@kline_1m → wss://stream.binance.com:443/ws/btcusdt@kline_1m
      '/ws': {
        target: 'wss://stream.binance.com:443',
        changeOrigin: true,
        ws: true,
      },
      // 永续合约数据（资金费率/未平仓）→ fapi.binance.com
      '/fapi': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
      },
      // 衍生品情绪数据（多空比/持仓量历史）→ fapi.binance.com
      '/futures': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
      },
    },
  },
  test: {
    setupFiles: ['vitest.setup.ts'],
    exclude: ['**/perf.test.ts', '**/e2e/**', '**/node_modules/**', '**/dist/**', 'docs-site/**'],
    coverage: {
      provider: 'v8',
      // O7 覆盖率基线：adapter 渲染层依赖 canvas（jsdom 无法创建 2d 上下文），由 E2E 覆盖；不计入单测覆盖率
      exclude: ['**/adapter.ts', '**/__tests__/**', '**/e2e/**', '**/perf.test.ts', '**/node_modules/**', '**/dist/**', '**/shell-app.ts', '**/shell-compat.ts'],
      reporter: ['text', 'json-summary'],
      // O7 门禁：低于阈值 coverage 命令即失败（防回退；当前基线 ~80%，后续继续提升到 85%）
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 70,
        lines: 80,
      },
    },
  },
})
