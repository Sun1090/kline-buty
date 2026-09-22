# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。提交均在本地，大阶段全绿后统一 push。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**进行中 · v0.5.27 批次积累（基线 main b5313a6 = v0.5.26）**
- 在飞 **#136** `fix(chart)`：右键菜单价位收口到展示精度（分支 `fix/v05-ctx-price-precision`，
  worktree `wt-ctx-price`）——十字光标价格是像素反算的浮点尾数（`50766.61229625584`），
  复制/加提醒/挂限价单三个出口原样带走。改为 `setCtxMenu` 前经 `roundPricePrecise` 收口，
  并把 `fmtPricePrecise`/`fmtPriceLocale` 各写一遍的阈值抽成 `pricePreciseDigits`；
  单测 1933 → **1940**，三条新用例逐一对应三个出口，撤掉收口即三条全红（实测报出原始尾数）
- 在飞 `test/v05-e2e-flake-hardening`（worktree `wt-e2e-flakes`）：画线命中族改按**当前渲染像素**定位。
  安德鲁叉从「全量连跑偶发红」恶化成隔离态 **3/3 常红**，同一条用例在平静行情下又 5/5 绿——
  命中点写死成创建时的像素，能否压线取决于这期间价格刻度有没有被行情刷新。
  新增 `findDrawnPixel(page, 窗口)` 扫 overlay 取真实像素；顺带发现更要紧的问题：
  **画线提交后本就是选中态，删除按钮一直亮着**，所以「点线 → 删除出现」这条正向断言是空的。
  现在先点已验证无像素的空白取消选中并断言面板收起，再点扫描到的像素断言出现——
  把命中点整体下移 60px，三条用例同时红，才算真的在验证命中

**里程碑 v0.5.26 发布完成（2026-09-22）**
- 版本号：**0.5.26**（package.json / package-lock 根版本 / index.html meta app-version）
- 分支：`release/v0.5.26`；发布 PR：**#135**（rebase 合并 → main **b5313a6**，合并后即删远端分支）
- 本版收录（v0.5.25 之后合并的批次）：#124 `?perf` 合成盘口 + 停真实历史预取（对外请求 5 → 0）、
  #125 挂单改价编辑器 320px 窄屏回归、#127 限价挂单附带止盈止损（成交按成交价复检）、
  #128 快速下单面板 320px 左半截裁出屏幕、#131 period-anchor A2 时间预算与上限对齐、
  #132 快速下单携带杠杆并透传成交仓位、#133 `smoke.spec.ts` 5952 行拆成 5 个规格（87 条用例标题逐条比对不变）
  + 顺带修掉两条自 v0.5.21 起就红着的腐化、#134 下单面板显示随单价位的隐含盈亏比
- tag/release：Release Tag workflow 自动打 **tag v0.5.26** @ b5313a6（run 35702634440，14s 成功）
- 定档门禁：typecheck ✅ / lint 0 err（30 条既有 warning）✅ / audit:i18n ✅ / unit **1933**（172 files）✅ /
  全量 build（含 docs 站合并）✅ / 本地全量 chromium E2E **210 passed**（2 条时序 flaky 重试即绿）；
  发布 PR CI 三浏览器 E2E（15m23s）+ CodeQL + Knowledge + Build + Audit 全绿
- 部署与 live 抽查：
  - Pages ✅ run 35702634449 success（2m39s）；首页 200 且 meta `app-version=0.5.26`、`/knowledge/` 200
  - 真实 bundle ✅ `assets/index-Dl7VHveG.js`（574KB）含本版新文案：随单 / 止盈价 / 隐含盈亏比 / 杠杆
  - Vercel ⚠ 仍是账号级 **build-rate-limit**（提示 24h 恢复），非代码问题，不阻塞发布
- 回滚：`git revert` 本次 release 提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（在飞两批次见「当前阶段」；已知遗留：marketable 即时成交不计滑点、
  e2e 规格不在 typecheck 覆盖内、低价币提醒行按 `pricePrecision ?? 2` 展示成 `0.00`）

**里程碑 v0.5.25 发布完成（2026-09-22）**
- 版本号：**0.5.25**（package.json / package-lock 根版本 / index.html meta app-version）
- 分支：`release/v0.5.25`；发布 PR：**#123**（rebase 合并 → main **231aebc**，合并后即删远端分支）
- 本版收录（v0.5.24 之后合并的批次）：#115 E2E 腐化修复 + 确定性清单补齐、#116 信息条超宽换行、
  #117 部分平仓（减仓）、#118 同方向加仓合并并保留价位线、#119 跨价差限价单按 Taker 计费、
  #120 partial-close 进 CI、#121 挂单改价（含按当下最新价重算费率归属）、#122 移动端触摸用例稳定化
- tag/release：Release Tag workflow 自动打 **tag v0.5.25** @ 231aebc（run 35685437363，9s 成功）
- 定档门禁：typecheck ✅ / lint 0 err（既有 warning 若干）✅ / audit:i18n ✅ / unit **1902**（172 files）✅ /
  全量 build（含 docs 站合并）✅；发布 PR CI 三浏览器 E2E（15m10s）+ CodeQL + Knowledge + Build + Audit 全绿
