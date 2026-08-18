import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { DrawingTool } from '../drawings/logic'
import { useI18n, type MessageKey } from '../i18n'
import { PeriodBar } from './PeriodBar'
import { SymbolPicker } from './SymbolPicker'
import { ThemePicker } from './ThemePicker'
import {
  DRAWING_TOOLS,
  MAIN_OPTIONS,
  SUB_OPTIONS,
  TYPE_OPTIONS,
  optionLabel,
  type HeaderOption,
} from './headerOptions'
import type { MobileHeaderProps } from './MobileHeader'

type MenuId = 'drawing' | 'more' | null

export interface DesktopHeaderProps extends MobileHeaderProps {
  /** 文本标注编辑态：输入框临时出现在可见行 */
  editingTextId: string | null
  textDraft: string
  onTextDraftChange: (v: string) => void
  onConfirmText: () => void
  onCancelText: () => void
}

const PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '100%',
  zIndex: 96,
  background: 'var(--panel)',
  borderTop: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
  padding: '10px 12px',
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '8px 0 6px' }}>{children}</div>
  )
}

/** 弹层内网格选项按钮（画线工具等）—— 自动换行，不产生横向滚动条 */
function OptionGrid({
  options,
  value,
  onPick,
  label,
}: {
  options: HeaderOption[]
  value: string
  onPick: (v: string) => void
  label: (o: HeaderOption) => string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            style={{
              flex: '0 0 auto',
              minWidth: 72,
              padding: '7px 10px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : 'var(--text-dim)',
            }}
          >
            {label(o)}
          </button>
        )
      })}
    </div>
  )
}

