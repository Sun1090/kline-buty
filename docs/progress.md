# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。提交均在本地，大阶段全绿后统一 push。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**E2E 收尾与依赖安全复核（2026-09-11，三轮提交 b230a00 / b045ea8 / 63cf426）** — 全量回归从 26 失败收敛到 3（均为负载抖动，隔离通过）
- 全量 chromium/webkit 回归现状：**297 passed / 37 skipped / 7 flaky / 3 failed**（14.7m，REAL_EXIT=1）
  - 3 个 failed 全部隔离复跑通过（chromium 5015 切回鼠标、5133 价格区间框、webkit indicator-crosshair），
    为 15 分钟长回归下的机器负载抖动，非确定性缺陷
  - 37 skipped = mobile.spec 14 CDP 守卫 + smoke 移动端 13 CDP 守卫 + 画线像素 4×2 守卫
    （`newCDPSession`/像素列分组仅 chromium 语义）等
- 依赖安全：`overrides: { esbuild: ^0.25.0 }` 使 vitepress 嵌套 esbuild 0.21.5 → 0.25.12，
  esbuild 高危（GHSA-67mh-4wv8-2f99）闭合，npm audit 3 → 2（剩余 vite≤6.4.2 全 Windows-only
  + dev-server-only，awaiting vitepress 2）。lockfile 外科手术式合并（仅 esbuild 相关块，其余字节不动）；
  验证 npm ci / docs:build / typecheck / lint(0 err) / unit 1532 全绿
- E2E 基础设施：dependabot 升级 @playwright/test 1.63 后本地缺 webkit 二进制
  （`npx playwright install webkit` 修复，WebKit 26.6）；multi 运行改显式捕获 REAL_EXIT
  （此前 pipeline 尾接 tail 掩蔽失败退出码致假绿）
- E2E 测试债修复（三轮）：
  1. smoke 过时断言（「浮动盈亏」标签移除→断言持仓行数值、价格提醒首 input 被隐藏文件导入框
     抢占→placeholder 定位、「止盈线」改开仓前断言）
  2. mobile.spec 14 个 + smoke 移动端 13 个 CDP 触摸用例加 chromium 守卫
  3. 惯性滚动用例方向修正（左拖撞最新右缘被 clamp 吸收、原像素签名实为合成 tick 噪声）
     → UI 级闭环断言（右拖进历史→「回到最新」出现→等停稳→点击恢复）
  4. 定位歧义：分享链接两按钮、盘口 exact:true×5；导出截图文件名 @1x 后缀
  5. webkit 栅格化差异：4 个画线像素列分组断言 chromium-only（功能断言有 chromium 像素级 + 单测）
  6. stress-large-data：20k 蜡烛下 webkit 首次 hover 被初始渲染吞掉 → timeAt 重试式 hover
- H11 firefox：直启 firefox-1543 nightly `-headless -profile <手动创建的目录>` 同样报
  「Could not find profile folder」，且 TMPDIR 覆盖无效 → 证实为浏览器层缺陷（非应用、非 playwright）；
  H11 维持 ◐，跨浏览器验证建议以 Linux CI 补齐（见「待办」）

**阶段 I 收尾：I15 已交付上线（0fb63ba），I3/I11 暂缓（外部依赖），I 阶段可落地项全部闭合** — docs/13 阶段 I（I1–I15）
- H1 知识库离线包 ✅（SW runtime 缓存 /knowledge 已访问页面离线可读）
- H2 知识库搜索增强 ✅（VitePress local 全文搜索既有）
- H3 应用内文档索引 ✅（本批：DocsIndexModal 知识库/README/仓库/CHANGELOG 入口）
- H4 更新提示 ✅（versionCheck + 横幅既有）
- H5 版本历史页面 ✅（本批：ChangelogModal 应用内版本要点；i18n 后版本要点五语外置）
- H6 多语言部署 ✅（en/zh 双语知识库既有）
- H7 自选列表云同步 ✅（本批：设置快照导出导入覆盖自选/主题/画线/账户）
- H8 主题与设置导出 ✅（本批：settings snapshot 全量 kline-buty:* 迁移）
- H9 快捷键速查卡 ✅（本批：printShortcuts 打印窗口 + 头部按钮）
- H10 数据源可配置 ✅（endpoints custom bases 既有）
- H11 多浏览器兼容 ◐（playwright 三浏览器 projects；chromium/webkit 通过；
  firefox headless 在本机有 SWGL 合成器环境缺陷（非应用 bug），待正常环境确认）
- H12 反馈入口 ✅（本批：GitHub Issues 链接）
- H13 项目路线图页 ✅（本批：README Progress 章节更新 v0.4 D–I 完成清单与徽章，作为路线图）
- H14 Docker 部署镜像更新 ✅（本批：修复 npm ci 缺 legacy-peer-deps + alpine 缺 git 两坑；
  镜像构建通过，容器首页/SPA fallback/知识库健康检查 200）