- 部署与 live 抽查：
  - Pages ✅ run 35685437425 success；首页 200 且 meta `app-version=0.5.25`、`/knowledge/` 200、`manifest.webmanifest` 200
  - 真实 bundle ✅ `assets/index-BgT2r73A.js`（569KB）含本版新文案：减仓 / 改价 / 吃单费率 / 挂单价 / 价格改善
  - 真浏览器抽查 ✅ 线上首页渲染出 canvas、顶栏实时价 85692.00（真实行情在走），无空屏
  - Vercel ⚠ 仍是账号级 **build-rate-limit**（提示 24h 恢复），非代码问题，不阻塞发布
- 回滚：`git revert` 本次 release 提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 发布后仍在飞的两个批次（都已 rebase 到 231aebc）：
  - **#124** `?perf` 压测模式补齐「不联网」契约：合成盘口档位（`src/data/syntheticDepth.ts`）+ 停掉真实历史预取，
    perf 模式下对外请求 5 → 0
  - **#125** 挂单改价编辑器的 320px 窄屏回归——顺带记一次有价值的变异失败：只用「控件在视口内 + 无横向溢出」
    断言时，撤掉编辑器 `flexWrap` 用例**照样绿**（274px 恰好塞下被压扁的四个控件），补「控件排成 ≥2 行」后才真正承重。
    教训：溢出类断言必须配一条「确实换行」的正向断言，否则测的是运气
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 需登录态与原生平台，暂缓；
  候选见文末「已知遗留」：marketable 即时成交不计滑点、`smoke.spec.ts` 体量过大待拆分）

**里程碑 v0.5.24 发布完成（2026-09-22）**
- 版本号：**0.5.24**（package.json / package-lock 根版本 / index.html meta app-version）
- 分支：`release/v0.5.24`（release 1708769）；发布 PR：#114（rebase 合并 → main **54f9773**）
- tag/release：Release Tag workflow 自动打 **tag v0.5.24** @ 54f9773（幂等）
- 定档门禁：typecheck ✅ / lint 0 err（29 条既有 warning）✅ / audit:i18n ✅ / unit **1862** ✅ /
  全量 build（含 docs 站合并）✅；发布 PR CI 三浏览器 E2E + CodeQL + Pages + Android 全绿
- 部署与 live 抽查：
  - Pages ✅ 首页 200 且 `app-version=0.5.24`、`/knowledge/` 200
  - 真实 bundle ✅ 主包含本版新文案（移动止损 / 保本止损 / 挂限价买入），535KB 单包
  - Vercel ⚠ 仍受账号级 **build-rate-limit** 滞后（本会话多次 PR/预览构建触顶，约 24h 自动恢复），非代码问题
- 回滚：`git revert` 本次 release 提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 发布后本地全量 chromium E2E（197 例）暴露出 **CI 规格清单的盲区**：CI 只跑固定 ?perf 规格集，
  `limit-orders` / `tpsl-guard` 两个纯合成数据规格从未进过 CI，而 `smoke` / `feature-gaps` 等实时数据规格
  按设计留本地——已按该标准在 test/v05-e2e-gaps 批次补齐（见「当前阶段」下一条）
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓）

**已收口 · E2E 健康度批次（test/v05-e2e-gaps → PR #115，已并入 v0.5.25）**
- 修掉本地全量跑出的真实腐化：持仓行按钮从 1 个变 3 个（平仓/反手/止盈止损）后
  `smoke` 两处用 `posRow.getByRole('button')` 触发 strict mode violation；
  `feature-gaps` G4 榜单用 `[data-testid^="market-row-"]` 计数把行内的 `market-row-select-*` 一起算进去（20>10）
- 修掉依赖缺陷结算旧行为的夹具：`smoke` 手动开仓用例填死价 100（真实价 ~8.6 万），
  在 v0.5.24 的诚实触价结算下会被瞬时平掉 → 改为按顶栏实时价下单、数量压到余额之内
- CI 清单补 `limit-orders` + `tpsl-guard`（纯 ?perf 驱动，符合该作业自述的入选标准）
- 已知非回归（环境/几何依赖，留本地观察）：`recent-features`/`smoke` 的盘口驱动「模拟交易」用例
  在本沙箱拿不到订单簿数据（bid count 0，K 线实时价正常），CI 本就 grep-invert 排除；
  `smoke` 移动端文本标注 tap 流与 `period-anchor` 偶发抖动待单独排查
  （订单簿拿不到数据 → #124 的 `?perf` 合成档位解决；移动端 tap 流 → #122 解决；`period-anchor` 仍待观察）


- 版本号：**0.5.23 → 0.5.24**（package.json + package-lock 根版本 + index.html meta app-version）
- 本版收录（v0.5.23 之后合并的四个批次）：
  - #110 持仓止盈止损可编辑：仓位面板行内编辑器（预填/留空清除/一键保本止损）+ `src/position/levels.ts`
  - #111 移动止损 `trailPct` + 结算链路合并：止损随价推进、回落不回撤；`usePositionSettlement` 一条链路
    统一当前品种与跨品种结算；顺带修掉「限价单跨过价差按挂单价成交导致开仓即亏平」→ 按市场价价格改善
  - #112 顶栏层级抬到停靠面板之上（z 95 → 130）：修掉「面板打开时 More 下拉项被面板按钮吃掉」
  - #113 图上拖拽止盈/止损线走同一套价位校验：`dragLevel` + `acceptDragPrice`，越界即停在边界
- 单测规模：v0.5.23 的 1796 → **1862**（171 files，+66）
- 定档门禁（release 分支实跑）：typecheck 干净 / lint 0 error（29 条既有 warning）/ audit:i18n 通过 /
  unit **1862** / 全量 build（含 docs 站产物合并）通过
