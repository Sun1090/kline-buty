#!/usr/bin/env node
/**
 * O4 发布预检：一键依次执行 typecheck → lint → unit → perf → build，
 * 任一步失败即中止（exit 非 0），供 CI 与发布前人工校验。
 *
 * 用法：npm run precheck        （全量）
 *      npm run precheck --skip-build
 */
import { execSync } from 'node:child_process'

const steps = [
  { name: 'Typecheck', cmd: 'npx tsc -b --noEmit' },
  { name: 'Lint', cmd: 'npm run lint' },
  { name: 'Unit tests', cmd: 'npm test' },
  { name: 'Perf baseline', cmd: 'npm run perf' },
  { name: 'Build (app + docs)', cmd: 'npm run build' },
]

const skipBuild = process.argv.includes('--skip-build')

const t0 = Date.now()
for (const step of steps) {
  if (skipBuild && step.name.startsWith('Build')) {
    console.log(`\n[precheck] SKIP ${step.name}`)
    continue
  }
  console.log(`\n[precheck] ▶ ${step.name} ...`)
  try {
    execSync(step.cmd, { stdio: 'inherit', shell: true })
  } catch {
    console.error(`\n[precheck] ✗ FAILED at ${step.name}`)
    process.exit(1)
  }
}
console.log(`\n[precheck] ✓ All checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
