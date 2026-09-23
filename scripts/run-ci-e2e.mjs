// CI 的 E2E 入口：清单只有一份（e2e/ci-specs.json），工作流不再抄写文件名。
// 忘了登记新规格会由 scripts/__tests__/ci-specs.test.ts 在单测阶段变红。
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const { ci } = JSON.parse(readFileSync(new URL('../e2e/ci-specs.json', import.meta.url), 'utf-8'))
const passthrough = process.argv.slice(2)
const result = spawnSync('npx', ['playwright', 'test', ...ci, ...passthrough], { stdio: 'inherit' })
process.exit(result.status ?? 1)