- 本批质量手段（写进记录以免失传）：
  - 每条新断言都做变异校验：移除止损写回 → hook 4 红；移除 settled 过滤 → 1 红；禁用推进 → 单测 3 红 + E2E 2 红；
    去掉价格改善 → 5 红；把 App 里的 `dragLevel` 换回直写 → 2 红；头部层改回 95 → 层叠用例红
  - 遮挡类断言改用 `elementFromPoint` 直断层叠（只靠 click 会被 Playwright 的重试机制补上，缺陷态照样绿、只是变慢）
- 已知遗留（不阻塞发布）：`?perf` 压测模式下文档级横向溢出 139px（`chart-indicator-last` 图例宽度所致，
  真实行情模式为 0）；限价单跨价差成交仍按挂单（Maker）费率计费——交易所会把这类判为 Taker，
  费率语义待单独一批决定
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**——候选「模拟盘部分平仓（按数量/比例减仓）」，
  现有一键全平之外没有减仓手段，而减仓是持仓管理的常用动作（`recordClose` 已支持任意 qty，改动集中在纯函数与面板）

**里程碑 v0.5.23 发布完成（2026-09-22）**
- 版本号：**0.5.23**（package.json / index.html meta app-version）
- 分支：`release/v0.5.23`（release bd7f22c）；发布 PR：#108（rebase 合并 → main **a573c4e**）
- tag/release：Release Tag workflow 自动打 **tag v0.5.23** @ a573c4e（幂等，不覆盖 v0.5.22）
- 本版收录（v0.5.22 之后积累的三个特性批次 + 质量修复一并定档）：
  - #102 成交明细筛选：方向（全部/主动买/主动卖）+ 大单档循环（关 → ×5 → ×10）
  - #105 图表右键挂限价单：以点击价位直接打开限价模式下单并入挂单队列
  - #107 止盈止损结算覆盖：跨品种守护 + 当前品种按最新价触发改动（修掉「静止持仓触价不平仓」与重复记账风险）
  - #104 发布记录文档、#106 A1 canvas 渲染判据改取主题涨跌色、限价单 E2E 浮层遮挡 60s 超时修复
- 单测规模：v0.5.22 的 1774 → **1796**（170 files，+22）
- smoke（release 分支实跑）：typecheck ✅ / lint 0 err（28 条既有 warning）✅ / audit:i18n ✅ /
  unit **1796** ✅ / 全量 build（含 docs 站合并）✅
- CI 与部署：release PR #108 三浏览器 E2E（12m2s）+ CodeQL + Pages + Android 全绿；
  **合并后 main push CI 同样全绿**（v0.5.22 那次 run 537 的 webkit A1 渲染断言未再复现）
- live 抽查：
  - Pages ✅ 首页 200 且 `app-version=0.5.23`、`/knowledge/` 200
  - 真实浏览器打开 `?perf=600` ✅ 应用正常启动（最新价 ▲50747.97、MA/VOL 指标读数正常），
    主包内含本版新文案（「挂限价买入」「无符合筛选的成交」），懒加载分块（RecentTrades/DepthChart 等）齐备
  - Vercel ⚠ 生产域名仍为 0.5.22（PR 的 Vercel 预览构建已通过；生产构建仍受账号级 **build-rate-limit** 滞后，
    `vercel.com/...?upgradeToPro=build-rate-limit`，非代码问题，限流解除后自动补齐最新 main）
- 取代与清理：已删除远端/本地临时分支 release/v0.5.23 与遗留的 release/v0522（#101 合并后未删的那条），
  worktree 全部回收，`git branch -r` 仅剩 main 与 Dependabot 分支；无 DB/迁移
- 回滚：`git revert a573c4e`（版本定档为单提交）；远端 tag 误打用 `gh api` 删除
- 下一里程碑：**v0.5.24 继续积累** — 进行中的批次为「持仓止盈止损可编辑（含一键保本止损）」
  （分支 feat/v05-position-levels，纯函数 `src/position/levels.ts` + 面板行内编辑器，
  与本版止盈止损结算链路闭环），随后清理 Dependabot #88–#94

**里程碑 v0.5.22 发布完成（2026-09-22）**
- 版本号：**0.5.22**（package.json / index.html meta app-version）
- 分支：`release/v0522`（release ce70dab）；发布 PR：#101（rebase 合并 → main **5a4c501**）
- tag/release：Release Tag workflow 自动打 **tag v0.5.22** @ 5a4c501（幂等，不覆盖 v0.5.21）
- 本版收录（三个本地特性批次按「批量积累后发布」一并定档）：
  - #96 提醒面板·列表筛选（方向 ≥/≤ + 状态过滤）
  - #98 侧栏「成交明细」Time & Sales 面板（逐笔成交轮询累积）
  - #99 模拟盘限价挂单 Maker 单（触价按挂单价成交 + 当前挂单列表 + D5 挂单费率设置）
  - #100 指标参数导出用例显式桩掉 URL.createObjectURL（解除 jsdom 30.1.0 门禁）+ DrawingLayers waitFor 并发偶发失败修复
- 单测规模：v0.5.21 的 1713 → **1774**（+61）
- 部署与 live 抽查：
  - Pages ✅ 首页 200 且 `app-version=0.5.22`、知识库 `/knowledge/` 200
  - Vercel ⚠ 当时仍为 0.5.21：账号级 **build-rate-limit**（Hobby 计划本会话多次 PR/预览构建触顶，
    `vercel.com/...?upgradeToPro=build-rate-limit`，约 24h 后自动恢复并补齐最新 main）——非代码问题，
    release PR 的 preview 构建与 CI Production build 均通过
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1774** ✅ /
  chromium E2E market-tape **3/3** + limit-orders **3/3** ✅ / 三浏览器 E2E + CodeQL + Pages + Android 全绿
