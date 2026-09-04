import type { CSSProperties, ReactNode } from 'react'
import { groupDrawings, type Drawing } from '../drawings/logic'
import type { DrawingTemplate } from '../drawings/templates'
import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { DRAWING_TOOLS, optionLabel } from './headerOptions'

interface DrawingLayersProps {
  /** 当前交易对全部画线（含隐藏/锁定） */
  drawings: Drawing[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleHidden: (id: string) => void
  onToggleLocked: (id: string) => void
  /** C10 单条透明度调节（0.15–1） */
  onSetOpacity: (id: string, opacity: number) => void
  /** C15 position 工具跟随最新价开关 */
  onSetFollowLatest: (id: string, followLatest: boolean) => void
  /** I15 画线重命名（name 传 '' 清除） */
  onRename: (id: string, name: string) => void
  /** C4 分组批量操作：组统一隐藏/锁定（key='' 为未分组） */
  onGroupHidden: (group: string, hidden: boolean) => void
  onGroupLocked: (group: string, locked: boolean) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  /** 批量显示/隐藏全部画线 */
  onSetAllHidden: (hidden: boolean) => void
  /** 画线 JSON 导出/导入（T19） */
  onExport: () => void
  onImportFile: (f: File) => void
  /** 导入错误信息（i18n 文本），null=无 */
  importError?: string | null
  /** 撤销/重做（P3：画线编辑历史栈，会话内有效） */
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  /** C7 画线复制/粘贴（跨品种）；可粘贴表示剪贴板已有画线 */
  canPaste: boolean
  onCopy: () => void
  onPaste: () => void
  /** 画线模板（C6）：命名保存常用组合，一键套用到任意品种 */
  templates: DrawingTemplate[]
  onSaveTemplate: (name: string) => void
  onApplyTemplate: (name: string) => void
  onDeleteTemplate: (name: string) => void
  /** 返回画线工具选择视图 */
  onBack: () => void
}

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  padding: 0,
  fontSize: 13,
  lineHeight: 1,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  flex: '0 0 auto',
}

