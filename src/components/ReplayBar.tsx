import type { ReplayState } from '../replay/engine'
import { REPLAY_SPEEDS } from '../replay/engine'

interface ReplayBarProps {
  replay: ReplayState
  cursorTime: number | null
  onToggle: () => void
  onSpeed: (s: number) => void
  onSeek: (cursor: number) => void
  onExit: () => void
}

export function ReplayBar({ replay, cursorTime, onToggle, onSpeed, onSeek, onExit }: ReplayBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 16px',
        borderTop: '1px solid #2a2e39',
        background: 'var(--panel)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(245,192,47,0.15)',
          color: 'var(--yellow)',
          whiteSpace: 'nowrap',
        }}
      >
        回放
      </span>
      <button
        onClick={onToggle}
        style={{
          padding: '3px 12px',
          fontSize: 12,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text)',
          minWidth: 56,
        }}
      >
        {replay.playing ? '暂停' : '播放'}
      </button>
      {REPLAY_SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => onSpeed(s)}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: s === replay.speed ? 'var(--accent)' : 'transparent',
            color: s === replay.speed ? '#fff' : 'var(--text-dim)',
          }}
        >
          {s}x
        </button>
      ))}
      <input
        type="range"
        min={0}
        max={Math.max(0, replay.total - 1)}
        value={replay.cursor}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', width: 150, textAlign: 'right' }}>
        {cursorTime ? new Date(cursorTime * 1000).toLocaleString('zh-CN', { hour12: false }) : '—'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
        {replay.cursor + 1} / {replay.total}
      </span>
      <button
        onClick={onExit}
        style={{
          padding: '3px 12px',
          fontSize: 12,
          border: '1px solid #2a2e39',
          borderRadius: 4,
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--down)',
        }}
      >
        退出回放
      </button>
    </div>
  )
}