- 取代处理：旧发布 PR **#97**（分支从 8bba2a8 切出、与 main CONFLICTING）已关闭，其内容在 #101 中重做；
  合并后已删除 release/v0.5.22、feat/v05-alert-filter、feat/v05-recent-trades、feat/v05-limit-orders、
  test/indicator-export-objecturl 等远端临时分支
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 遗留：release push 的主 CI（run 537）唯一失败项是 webkit A1 周期边界用例的 canvas 像素断言
  （同代码上一次 main push 全绿、同一位置 3 次重试均超时）→ 按 A2/smoke 用例既有先例做抗抖加固
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓）

**里程碑 v0.5.21 发布完成（2026-09-21）**
- 版本号：**0.5.21**（package.json / index.html meta app-version）
- 分支：`release/v0.5.21`（release 25524c3）；发布 PR：#87（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.21** @ cdf77b6（幂等，不覆盖 v0.5.20）
- 部署：Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.21`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1713** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿（release push 主 CI 首跑即绿）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 已解阻塞——typescript-eslint 8.70 兼容 TS 7.0.2，toolchain 全绿；Vercel build-rate-limit 已自动恢复，
  发布节奏调整为批量积累后发布）

**里程碑 v0.5.20 发布完成（2026-09-21）**
- 版本号：**0.5.20**（package.json / index.html meta app-version）
- 分支：`release/v0.5.20`（release 2b23e23）；发布 PR：#84（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.20** @ df71d10（幂等，不覆盖 v0.5.19）
- 部署：Pages **live 抽查通过**（首页 200 + `app-version=0.5.20` + 知识库 200）；
  Vercel 生产被 **build-rate-limit** 阻塞（Hobby 计划因本会话 12 连发触顶，vercel.com?upgradeToPro=build-rate-limit；
  非代码问题——release PR preview 构建通过、CI 全绿；限流重置后 Vercel 自动补齐最新 main）
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1710** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿（release push 主 CI 首跑即绿）
- 期间处理：E6 E2E 断言 getByText(/已过期/) 因新增「清理已过期」按钮文案二义 → 限定 alert-row（组件+E2E 双处同步修复）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**——调整发布节奏（连发 12 版触发 Vercel Hobby build-rate-limit，后续功能先批量积累再发布）

**里程碑 v0.5.19 发布完成（2026-09-20）**
- 版本号：**0.5.19**（package.json / index.html meta app-version）
- 分支：`release/v0.5.19`（release c34fd13）；发布 PR：#81（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.19** @ a99d54a（幂等，不覆盖 v0.5.18）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.19`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1708** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿（release push 主 CI 曾遇 period-anchor webkit 已知 flake → 复跑通过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 已解阻塞——typescript-eslint 8.70 兼容 TS 7.0.2，toolchain 全绿）

**里程碑 v0.5.18 发布完成（2026-09-20）**
- 版本号：**0.5.18**（package.json / index.html meta app-version）
- 分支：`release/v0.5.18`（release 6d4f0d9）；发布 PR：#78（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.18** @ 443794e（幂等，不覆盖 v0.5.17）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.18`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1706** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 已解阻塞——typescript-eslint 8.70 兼容 TS 7.0.2，toolchain 全绿）

**里程碑 v0.5.17 发布完成（2026-09-20）**
- 版本号：**0.5.17**（package.json / index.html meta app-version）
- 分支：`release/v0.5.17`（release aa77723）；发布 PR：#75（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.17** @ 00c0222（幂等，不覆盖 v0.5.16）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.17`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1699** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.16 发布完成（2026-09-19）**
- 版本号：**0.5.16**（package.json / index.html meta app-version）
- 分支：`release/v0.5.16`（release 47e94b0）；发布 PR：#71（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.16** @ 7899528（幂等，不覆盖 v0.5.15）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.16`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1696** ✅ / chromium E2E recent-features **22/22** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.15 发布完成（2026-09-19）**
- 版本号：**0.5.15**（package.json / index.html meta app-version）
- 分支：`release/v0.5.15`（release 8240f1f）；发布 PR：#68（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.15** @ 6acc2d6（幂等，不覆盖 v0.5.14）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.15`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1694** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.14 发布完成（2026-09-19）**
- 版本号：**0.5.14**（package.json / index.html meta app-version）
- 分支：`release/v0.5.14`（release 0f568c2）；发布 PR：#65（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.14** @ 28f347d（幂等，不覆盖 v0.5.13）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.14`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1687** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.13 发布完成（2026-09-19）**
- 版本号：**0.5.13**（package.json / index.html meta app-version）
- 分支：`release/v0.5.13`（release d0e7f59 + 硬化 9d8071b）；发布 PR：#62（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.13** @ 27a7311（幂等，不覆盖 v0.5.12）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.13`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1684** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 期间处理：period-anchor webkit 既有时序 flake（main 基线复现，与功能无关）→ 两次硬化
  （回到最新断言 15s→25s→45s + 整测预算 60s→150s）后 CI 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.12 发布完成（2026-09-19）**
