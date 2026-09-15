import { describe, expect, it } from 'vitest'
import { shareTextFile } from '../shellShare'

describe('shellShare 桩（Web/测试）', () => {
  it('恒返回 fallback（不拦截导出，保持下载行为）', async () => {
    await expect(shareTextFile('trades.csv', 'a,b')).resolves.toBe('fallback')
  })
  it('空内容同样回退', async () => {
    await expect(shareTextFile('paper-account.json', '')).resolves.toBe('fallback')
  })
})
