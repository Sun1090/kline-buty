# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。提交均在本地，大阶段全绿后统一 push。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**阶段 F · UI / 主题 / 可访问性（进行中）** — docs/13 阶段 F（F1–F20）
- F4 弹层焦点陷阱 ✅（AlertPanel/PositionPanel/TradeHistoryPanel 接入 useFocusTrap）
- F7 高对比模式 ✅（applyTheme highContrast + data-hc CSS + 头部开关持久化）
- F14 侧边栏宽度可调 ✅（persisted width + col-resize 手柄 240–720）
- F15 信息条显示项配置 ✅（StatsBar 齿轮下拉，7 项开关持久化）
- F18 面板布局方案保存 ✅（命名快照 保存/套用/删除）
- F5 焦点可见性 ✅（既有 focus-visible）/ F8 减少动效 ✅（useReducedMotion）/ F9 键盘选择器 ✅ /
  F10 快捷键冲突检测 ✅ / F11 语言切换快捷键 ✅ / F12 a11y 自动化断言 ✅ / F13 顶栏可折叠 ✅（More 设计既定）/
  F17 对比模式 ✅ / F19 骨架屏 ✅ / F20 弱网降级 ✅
- F1 图表键盘导航 ◐（方向键十字光标漫游既有，平移/缩放待增强）
- F2 键盘画线 ✳ **待实现**
- F3 全面板 Tab 可达性 ◐（a11yAudit 覆盖 6 面板，扩充中）
- F6 屏幕阅读器标签 ◐（随组件审计）
- F16 面板拖拽排序 ✳ **待实现**
- 状态：F 批一已提交（a3f60d7），E2E 验证中

## 阶段 E · 提醒与通知（已闭合，E 批一 f38d594）

- E1 推送渠道 ✅（channel system/web/both 持久化 + 站内横幅 toast）
- E2 多品种同时监控 ✅（prices 表覆盖全部提醒品种，内部轮询 30s）
- E3 提醒组同组一键开关 ✅（setGroupEnabled + 组头切换）
- E4 提醒模板 ✅（保存/套用/删除，持久化）
- E5 触发声音预览 ✅（既有 alert-sound-preview）
- E6 到期时间 ✅（expiresAt 失效 + 面板 datetime-local + 已过期标记）
- E7 批量操作 ✅（多选删除/停用/启用）
- E8 历史统计触发次数 ✅（triggerCounts 行内展示）
- E9 重复间隔 ✅（既有 repeatInterval）
- E10 价格精度设置 ✅（pricePrecision + 面板选择）
- E11 提醒排序 ✅（既有 sortKey price/time/symbol）
- E12 待触发角标 ✅（pendingCount 排除停用/过期 + 头部徽标）
- E13 提醒快捷键 ✅（toggle-alerts 按 a + 帮助面板）
- E14 提醒导入/导出 ✅（export/importAlertsJson 严格校验）
- E15 提醒备注字段 ✅（note 输入与行内展示）
- 状态：E 批一已提交（f38d594），E2E 验证中

## 已完成（本会话 v0.4 推进，全部带提交）

| 项 | 提交 | 验证 |
|---|---|---|
| A1 周期边界对齐 | 6505bf6 | 单测/E2E 全绿，CI ✅ |
| A2 右侧锚定 | 8a255dc | 全绿，CI ✅ |
| A3 断线补洞+进度 | 3fa3cc0 | 全绿，CI ✅ |
| A4 十字光标同步 E2E | 7bdee88 | E2E ✅ |
| A5 数据延迟指示 | 3dba149 | 单测+E2E ✅ |
| A6–A15 审计闭合 | f41efd4 | 代码核查（测试已具：topRank/volumeSurge/dataHealth/calcOBV） |
| B1 光标副图取值 | 7e0761e | valuesAtTime+E2E ✅ |
| B2–B15 审计闭合 | 89ee720 | 信号打点等已具单测 |
| C1–C15 审计闭合 | 720edbe | v0.3 I 系列 + O8 E2E 覆盖 |
| D 批：费率/滑点/统计/一键平仓/保证金率 | c88c828 | typecheck/lint/unit 全绿 + trade-settings E2E |
| D 补全：强平预警/费拆分/快照/目标/JSON | 845a0ae | unit 1471 全绿，coverage lines 86.46%，build ✅ |
| E 批一：渠道/多品种/批量/模板/到期/备注/精度/JSON/角标/快捷键 | f38d594 | unit 1490 全绿，build ✅，E2E 验证中 |

## D 阶段（D1–D15 全闭合）
- D1 双向持仓 / D2 保证金率动态+强平价 / D3 多品种同时持仓 / D4 加权均价 / D5 费率可配 /
  D6 盈亏统计 / D7 一键平仓 / D8 滑点可配 / D9 强平预警（liquidationRisk 分级徽标）/
  D10 手续费拆分（流水行展开） / D11 权益曲线导出 / D12 复盘模式 / D13 账户快照 /
  D14 收益目标（进度+达成提示） / D15 账户导入导出（JSON 严格校验）
- 审计补测结论：A14 market-type StattsBar 合约/现货徽标测试 ✓ 已具，无需补充

## 待办审计（标记完成前的补测项）
- B2 信号打点：crossovers.test.ts 已具 ✓；补 marker 渲染 E2E（可延后）
- C 阶段：v0.3 O8 E2E 已覆盖图层/截图/坐标角标 ✓
- E 批一：E2E 验证中（recent-features 吸附陈旧断言已修正 ohlc→grid→off→time）

## 恢复入口
1. `git log --oneline -5` 确认已提交边界
2. `docs/progress.md`「当前阶段」继续 E 阶段（批二审计/补测 或 F 阶段）
3. 每批：实现 → 补单测 → typecheck/lint/unit → 本地 commit；大阶段全绿后 push → 查 CI/Pages/CodeQL/依赖扫描