- 版本号：**0.5.12**（package.json / index.html meta app-version）
- 分支：`release/v0.5.12`（release 7d85f64）；发布 PR：#59（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.12** @ 371bb8a（幂等，不覆盖 v0.5.11）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.12`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1682** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.11 发布完成（2026-09-19）**
- 版本号：**0.5.11**（package.json / index.html meta app-version）
- 分支：`release/v0.5.11`（release b717385）；发布 PR：#56（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.11** @ 3c8691f（幂等，不覆盖 v0.5.10）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.11`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1679** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.10 发布完成（2026-09-18）**
- 版本号：**0.5.10**（package.json / index.html meta app-version）
- 分支：`release/v0.5.10`（release b0b5383）；发布 PR：#54（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.10** @ d6483bc（幂等，不覆盖 v0.5.9）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.10`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1671** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.9 发布完成（2026-09-18）**
- 版本号：**0.5.9**（package.json / index.html meta app-version）
- 分支：`release/v0.5.9`（release adacc0e）；发布 PR：#51（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.9** @ 1712fe0（幂等，不覆盖 v0.5.8）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.9`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1665** ✅ / chromium E2E recent-features **21/21** ✅ /
  CI+CodeQL+Pages+Android 全绿（iOS 在 feat 合并时已全绿；release push 无 app-shell/src 变更按路径过滤跳过）
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.8 发布完成（2026-09-18）**
- 版本号：**0.5.8**（package.json / index.html meta app-version）
- 分支：`release/v0.5.8`（release 66e3c69）；发布 PR：#48（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.8** @ 66e3c69（幂等，不覆盖 v0.5.7）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.8`（Pages + Vercel）、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1657** ✅ / chromium E2E recent-features **20/20** ✅
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.7 发布完成（2026-09-18）**
- 版本号：**0.5.7**（package.json / index.html meta app-version）
- 分支：`release/v0.5.7`（release 8e66ea3）；发布 PR：#45（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.7** @ 7be8669（幂等，不覆盖 v0.5.6）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：首页 200 且 `app-version=0.5.7`、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1656** ✅ / chromium E2E recent-features **20/20** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.6 发布完成（2026-09-18）**
- 版本号：**0.5.6**（package.json / index.html meta app-version）
- 分支：`release/v0.5.6`（release 53081d0）；发布 PR：#42（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.6** @ 311ac6b（幂等，不覆盖 v0.5.5）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：首页 200 且 `app-version=0.5.6`、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1655** ✅ / chromium E2E recent-features **20/20** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.5 发布完成（2026-09-17）**
- 版本号：**0.5.5**（package.json / index.html meta app-version）
- 分支：`release/v0.5.5`（release f95a514）；发布 PR：#39（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.5** @ 1885ff3（幂等，不覆盖 v0.5.4）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：首页 200 且 `app-version=0.5.5`、知识库 200
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1652** ✅ / chromium E2E snapshot-gallery 2/2 ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.4 发布完成（2026-09-16）**
- 版本号：**0.5.4**（package.json / index.html meta app-version）
- 分支：`release/v0.5.4`（release 8f7bb64）；发布 PR：#36（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.4** @ d52416e（幂等，不覆盖 v0.5.3）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.4`、知识库 200；bundle 含 复制 OHLC / Copy OHLC 新特征
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1652** ✅ / chromium E2E **19/19** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿；期间 webkit period-anchor 已知 flake 复跑通过
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（本批：快照画廊导出图片；I3 云同步 / I11 移动端 Widget 外部能力暂缓；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.3 发布完成（2026-09-16）**
- 版本号：**0.5.3**（package.json / index.html meta app-version）
- 分支：`release/v0.5.3`（release 3957963）；发布 PR：#32（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.3** @ 296da71（幂等，不覆盖 v0.5.2）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.3`、知识库 200；bundle 含 tab/position/trades/alerts 深链特征
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1648** ✅ / chromium E2E **17/17** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（本批：图表右键「复制 OHLC」+ 按品种汇总点击切品种；I3 云同步 /
  I11 移动端 Widget 外部能力暂缓；TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.2 发布完成（2026-09-16）**
- 版本号：**0.5.2**（package.json / index.html meta app-version）
- 分支：`release/v0.5.2`（release 6c1030b + 硬化 907b1d7）；发布 PR：#29（rebase 合并 → main）
- tag/release：release-tag workflow 自动打 **tag v0.5.2** @ 907b1d7（幂等，不覆盖 v0.5.1）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.2`、知识库 200；bundle 含 `Enter 确认`/`Esc 关闭`/`当日盈亏` 新特征
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1648** ✅ / chromium E2E **16/16** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿；期间 period-anchor webkit/firefox/chromium 时序 flake 复跑 + 硬化
  （回到最新 force 点击 + 锚定断言 8s→15s）后全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（本批：深链 `?tab=` 直达面板；I3 云同步 / I11 移动端 Widget 外部能力暂缓；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5.1 发布完成（2026-09-16）**
- 版本号：**0.5.1**（package.json / index.html meta app-version）
- 分支：`release/v0.5.1`（release 3b7abcc）；发布 PR：#26（rebase 合并 → main @ `f3740b8`）
- tag/release：release-tag workflow 自动打 **tag v0.5.1** @ f3740b8（幂等，不覆盖 v0.5.0）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.1`、知识库 200；bundle 含 `按品种汇总`/`当日盈亏` 新特征
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1645** ✅ / chromium E2E **15/15** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（本批：图表面板深链增强 `?ind=`/`?sub=` 直达指标 + QuickOrder 键盘
  Enter 确认/Esc 关闭；I3 云同步 / I11 移动端 Widget 外部能力暂缓；
  TS7 仍阻塞——typescript-eslint 8.70 报 "does not support TS 7.0"，待官方支持）

