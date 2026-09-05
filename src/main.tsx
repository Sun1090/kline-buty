import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { I18nProvider } from './i18n/I18nProvider'
import { SKELETON_KEYFRAMES } from './components/Skeleton'
import { initErrorReporting } from './utils/errorReport'

// O1 错误监控：全局 error / unhandledrejection 捕获（本地降级；endpoint 未配置不上报）
initErrorReporting()

// L6 骨架屏脉冲动画 + M4 统一焦点环 + M7 减少动效：一次性注入全局样式
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
/* M7 减少动效偏好：用户系统开启 reduced-motion 时关闭全部 CSS 动画与过渡 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
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
