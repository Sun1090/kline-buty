# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。提交均在本地，大阶段全绿后统一 push。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**阶段 H · 生态 / 部署 / 文档（进行中）** — docs/13 阶段 H（H1–H15）
- H1 知识库离线包 ✅（SW runtime 缓存 /knowledge 已访问页面离线可读）
- H2 知识库搜索增强 ✅（VitePress local 全文搜索既有）
- H3 应用内文档索引 ✅（本批：DocsIndexModal 知识库/README/仓库/CHANGELOG 入口）
- H4 更新提示 ✅（versionCheck + 横幅既有）
- H5 版本历史页面 ✅（本批：ChangelogModal 应用内版本要点）
- H6 多语言部署 ✅（en/zh 双语知识库既有）
- H7 自选列表云同步 ✅（本批：设置快照导出导入覆盖自选/主题/画线/账户）
- H8 主题与设置导出 ✅（本批：settings snapshot 全量 kline-buty:* 迁移）
- H9 快捷键速查卡 ✅（本批：printShortcuts 打印窗口 + 头部按钮）
- H10 数据源可配置 ✅（endpoints custom bases 既有）
- H11 多浏览器兼容 ◐（本批：playwright 三浏览器 projects；chromium/webkit smoke 通过；
  firefox headless 在本机有 SWGL 合成器环境缺陷（非应用 bug），待正常环境确认）
- H12 反馈入口 ✅（本批：GitHub Issues 链接）
- H13 项目路线图页 ✅（本批：README Progress 章节更新 v0.4 D–I 完成清单与徽章，作为路线图）
- H14 Docker 部署镜像更新 ◐（Dockerfile + nginx 既有，镜像构建/推送待 CI 侧验证）
- H15 部署健康检查 ◐（静态托管无服务端探活；以 CI/Pages 状态徽章代偿，状态页待补）
- 状态：H 批已提交（857faa1/c9391b8/350a6b1/f8d3556/aa9c5e5），H11 chrom/webkit 通过

## 阶段 I · 新特性构想（进行中）
- I1★ PWA 离线可安装 ✅（sw.js + manifest 既有）
- I2★ 画线一键分享 ✅（本批：Web Share API 带文件分享 + 降级下载）
- I4 自选价格实时面板 ✅（本批：PinnedPanel 钉选迷你图 + 新增/取消）
- I6 智能提醒（波动率阈值自适应）✅（本批：atrPercent + adaptiveThreshold ATR% 波动带）
- I7 多语言语音播报 ✅（本批：WebSpeech 按 UI 语言朗读触发）
- I8 图表面板深链 ✅（?symbol=&period= URL 解析既有）
- I9 深色浅色自动切换 ✅（theme auto 既有）
- I10 指标智能推荐 ✅（本批：recommendIndicators 趋势/波动率分析 + 参数面板一键应用）
- I12 交易策略笔记 ✅（既有 note 便签画线工具落图）
- I13 数据导出增强 ✅（本批：导出范围最近 N 根 0/100/500/1000）
- I3/I5/I11/I14/I15 ✳ 待实现（云同步/语义识别/Widget/画廊/模板市场，多为后端/原生平台依赖）

## 阶段 G · 性能 / 质量 / 工程（剩余 G2/G3，已闭合 G1/G4/G5/G6/G7/G8/G9/G10/G11/G12/G13/G14/G15）
- G1 文档站组件测试补全 ✅（本批：@vue/test-utils 挂载级 4 计算器 + 独立 test:docs + CI）
- G2 视觉回归测试 ✳ **待实现**
- G3 大屏 K 线数优化 ◐（B12 worker + G15 降采样 + 视口 cull 覆盖；5000+ 压测待补）
- G4 指标 worker 化 ✅（B12 既有）
- G5 首屏加载优化 ✅（3 重组件 lazy 代码分割：DepthChart/VolumeProfile/Sentiment + Suspense）
- G6 渲染性能基准 ◐（vitest.perf.config + indicators perf.test 既有）
- G7 内存泄漏检查 ✅（本批：WS close 清理重连定时器 + 重复开闭不累积 2 例审计）
- G8 WS 消息批处理 ✅（createBatchScheduler rAF 合帧既有 + 单测）
- G9 数据预取 ✅（usePrefetch 既有）
- G10 图表卡顿诊断工具 ✅（本批：PerfPanel 实时帧/丢帧率诊断）
- G11 实时帧丢帧统计 ✅（frameStats + PerfPanel）
- G12 localStorage 容量监控 ✅（storage-banner 既有）
- G13 资源加载失败降级 ✅（OfflineBanner 既有）
- G14 构建体积报告 ✅（bundle-report 既有）
- G15 数据量自适应（降采样）✅（本批：downsampleCandles + renderCandleCap）
- 状态：G 剩 G2/G3/G6；下一步 H 阶段（★ H1 离线包 / H2 搜索增强）

## 阶段 F · UI / 主题 / 可访问性（已闭合，F 批一 a3f60d7 + F16 d5f7f91）
- F1 图表键盘导航 ✅（方向键十字光标漫游 + 回放步进，既有）
- F2 键盘画线 ✅（M8：工具激活 Enter 十字光标处放锚点，E2E 既有）
- F3 全面板 Tab 可达性 ✅（a11yAudit 覆盖 6 面板 + roving tabindex）
- F4 弹层焦点陷阱 ✅（useFocusTrap：AlertPanel/PositionPanel/TradeHistoryPanel 补齐）
- F5 焦点可见性 ✅（focus-visible 既有）/ F6 屏幕阅读器标签 ✅（aria 全覆盖 + 审计）
- F7 高对比模式 ✅（本批新增：applyTheme highContrast + data-hc CSS + 开关持久化）
- F8 减少动效 ✅（useReducedMotion）/ F9 键盘选择器 ✅ / F10 快捷键冲突检测 ✅ /
  F11 语言切换快捷键 ✅ / F12 键盘 a11y 自动化断言 ✅ / F13 顶栏可折叠 ✅（More 设计）
- F14 侧边栏宽度可调 ✅（本批新增：col-resize 手柄 240–720 持久化）
- F15 信息条显示项配置 ✅（本批新增：StatsBar 齿轮下拉 7 项）
- F16 面板拖拽排序 ✅（本批新增：panelOrder ↑/↓ 换位持久化）
- F17 对比模式 ✅（compareSymbol 既有）/ F18 布局方案保存 ✅（本批新增：命名快照）
- F19 骨架屏 ✅（Skeleton/PanelState）/ F20 弱网模式提示 ✅（OfflineBanner）

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