**v0.5.x 继续（2026-09-15）** — v0.5.0 已发布；本地新特性构想继续
- **app-shell M2 · 原生分享适配层（已合并 PR #22，feat/shell-native-share）**：
  - 新增 `@shell/share` 适配层（vite 别名条件化 + tsconfig paths，与 `@shell/notifications` 同构）：
    桩 `src/shellShare.ts`（Web/测试：恒返回 'fallback'，导出行为与原完全一致）+
    真实 `app-shell/native-share.ts`（Capacitor Share：系统分享面板文本分享 → 'shared'，取消/失败 → 'fallback'）
  - App.tsx 三个文本导出（交易流水 CSV / 权益曲线 CSV / 账户 JSON）改走 `exportTextFile`：
    先尝试原生分享（壳内系统分享面板），未分享回退原有 `<a download>`；
    CSV 保留 BOM（Excel 兼容）、JSON 不加 BOM（回导 JSON.parse 不破坏）；`@capacitor/share@8.0.1` 装入 app-shell
  - 验证：`VITE_CAPACITOR=1 vite build` → bundle 含 `Share.share` + 'shared'/'fallback'（native-share 生效）；
    默认 build → 桩 `return\`fallback\`` 保留、无真实插件；typecheck ✅ / lint 0 err ✅ /
    unit **1635 全绿**（+shellShare 桩 2 用例）✅
  - Web 端零行为变化：桩恒返回 'fallback'，导出下载路径与原一致（无 E2E 依赖交易 CSV/JSON 下载）
- **v0.5.x Web 特性 · 交易流水按日分组 + 每日小计（已合并 PR #24，feat/v05-trade-daily）**：
  - `src/trade/daily.ts` 纯函数：`dayKeyFor`（UTC 日键 `YYYY-MM-DD`）/ `groupTradesByDay`（新日在前组序）/
    `dailySummary`（笔数/已平仓数/净盈亏）
  - TradeHistoryPanel 流水列表按 UTC 日分组：日标题 + 每日小计（笔数 / 当日盈亏，仅已平仓>0 显示盈亏）；
    五语 i18n 新增 `trade.dailyCount`/`trade.dailyPnl`；单测 +7；unit 1640 全绿；chromium E2E 15/15 ✅
- **v0.5.x Web 特性 · 按品种盈亏汇总（本批，feat/v05-trade-breakdown）**：
  - `src/trade/breakdown.ts` 纯函数 `symbolBreakdown`：按品种聚合笔数/已平仓数/净盈亏/胜率，净盈亏降序
  - TradeHistoryPanel 统计行下折叠区「按品种汇总」（默认收起，多品种时显示）：品种 / 笔数 / 胜率 / 累计盈亏；
    五语 i18n 新增 `trade.bySymbol`
  - 单测 +3（breakdown）；全量 unit **1645 全绿** ✅
- 下一项：提交本批 → PR → CI → 合并；随后继续 v0.5.x（更多新特性）

**里程碑 v0.5.0 发布完成（2026-09-15）**
- 版本号：**0.5.0**（package.json / index.html meta app-version）
- 分支：`release/v0.5.0`（release 0493573 + fix 703cd3d，基于含 session-lines 的 main）
- 发布 PR：#20（rebase 合并 → main @ `703cd3d`）
- tag/release：release-tag workflow 自动打 **tag v0.5.0** @ 703cd3d（幂等，不覆盖 v0.4.0/v0.1.0）
- 部署：merge 后 Pages + Vercel 自动部署，**live 抽查通过**：
  首页 200 且 `app-version=0.5.0`、知识库 200；bundle 含 sessionLines/maxDrawdown/pnlBars 新特征
- smoke：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit **1633** ✅ / chromium E2E **15/15** ✅ /
  CI+CodeQL+Pages+Android+iOS 全绿；CI E2E 曾因当日高低按钮与 snapshot-save 重叠失败 → 移至第二行修复后全绿
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5.x 继续**（I3 云同步 / I11 移动端 Widget 外部能力暂缓；本地可继续新特性构想；
  TS7 仍阻塞——typescript-eslint 8.70 明确报 "does not support TS 7.0"，待官方支持）

**里程碑 v0.5 进行中（2026-09-14）** — I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性
- **里程碑 v0.4.0 发布完成（2026-09-13）**：`release/v0.4.0` → PR #11 rebase 合并 main @ `8a1fbcf`，
  release-tag workflow 自动打 **tag v0.4.0**；Pages + Vercel 双平台 live 抽查 200 且 `app-version=0.4.0`、
  知识库 200、bundle 含 I9 scheduleTheme 特征；CI/CodeQL/e2e-tests 全绿；回滚方案：`git revert`（无 DB/迁移）
- **app-shell M1 已合并（2026-09-13，PR #12）**：真实 Capacitor 插件打包（`VITE_CAPACITOR=1` 条件化别名）+
  原生价格提醒（Local Notifications 适配层 `@shell/notifications`）→ main `3ae7383`/`16b4677`
- **O1 错误监控测试已合并（2026-09-13，PR #13）**：errorReport 12 用例 + ErrorBoundary 3 用例 → main `9c17059`
- **CI 构建顺序缺陷已修复（2026-09-14，PR #15）**：M1 引入的 `VITE_CAPACITOR=1 npm run build` 在 app-shell
  依赖未装时就跑 → Android/iOS CI UNLOADABLE_DEPENDENCY 双失败；修复：Install shell deps 前移到 Build web 前 → main `a456a6a`，合并后 app-android-apk / app-ios-simulator-build 验证中
