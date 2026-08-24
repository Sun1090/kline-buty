import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端统一走相对路径 /api /ws，由本代理转发到币安，禁止硬编码外部域名
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    // 壳插件只装在 app-shell/；主应用动态 import 仅用于壳内初始化，Web/测试环境走空实现降级。
    alias: [
      { find: /^@capacitor\/app$/, replacement: '/src/shell-app.ts' },
      { find: '@capacitor/status-bar', replacement: '/src/shell-compat.ts' },
      { find: '@capacitor/splash-screen', replacement: '/src/shell-compat.ts' },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // lightweight-charts 拆为独立 vendor chunk，利用浏览器缓存减少重复下载
          vendor: ['lightweight-charts'],
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
    exclude: ['**/perf.test.ts', '**/e2e/**', '**/node_modules/**', '**/dist/**'],
  },
})
