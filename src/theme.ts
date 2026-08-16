export type ThemeMode = 'dark' | 'light'

export interface ChartTheme {
  background: string
  textColor: string
  gridColor: string
  borderColor: string
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
  },
  light: {
    background: '#f7f8fa',
    textColor: '#1e222d',
    gridColor: 'rgba(30,34,45,0.08)',
    borderColor: 'rgba(30,34,45,0.12)',
    up: '#0d9480',
    down: '#dc4a4a',
    yellow: '#b8860b',
  },
}

/** 应用主题到 html[data-theme]（CSS 变量随动） */
export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEMES[mode].background)
}
