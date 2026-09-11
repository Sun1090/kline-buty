# 变更日志（CHANGELOG）

> 按阶段记录主要功能交付。提交均出自 `sun1090`（无 AI 署名）。
> 完整提交历史见 `git log`；阶段任务明细见 `docs/04-排期计划.md`、`docs/06-开发任务清单.md`、`docs/07-P3P4-任务清单.md`、`docs/13-下一版本任务清单.md`。

## [v0.4] 数据正确性阶段（2026-09-06 ~）

承接 `docs/13-下一版本任务清单.md`，第一优先级 A 阶段数据正确性与稳定性。完成状态见该清单（★ 标注）。

### 依赖批次（2026-09-10）
- dependabot 首批 9 个更新 PR 评估合并 8 个：eslint 10.10、@playwright/test 1.63、@vitest/coverage-v8 5.0、vitest 5.0、typescript-eslint 8.69、eslint-plugin-react-refresh 0.5.6、actions/github-script 9、@types/react-dom 19.2.7
- 升级后全量验证：typecheck / lint 0 error / unit 1532 / build（tsc+vite+docs 47s）全绿
- typescript 7.0.2 暂缓（#8）：TS7 与 typescript-eslint 尚不兼容致 lint 加载崩溃，待官方支持

### E2E 测试修复与依赖安全（2026-09-11）
- 依赖安全：`overrides: { esbuild: ^0.25.0 }` 将 vitepress 嵌套 esbuild 0.21.5 → 0.25.12，闭合 dev 高危（GHSA-67mh-4wv8-2f99，≤0.24.2），`npm audit` 3 → 2（剩余 vite≤6.4.2 全为 Windows-only + dev-server-only，awaiting vitepress 2）；lockfile 外科手术式合并仅替换 esbuild 相关块，`npm ci`/docs 构建/单测 1532 全绿
- E2E 测试债修复（`b045ea8`）：
  - smoke 5 处过时断言（「浮动盈亏」标签已移除改断言持仓行数值 ×3、「止盈线」改开仓前断言、价格提醒首 input 被隐藏文件导入框抢占改 placeholder 定位）
  - mobile 14 个 CDP 触摸用例加 chromium 守卫（`newCDPSession` 仅 Chromium；跨浏览器触摸覆盖由 chromium 承担）
  - 惯性滚动用例方向修正（左拖撞最新右缘被 clamp 吸收、原像素签名实为合成 tick 噪声）→ 改 UI 级闭环断言：右拖进历史 →「回到最新」出现 → 等停稳 → 点击恢复
- E2E 基建：dependabot 升级 @playwright/test 1.63 后本机缺 webkit 二进制（`npx playwright install webkit`，WebKit 26.6）；运行改为显式捕获退出码（此前 pipeline 尾接 `tail` 掩蔽了失败退出码）
- 验证：mobile.spec chromium/webkit 24 passed / 14 skipped / 0 failed；smoke 仓位×2 + QO×2 + 价格提醒 chromium 通过；eslint 0 error

