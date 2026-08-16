import { defineConfig } from 'vitest/config'

/** 性能基线独立配置：不与其他测试并行，预算可保持严格（npm run perf） */
export default defineConfig({
  test: {
    include: ['src/indicators/__tests__/perf.test.ts'],
    setupFiles: ['vitest.setup.ts'],
  },
})