export function DrawingLayers({
  drawings,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onSetOpacity,
  onSetFollowLatest,
  onGroupHidden,
  onGroupLocked,
  onDelete,
  onClearAll,
  onSetAllHidden,
  onExport,
  onImportFile,
  importError,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canPaste,
  onCopy,
  onPaste,
  templates,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  onBack,
  onRename,
}: DrawingLayersProps) {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  // I15 搜索：按自定义名或类型标签过滤图层树（空 = 全部）
  const [searchQuery, setSearchQuery] = useState('')
  // I15 重命名：正在编辑的图层 id（行内输入框）
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  // 模板保存输入（C6）：回车或按钮提交
  const [templateName, setTemplateName] = useState('')
  const [templateSavedFlash, setTemplateSavedFlash] = useState(false)
  // C4 分组折叠：低优先级组名集合（折叠时该组画线隐藏）
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroupCollapsed = (group: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  // I15 搜索过滤：自定义名 / 类型标签 / 分组名 任一命中（空查询 = 全部）
  const visibleDrawings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return drawings
    return drawings.filter((d) => {
      const opt = DRAWING_TOOLS.find((o) => o.value === d.type)
      const typeLabel = opt ? optionLabel(opt, t).toLowerCase() : d.type
      return (
        (d.name ?? '').toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        (d.group ?? '').toLowerCase().includes(q)
      )
    })
  }, [drawings, searchQuery, t])
  return (
    <div
      data-testid="drawing-layers"
      role="region"
      aria-label={t('layers.title')}
      style={{ minWidth: 260 }}
    >
      {/* 头部：返回 + 标题（含数量）+ 全部清除 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <button
          data-testid="drawing-layer-back"
          onClick={onBack}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-dim)',
          }}
        >
          ← {t('layers.back')}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {t('layers.title')}（{drawings.length}）
        </span>
        {/* 撤销/重做：画线编辑历史栈（会话内） */}
        <button
          data-testid="drawing-layer-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title={t('layers.undo')}
          aria-label={t('layers.undo')}
          aria-disabled={!canUndo}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            background: canUndo ? 'rgba(41,98,255,0.15)' : 'rgba(255,255,255,0.03)',
            color: canUndo ? 'var(--accent)' : 'var(--text-faint)',
          }}
        >
          ↩
        </button>
        <button
          data-testid="drawing-layer-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title={t('layers.redo')}
          aria-label={t('layers.redo')}
          aria-disabled={!canRedo}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            background: canRedo ? 'rgba(41,98,255,0.15)' : 'rgba(255,255,255,0.03)',
            color: canRedo ? 'var(--accent)' : 'var(--text-faint)',
          }}
        >
          ↪
        </button>
        {/* C7 画线复制/粘贴（跨品种） */}
        <button
          data-testid="drawing-layer-copy"
          onClick={onCopy}
          disabled={!selectedId}
          title={t('layers.copy')}
          aria-label={t('layers.copy')}
          aria-disabled={!selectedId}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: selectedId ? 'pointer' : 'not-allowed',
            background: selectedId ? 'rgba(41,98,255,0.15)' : 'rgba(255,255,255,0.03)',
            color: selectedId ? 'var(--accent)' : 'var(--text-faint)',
          }}
        >
          📋
        </button>
        <button
          data-testid="drawing-layer-paste"
          onClick={onPaste}
          disabled={!canPaste}
          title={t('layers.paste')}
          aria-label={t('layers.paste')}
          aria-disabled={!canPaste}
          style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 6,
            cursor: canPaste ? 'pointer' : 'not-allowed',
            background: canPaste ? 'rgba(41,98,255,0.15)' : 'rgba(255,255,255,0.03)',
            color: canPaste ? 'var(--accent)' : 'var(--text-faint)',
          }}
        >
          📌
        </button>
        <div style={{ flex: 1 }} />
        {drawings.length > 0 && (
          <>
            <button
              data-testid="drawing-layer-export"
              onClick={onExport}
              title={t('layers.export')}
              aria-label={t('layers.export')}
              style={{
                flex: '0 0 auto',
                padding: '4px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
              }}
            >
              ⬇
            </button>
            <button
              data-testid="drawing-layer-import"
              onClick={() => fileRef.current?.click()}
              title={t('layers.import')}
              aria-label={t('layers.import')}
              style={{
                flex: '0 0 auto',
                padding: '4px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
              }}
            >
              ⬆
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportFile(f)
                e.target.value = ''
              }}
            />
            <button
              data-testid="drawing-layer-show-all"
              onClick={() => onSetAllHidden(false)}
              title={t('layers.showAll')}
              aria-label={t('layers.showAll')}
              style={{
                flex: '0 0 auto',
                padding: '4px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
              }}
            >
              👁
            </button>
            <button
              data-testid="drawing-layer-hide-all"
              onClick={() => onSetAllHidden(true)}
              title={t('layers.hideAll')}
              aria-label={t('layers.hideAll')}
              style={{
                flex: '0 0 auto',
                padding: '4px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
              }}
            >
              🚫
            </button>
          </>
        )}
        {drawings.length > 0 && (
          <button
            data-testid="drawing-layer-clear"
            onClick={onClearAll}
            style={{
              flex: '0 0 auto',
              padding: '4px 8px',
              fontSize: 11,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'rgba(239,83,80,0.15)',
              color: 'var(--down)',
            }}
          >
            {t('layers.clearAll')}
          </button>
        )}
      </div>

      {/* 列表 / 空状态 */}
      {importError && (
        <div data-testid="drawing-import-error" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--down)' }}>
          {importError}
        </div>
      )}
      {drawings.length > 0 && (
        <input
          data-testid="drawing-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('layers.search')}
          aria-label={t('layers.search')}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '4px 8px',
            marginBottom: 6,
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--bg)',
            color: 'var(--text)',
          }}
        />
      )}
      {drawings.length === 0 ? (
        <div
          data-testid="drawing-layer-empty"
          style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}
        >
          {t('layers.empty')}
        </div>
      ) : (
        <div
          role="listbox"
          aria-label={t('layers.title')}
          style={{ maxHeight: 'min(40vh, 320px)', overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          {Object.entries(groupDrawings(visibleDrawings)).map(([group, items]) => {
            const collapsed = collapsedGroups.has(group)
            const allHidden = items.every((d) => d.hidden)
            const allLocked = items.every((d) => d.locked)
            const label = group === '' ? t('layers.ungrouped') : group
            return (
              <div key={group || '__ungrouped'}>
                {/* C4 组头：折叠 + 组名 + 计数 + 组级显隐/锁定 */}
                <div
                  data-testid="drawing-group-header"
                  data-group={group}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 6px',
                    marginTop: 4,
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleGroupCollapsed(group)}
                >
                  <span style={{ flexShrink: 0, width: 14, textAlign: 'center' }}>{collapsed ? '▶' : '▼'}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label} ({items.length})
                  </span>
                  {rowBtn(
                    `drawing-group-eye-${group || 'ungrouped'}`,
                    allHidden ? t('layers.show') : t('layers.hide'),
                    !allHidden,
                    (e) => {
                      e.stopPropagation()
                      onGroupHidden(group, !allHidden)
                    },
                    allHidden ? '🚫' : '👁',
                    allHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                  )}
                  {rowBtn(
                    `drawing-group-lock-${group || 'ungrouped'}`,
                    allLocked ? t('layers.unlock') : t('layers.lock'),
                    allLocked,
                    (e) => {
                      e.stopPropagation()
                      onGroupLocked(group, !allLocked)
                    },
                    allLocked ? '🔒' : '🔓',
                    allLocked ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.10)',
                  )}
                </div>
                {/* C4 组折叠：折叠时组内画线不渲染（数据保留） */}
                {!collapsed &&
                  items.map((d) => {
                    const opt = DRAWING_TOOLS.find((o) => o.value === d.type)
                    const itemLabel = opt ? optionLabel(opt, t) : d.type
                    const selected = d.id === selectedId
                    return (
                      <div
                        key={d.id}
                        data-testid="drawing-layer-row"
                        role="option"
                        aria-selected={selected}
                        data-selected={selected}
                        data-type={d.type}
                        onClick={() => onSelect(d.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 6px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          marginBottom: 2,
                          background: selected ? 'rgba(41,98,255,0.18)' : 'transparent',
                          border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                        }}
                      >
                        {renamingId === d.id ? (
                          <input
                            data-testid="drawing-rename-input"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => {
                              onRename(d.id, renameDraft.trim())
                              setRenamingId(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRename(d.id, renameDraft.trim())
                                setRenamingId(null)
                              } else if (e.key === 'Escape') setRenamingId(null)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              fontSize: 12,
                              padding: '1px 4px',
                              border: '1px solid var(--accent)',
                              borderRadius: 4,
                              background: 'var(--bg)',
                              color: 'var(--text)',
                              minWidth: 0,
                            }}
                          />
                        ) : (
                          <span
                            data-testid="drawing-layer-name"
                            style={{
                              flex: 1,
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: selected ? 'var(--accent)' : 'var(--text-dim)',
                            }}
                          >
                            {d.name ?? itemLabel}
                          </span>
                        )}
                        {renamingId !== d.id &&
                          rowBtn(
                            'drawing-layer-rename',
                            t('layers.rename'),
                            false,
                            (e) => {
                              e.stopPropagation()
                              setRenamingId(d.id)
                              setRenameDraft(d.name ?? '')
                            },
                            '✎',
                            'rgba(255,255,255,0.06)',
                          )}
                        {rowBtn(
                          'drawing-layer-eye',
                          d.hidden ? t('layers.show') : t('layers.hide'),
                          !d.hidden,
                          (e) => {
                            e.stopPropagation()
                            onToggleHidden(d.id)
                          },
                          d.hidden ? '🚫' : '👁',
                          d.hidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                        )}
                        {rowBtn(
                          'drawing-layer-lock',
                          d.locked ? t('layers.unlock') : t('layers.lock'),
                          !!d.locked,
                          (e) => {
                            e.stopPropagation()
                            onToggleLocked(d.id)
                          },
                          d.locked ? '🔒' : '🔓',
                          d.locked ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.10)',
                        )}
                        {rowBtn(
                          'drawing-layer-delete',
                          t('common.delete'),
                          false,
                          (e) => {
                            e.stopPropagation()
                            onDelete(d.id)
                          },
                          '🗑',
                          'rgba(239,83,80,0.12)',
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      )}

      {/* C10 单条透明度：选中画线时显示滑杆调节（0.15–1） */}
      {(() => {
        const sel = drawings.find((d) => d.id === selectedId)
        if (!sel) return null
        const value = sel.opacity ?? 1
        return (
          <div
            data-testid="drawing-opacity-row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 52, flexShrink: 0 }}>{t('layers.opacity')}</span>
            <input
              data-testid="drawing-opacity-slider"
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={value}
              onChange={(e) => onSetOpacity(sel.id, Number(e.target.value))}
              aria-label={`${t('layers.opacity')} ${Math.round(value * 100)}%`}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(value * 100)}%
            </span>
          </div>
        )
      })()}

      {/* C15 position 工具跟随最新价：入场锚点随最新收盘价自动贴附 */}
      {(() => {
        const sel = drawings.find((d) => d.id === selectedId)
        if (!sel || sel.type !== 'position') return null
        const on = sel.followLatest ?? false
        return (
          <label
            data-testid="drawing-follow-latest-row"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, cursor: 'pointer' }}
          >
            <input
              data-testid="drawing-follow-latest-checkbox"
              type="checkbox"
              checked={on}
              onChange={(e) => onSetFollowLatest(sel.id, e.target.checked)}
              aria-label={t('layers.followLatest')}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('layers.followLatest')}</span>
          </label>
        )
      })()}

      {/* 画线模板（C6）：命名保存常用组合，一键套用 */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>
          {t('layers.templateTitle')}
          {templateSavedFlash && (
            <span style={{ color: 'var(--up)', marginLeft: 8 }}>{t('layers.templateSaved')}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <input
            data-testid="drawing-template-name"
            value={templateName}
            placeholder={t('layers.templateNamePlaceholder')}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim() && drawings.length > 0) {
                onSaveTemplate(templateName.trim())
                setTemplateName('')
                setTemplateSavedFlash(true)
                window.setTimeout(() => setTemplateSavedFlash(false), 1600)
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '5px 8px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #2a2e39',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <button
            data-testid="drawing-template-save"
            disabled={!templateName.trim() || drawings.length === 0}
            onClick={() => {
              onSaveTemplate(templateName.trim())
              setTemplateName('')
              setTemplateSavedFlash(true)
              window.setTimeout(() => setTemplateSavedFlash(false), 1600)
            }}
            style={{
              flex: '0 0 auto',
              padding: '5px 10px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: templateName.trim() && drawings.length > 0 ? 'pointer' : 'not-allowed',
              background: templateName.trim() && drawings.length > 0 ? 'rgba(41,98,255,0.18)' : 'rgba(255,255,255,0.04)',
              color: templateName.trim() && drawings.length > 0 ? 'var(--accent)' : 'var(--text-faint)',
            }}
          >
            {t('layers.templateSave')}
          </button>
        </div>
        {templates.length === 0 ? (
          <div data-testid="drawing-template-empty" style={{ fontSize: 11, color: 'var(--text-faint)', padding: '4px 2px' }}>
            {t('layers.templateEmpty')}
          </div>
        ) : (
          <div data-testid="drawing-template-list" style={{ maxHeight: 'min(24vh, 180px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {templates.map((tmpl) => (
              <div
                key={tmpl.name}
                data-testid="drawing-template-row"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 2px', marginBottom: 2 }}
              >
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tmpl.name}（{tmpl.drawings.length}）
                </span>
                <button
                  data-testid="drawing-template-apply"
                  onClick={() => onApplyTemplate(tmpl.name)}
                  style={{
                    flex: '0 0 auto',
                    padding: '3px 8px',
                    fontSize: 11,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'rgba(41,98,255,0.15)',
                    color: 'var(--accent)',
                  }}
                >
                  {t('layers.templateApply')}
                </button>
                <button
                  data-testid="drawing-template-delete"
                  onClick={() => onDeleteTemplate(tmpl.name)}
                  aria-label={t('common.delete')}
                  style={{
                    flex: '0 0 auto',
                    padding: '3px 6px',
                    fontSize: 11,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'rgba(239,83,80,0.12)',
                    color: 'var(--down)',
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 行内图标按钮（眼睛/锁定/删除） */
function rowBtn(
  testId: string,
  title: string,
  active: boolean,
  onClick: (e: { stopPropagation(): void }) => void,
  children: ReactNode,
  bg: string,
) {
  return (
    <button
      data-testid={testId}
      data-active={active}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        ...btnBase,
        background: bg,
        color: active ? 'var(--accent)' : 'var(--text-faint)',
        opacity: active ? 1 : 0.65,
      }}
    >
      {children}
    </button>
  )
}
