import { Component, type ReactNode } from 'react'
import { makeT } from '../i18n/translate'
import { DICTIONARIES, type Lang } from '../i18n/messages'
import { reportRenderError } from '../utils/errorReport'

function readLang(): Lang {
  try {
    const v = localStorage.getItem('kline-buty:lang')
    if (v === 'zh-CN' || v === 'en') return v
  } catch {
    /* noop */
  }
  return 'zh-CN'
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** 渲染错误边界：防止图表等模块崩溃导致整页白屏 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  /** O1 渲染错误上报（错误监控：不采集用户数据，仅错误摘要） */
  componentDidCatch(error: Error) {
    reportRenderError(error)
  }

  render() {
    const t = makeT(DICTIONARIES[readLang()])
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 12,
            color: 'var(--text-dim)',
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 15, color: 'var(--down)' }}>{t('errorBoundary.title')}</div>
          <div style={{ maxWidth: 480, textAlign: 'center', fontSize: 12, wordBreak: 'break-all' }}>
            {String(this.state.error?.message ?? this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              border: '1px solid #2a2e39',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'var(--panel)',
              color: 'var(--text)',
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
