import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * G1 文档站组件测试：独立 vitest 配置。
 * 面向 docs-site 的 Vue 计算器组件（@vue/test-utils 挂载级），
 * 与主应用（React, vitest.config 默认配置）隔离，避免插件/环境串扰。
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['docs-site/.vitepress/theme/__tests__/**/*.test.ts'],
    globals: false,
  },
})