- H15 部署健康检查 ✅（本批：docs/05-部署.md「七、部署状态与健康检查」状态页章节
  + README pages.yml 动态徽章；静态托管以徽章 + 内容抽查 curl 代偿探活）
- 状态：H 批已提交（c7655bb/c20e176/cafcb43），CI/Pages/Android/iOS 全绿
## 阶段 I · 新特性构想（进行中，剩 I3/I11/I15）
- I1★ PWA 离线可安装 ✅（sw.js + manifest 既有）
- I2★ 画线一键分享 ✅（本批：Web Share API 带文件分享 + 降级下载）
- I4 自选价格实时面板 ✅（本批：PinnedPanel 钉选迷你图 + 新增/取消）
- I5★ 画线语义识别 ✅（本批：drawingSemantics 纯函数按已画图形建议指标
  区间→BOLL+RSI/趋势→EMA+MACD/水平→RSI/十字→KDJ + 设置面板一键应用 + 单测/E2E）
- I6 智能提醒（波动率阈值自适应）✅（本批：atrPercent + adaptiveThreshold ATR% 波动带）
- I7 多语言语音播报 ✅（本批：WebSpeech 按 UI 语言朗读触发）
- I8 图表面板深链 ✅（?symbol=&period= 白名单校验打开定位 + 本批 ?drawing=<id> 打开选中指定画线：格式校验/不存在静默忽略/分享链接自动携带 id；副图刻度守卫修复 v5 竞态；E2E 深链用例，recent-features 12/12）
- I9 深色浅色自动切换 ✅（theme auto 既有）
- I10 指标智能推荐 ✅（本批：recommendIndicators 趋势/波动率分析 + 参数面板一键应用）
- I12 交易策略笔记 ✅（既有 note 便签画线工具落图）
- I13 数据导出增强 ✅（本批：导出范围最近 N 根 0/100/500/1000）
- I14★ 图表快照画廊 ✅（本批：snapshotGallery localStorage 存储
  + ChartView「存快照」+ SnapshotGallery 缩略图/预览/删除/清空 + 单测/E2E）
- I15★ 社区画线模板市场 ✅（本批提交 0fb63ba：templateMarket 纯函数导出/严格校验导入/同名序号化合并
  + 图层面板「导出/导入」入口 + 五语 i18n + 单测 10 + E2E 导出下载→导入合并→套用）
- I3/I11 ✳ 暂缓（多端云同步需登录态+云端 KV 后端、移动端 Widget 需原生平台；
  现有 H7/H8 设置快照 JSON 已覆盖跨设备手动迁移的 Web 端等价能力）
- 本批验证：typecheck/lint 0 error、unit 1532 全绿、chromium E2E recent-features 11/11；
  CI/CodeQL/Pages/Android/iOS/Release 六 workflow 全绿；Pages+Vercel 双平台抽查
  （首页 200 且 bundle 含 drawing-template-export 特征、知识库 200）
- 随批 chore 1d0eba5：gitignore+eslint 排除 docs-site/.vitepress/.temp 构建临时目录

## 阶段 K · 依赖批次（2026-09-10 收尾）
- dependabot 首批 9 个 PR：8 个已合并（#10 eslint 10.10 / #9 @playwright/test 1.63 / #7 @vitest/coverage-v8 5.0
  / #5 react-refresh 0.5.6 / #4 typescript-eslint 8.69 / #2 actions/github-script 9 / #6 vitest 5.0 / #3 @types/react-dom 19.2.7）
- #8 typescript 7.0.2 ⛔ 暂缓：TS7 Go 原生编译器致 eslint 加载崩溃，typescript-eslint 8.69 尚未兼容（PR 留言记录，待官方支持后再评估）
- 升级后本地全量验证：typecheck ✅ / lint 0 error ✅ / unit 1532 全绿 ✅ / build（tsc+vite+docs）✅，工作区干净
- H11 firefox 复查：playwright 1.63 本机 firefox 155(nightly) 启动报 「Could not find profile folder」（playwright 临时 profile 竞态，TMPDIR 改 /tmp/kb-tmp 亦然）；
  属本机工具链环境缺陷非应用 bug，H11 维持 ◐（chromium E2E 回归、webkit 既往通过）
- 本批提交：@dependabot squash 合并 8 个（分支自动关闭），本地未改源码

## 阶段 G · 性能 / 质量 / 工程（G2/G3 已闭合，G 阶段全部完成）
- G1 文档站组件测试补全 ✅（本批：@vue/test-utils 挂载级 4 计算器 + 独立 test:docs + CI）
- G2 视觉回归测试 ✅（本批：visual.spec.ts chromium 截图基线 + ?perf 合成数据确定性，
  基线入库 e2e/__screenshots__，--update-snapshots 再生成）
