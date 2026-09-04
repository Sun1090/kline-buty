import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { I18nProvider } from './i18n/I18nProvider'
import { SKELETON_KEYFRAMES } from './components/Skeleton'

// L6 骨架屏脉冲动画：一次性注入全局样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = SKELETON_KEYFRAMES
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
