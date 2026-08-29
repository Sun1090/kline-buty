import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { Period } from '../chart/types'
import type { ChartType, MainIndicatorKind, SubIndicatorKind } from './ChartView'
import type { Drawing, DrawingTool } from '../drawings/logic'
import type { ColorPresetId, ThemeMode } from '../theme'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'
import { DrawingColorRow } from './DrawingColorRow'
import { DrawingLayers } from './DrawingLayers'
import { DrawingToolPicker } from './DrawingToolPicker'
import { OptionGrid } from './OptionGrid'
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

type MenuId = 'type' | 'main' | 'sub' | 'drawing' | 'more' | 'layers'

export interface MobileHeaderProps {
  /** 由 App 注入，供 ResizeObserver 测 header 高度（右侧抽屉/面板定位依赖） */
  headerRef?: RefObject<HTMLElement | null>
  symbol: string
  onSymbol: (s: string) => void
  statusText: string
  statusColor: string
  period: Period
  onPeriod: (p: Period) => void
  chartType: ChartType
  onChartType: (t: ChartType) => void
  priceScaleMode: 'linear' | 'log'
  onToggleScale: () => void
  mainIndicator: MainIndicatorKind
  onMainIndicator: (m: MainIndicatorKind) => void
  subIndicator: SubIndicatorKind
  onSubIndicator: (s: SubIndicatorKind) => void
  drawingTool: DrawingTool
  /** 新建画线默认颜色偏好（'' = 跟随主题） */
  drawingColor: string
  onDrawingColor: (c: string) => void
  onDrawingTool: (t: DrawingTool) => void
  drawingSelected: boolean
  onDeleteSelectedDrawing: () => void
  onEditSelectedText?: () => void
  /** 图层管理：当前交易对全部画线 + 操作回调 */
  drawings: Drawing[]
  selectedDrawingId: string | null
  onSelectDrawing: (id: string) => void
  onToggleDrawingHidden: (id: string) => void
  onToggleDrawingLocked: (id: string) => void
  onDeleteDrawing: (id: string) => void
  onClearDrawings: () => void
  layout: 'single' | 'pair' | 'quad'
  onCycleLayout: () => void
  themeMode: ThemeMode
  onToggleTheme: () => void
  colorPreset: ColorPresetId
  onColorPreset: (c: ColorPresetId) => void
  showWatermark: boolean
  onToggleWatermark: () => void
  positionActive: boolean
  onTogglePosition: () => void
  alertsActive: boolean
  onToggleAlerts: () => void
  depthActive: boolean
  onToggleDepth: () => void
  orderBookActive: boolean
  onToggleOrderBook: () => void
  vpActive: boolean
  onToggleVp: () => void
  sentimentActive: boolean
  onToggleSentiment: () => void
  marketListActive?: boolean
  onToggleMarketList?: () => void
  replayActive: boolean
  replayDisabled: boolean
  onReplay: () => void
  settingsActive: boolean
  onToggleSettings: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  shortcutsActive: boolean
  onToggleShortcuts: () => void
  /** App 全局 Esc 链路上有更高层（面板/浮层/画线进度等）打开时为 true：顶栏弹层让路，不劫持 Esc */
  /** 主题设置三态（auto/dark/light）：自动档按钮文案需区分有效模式与设置 */
  themeSetting?: 'auto' | ThemeMode
  escChainActive?: boolean
  langLabel: string
  onCycleLang: () => void
  copied: boolean
  onShare: () => void
  exported: boolean
  onExport: () => void
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
  maxHeight: '48vh',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '8px 0 6px' }}>{children}</div>
  )
}