- **v0.5 本地特性 · 交易绩效面板（已合并 PR #14，feat/v05-perf-panel）**：
  - 新增 `src/trade/perf.ts` 纯函数：`maxDrawdown` / `currentDrawdown` / `maxDrawdownAmount`（回撤口径含
    初始资金峰值参考，initialBalance 可选参数）+ `scaleEquity`（权益曲线缩放/路径，全平居中）
  - 新增 `src/components/EquityCurve.tsx` 可交互权益曲线：悬停十字定位 + tooltip（时点权益/回撤）、
    初始权益基准虚线、终值涨跌着色、五语 i18n（`trade.maxDrawdown`/`trade.drawdown` 新键）
  - TradeHistoryPanel 原 280×48 sparkline 升级为交互式权益曲线 + 最大回撤/当前回撤指标行
  - 验证：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit 1608 全绿 ✅ / 全量 build ✅ /
    chromium E2E recent-features 14/14 ✅
- **v0.5 本地特性 · 逐笔盈亏条形图（已合并 PR #16，feat/v05-pnl-bars）**：
  - `perf.ts` 新增 `pnlBars(trades)` 纯函数：提取已平仓盈亏序列（新在前 → 时间升序）
  - 新增 `src/components/PnlBars.tsx`：零轴 + 盈利向上（up 色）/亏损向下（down 色）柱形条，柱高按最大 |pnl| 归一化
  - TradeHistoryPanel 权益曲线下方渲染逐笔盈亏条形图；五语 i18n 新增 `trade.pnlBars`
  - 验证：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit 1617 全绿 ✅ / chromium E2E 14/14 ✅
- **v0.5 本地特性 · 交易流水过滤（已合并 PR #17，feat/v05-trade-filters）**：
  - `src/trade/filter.ts` 纯函数：`filterTrades`（symbol/side/query 组合过滤，无过滤原引用返回）+ `tradeSymbols`（去重品种列表）
  - TradeHistoryPanel 多品种时显示过滤行（品种下拉 + 方向下拉 + 关键词搜索），仅过滤列表，
    统计/权益曲线/盈亏条仍用全量；空匹配显示 `trade.filterEmpty` 提示
  - 五语 i18n 新增 `trade.filterSymbol/filterSide/filterQuery/filterEmpty/all`
  - 验证：typecheck ✅ / lint 0 err ✅ / audit:i18n ✅ / unit 1628 全绿 ✅ / chromium E2E 15/15 ✅
- **v0.5 本地特性 · 当日高低线（本批，feat/v05-session-lines）**：
  - `src/data/session.ts` 纯函数 `sessionExtremes`：按最新 K 线所在 UTC 日聚合会话最高/最低价（含未收盘 K 线实时高低）
  - adapter 新增 `setSessionHighLow`（当日 H/L 虚线价格线，H 上色/L 下色，仅首次 create 后续 applyOptions）
  - ChartView 图表右上角「当日高低」开关（持久化 `kline-buty:sessionLines`），随会话高低变化更新；
    五语 i18n 新增 `chart.sessionLines`
  - 单测 +5（session.test）+ 相关 ChartApi mock 补 `setSessionHighLow`；全量 unit **1633 全绿** ✅
  - chromium E2E recent-features **15/15**（新增「当日高低线」开关开/关 + 持久化用例）✅
  - 注：本机 E2E webServer 构建近期 I/O 阻塞（>40min，4% CPU），改用预构建 dist + 手工 serve-static 验证
- 下一项：提交本批 → PR → CI → 合并；随后继续 v0.5（app-shell M2 分享/崩溃监控 或 下一 Web 特性）

**里程碑 v0.4 exit report（2026-09-12）**
- 版本号：**0.4.0**（package.json / index.html meta app-version；本地 tag `v0.4.0` @ 7321ad0）
- 包含任务：I9 定时主题（新）+ I1/I2/I4–I8/I10/I12–I15 收口；A–H 阶段此前全闭合；
  唯一未含：I3（云同步）/ I11（移动端 Widget），BLOCKED_EXTERNAL
- 分支：`release/v0.4.0`（3 commits：e3750d0 / b489bdc / 7321ad0），基于 `feat/i9-scheduled-theme`（内含 I9）
- base SHA：`a57d51065f1696baff0f95fcd0c71849cc225838`
- 发布 PR：**待授权创建**（LOCAL_ONLY 未 push；`gh pr create --base main --head release/v0.4.0` body 已备好）
- 合并方式：rebase（禁 merge commit）
- tag/release：release-tag workflow push main 后自动打 v0.4.0（幂等，不覆盖 v0.1.0）
- 部署：merge 后 Pages/Vercel 自动部署；需 live 抽查（应用首页 + 知识库，curl grep 新特征）
- smoke：chromium E2E recent-features 13/13 + visual 4/4 + 全量单测 1561 + build；CI e2e-tests 3 浏览器门禁验证中
- 回滚：`git revert` 反向提交；远端 tag 误打用 `gh api` 删除；无 DB/迁移
- 下一里程碑：**v0.5**（I3 云同步需登录态+云端 KV、I11 移动端 Widget 需原生平台，均外部能力；
  本地可先行新特性构想；dependabot #8 TS7 待 typescript-eslint 支持后解封）