### A 阶段 - 行情与数据深化
- A1（★）K 线时间戳对齐周期边界：修正 `1w`（UTC 周一）与 `1M`（月初）边界对齐（此前按固定 epoch 倍数会落到周四/30 天近似错位）；新增 `normalizeCandles` 数据流唯一入口，REST/WS/缓存/补洞/分页/合成数据全部归一化后入仓
- A1 附带：`1M` 分页游标改 31 天上界（修复 30 天近似致首翻页不足 500 根、误判 `hasMore=false` 漏页）；loadMore 游标排除首根自身（翻满一页新数据）；perf 压测周期感知（合成步长/起点对齐当前周期，配合 `window.__klineButyPerf` E2E 断言切周期边界对齐与序列间隔稳定）
- A2（★）周期切换右侧锚定：修复三处真实缺陷——① `symChanged` 死守卫（`keyRef` 先被覆盖致恒 false，换品种也走锚定而非 fitContent）；② 可见区间订阅用 lightweight-charts 浮点逻辑索引直接取数据致 `tFrom/tTo` 恒 null，`lastVisibleTimeRef` 永不更新（锚定输入丢失→回落 fitContent 跳最新，A11 可视范围显示/loadMore 左缘判定同步失效）；③ 锚定对「旧周期位置索引裁出的新切片」做二分，位置×周期错位致回看跨周期跳最新
- A2 修复内容：可见区间索引先取整并 clamp（`from ≤ to` 防 lightweight-charts 断言崩溃）；周期切换锚定改为在**全量新数据**上按时间定位并重建裁剪窗口；`anchorRangeForSwitch` 最少 2 根保底 + 目标早于数据起点时从最左展示跨度；合成 K 线改为**向后生成**（终点对齐 now、各周期终点一致，与真实行情语义一致）
- A2 连带：A11「图表可视时间范围」显示修复、pair/quad 时间轴同步索引清洁化；E2E `period-anchor.spec.ts`（最新处切周期不越界 / 回看处切周期不跳最新）
- A3（★）断线分段补洞：抽 `runRefillPages` 纯编排（串行逐段 REST 回补、失败页跳过继续、进度回调可单测）；useKlineData 暴露 `refill {done,total,failed}` 状态，重连补洞全程上报进度
- A3 交互：顶栏右上角「断线回补中 done/total」指示（`aria-live` 状态徽标，五语 i18n `status.refilling`）；单测覆盖串行/失败跳过/进度递增 + App 组件级指示渲染测试
- A4（★）多周期十字光标时间同步：核对 pair/quad 双通道同步链路完备（`ChartPair` 双向防回环、`useChartSync` 多点广播 + 回显抑制、adapter `setCrosshairTime` 按时间戳二分定位→跨周期天然对齐）；新增 E2E `period-crosshair.spec.ts` 端到端验证 hover 一格 → 四格同步绘制（canvas 快照指纹法，颜色无关、确定性）
- A5 数据延迟指示：StatsBar 由「>5s 才警示」改为「实时帧期间**常态显示滞后秒数**」（≤5s 低调样式 / >5s 黄色警示，弱网/停更语义保留）；单测更新为新语义 + E2E 断言压测实时帧下信息条显示延迟 Xs
- A6–A15 核对完成：全部承接 v0.3 G3–G15 已实现（榜单/量能异动/健康度/轴单位/轮播/请求取消/周期记忆/盘口刷新/现货差异/OBV 因子），代码核查 + 单测确认，逐项标注 ✅（A 阶段 15 项全部闭合）

## B 阶段 - 指标引擎扩展
- B1（★）十字光标显示副图指标当前值：新增 `valuesAtTime`/`histValueAtTime` 二分纯函数（指标线在光标时刻精确取值，预热期省略）；`chart-indicator-last` 信息条在光标激活时按时刻取值、移出回落最新；近光标 tooltip 原已按时刻取副图值
- B1 测试：取值纯函数单测 4 例（命中/未命中/升序二分/空）；E2E `indicator-crosshair.spec.ts`（设 RSI → hover 左区取历史时刻值 ≠ 右缘最新值 → 移出回落）
- B2–B15 核对完成：全部承接 v0.3 H 系列已实现（信号打点 findCrossovers/annotateCrossovers、阈值着色、W%R/TRIX/DPO/Vortex 指标、参数导入导出、主副图叠加、线色自定义、Y 轴定标、worker 化、回测标注、指标收藏、CSV 值导出），代码核查 + 单测确认，逐项标注 ✅（B 阶段 15 项闭合）
- C1–C15 核对完成：全部承接 v0.3 I 系列已实现（截图导出 takeScreenshot、组锁、批量操作、模板跨品种、吸附四态、缩略图、统计汇总、样式复制、拖拽预览、文字底色、命名搜索、全局透明度、撤销深度、坐标角标），逐项标注 ✅（C 阶段 15 项闭合）