export function MobileHeader(props: MobileHeaderProps) {
  const { t } = useI18n()
  const [menu, setMenu] = useState<MenuId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // 点击/触摸弹层外部 → 收起菜单
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

  // 弹层打开时 Esc 收起（stopImmediatePropagation 阻止同 window 上 App 全局 Esc 链路，一次只关一层）
  useEffect(() => {
    if (menu === null || props.escChainActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      e.preventDefault()
      setMenu(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, props.escChainActive])

  const toggleMenu = (m: MenuId) => setMenu((cur) => (cur === m ? null : m))
  // 选中即收面板
  const closePanel = () => setMenu(null)

  const typeLabel = optionLabel(TYPE_OPTIONS.find((o) => o.value === props.chartType) ?? TYPE_OPTIONS[0], t)
  const mainLabel = optionLabel(MAIN_OPTIONS.find((o) => o.value === props.mainIndicator) ?? MAIN_OPTIONS[0], t)
  const subLabel = optionLabel(SUB_OPTIONS.find((o) => o.value === props.subIndicator) ?? SUB_OPTIONS[0], t)
  const drawLabel =
    props.drawingTool === 'none'
      ? t('drawing.group')
      : optionLabel(
          { value: props.drawingTool, labelKey: (DRAWING_TOOLS.find((d) => d.value === props.drawingTool)?.labelKey ?? 'drawing.group') as MessageKey },
          t,
        )
  const layoutLabel =
    props.layout === 'single' ? t('layout.single') : props.layout === 'pair' ? t('layout.pair') : t('layout.quad')

  const triggerStyle = (open: boolean, active = false): CSSProperties => ({
    flex: 1,
    minWidth: 0,
    padding: '6px 4px',
    fontSize: 11,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    background: open ? 'rgba(41,98,255,0.25)' : active ? 'rgba(41,98,255,0.15)' : 'rgba(255,255,255,0.04)',
    color: open || active ? '#4e9cf5' : 'var(--text-dim)',
  })

  const editText = props.onEditSelectedText
  const selectSymbol = (s: string) => {
    setMenu(null)
    props.onSymbol(s)
  }

  const moreToggles: { label: string; active: boolean; onToggle: () => void; title?: string }[] = [
    { label: t('panel.position'), active: props.positionActive, onToggle: props.onTogglePosition, title: t('panel.positionTitle') },
    { label: t('panel.alerts'), active: props.alertsActive, onToggle: props.onToggleAlerts, title: t('panel.alertsTitle') },
    { label: t('panel.depth'), active: props.depthActive, onToggle: props.onToggleDepth, title: t('panel.depthTitle') },
    { label: t('panel.orderBook'), active: props.orderBookActive, onToggle: props.onToggleOrderBook, title: t('panel.orderBookTitle') },
    { label: t('panel.vp'), active: props.vpActive, onToggle: props.onToggleVp, title: t('panel.vpTitle') },
    { label: t('panel.sentiment'), active: props.sentimentActive, onToggle: props.onToggleSentiment, title: t('panel.sentimentTitle') },
    ...(props.onToggleMarketList
      ? [{ label: t('marketList.title'), active: !!props.marketListActive, onToggle: props.onToggleMarketList, title: t('marketList.title') }]
      : []),
    { label: t('panel.settings'), active: props.settingsActive, onToggle: props.onToggleSettings },
    {
      label: props.priceScaleMode === 'log' ? t('scale.log') : t('scale.linear'),
      active: props.priceScaleMode === 'log',
      onToggle: props.onToggleScale,
      title: t('scale.title'),
    },
  ]

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: 95 }}>
      <header
        data-testid="mobile-header"
        ref={props.headerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 10px 6px',
          borderBottom: '1px solid #2a2e39',
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        {/* 第 1 行：交易对（点击开搜索）+ 状态 + 主题 + 更多 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ flexShrink: 1, minWidth: 0 }}>
            <SymbolPicker value={props.symbol} onChange={selectSymbol} />
          </div>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: props.statusColor,
              flex: '0 1 auto',
              minWidth: 0,
              maxWidth: '42%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: props.statusColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span data-testid="conn-status" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {props.statusText}
            </span>
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={props.onToggleTheme}
              title={t('theme.switchTitle')}
              aria-label={t('theme.switchTitle')}
              style={{
                padding: '4px 8px',
                fontSize: 14,
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-dim)',
                lineHeight: 1,
              }}
            >
              {props.themeMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              data-testid="mobile-more"
              onClick={() => toggleMenu('more')}
              aria-expanded={menu === 'more'}
              style={{
                padding: '5px 10px',
                fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                background: menu === 'more' ? 'rgba(41,98,255,0.25)' : 'transparent',
                color: menu === 'more' ? '#4e9cf5' : 'var(--text-dim)',
              }}
            >
              {t('common.more')} ⋯
            </button>
          </span>
        </div>

        {/* 第 2 行：周期换行展示（全部周期直接可见，绝不出现横向滚动条） */}
        <PeriodBar value={props.period} onChange={props.onPeriod} compact />

        {/* 第 3 行：类型/主图/副图/画线弹层 + 布局/回放/全屏 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            data-testid="mobile-menu-type"
            onClick={() => toggleMenu('type')}
            aria-expanded={menu === 'type'}
            title={t('group.type')}
            style={triggerStyle(menu === 'type')}
          >
            {typeLabel} ▾
          </button>
          <button
            data-testid="mobile-menu-main"
            onClick={() => toggleMenu('main')}
            aria-expanded={menu === 'main'}
            title={t('group.main')}
            style={triggerStyle(menu === 'main')}
          >
            {mainLabel} ▾
          </button>
          <button
            data-testid="mobile-menu-sub"
            onClick={() => toggleMenu('sub')}
            aria-expanded={menu === 'sub'}
            title={t('group.sub')}
            style={triggerStyle(menu === 'sub')}
          >
            {subLabel} ▾
          </button>
          <button
            data-testid="mobile-menu-drawing"
            onClick={() => toggleMenu('drawing')}
            aria-expanded={menu === 'drawing'}
            title={t('drawing.group')}
            style={triggerStyle(menu === 'drawing', props.drawingTool !== 'none')}
          >
            {drawLabel} ▾
          </button>
          <button
            onClick={props.onCycleLayout}
            title={t('layout.switchTitle')}
            style={triggerStyle(false, props.layout !== 'single')}
          >
            {layoutLabel}
          </button>
          <button
            onClick={props.onReplay}
            disabled={props.replayDisabled}
            title={props.replayDisabled ? t('status.replayNotEnough') : t('replay.title')}
            style={{
              ...triggerStyle(false, props.replayActive),
              ...(props.replayDisabled ? { opacity: 0.4, cursor: 'default' } : {}),
            }}
          >
            {props.replayActive ? '⏸' : t('replay.start')}
          </button>
          <button
            onClick={props.onToggleFullscreen}
            title={props.isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
            style={triggerStyle(false, props.isFullscreen)}
          >
            {'⛶'}
          </button>
        </div>
      </header>

      {/* 弹层面板（绝对定位，撑满 header 宽度） */}
      {menu && (
        <div style={PANEL_STYLE} data-testid={`mobile-panel-${menu}`}>
          {menu === 'type' && (
            <>
              <SectionTitle>{t('group.type')}</SectionTitle>
              <OptionGrid
                options={TYPE_OPTIONS}
                value={props.chartType}
                label={(o) => optionLabel(o, t)}
                onPick={(v) => {
                  props.onChartType(v as ChartType)
                  closePanel()
                }}
              />
            </>
          )}
          {menu === 'main' && (
            <>
              <SectionTitle>{t('group.main')}</SectionTitle>
              <OptionGrid
                options={MAIN_OPTIONS}
                value={props.mainIndicator}
                label={(o) => optionLabel(o, t)}
                onPick={(v) => {
                  props.onMainIndicator(v as MainIndicatorKind)
                  closePanel()
                }}
              />
            </>
          )}
          {menu === 'sub' && (
            <>
              <SectionTitle>{t('group.sub')}</SectionTitle>
              <OptionGrid
                options={SUB_OPTIONS}
                value={props.subIndicator}
                label={(o) => optionLabel(o, t)}
                onPick={(v) => {
                  props.onSubIndicator(v as SubIndicatorKind)
                  closePanel()
                }}
              />
            </>
          )}
          {menu === 'drawing' && (
            <>
              <SectionTitle>{t('drawing.group')}</SectionTitle>
              {props.drawingSelected && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {editText && (
                    <button
                      onClick={() => {
                        editText()
                        closePanel()
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: 12,
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: 'rgba(41,98,255,0.15)',
                        color: 'var(--accent)',
                      }}
                    >
                      {t('drawing.editText')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      props.onDeleteSelectedDrawing()
                      closePanel()
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: 'rgba(239,83,80,0.15)',
                      color: 'var(--down)',
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
              <DrawingToolPicker
                testIdPrefix="mobile-drawing"
                value={props.drawingTool}
                onPick={(v) => {
                  props.onDrawingTool(v as DrawingTool)
                  closePanel()
                }}
              />
              <DrawingColorRow testIdPrefix="mobile-drawing" value={props.drawingColor} onChange={props.onDrawingColor} />
              <button
                data-testid="drawing-layers-open"
                onClick={() => setMenu('layers')}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '8px 10px',
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
            </>
          )}
          {menu === 'layers' && (
            <DrawingLayers
              drawings={props.drawings}
              selectedId={props.selectedDrawingId}
              onSelect={props.onSelectDrawing}
              onToggleHidden={props.onToggleDrawingHidden}
              onToggleLocked={props.onToggleDrawingLocked}
              onDelete={props.onDeleteDrawing}
              onClearAll={props.onClearDrawings}
              onBack={() => setMenu('drawing')}
            />
          )}
          {menu === 'more' && (
            <>
              <SectionTitle>{t('common.more')}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {moreToggles.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => {
                      it.onToggle()
                      closePanel()
                    }}
                    title={it.title}
                    style={{
                      padding: '10px 8px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: it.active ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
                      color: it.active ? '#4e9cf5' : 'var(--text-dim)',
                    }}
                  >
                    {it.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    props.onToggleTheme()
                  }}
                  title={t('theme.switchTitle')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-dim)',
                  }}
                >
                  {(props.themeSetting ?? props.themeMode) === 'auto' ? t('theme.toAuto') : (props.themeSetting ?? props.themeMode) === 'dark' ? t('theme.toLight') : t('theme.toDark')}
                </button>
                <button
                  onClick={props.onToggleWatermark}
                  data-testid="watermark-toggle"
                  title={t('settings.watermarkTitle')}
                  aria-pressed={props.showWatermark}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: props.showWatermark ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
                    color: props.showWatermark ? '#4e9cf5' : 'var(--text-dim)',
                  }}
                >
                  {t('settings.watermark')}
                </button>
                <button
                  onClick={props.onCycleLang}
                  title={t('lang.switchTo')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-dim)',
                  }}
                >
                  {props.langLabel}
                </button>
              </div>
              <SectionTitle>{t('theme.pickTitle')}</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <ThemePicker value={props.colorPreset} onChange={props.onColorPreset} />
              </div>
              <SectionTitle>{t('shortcuts.title')}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  onClick={() => {
                    props.onShare()
                  }}
                  title={t('share.title')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: props.copied ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
                    color: props.copied ? '#4e9cf5' : 'var(--text-dim)',
                  }}
                >
                  {props.copied ? t('share.copied') : t('share.copy')}
                </button>
                <button
                  onClick={() => {
                    props.onExport()
                  }}
                  title={t('share.exportTitle')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: props.exported ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
                    color: props.exported ? '#4e9cf5' : 'var(--text-dim)',
                  }}
                >
                  {props.exported ? t('share.exported') : t('share.export')}
                </button>
                <button
                  onClick={() => {
                    props.onToggleShortcuts()
                    closePanel()
                  }}
                  title={t('shortcuts.hint')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: props.shortcutsActive ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
                    color: props.shortcutsActive ? '#4e9cf5' : 'var(--text-dim)',
                  }}
                >
                  {t('shortcuts.title')}
                </button>
                <a
                  data-testid="knowledge-link"
                  href={`${import.meta.env.BASE_URL}knowledge/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('common.knowledgeTitle')}
                  style={{
                    padding: '10px 8px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-dim)',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  📚 {t('common.knowledge')}
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
