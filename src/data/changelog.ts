/**
 * H5 应用内版本历史：与 CHANGELOG.md 对应的重要版本条目（新在前）。
 * rows 为 i18n 键（changelog.v04r1 等，五语字典见 messages.ts），由 ChangelogModal 翻译渲染。
 */
export interface ChangelogEntry {
  version: string
  date: string
  rows: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.4',
    date: '2026-09',
    rows: [
      'v04r1',
      'v04r2',
      'v04r3',
      'v04r4',
      'v04r5',
      'v04r6',
      'v04r7',
      'v04r8',
    ],
  },
  {
    version: 'v0.3',
    date: '2026-08',
    rows: ['v03r1', 'v03r2'],
  },
  {
    version: 'v0.2',
    date: '2026-07',
    rows: ['v02r1'],
  },
  {
    version: 'v0.1',
    date: '2026-06',
    rows: ['v01r1'],
  },
]