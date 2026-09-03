import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  TEXT_COLOR_OPTIONS,
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  type DrawingTool,
} from '../drawings/logic'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'
import { DrawingColorRow } from './DrawingColorRow'
import { DrawingLayers } from './DrawingLayers'
import { DrawingToolPicker } from './DrawingToolPicker'
import { PeriodBar } from './PeriodBar'
import { SymbolPicker } from './SymbolPicker'
import { ThemePicker } from './ThemePicker'
import {
  DRAWING_TOOLS,
  MAIN_OPTIONS,
  SUB_OPTIONS,
  TYPE_OPTIONS,
  optionLabel,
} from './headerOptions'
import type { MobileHeaderProps } from './MobileHeader'

type MenuId = 'drawing' | 'more' | 'layers' | null

export interface DesktopHeaderProps extends MobileHeaderProps {
  /** 文本标注编辑态：输入框临时出现在可见行 */
  editingTextId: string | null
  textDraft: string
  textFontSize: number
  textColor: string
  onTextDraftChange: (v: string) => void
  onTextFontSizeChange: (n: number) => void
  onTextColorChange: (c: string) => void
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

/** 折叠面板里的功能按钮（自动换行） */
function PanelButton({
  children,
  onClick,
  title,
  ariaLabel,
  active,
  danger,
  disabled,
  testId,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
  ariaLabel?: string
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
      aria-label={ariaLabel}
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
  // 交易对搜索下拉是否打开：它是顶栏最上层，Esc 层进链路里先于菜单关闭
  const [searchOpen, setSearchOpen] = useState(false)
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

  // 弹层打开时 Esc 收起（stopImmediatePropagation 阻止同 window 上 App 全局 Esc 链路，一次只关一层）。
  // 搜索下拉或 App 更高层打开时不劫持：让 Esc 冒泡给真正的顶层（搜索输入框自身处理器 / App 全局链路）
  useEffect(() => {
    if (menu === null || searchOpen || props.escChainActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      e.preventDefault()
      setMenu(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, searchOpen, props.escChainActive])

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
    { label: t('paper.title'), active: props.tradesActive, onToggle: closeMore(props.onToggleTrades), title: t('paper.title') },
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
          onOpenChange={setSearchOpen}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <textarea
                value={props.textDraft}
                onChange={(e) => props.onTextDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) props.onConfirmText()
                  if (e.key === 'Escape') props.onCancelText()
                }}
                placeholder={t('drawing.textPlaceholder')}
                autoFocus
                rows={2}
                style={{
                  width: 120,
                  minHeight: 30,
                  fontSize: 11,
                  padding: '3px 6px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  resize: 'vertical',
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={props.onConfirmText}
                data-testid="text-confirm"
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
            <div
              data-testid="text-options"
              style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('drawing.fontSize')}</span>
              <button
                onClick={() => props.onTextFontSizeChange(Math.max(TEXT_FONT_SIZE_MIN, props.textFontSize - 2))}
                data-testid="text-font-dec"
                aria-label={`${t('drawing.fontSize')} -`}
                style={{
                  padding: '1px 6px',
                  fontSize: 11,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text)',
                }}
              >
                A−
              </button>
              <span data-testid="text-font-value" style={{ fontSize: 11, color: 'var(--text)', minWidth: 20, textAlign: 'center' }}>
                {props.textFontSize}
              </span>
              <button
                onClick={() => props.onTextFontSizeChange(Math.min(TEXT_FONT_SIZE_MAX, props.textFontSize + 2))}
                data-testid="text-font-inc"
                aria-label={`${t('drawing.fontSize')} +`}
                style={{
                  padding: '1px 6px',
                  fontSize: 11,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text)',
                }}
              >
                A+
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{t('drawing.color')}</span>
              {TEXT_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  data-testid={`text-color-${opt.id}`}
                  aria-label={`${t('drawing.color')} ${opt.id}`}
                  aria-pressed={props.textColor === opt.color}
                  onClick={() => props.onTextColorChange(opt.color)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: props.textColor === opt.color ? '2px solid #fff' : '1px solid var(--border)',
                    cursor: 'pointer',
                    background: opt.color || 'transparent',
                    ...(opt.color
                      ? {}
                      : {
                          background: 'transparent',
                          border: '1px dashed var(--border)',
                          color: 'var(--text)',
                          fontSize: 10,
                          lineHeight: '14px',
                        }),
                  }}
                >
                  {opt.color ? '' : 'A'}
                </button>
              ))}
            </div>
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
          <span data-testid="conn-status" style={{ whiteSpace: 'nowrap' }}>{props.statusText}</span>
        </span>
        <RowButton testId="header-more" onClick={() => toggleMenu('more')} open={menu === 'more'} title={t('common.more')}>
          {t('common.more')} ▾
        </RowButton>
      </header>

      {/* 画线工具折叠面板（选工具即收起） */}
      {menu === 'drawing' && (
        <div style={PANEL_STYLE} data-testid="desktop-drawing-panel">
          <SectionTitle>{t('drawing.group')}</SectionTitle>
          <DrawingToolPicker
            testIdPrefix="desktop-drawing"
            value={props.drawingTool}
            onPick={(v) => {
              props.onDrawingTool(v as DrawingTool)
              setMenu(null)
            }}
          />
          <DrawingColorRow testIdPrefix="desktop-drawing" value={props.drawingColor} onChange={props.onDrawingColor} />
          <PanelButton
            onClick={props.onToggleDrawingSnap}
            title={t('drawing.snap')}
            ariaLabel={`${t('drawing.snap')}: ${props.drawingSnap === 'off' ? t('drawing.snapOff') : props.drawingSnap === 'time' ? t('drawing.snapTime') : t('drawing.snapOhlc')}`}
            active={props.drawingSnap !== 'off'}
            testId="drawing-snap-toggle"
          >
            {t('drawing.snap')} · {props.drawingSnap === 'off' ? t('drawing.snapOff') : props.drawingSnap === 'time' ? t('drawing.snapTime') : t('drawing.snapOhlc')}
          </PanelButton>
          <PanelButton
            onClick={props.onToggleNotesHidden}
            title={t('drawing.noteToggle')}
            ariaLabel={t('drawing.noteToggle')}
            active={props.notesHidden}
            testId="drawing-note-toggle"
          >
            {t('drawing.noteToggle')}
          </PanelButton>
          <button
            data-testid="drawing-layers-open"
            onClick={() => setMenu('layers')}
            style={{
              marginTop: 8,
              padding: '7px 12px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-dim)',
            }}
          >
            {t('layers.title')}（{props.drawings.length}）
          </button>
        </div>
      )}

      {/* 画线图层管理面板 */}
      {menu === 'layers' && (
        <div style={PANEL_STYLE} data-testid="desktop-layers-panel">
          <DrawingLayers
            drawings={props.drawings}
            selectedId={props.selectedDrawingId}
            onSelect={props.onSelectDrawing}
            onToggleHidden={props.onToggleDrawingHidden}
            onToggleLocked={props.onToggleDrawingLocked}
            onSetOpacity={props.onSetDrawingOpacity}
            onSetFollowLatest={props.onSetDrawingFollowLatest}
            onGroupHidden={props.onGroupHidden}
            onGroupLocked={props.onGroupLocked}
            onDelete={props.onDeleteDrawing}
            onClearAll={props.onClearDrawings}
            onSetAllHidden={props.onSetAllDrawingsHidden}
            onExport={props.onExportDrawings}
            onImportFile={props.onImportDrawings}
            importError={props.drawingImportError}
            canUndo={props.drawingCanUndo}
            canRedo={props.drawingCanRedo}
            onUndo={props.onUndoDrawing}
            onRedo={props.onRedoDrawing}
            canPaste={props.drawingCanPaste}
            onCopy={props.onCopyDrawing}
            onPaste={props.onPasteDrawing}
            templates={props.drawingTemplates}
            onSaveTemplate={props.onSaveDrawingTemplate}
            onApplyTemplate={props.onApplyDrawingTemplate}
            onDeleteTemplate={props.onDeleteDrawingTemplate}
            onBack={() => setMenu('drawing')}
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
            <PanelButton
              onClick={props.onCycleLayout}
              title={t('layout.switchTitle')}
              ariaLabel={`${t('layout.switchTitle')}: ${layoutLabel}`}
              active={props.layout !== 'single'}
              testId="layout-toggle"
            >
              {layoutLabel}
            </PanelButton>
            <PanelButton
              onClick={props.onToggleScale}
              title={t('scale.title')}
              ariaLabel={`${t('scale.title')}: ${props.priceScaleMode === 'log' ? t('scale.log') : t('scale.linear')}`}
              active={props.priceScaleMode === 'log'}
              testId="scale-toggle"
            >
              {props.priceScaleMode === 'log' ? t('scale.log') : t('scale.linear')}
            </PanelButton>
            <PanelButton
              onClick={props.onToggleTimezone}
              title={t('tz.title')}
              ariaLabel={`${t('tz.title')}: ${props.timezoneMode === 'local' ? t('tz.local') : t('tz.utc')}`}
              active={props.timezoneMode === 'local'}
              testId="tz-toggle"
            >
              {props.timezoneMode === 'local' ? t('tz.local') : t('tz.utc')}
            </PanelButton>
            <PanelButton
              onClick={props.onToggleTheme}
              title={t('theme.switchTitle')}
              ariaLabel={`${t('theme.switchTitle')}: ${(props.themeSetting ?? props.themeMode) === 'auto' ? t('theme.toAuto') : (props.themeSetting ?? props.themeMode) === 'dark' ? t('theme.toLight') : t('theme.toDark')}`}
            >
              {(props.themeSetting ?? props.themeMode) === 'auto' ? t('theme.toAuto') : (props.themeSetting ?? props.themeMode) === 'dark' ? t('theme.toLight') : t('theme.toDark')}
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
            <a
              data-testid="knowledge-link"
              href={`${import.meta.env.BASE_URL}knowledge/`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('common.knowledgeTitle')}
              style={{
                flex: '0 0 auto',
                padding: '7px 10px',
                fontSize: 12,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              📚 {t('common.knowledge')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
