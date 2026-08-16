import { Component, type ReactNode } from 'react'

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

  render() {
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
          <div style={{ fontSize: 15, color: 'var(--down)' }}>图表渲染出错</div>
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
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