## D 阶段 - 模拟交易与账户（D1–D15 全部闭合）
- D5/D8 费率与滑点可配：`useTradeSettings` 持久化（吃单费率 + 市价滑点），`estimateOrder(feeRate)` 下单估算 + 平仓计费接线；E2E `trade-settings.spec.ts` 改后持久化刷新保留
- D6 盈亏统计：`trade/stats.ts` 纯函数（胜率/盈亏比/累计/均盈均亏），TradeHistoryPanel 统计行
- D7 一键平仓：`onSettleSymbol` 切品种 + 置空 → 结算 effect 记账（PnL/手续费），含其他品种一键全平
- D2 补强：`marginRate` 全额保证金口径动态保证金率（随盈亏变化）+ 持仓行实时显示
- D9 强平预警：Position 存开仓杠杆，`liquidationRisk` 按保证金率分级（<50% 临界 / <80% 警示），持仓行 ⚠ 徽标
- D10 手续费拆分：TradeRecord 记录 `feeRate`，流水行展开显示成交额/费率/手续费/价差盈亏/净盈亏
- D13 账户快照：`save/load/deleteSnapshot` 命名快照 + 面板保存/载入/删除
- D14 收益目标：`profitTargetStatus` 纯函数 + 面板输入/进度条/达成徽标（持久化）
- D15 账户导入/导出：`export/importAccountJson`（版本+余额+流水，严格校验）+ 文件下载/导入
- 五语 i18n 全量同步；unit 1471 全绿，coverage lines 86.46%，build 全通

## E 阶段 - 提醒与通知（E1–E15 批一完成）
- E1（★）推送渠道：channel system/web/both 持久化；web 渠道站内横幅事件 → App toast
- E2（★）多品种监控：prices 表覆盖全部提醒品种；无外部表时内部按提醒品种轮询 ticker（30s，直连 data-api 带 CORS）
- E3 组级一键开关：`setGroupEnabled` + 组头 🟢/🔴 切换
- E4 提醒模板：`save/load/deleteTemplate` 持久化 + 面板保存/套用/删除
- E6 到期时间：`expiresAt` 字段 + `shouldTrigger/stepAlert` 过期失效 + 面板 datetime-local + 已过期标记
- E7 批量操作：多选复选框 + 删除/停用/启用所选（操作后清空选择）
- E8 触发次数：`triggerCounts` 由历史聚合行内展示
- E10 价格精度：`pricePrecision` 字段 + 面板精度选择 + 目标价按精度展示
- E12 待触发角标：`pendingCount` 排除停用/过期 + DesktopHeader 提醒项徽标
- E13 提醒快捷键：`toggle-alerts`（按 a）+ 快捷键帮助面板展示
- E14 提醒导入/导出：`export/importAlertsJson`（严格校验）+ 面板按钮
- E15 备注字段：`note` 输入与行内展示
- 测试：engine 停用/到期/批量/分组单测 + hook 多品种/模板/JSON/渠道/角标单测 + AlertPanel 面板单测 + E2E `alerts-features.spec.ts`；unit 1490 全绿，build 全通
- 修复：`recent-features` 画线吸附 E2E 陈旧断言（C6 四态循环 ohlc→grid→off→time）

## F 阶段 - UI / 主题 / 可访问性（F1–F20 全部闭合）
- F4 弹层焦点陷阱：AlertPanel/PositionPanel/TradeHistoryPanel 接入既有 `useFocusTrap`（Tab 不逃逸、关闭恢复焦点）
- F7 高对比模式：`applyTheme(highContrast)` 设 `html[data-hc]` CSS 变量 + 高饱和强调/涨跌色；头部开关持久化
- F14 侧边栏宽度可调：persisted `sidePanelWidth` + 侧栏左缘 `col-resize` 手柄（240–720px 钳制）
- F15 信息条显示项配置：StatsBar `config`（marketType/volumeSurge/latency/health/price/summary/countdown）+ 齿轮下拉持久化
- F16 侧栏面板顺序：persisted `panelOrder` 按序渲染 + 头部 ↑/↓ 换位
- F18 面板布局方案：命名快照（图表布局 + 侧栏面板开合 + 宽度）保存/套用/删除
- F1/F2 核对：键盘十字光标漫游 + M8 键盘画线（Enter 放锚点）均有实现与测试
- F3/F5/F6/F8/F9/F10/F11/F12/F13/F17/F19/F20 核对：承接 v0.3 M1/O9 等既有实现（a11yAudit/useReducedMotion/compare/Skeleton/OfflineBanner）
- 五语 i18n 全量同步；unit 1495 全绿，build 全通，CI ✅