- G3 大屏 K 线数优化 ✅（本批：stress-large-data.spec.ts ?perf=20000 加载/十字光标取时/
  多段拖动翻页，crosshair-tooltip 暴露原始时间戳断言时光倒流 + 数据完整无异常）
- G4 指标 worker 化 ✅（B12 既有）
- G5 首屏加载优化 ✅（3 重组件 lazy 代码分割：DepthChart/VolumeProfile/Sentiment + Suspense）
- G6 渲染性能基准 ✅（vitest.perf.config + indicators perf.test，npm run perf 10 项全绿）
- G7 内存泄漏检查 ✅（本批：WS close 清理重连定时器 + 重复开闭不累积 2 例审计）
- G8 WS 消息批处理 ✅（createBatchScheduler rAF 合帧既有 + 单测）
- G9 数据预取 ✅（usePrefetch 既有）
- G10 图表卡顿诊断工具 ✅（本批：PerfPanel 实时帧/丢帧率诊断）
- G11 实时帧丢帧统计 ✅（frameStats + PerfPanel）
- G12 localStorage 容量监控 ✅（storage-banner 既有）
- G13 资源加载失败降级 ✅（OfflineBanner 既有）
- G14 构建体积报告 ✅（bundle-report 既有）
- G15 数据量自适应（降采样）✅（本批：downsampleCandles + renderCandleCap）
- 状态：G 阶段 15 项全部闭合（本批提交 + chromium/webkit 全量 E2E 回归 271 passed / 0 failed）

## 安全与依赖（本批新增）
- CodeQL：`.github/workflows/codeql.yml`（src 限定 + security-extended，main push + 每周 + PR）；当前 0 open 告警
- dependabot：`.github/dependabot.yml`（npm + github-actions 周频、分组更新）；首批 9 个更新 PR 待人工/CI 评估合并
- CI 生产依赖审计门禁：`npm audit --omit=dev --audit-level=high`（本地实测 0 漏洞；dev 侧 vitepress→vite 告警见 CHANGELOG「已知欠账」，无修复、仅 dev server）
- esbuild 高危闭合：`overrides: { esbuild: ^0.25.0 }` 使 vitepress 嵌套 esbuild 0.21.5 → 0.25.12（GHSA-67mh-4wv8-2f99），dev audit 3 → 2；lockfile 外科手术式合并（仅 esbuild 相关块变更，其余字节不动），npm ci / vitepress 构建 / 单测 1532 全绿

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
| I5 画线语义识别 + I6/I10 回写 | c7655bb | typecheck/lint 0 error，unit 1513，drawing-semantics E2E ✅ |
| H14 Docker 镜像修复（npm ci legacy-peer-deps / alpine git） | c20e176 | 镜像构建 ✅，容器首页/SPA fallback/知识库 200 |
| i18n：版本历史五语外置 + a11yAudit 豁免（audit:i18n 全绿） | 03b7ebf | typecheck/unit 1513，audit:i18n 0 发现 |
| H15 部署状态页 + README pages 徽章 | cafcb43 | docs/05-部署.md「七、部署状态与健康检查」 |
| I14 快照画廊 + G2 视觉回归 + G3 大屏压测 | 4a81f2d | unit 1522，I14/G3 E2E ✅，G2 基线对比 4/4 |

## D 阶段（D1–D15 全闭合）
- D1 双向持仓 / D2 保证金率动态+强平价 / D3 多品种同时持仓 / D4 加权均价 / D5 费率可配 /
  D6 盈亏统计 / D7 一键平仓 / D8 滑点可配 / D9 强平预警（liquidationRisk 分级徽标）/
  D10 手续费拆分（流水行展开） / D11 权益曲线导出 / D12 复盘模式 / D13 账户快照 /
  D14 收益目标（进度+达成提示） / D15 账户导入导出（JSON 严格校验）
- 审计补测结论：A14 market-type StattsBar 合约/现货徽标测试 ✓ 已具，无需补充

## 待办审计（标记完成前的补测项）
- B2 信号打点 ✅（本批：crossovers.test.ts 单测 ✓ + `e2e/marker-render.spec.ts` 渲染 E2E——
  MA 金叉/死叉：页内重算 MA5/MA10 交叉数确定性 >2 + 主图截图基线 ma-cross-markers + pageerror 守卫；
  SAR 圆点：开启 + 十字光标漫游无异常冒烟。基线 e2e/marker-render.spec.ts-snapshots/ 入库，chromium 维护）
- C 阶段：v0.3 O8 E2E 已覆盖图层/截图/坐标角标 ✓
- E 批一：E2E 验证中（recent-features 吸附陈旧断言已修正 ohlc→grid→off→time）

## 恢复入口
1. `git log --oneline -5` 确认已提交边界
2. `docs/progress.md`「当前阶段」继续 E 阶段（批二审计/补测 或 F 阶段）
3. 每批：实现 → 补单测 → typecheck/lint/unit → 本地 commit；大阶段全绿后 push → 查 CI/Pages/CodeQL/依赖扫描