/** 折叠面板里的功能按钮（自动换行） */
function PanelButton({
  children,
  onClick,
  title,
  active,
  danger,
  disabled,
  testId,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  testId?: string
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      style={{
        flex: '0 0 auto',
        padding: '7px 10px',
        fontSize: 12,
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        background: danger
          ? 'rgba(239,83,80,0.15)'
          : active
            ? 'rgba(41,98,255,0.25)'
            : 'rgba(255,255,255,0.05)',
        color: danger ? 'var(--down)' : active ? '#4e9cf5' : 'var(--text-dim)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** 可见行内的小按钮（画线触发 / 删除 / 更多） */
function RowButton({
  children,
  onClick,
  title,
  open,
  active,
  danger,
  testId,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
  open?: boolean
  active?: boolean
  danger?: boolean
  testId?: string
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      title={title}
      aria-expanded={open === undefined ? undefined : open}
      style={{
        flex: '0 0 auto',
        padding: '4px 8px',
        fontSize: 11,
        border: '1px solid var(--border)',
        borderRadius: 4,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: danger
          ? 'rgba(239,83,80,0.15)'
          : open
            ? 'rgba(41,98,255,0.25)'
            : active
              ? 'rgba(41,98,255,0.15)'
              : 'transparent',
        color: danger ? 'var(--down)' : open || active ? '#4e9cf5' : 'var(--text-dim)',
      }}
    >
      {children}
    </button>
  )
}

export function DesktopHeader(props: DesktopHeaderProps) {
  const { t } = useI18n()
  const [menu, setMenu] = useState<MenuId>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // 点击弹层外部 → 收起
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  const toggleMenu = (m: Exclude<MenuId, null>) => setMenu((cur) => (cur === m ? null : m))

  const drawLabel =
    props.drawingTool === 'none'
      ? t('drawing.group')
      : optionLabel(
          {
            value: props.drawingTool,
            labelKey: (DRAWING_TOOLS.find((d) => d.value === props.drawingTool)?.labelKey ?? 'drawing.group') as MessageKey,
          },
          t,
        )
  const layoutLabel =
    props.layout === 'single' ? t('layout.single') : props.layout === 'pair' ? t('layout.pair') : t('layout.quad')

  // 触发外部面板/浮层的功能：点击后收起更多面板（避免遮挡右侧面板/弹层，与移动端一致）
  // 纯切换类（类型/主图/副图指标/布局/主题/语言等）保持展开，方便连续操作
  const closeMore = (fn: () => void) => () => {
    fn()
    setMenu(null)
  }
  const moreToggles: { label: string; active: boolean; onToggle: () => void; title?: string; disabled?: boolean }[] = [
    { label: t('panel.position'), active: props.positionActive, onToggle: closeMore(props.onTogglePosition), title: t('panel.positionTitle') },
    { label: t('panel.alerts'), active: props.alertsActive, onToggle: closeMore(props.onToggleAlerts), title: t('panel.alertsTitle') },
    { label: t('panel.depth'), active: props.depthActive, onToggle: closeMore(props.onToggleDepth), title: t('panel.depthTitle') },
    { label: t('panel.orderBook'), active: props.orderBookActive, onToggle: closeMore(props.onToggleOrderBook), title: t('panel.orderBookTitle') },
    { label: t('panel.vp'), active: props.vpActive, onToggle: closeMore(props.onToggleVp), title: t('panel.vpTitle') },
    { label: t('panel.sentiment'), active: props.sentimentActive, onToggle: closeMore(props.onToggleSentiment), title: t('panel.sentimentTitle') },
    { label: t('replay.start'), active: props.replayActive, onToggle: closeMore(props.onReplay), title: t('replay.title'), disabled: props.replayDisabled },
    { label: t('panel.settings'), active: props.settingsActive, onToggle: closeMore(props.onToggleSettings) },
  ]

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: 95 }}>
      <header
        data-testid="desktop-header"
        ref={props.headerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          padding: '6px 10px',
          borderBottom: '1px solid #2a2e39',
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        <SymbolPicker
          value={props.symbol}
          onChange={(s) => {
            setMenu(null)
            props.onSymbol(s)
          }}
        />
        <PeriodBar value={props.period} onChange={props.onPeriod} />
        <RowButton
          testId="drawing-toggle"
          onClick={() => toggleMenu('drawing')}
          open={menu === 'drawing'}
          active={props.drawingTool !== 'none'}
          title={t('drawing.group')}
        >
          {drawLabel} ▾
        </RowButton>
        {props.drawingSelected && (
          <>
            {props.onEditSelectedText && (
              <RowButton onClick={props.onEditSelectedText} title={t('drawing.editText')}>
                {t('drawing.editText')}
              </RowButton>
            )}
            <RowButton onClick={props.onDeleteSelectedDrawing} danger title={t('common.delete')}>
              {t('common.delete')}
            </RowButton>
          </>
        )}
        {props.editingTextId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
            <input
              value={props.textDraft}
              onChange={(e) => props.onTextDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') props.onConfirmText()
                if (e.key === 'Escape') props.onCancelText()
              }}
              placeholder={t('drawing.textPlaceholder')}
              autoFocus
              style={{
                width: 120,
                fontSize: 11,
                padding: '3px 6px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--panel)',
                color: 'var(--text)',
              }}
            />
            <button
              onClick={props.onConfirmText}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              {t('common.confirm')}
            </button>
            <button
              onClick={props.onCancelText}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-dim)',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
        <span style={{ marginLeft: 'auto' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: props.statusColor, flex: '0 0 auto' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: props.statusColor,
              display: 'inline-block',
            }}
          />
          <span style={{ whiteSpace: 'nowrap' }}>{props.statusText}</span>
        </span>
        <RowButton testId="header-more" onClick={() => toggleMenu('more')} open={menu === 'more'} title={t('common.more')}>
          {t('common.more')} ▾
        </RowButton>
      </header>

      {/* 画线工具折叠面板（选工具即收起） */}
      {menu === 'drawing' && (
        <div style={PANEL_STYLE} data-testid="desktop-drawing-panel">
          <SectionTitle>{t('drawing.group')}</SectionTitle>
          <OptionGrid
            options={DRAWING_TOOLS}
            value={props.drawingTool}
            label={(o) => optionLabel(o, t)}
            onPick={(v) => {
              props.onDrawingTool(v as DrawingTool)
              setMenu(null)
            }}
          />
        </div>
      )}

      {/* 更多功能折叠面板：按钮自动换行，不出横向滚动条 */}
      {menu === 'more' && (
        <div style={PANEL_STYLE} data-testid="desktop-more-panel">
          <SectionTitle>{t('group.type')} · {t('group.main')} · {t('group.sub')}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>{t('group.type')}</span>
              {TYPE_OPTIONS.map((o) => {
                const active = o.value === props.chartType
                return (
                  <button
                    key={o.value}
                    data-testid={`chart-type-${o.value}`}
                    onClick={() => props.onChartType(o.value as never)}
                    style={{
                      flex: '0 0 auto',
                      padding: '7px 10px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#fff' : 'var(--text-dim)',
                    }}
                  >
                    {optionLabel(o, t)}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>{t('group.main')}</span>
              {MAIN_OPTIONS.map((o) => {
                const active = o.value === props.mainIndicator
                return (
                  <button
                    key={o.value}
                    data-testid={`main-indicator-${o.value}`}
                    onClick={() => props.onMainIndicator(o.value as never)}
                    style={{
                      flex: '0 0 auto',
                      padding: '7px 10px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#fff' : 'var(--text-dim)',
                    }}
                  >
                    {optionLabel(o, t)}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>{t('group.sub')}</span>
              {SUB_OPTIONS.map((o) => {
                const active = o.value === props.subIndicator
                return (
                  <button
                    key={o.value}
                    data-testid={`sub-indicator-${o.value}`}
                    onClick={() => props.onSubIndicator(o.value as never)}
                    style={{
                      flex: '0 0 auto',
                      padding: '7px 10px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#fff' : 'var(--text-dim)',
                    }}
                  >
                    {optionLabel(o, t)}
                  </button>
                )
              })}
            </div>
          </div>
          <SectionTitle>{t('layout.switchTitle')} · {t('scale.title')} · {t('theme.switchTitle')}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <PanelButton onClick={props.onCycleLayout} title={t('layout.switchTitle')} active={props.layout !== 'single'} testId="layout-toggle">
              {layoutLabel}
            </PanelButton>
            <PanelButton onClick={props.onToggleScale} title={t('scale.title')} active={props.priceScaleMode === 'log'} testId="scale-toggle">
              {props.priceScaleMode === 'log' ? t('scale.log') : t('scale.linear')}
            </PanelButton>
            <PanelButton onClick={props.onToggleTheme} title={t('theme.switchTitle')}>
              {props.themeMode === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            </PanelButton>
            <ThemePicker value={props.colorPreset} onChange={props.onColorPreset} />
            <PanelButton onClick={props.onToggleWatermark} title={t('settings.watermarkTitle')} active={props.showWatermark} testId="watermark-toggle">
              {t('settings.watermark')}
            </PanelButton>
          </div>
          <SectionTitle>{t('common.more')}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {moreToggles.map((it) => (
              <PanelButton key={it.label} onClick={it.onToggle} title={it.title} active={it.active} disabled={it.disabled}>
                {it.label}
              </PanelButton>
            ))}
          </div>
          <SectionTitle>{t('shortcuts.title')} · {t('lang.switchTo')} · {t('share.title')}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <PanelButton onClick={props.onToggleFullscreen} title={props.isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')} active={props.isFullscreen}>
              {props.isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
            </PanelButton>
            <PanelButton onClick={props.onToggleShortcuts} title={t('shortcuts.hint')} active={props.shortcutsActive} testId="shortcuts-toggle">
              ?
            </PanelButton>
            <PanelButton onClick={props.onCycleLang} title={t('lang.switchTo')}>
              {props.langLabel}
            </PanelButton>
            <PanelButton onClick={props.onShare} title={t('share.title')} active={props.copied}>
              {props.copied ? t('share.copied') : t('share.copy')}
            </PanelButton>
            <PanelButton onClick={props.onExport} title={t('share.exportTitle')} active={props.exported}>
              {props.exported ? t('share.exported') : t('share.export')}
            </PanelButton>
          </div>
        </div>
      )}
    </div>
  )
}