## H 阶段 - 生态 / 部署 / 文档 + I 阶段 - 新特性 + G 收尾
- H3 应用内文档索引：DocsIndexModal 知识库/README/仓库/CHANGELOG 快捷入口（More 菜单）
- H5 版本历史：ChangelogModal 应用内版本要点（v0.1–v0.4）
- H7/H8 设置快照：全量 `kline-buty:*` 持久化键导出/导入（主题/自选/画线/账户一次迁移）
- H9 快捷键速查卡：printShortcuts 独立打印窗口生成分组表
- H11 多浏览器：playwright projects chromium/firefox/webkit（chromium/webkit 通过）
- H12 反馈入口：GitHub Issues 链接
- I2 一键分享：Web Share API 带文件分享图表 PNG（不支持降级下载）
- I4 自选实时行情：PinnedPanel 钉选品种最新价/涨跌/日线迷你图 + 新增/取消钉选
- I7 语音播报：WebSpeech 按 UI 语言朗读价格异动（面板开关）
- I13 区间导出：CSV 导出范围最近 N 根（全部/100/500/1000）
- G6 渲染性能基准：指标/降采样/裁剪管线预算（perf.test 扩充）
- I3 画线语义识别：`drawingSemantics` 纯函数按已画图形建议指标（区间→BOLL+RSI / 趋势→EMA+MACD / 水平→RSI / 十字→KDJ），设置面板「画线建议」一键应用（单测 + E2E）
- I15 社区画线模板市场：`templateMarket` 纯函数（导出序列化 / 导入严格校验：格式版本、逐条画线形状白名单、文件内按名去重）+ `mergeTemplates` 同名自动序号化合并；图层面板模板区新增「导出/导入」入口（Blob 下载 + FileReader 导入，成功/失败短提示）；单测 7 + 组件测试 3 + E2E（导出下载结构校验 → 导入合并序号化 → 套用生效；非法文件失败提示）
- I8 图表面板深链：`?drawing=<id>` 打开自动选中指定画线（格式校验 + 不存在静默忽略）；分享链接在有选中画线时自动携带 id；副图刻度守卫修复 v5 竞态（setSubScaleRange try 包裹）；E2E 深链用例（带 id 打开 → 图层行选中高亮），recent-features 12/12 通过
- I14 图表快照画廊：`snapshotGallery` localStorage 存储（条数/字节双配额 + FIFO 淘汰），图表右上「存快照」→ SnapshotGallery 缩略图网格/全图预览/删除/清空，More 菜单入口（单测 9 + E2E）
- G2 视觉回归：`visual.spec.ts` chromium 截图基线（?perf 合成数据确定性，基线入库，`--update-snapshots` 再生成）
- G3 大屏压测：`stress-large-data.spec.ts` `?perf=20000` 加载/十字光标取时/多段拖动翻页（crosshair-tooltip 暴露原始时间戳断言时光倒流）
- H14 Docker 镜像修复：构建阶段补 `.npmrc`（legacy-peer-deps，此前 Docker 内 npm ci EUSAGE）+ 安装 git（vitepress lastUpdated spawn ENOENT）；镜像容器健康检查（首页/SPA fallback/知识库 200）
- H15 部署状态与健康检查：`docs/05-部署.md` 新增状态页章节（CI/Pages 徽章 + 双平台内容抽查 curl + Docker 健康清单），README 增加 pages.yml 动态徽章
- i18n：版本历史外置五语字典（changelog.* 12 键 × 5），audit:i18n 巡检 0 发现（a11yAudit 豁免：零依赖测试断言库非 UI）
- 安全：CodeQL（src 限定 + security-extended）、dependabot（npm + actions 周频分组）、CI 生产依赖审计门禁
  （`npm audit --omit=dev --audit-level=high`，实测 0 漏洞）；修复 CodeQL 2 告警（SW/worker postMessage origin 校验）
- 工程：vitest 主配置隔离 docs-site（React/Vue 两套测试环境），CI 集成 test:docs；lint 修复
- 五语 i18n 全量同步；unit 1522 + test:docs 21 + perf 10 全绿，build 全通，CI/Pages/CodeQL/Android/iOS ✅

## [P3/P4] 深化阶段（2026-09-01 ~ 09-02）

承接 30 项 P0–P2 之后的功能深化，共 34 提交，全部推送 `origin/main`。完成状态逐项见 `docs/11-P3P4-完成状态盘点.md`。