**I9 定时主题切换（2026-09-12，提交 e3750d0）** — I9「深色/浅色自动切换（跟随系统 + 定时）」补齐「定时」子能力：
- 新增 `schedule` 主题档：主题档循环 dark→light→auto→schedule；schedule 档按用户设定深/浅色时刻
  （HH:mm）自动切换，配置持久化 `kline-buty:scheduleTheme`（默认深 18:00 / 浅 07:00），跨午夜区间正确
- `src/theme.ts` 纯函数：`timeToMinutes` / `resolveScheduledTheme` / `currentScheduledTheme`；新 hook
  `useScheduledTheme`（30s 重算，仅变化时 setState）；桌面/移动 Header 在 schedule 档显示时间配置输入
- 五语 i18n（toSchedule/scheduleDark/scheduleLight）；设置快照导出自动纳入新持久化键
- 验证：typecheck ✅ / lint 0 err ✅ / i18n 五语键集一致 ✅ / unit 1561 全绿 ✅ /
  chromium E2E recent-features 13/13（含 I9 用例）+ visual 4/4 基线不变 ✅
- 分支 feat/i9-scheduled-theme @ e3750d0，基于 origin/main@a57d510；LOCAL_ONLY 未 push

**app-shell M1（2026-09-13，feat/shell-navigation-alerts）** — 两个真机能力缺口修复
- **① 壳构建打包真实 Capacitor 插件**：根 `vite.config.ts` 此前无条件把 `@capacitor/*` 别名到浏览器桩，
  Android/iOS CI 又直接跑根 `npm run build` → APK 内 JS 是桩，状态栏/启动屏/返回键在真机 no-op。
  修复：别名按 `VITE_CAPACITOR` 条件化——壳构建指向 app-shell/node_modules 真实插件
  （`@capacitor/app`/`status-bar`/`splash-screen` 的 `dist/esm/index.js`），Web/测试保持桩；
  android-app.yml / ios-app.yml 的 `Build web` 改 `VITE_CAPACITOR=1 npm run build`
- **② 原生价格提醒（M1 P0 Local Notifications）**：Web `new Notification` 在壳 WebView 不可用。
  新增通知适配层 `@shell/notifications`（vite 别名条件化 + tsconfig paths）：
  桩 `src/shellNotifications.ts`（Web/测试：行为与原完全一致）+ 真实 `app-shell/native-notifications.ts`
  （Capacitor LocalNotifications：requestPermissions → schedule 即时展示）；usePriceAlerts 系统渠道改走适配层，
  permission init/request/挂载异步校正统一经适配层；`@capacitor/local-notifications@^8.3.1` 装入 app-shell；
  capacitor.config 加 presentationOptions（badge/sound/banner/list）；Android 权限由插件 manifest 自动合并
  （POST_NOTIFICATIONS + SCHEDULE_EXACT_ALARM）
- 验证：`VITE_CAPACITOR=1 build` → bundle 含 registerPlugin/@capacitor/core 运行时 + 真实 StatusBar/SplashScreen/
  LocalNotifications 分块，桩标记消失；默认 build → 桩保留、无真实插件；typecheck ✅ / lint 0 err ✅ /
  unit 1556 全绿（+7 桩适配层测试）✅ / 全量 build ✅
- 真机行为：本机无原生工具链，由 CI android/ios 工作流打包后真机确认（构建正确性已由 bundle 检查保障）
- 分支 feat/shell-navigation-alerts，基于 origin/main@a57d510；LOCAL_ONLY 未 push

**CI E2E 确定性回归 + 覆盖率补强（2026-09-12）** — ci.yml 新增 e2e-tests job（3 浏览器 × 确定性规格集，H11 firefox 在 Linux CI 全跑）；覆盖率 statements 81.71%→82.62%、lines 破 85%

**CI E2E 确定性回归 + 覆盖率补强（2026-09-12）** — ci.yml 新增 e2e-tests job（3 浏览器 × 确定性规格集，H11 firefox 在 Linux CI 全跑）；覆盖率 statements 81.71%→82.62%、lines 破 85%
- 覆盖率补强（5c339c5）：vitest.setup 加 WebSocket 桩；App 集成 +8 / DesktopHeader +9 / MobileHeader +3；npm test 1549 全绿
- CI E2E job（2648d4c）：确定性规格集（?perf）+ `--grep-invert "模拟交易"` + 失败上传工件；实时冒烟留本地
- CI 首跑失败 4 类可移植性问题 + perf 模式真正离线（4d17ca9，CI 复跑中）：
  1. marker-render 截图基线按 darwin 提交 → CI linux 按 fs.existsSync 平台守卫，功能断言仍执行
  2. 币安 WS 被 GH runner geo 阻断（HTTP 451）污染 error 断言 → 过滤环境性 Binance WS 错误
  3. period-anchor firefox 拖拽时序 → 回看步骤重试式（≤5 次）
  4. recent-features 下拉刷新 firefox 无 Touch 构造器 → firefox 跳过
  - perf 模式 docs 契约「不联网」此前被违反（仍连 WS/REST 生成环境性错误）：合成数据模式下
    useMarketStats/useSentiment/useTickerList/useMarketSnapshots 加 isPerfMode 守卫
    （useDepth 保留实时——「模拟交易」用例 ?perf 下仍用实时盘口，且已 grep-invert 出 CI）

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
- I9 深色浅色自动切换 ✅（theme auto 既有 + 本批新增 schedule 定时档：深/浅色时刻可配、跨午夜、持久化 + 单测 12 + E2E）
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