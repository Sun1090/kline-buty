import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { I18nProvider } from './i18n/I18nProvider'
import { SKELETON_KEYFRAMES } from './components/Skeleton'

// L6 骨架屏脉冲动画 + M4 统一焦点环：一次性注入全局样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
${SKELETON_KEYFRAMES}
/* M4 统一焦点可见性：键盘导航时显示清晰 focus ring，鼠标点击不显示 */
:where(button, a, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--accent, #4e9cf5);
  outline-offset: 1px;
}
:where(button, a, input, select, textarea, [tabindex]):focus:not(:focus-visible) {
  outline: none;
}
`
  document.head.appendChild(style)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
)
