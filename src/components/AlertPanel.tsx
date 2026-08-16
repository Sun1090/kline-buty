import { useState } from 'react'
import type { AlertsApi } from '../hooks/usePriceAlerts'

interface AlertPanelProps {
  symbol: string
  currentPrice: number | null
  alertsApi: AlertsApi
}

const inputStyle: React.CSSProperties = {
  width: 80,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

export function AlertPanel({ symbol, currentPrice, alertsApi }: AlertPanelProps) {
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [price, setPrice] = useState('')
  const { alerts, permission, addAlert, removeAlert, resetAlert, requestPermission } = alertsApi

  const priceNum = Number(price)
  const valid = Number.isFinite(priceNum) && priceNum > 0

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol)

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 100,
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        padding: '12px 14px',
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 260,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>价格提醒 · {symbol.replace('USDT', '/USDT')}</span>
        {permission === 'granted' ? (
          <span style={{ color: 'var(--up)', fontSize: 11 }}>通知已开启</span>
        ) : permission === 'unsupported' ? (
          <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>环境不支持通知</span>
        ) : (
          <button
            onClick={() => void requestPermission()}
            style={{ background: 'none', border: '1px solid #2a2e39', borderRadius: 4, color: '#4e9cf5', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}
          >
            开启通知
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {(['above', 'below'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: d === direction ? 'var(--accent)' : 'transparent',
              color: d === direction ? '#fff' : 'var(--text-dim)',
            }}
          >
            {d === 'above' ? '价格 ≥' : '价格 ≤'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          style={inputStyle}
          placeholder={currentPrice ? String(currentPrice.toFixed(2)) : '价格'}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          onClick={() => {
            if (valid) {
              addAlert(symbol, direction, priceNum)
              setPrice('')
            }
          }}
          disabled={!valid}
          style={{
            flex: 1,
            padding: '4px 0',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: valid ? 'pointer' : 'not-allowed',
            background: valid ? 'var(--accent)' : 'var(--border)',
            color: valid ? '#fff' : 'var(--text-faint)',
          }}
        >
          添加提醒
        </button>
      </div>

      {symbolAlerts.length === 0 ? (
        <div style={{ color: 'var(--text-faint)' }}>暂无提醒</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {symbolAlerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: 6,
                background: a.triggered ? 'rgba(245,192,47,0.08)' : 'transparent',
                border: '1px solid #2a2e39',
              }}
            >
              <span style={{ color: a.triggered ? 'var(--yellow)' : 'var(--text)' }}>
                {a.direction === 'above' ? '≥' : '≤'} {a.price.toFixed(2)}
                {a.triggered && ' · 已触发'}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                {a.triggered && (
                  <button onClick={() => resetAlert(a.id)} style={{ background: 'none', border: 'none', color: '#4e9cf5', cursor: 'pointer', fontSize: 11 }}>
                    重置
                  </button>
                )}
                <button onClick={() => removeAlert(a.id)} style={{ background: 'none', border: 'none', color: 'var(--down)', cursor: 'pointer', fontSize: 11 }}>
                  删除
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
