import type { ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'

export type PanelStatus = 'loading' | 'error' | 'empty'

interface PanelStateProps {
  status: PanelStatus
  /** 覆盖默认文案（i18n 已翻译的字符串） */
  message?: ReactNode
  /** error 态的重试按钮 */
  onRetry?: () => void
}

const style: React.CSSProperties = {
  padding: '16px 12px',
  fontSize: 12,
  color: 'var(--text-faint)',
  textAlign: 'center',
}

/** 面板统一空态/错误态/加载态（T30）：三态共用一套样式，error 可带重试 */
export function PanelState({ status, message, onRetry }: PanelStateProps) {
  const { t } = useI18n()
  const fallback = status === 'loading' ? t('panelState.loading') : status === 'error' ? t('panelState.error') : t('panelState.empty')
  return (
    <div style={style} role={status === 'error' ? 'alert' : 'status'}>
      <div>{message ?? fallback}</div>
      {status === 'error' && onRetry && (
        <button
          data-testid="panel-retry"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '3px 12px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
          }}
        >
          {t('panelState.retry')}
        </button>
      )}
    </div>
  )
}
