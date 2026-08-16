export type ThemeMode = 'dark' | 'light'

/** 主题色预设 id：classic 默认（保持原配色） */
export type ColorPresetId = 'classic' | 'a-share' | 'purple' | 'teal'

export interface ChartTheme {
  background: string
  textColor: string
  gridColor: string
  borderColor: string
  up: string
  down: string
  yellow: string
  accent: string
}

export interface ColorPreset {
  id: ColorPresetId
  /** i18n 字典键（theme.preset*） */
  labelKey: 'theme.presetClassic' | 'theme.presetAShare' | 'theme.presetPurple' | 'theme.presetTeal'
  accent: string
  up: string
  down: string
  yellow: string
}

export const THEMES: Record<ThemeMode, ChartTheme> = {
  dark: {
    background: '#131722',
    textColor: '#d1d4dc',
    gridColor: 'rgba(42,46,57,0.6)',
    borderColor: 'rgba(42,46,57,0.6)',
    up: '#26a69a',
    down: '#ef5350',
    yellow: '#f5c02f',
    accent: '#2962ff',
  },
  light: {
    background: '#f7f8fa',
    textColor: '#1e222d',
    gridColor: 'rgba(30,34,45,0.08)',
    borderColor: 'rgba(30,34,45,0.12)',
    up: '#0d9480',
    down: '#dc4a4a',
    yellow: '#b8860b',
    accent: '#2962ff',
  },
}

/** 主题色预设：accent（选中/强调）+ 涨跌色（K 线/图表） */
export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'classic',
    labelKey: 'theme.presetClassic',
    accent: '#2962ff',
    up: '#26a69a',
    down: '#ef5350',
    yellow: '#f5c02f',
  },
  {
    id: 'a-share',
    labelKey: 'theme.presetAShare',
    accent: '#d4380d',
    up: '#ef5350',
    down: '#26a69a',
    yellow: '#f5c02f',
  },
  {
    id: 'purple',
    labelKey: 'theme.presetPurple',
    accent: '#8b5cf6',
    up: '#22c55e',
    down: '#f43f5e',
    yellow: '#f5c02f',
  },
  {
    id: 'teal',
    labelKey: 'theme.presetTeal',
    accent: '#06b6d4',
    up: '#10b981',
    down: '#fb7185',
    yellow: '#f5c02f',
  },
]

export function presetFor(id: ColorPresetId): ColorPreset {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0]
}

/** 图表主题 = 模式基础色 + 预设涨跌/强调色（画布渲染用） */
export function themeFor(mode: ThemeMode, presetId: ColorPresetId = 'classic'): ChartTheme {
  const base = THEMES[mode]
  const p = presetFor(presetId)
  return { ...base, up: p.up, down: p.down, yellow: p.yellow, accent: p.accent }
}

/** 应用主题到 html[data-theme]：模式切 CSS 变量；预设色以内联变量覆盖 --accent/--up/--down/--yellow */
export function applyTheme(mode: ThemeMode, presetId: ColorPresetId = 'classic') {
  document.documentElement.setAttribute('data-theme', mode)
  const p = presetFor(presetId)
  const root = document.documentElement.style
  root.setProperty('--accent', p.accent)
  root.setProperty('--up', p.up)
  root.setProperty('--down', p.down)
  root.setProperty('--yellow', p.yellow)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEMES[mode].background)
}