### 指标引擎（B）
- 新增五个副图指标：MFI / AO / CMF / Donchian 通道 / Aroon（算法纯函数 + 边界测试 + 五语 i18n）
- 主图 MA + EMA 同屏叠加开关；指标参数预设命名保存/切换
- CCI / DMI 参数面板接入；参数一键重置默认

### 画线工具（C）
- 撤销/重做栈（会话内、按交易对隔离）、模板持久化、跨品种复制粘贴、单条透明度、便签全局显隐、分组与组级批量显隐/锁定
- 吸附三态（off/time/ohlc）、悬停高亮显示锚点、文字左/中/右对齐、position 工具贴附最新价、拖拽实时坐标提示、量度角度/面积、全图/区域截图导出

### 交易 / 账户（D）
- 模拟盘：杠杆/保证金/强平价（D1–D3）、滑点估算（D7）、手数预设（D8）、加权成本合并加仓/减仓/反手（D6）、止盈/止损单模拟触发（D5）、流水 CSV 导出（D14）、账户重置（D15）
- 提醒：一次性/循环模式（D10）、四音效选择（D11）、时间窗口复合条件（D9）、盈亏曲线（D13）

### 行情 / 体验（A / E）
- 实时帧 rAF 渲染节流、图表可视时间范围、K 线本地缓存冷启动秒开、加载失败错误重试
- 数字千分位国际化、面板折叠记忆、移动端长按快速操作、SymbolPicker 键盘导航、图表全屏

### 工程 / 质量（F）
- 单元测试覆盖率基准（核心模块 ≥90%）、E2E 场景扩充至 90+、依赖升级评估、i18n 五语审计、无障碍审计报告

## [P0–P2] 核心体验阶段（2026-08-29 ~ 08-31）

30 项开发任务全部完成（`docs/06-开发任务清单.md`）。要点：
- 周期收盘倒计时、资金费率显示、主题三态（自动/深浅）、时区切换、键盘十字光标、Supertrend/BBW 指标
- 行情列表搜索/自选视图、盘口快速下单、移动端手势与下拉刷新、四图布局独立周期
- 提醒提示音/触发历史、K 线 CSV 导出、指标参数面板、主题色预设
- React 19、Vite 8（rolldown）、Vitest 4、TS 6 升级；Playwright E2E 硬化

## [M0–M30] 里程碑阶段（2026-08-16 ~ 08-28）

单里程碑逐日交付（明细见 `docs/04-排期计划.md`）。要点：
- 图表核心：OKX/币安对齐实时 K 线、周期切换、坐标轴线性/对数、大数据量窗口裁剪、回到最新
- 指标：SAR / Ichimoku / VWAP 及副图 13+ 种、指标参数面板
- 画线：35+ 种工具（含斐波那契族、江恩、周期线、价格带、安德鲁叉、平行类）
- 数据：REST/WS 直连 + 代理探测、fapi→dapi COIN-M 兜底、合成压测
- 交易：模拟仓位、盘口订单簿/深度、衍生品情绪面板、自选收藏、分享链接、区域截图
- i18n：五语全量字典；PWA（manifest + SW 壳缓存）；GitHub Pages / Vercel 部署
- 知识库：交易知识库 27+ 篇章 160+ 文档（约 4 万行）

## 已知欠账（不占排期名额）

- TypeScript 7：等 typescript-eslint 支持
- VitePress 2 正式版：升级后可移除 `.npmrc` legacy-peer-deps
- **dev 依赖告警（有据可查，生产零漏洞）**：`npm audit` 报 2 条全部在 dev 工具链
  （`vitepress→vite`，vite ≤6.4.2 三项均为 Windows-only + dev-server-only 的路径遍历/UNC 哈希泄露、
  无修复）。仅影响本地 dev server，不影响生产构建/运行时；CI 新增
  `npm audit --omit=dev --audit-level=high` 生产门禁（通过）+ dependabot 跟踪，
  vitepress 2（vite 7）发布后自动闭合。
- 原 esbuild 高危（GHSA-67mh-4wv8-2f99，≤0.24.2 受影响）已闭合：`package.json` 增加
  `overrides: { esbuild: ^0.25.0 }`，vitepress 嵌套 esbuild 0.21.5 → 0.25.12。
  已验证：npm ci / vitepress docs 构建 / 全量单测 1532 通过、dev audit 3 → 2。
- app-shell M1–M3：需真机与上架决策
