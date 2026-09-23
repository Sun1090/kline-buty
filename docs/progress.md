# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。每条主题分支推一次、开一个 PR，合并后即删远端分支。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**批次 v0.5.31 之后：四图联动的两条真实缺陷 + 测试账本收口（2026-09-23）**
- 已合并到 main（按合并顺序）：
  - **#180 → 02475c8** v0.5.31 发布完成记录与线上抽查结果（docs）
  - **#181 → 87c11c1** 移动端双击复位用例去掉「几秒前的像素快照」基线，改按 `chart-visible-range` 的**可视时间跨度**断言
    （原基线在自动缩放的价格轴上自己会漂，与阈值的差只有 3px ⇒ 偶发红）
  - **#182 → d67e024** `period-crosshair` 改按同一帧快照比对**源格当前时刻**，容差 `2×本格周期 + 源格一个周期`
    （四格默认同为 1m 时「半周期容差」等于要求逐字相等，CI 的 webkit 就是这么偶发红），并新增「左移后四格时刻必须变小」
  - **#187 → 5a68b55** 零引用 `data-testid` 清点：24 个控件补真实断言（每条都做过变异复验）、32 个死钩子删除，
    新增 `scripts/__tests__/testid-usage.test.ts` 把「加了钩子没用例」变成 CI 变红条件（含 `decls.length > 200` 下限，防解析器静默失效）
- 待合并（两条产品缺陷，均已在真浏览器上复现并变异复验）：
  - **#189**（issue **#183**）混周期四图的十字光标**互相回声覆盖**：接收格把外部时刻吸附到自己周期后，回流带回来的是
    **吸附落点**而非请求值，#177 按值判等的回声判断认不出来 ⇒ 四格互相覆盖，实测指针移动不再改任何一格的时刻、
    移出后三格残留幻影。修法：adapter 记住真实落点并给回调加 `fromExternalWrite`；本格被指针停着时一律按真实上报处理
    （只按值判等会把「指针恰好落回上次吸附那根」也吞掉，实测接收格会永远停在 20 小时前）。四格同周期时吸附是恒等映射，
    所以默认配置一直绿 —— 缺陷躲在门禁后面。
  - **#188**（issue **#186**）四图时间轴联动按**逻辑索引**广播：混周期下把 1m 那格挤到只剩两三根 K 线的可视窗口。
    改成广播秒、接收侧按本格数据换算（`cull.ts` 抽出 `floorIndexByTime`，与 G2 的 `anchorRangeForSwitch` 共用同一件换算）；
    顺带修正**流水定位** `locateRangeFor` 交出的秒被当成索引喂给图表（该功能 E2E 零覆盖，一直静默错位）；
    接收侧还要把窗口撑到请求跨度的根数，否则粗周期吸附成一根宽的退化视角再被广播回去，会把对面那格一路压扁。
- 另立单未开工：**#185** 移出指针后接收格残留停在旧 K 线的 OHLC 浮层（`clearCrosshairPosition()` 不回抛事件，
  没有任何路径把接收格的 `tooltip` 置回 null；补 `setTooltip(null)` 只从 3 格降到 2 格，还有第二条写入路径待查）
- 门禁现状（main@5a68b55）：`npm test` → **2022 passed / 175 files**；`node scripts/run-ci-e2e.mjs --list` → **411 tests in 19 files**；
  #187 CI 三浏览器 E2E 全绿。Vercel 那条仍是账号级构建限流，按既定口径不作判定依据
- 合并 #187 后的线上抽查（Pages 部署成功后真浏览器打 https://sun1090.github.io/kline-buty/）：
  `meta app-version=0.5.31`、`data-candles=800`、页面内 `[data-testid]` 元素 **245** 个、A11 范围条 `09/23 13:29 — 09/23 15:22`、
  `pageerror` **0** —— 证明那 32 个钩子确实只服务于「标了却没用例」，删掉不影响运行时
- 版本判断：本批含两条用户可见的图表行为修复，**待 #189 与 #188 合并后定 v0.5.32**（不逐条发版）；
  两 PR 都改 `ChartView.tsx` 相邻区域，后合并者需改基重做（禁 force-push，走「新分支 + 关旧 PR」）
- 本地已知噪声：`period-anchor` A2 在本机负载下约 1/3 红，A/B 过 main 构建同样 2/3 红 ⇒ 与本批分支无关的既有 flake
- 下一项：#185（残留浮层）；#56 双击复位的「价格轴回自适应」那一半仍无任何测试覆盖
- 更新日：2026-09-23

**里程碑 v0.5.31 发布完成（2026-09-23）**
- 版本号：**0.5.31**（package.json / package-lock 根两处 / index.html meta `app-version`）
- 分支：`release/v0.5.31`；发布 PR：**#178**（rebase 合并 → main **5b738be**，合并后即删本地与远端分支）
- tag：**v0.5.31** @ 5b738be（Release Tag workflow run 35858495581 success；幂等，不覆盖旧 tag）
- 本版收录（批次主题：**「其实从来没在工作」的第三连——这次是图表视角状态与多图联动**）：
  - **#174 → main e2127ab** 裁剪窗口迁移改按实际装载判定，停在最新处切周期不再塌成 4~9 根
  - **#175 → main 47c6ce1** 静态托管构建期声明 `VITE_ENDPOINT_MODE=direct`，不再发必然落空的同源 `/api/v3/ping`
  - **#176 → main b556969** A11 可视时间范围条在日常数据量下**永不渲染**的线上回归（#174 作废了装载期的陈旧通知，
    而 lightweight-charts 只在区间真的「变化」时才发事件）→ `ChartApi.visibleRange()` 补读一次；
    补读带来的二阶错（脏区间喂给窗口迁移）用 `onVisibleRange(from, to, trusted)` 分离：**只有图表自己的事件**能决定窗口迁移与分页
  - **#177 → main 48f6022** 多图十字光标回流不再二次广播——`setCrosshairPosition()` 会再触发一次
    `subscribeCrosshairMove`，四格移出后残留 3 个幻影光标；改单源，移出即清零
  - 同批把两条「CI 绿着但什么都没保证」的规格改成能红的：`e2e/multi-chart-sync.spec.ts`（新增，四格必须都相对自己动过）、
    `e2e/period-crosshair.spec.ts`（重写：关掉同步也照过的假绿）、`e2e/stress-large-data.spec.ts`（装载窗口必须容纳视角）
- 定档门禁（最终工作区即 release 提交 5b738be）：
  - `npm test` → **1996 passed / 174 files**；`npm run precheck` → All checks passed（86.2s）
  - `node scripts/run-ci-e2e.mjs --list` → **408 tests in 19 files**
  - CI（#178 与 main@5b738be 各跑一遍）→ Typecheck+Lint / Unit+Coverage / Production build / CodeQL / KB validation /
    **E2E 三浏览器（19m37s）全绿**；Vercel 那条是账号级构建限流，按既定口径不作判定依据
- 部署与线上抽查（GitHub Pages run 35858495572 success；真浏览器 1280×800 打生产域名）：
  - `meta app-version=0.5.31`、`data-candles=800`
  - **A11 可视时间范围条在线上真的出现了**：`09/23 10:21 — 09/23 12:14`
    （#176 的验收此前只有本地重建包 + 生产域名对照「元素数为 0」，这次升到生产域名「元素出现且是真实时间段」）
  - **四图十字光标**：hover 源格时四格 `data-crosshair-time` 全部等于 `1790165640`；指针移出后四格全部为 `null`
    —— 这正是 #177 的现场，而该钩子在 v0.5.30 的生产包里还不存在，当时无法验收
  - `/api/v3/ping` 请求数 **0**（#175 的线上确认：Pages 上那次必然 404 的探测已不再发出）、`pageerror` **0**
- 风险 / 回滚：本版含 `ChartView` 视角事件与多图广播的行为改动，回滚方式为 revert release 提交并重打 tag；
  无数据迁移、无设置快照变更（`version` 仍为 2）
- 下一项（已开工，待合并）：**PR #179 `test/audit-data-testid`**——零引用 `data-testid` 清点：
  74 个生产钩子从没被任何测试引用，24 个补真实断言、32 个删掉，并新增
  `scripts/__tests__/testid-usage.test.ts` 把「加了钩子没用例」变成 CI 变红条件
- 更新日：2026-09-23

**批次 v0.5.30 之后：图表视角状态三连修 + 多图联动首次可断言（2026-09-23，已定档为 v0.5.31）**
- 分支：`test/v05-quad-range-sync`；PR：**#176**（7 个提交，`94aa985`…`679c3fd`）；同批已合并的前置：
  - **#174 → main e2127ab** 窗口迁移改按「实际装载」判定，停在最新切周期后视野不再塌成 4~9 根
  - **#175 → main 47c6ce1** 静态托管构建期声明 `VITE_ENDPOINT_MODE=direct`，不再发一次必然落空的同源 `/api/v3/ping`
- 本 PR 做的事（一条规格牵出三个真实缺陷）：
  1. `e2e/multi-chart-sync.spec.ts`（新增，登记进 ci 清单）：四图拖一格 → 其余三格必须跟到同一段时间，
     且每格都得相对自己「动过」；落点必须直接命中 canvas（「更多」面板是浮层，开着它拖的是面板按钮）
  2. **修线上回归**：#174 作废了 `setData` 期间的陈旧可见区间通知，但没有替代品——lightweight-charts 只在区间
     「变化」时发事件，而 `fitContent/setVisibleRange` 常算出与当前值相同的区间，于是一条都不发。
     数据量低于 `CULL_THRESHOLD`（2000 根；真实首屏 1500 根）时之后再没有事件补上：A11 可视时间范围条
     **在生产域名完全不渲染**（真浏览器实测 35s 内元素数为 0）、pair/quad 视角广播零上报、`loadMore` 左缘判定拿不到视角。
     修法：`ChartApi` 新增只读 `visibleRange()`，整窗装载收尾主动读一次当前区间
  3. 补读第一版把「换片瞬间按旧切片间距算出的脏区间」喂给了窗口迁移决策 → A2 变成 3/3 稳定红
     （视角被甩到历史中段、「回到最新」常驻）。现在 `onVisibleRange` 收 `trusted` 参数：
     **只有图表自己的事件**决定窗口迁移与向左分页，补读只发布状态
  4. 测试基建：`scripts/serve-static.mjs` 在 `dist/knowledge/404.html` 缺失时 `readFileSync` 抛未捕获异常
     **把整个静态服务进程带下去**，之后每条用例都在 1.1s 内以 `ERR_CONNECTION_REFUSED` 失败——实测一次误红 100+ 条
  5. `e2e/stress-large-data.spec.ts`：新增「初始视角必须被装载窗口完整容纳」（x=10%/25%/50%/75% 逐点取十字光标）；
     拖动位移从 12×30px 收到 12×4px（视角现在真的铺满 3000 根，360px 甩动会越过首根进过滚空白区，红的是手势选错）
  6. webkit 收口：四图联动改按分钟比同一段（≤2 分钟）而不是逐字比文本——CI webkit 稳定报「动了 3/3，同段 3/4」，
     是布局取整让某一格差出一根；变异复验 `externalRange=null` → 红「跑偏 3/4」，容差吞不掉真断链
- 验证：
  - `npx vitest run` → **174 files / 1996 tests 全绿**；`tsc -b --noEmit` + `tsc -p tsconfig.e2e.json` 干净；`npm run lint` **0 error**（30 条既有 warning）
  - 本地全量 E2E（整个 `e2e/`：CI 清单 + localOnly 实时族，chromium，打在 `vite build && docs:build` 之后的完整 dist）→ **268 passed / 0 failed / 9.9m**
  - 变异检查（每轮都重新 `vite build` 再跑，静态服务器读盘上的 dist）：去掉补读 → 新增单测红；补读改回 `trusted=true` → 大屏压测「窗口必须容纳视角」红 + A2 红；`externalRange` 恒 null → 四图联动红
  - CI：Typecheck+Lint / Unit+Coverage / Production build / CodeQL / KB validation 全过；**E2E 三浏览器在 webkit 首红后已按上面第 6 条重推复跑**
  - 线上事实核对（GitHub Pages 生产域名，真浏览器）：`?perf` 关掉、真实 1500 根首屏下 `chart-visible-range` 元素数为 **0**（这就是第 2 条要修的现场）
- 已知噪音 / 风险：Vercel Hobby 构建限流是账号级的，与本批无关，按既定口径忽略；
  （A11 修复的线上验收已在 v0.5.31 部署后补做，见上面的发布记录：范围条出现 + 四图联动手势不超时）
- 下一项（当时）：`e2e/period-crosshair.spec.ts` 是 CI 里的**假绿**——把 `externalCrosshairTime` 恒置 null
  （多图十字光标完全关掉）它照样通过，因为 perf tick 本来就在改画布像素，指纹「有变化」是空的；
  需与四图规格同一套口径重写（关面板 + 断落点命中画布 + 换成不受重绘影响的信号）
  → **已做**：#177 重写该规格（改断 `data-crosshair-time` 的同步与移出清零），并顺带修掉它暴露的回流缺陷
- 更新日：2026-09-23

**里程碑 v0.5.30 发布完成（2026-09-23）**
- 版本号：**0.5.30**（package.json / package-lock 根两处 / index.html meta `app-version`）
- 分支：`release/v0.5.30`；发布 PR：**#170**（rebase 合并 → main **33209a9**，合并后即删远端分支）
- tag：**v0.5.30** @ 33209a9（Release Tag workflow run 35820799418 success；幂等，不覆盖旧 tag）
- 本版收录（批次主题：**三个「其实从来没在工作」的东西被抓出来**，每处补一条能在 CI 里红的检查）：
  - **#164 → main 1436eda** 现货品种不再显示另一市场的费率/标记价，也不再灌必然 400 的请求
  - **#165 → main 9ccb2b8** 「导出设置」从必抛 SyntaxError 的死按钮改成原始字符串逐字往返（快照 `version: 2`）
  - **#166 → main 1e4ab38** QuickOrder 市价分支第一次走上 E2E
  - **#167 → main e4404ad** 情绪面板关着就不轮询；四端点**同时** 400 才 latch
  - **#168 → main 0e77aa0** CI 的 E2E 清单收进 `e2e/ci-specs.json`，漏登记由 `scripts/__tests__/ci-specs.test.ts` 变红
  - **#169 → main 33ed83b** P4 更新横幅「点刷新 → 换文档 → 不再出现」闭环进 E2E
- 定档门禁（最终工作区 16ef24e，即 release 提交本身）：
  - `npm run precheck` → **All checks passed in 101.6s**
  - `npm test` → **1983 passed / 174 files**（v0.5.29 定档时 1960 条）
  - CI E2E 等价性：`node scripts/run-ci-e2e.mjs --list` → **396 tests in 17 files**（本批 +2 条用例 × 3 浏览器；清单搬家本身没改变跑什么）
  - 本地全量 chromium E2E（同一条 CI 清单，打定档构建）→ **131 passed / 1 flaky / 6.1m**。
    唯一 flaky 是 `period-anchor` A2 的 `back-to-latest` 计数：停在最新处切周期后按钮应缺席，
    实测 45s 内 93 次采样都拿到 1（重试即过）——**不是瞬时竞态而是稳定状态错**，值得单独查；
    与本批改动无关（不涉及时钟/周期/滚动），记为待收敛项而不是已修
  - 本地实时数据规格（CI 不跑的 13 条里的代表：`smoke` + `docs` + `market-tape`）→ **27 passed / 1.1m**：
    本批改了行情 hook 与信息条数据来源，只有这几条会碰真实币安
- 部署与线上抽查（GitHub Pages run 35820799404 success；真浏览器 1280×800 打线上）：
  - `meta app-version=0.5.30`、bundle 已换；最新价 86934.86、`data-candles=800`、徽标「合约」
  - **线上点「导出设置」真的出文件**：`kline-buty-settings.json`，`version=2`、55 个键、
    `lastVersion` 原样为 `"0.5.30"`（不带 JSON 引号）而 `symbol` 保留引号 —— #165 的验收从「本地构建」升到「生产域名」
  - 情绪面板关着等 11s：`/futures/data/*` **0 次请求**（#167；改前是每分钟 4 次）
  - 现货专属品种 `SHIBUSDT`：徽标「现货」、无资金费率行、最新价 `0.00000618` 全精度；
    premiumIndex/openInterest **各只 1 次 400 后就不再打**（正是 #164 设计的「探测一次然后 latch」），`pageerror` 0
  - 文档站 `/knowledge/` HTTP 200，标题 `Trading Knowledge Base`
  - 一条**已知噪音**记录在案：首页有一次 `https://<site>/api/v3/ping` 404 —— 这是 `detectMode()` 探测
    「同源反代 vs 直连」的探针，Pages 上必然 404 并回退直连（功能正常）。可优化为「构建期已知静态托管就跳过探测」，
    但必须保留 Vercel 反代场景的判定，属独立小改动
- 风险 / 回滚：
  - **唯一持久化格式变化**是设置快照文件编码 v1 → v2。存量用户不可能有 v1 导出文件（导出必崩），无需迁移；
    v2 导入器仍读 v1 文件。localStorage 的键与值格式一字未动
  - 行为面：`useSentiment(symbol, enabled=true)` 新增可选参数；现货专属品种信息条改为「没有费率 = 现货」，
    这是纠错不是降级
  - 回滚 = `git revert` release 提交 33209a9；若把 CI 清单退回 `ci.yml` 内联，账本第 5 条会红（有意：不许出现第二份清单）。
    远端 tag 误打用 `gh api` 删除，不移动已有 tag
- 下一里程碑：**v0.5.x 继续**。本轮明确排队项：
  1. PR **#171**（`docs.spec.ts` 提进 CI 清单）——用那次 CI 运行本身当提速/稳定性证据
  2. PR **#172**（README 三个门面数字校正：47 工具 / 29 指标 / 1983 单测 / 221 E2E 用例）
  3. `period-anchor` A2 的 `back-to-latest` 稳定态误判（本批全量里唯一一条 flake）
  4. 49 个 `data-testid` 零测试引用的逐条判定：`screenshot-share` 已抽查正常（回退下载），
     `market-refresh` / `mobile-text-*` 因探针定位写错**未判定**，`trade-history-*`、`storage-banner` 待查
  5. 静态托管下跳过 `/api/v3/ping` 探测（保留反代判定）
  6. 移动端要不要有设置快照入口（`MobileHeader` 收了 handler 但不渲染，注释写明「桌面端使用」）——需要产品决策
- 更新日：2026-09-23

**里程碑 v0.5.29 发布完成（2026-09-23）**
- 版本号：**0.5.29**（package.json / package-lock 根两处 / index.html meta `app-version`）
- 分支：`release/v0.5.29`；发布 PR：**#162**（rebase 合并 → main **0e4a318**，合并后即删远端分支）
- 本版收录：#157 就绪门改按 K 线根数、#158 47 工具全表契约、#159 Linux 基线生成 workflow、
  #160 基线入库 + visual 进 CI、#161 批次记录。**全部是测试与门禁侧**，运行时只新增一个只读
  DOM 属性（`data-candles`），用户可见行为零变化
- tag：Release Tag workflow 自动打 **tag v0.5.29** @ 0e4a318（run 35806529941，幂等不覆盖旧 tag）
- 定档门禁（最终工作区状态 069fabd，即 #161 合并后变基）：`npm run precheck` **All checks passed
  in 123.2s**；本地全量 chromium E2E **264 passed / 0 failed / 0 flaky，9.7m** —— 对照 v0.5.28
  定档时的 214 passed / 2 flaky / 1 failed：用例数 +50（新增 48 条工具契约），flaky 与 failed 归零
- 部署与 live 抽查：
  - Pages run 35806529949 success；首页 200、meta `app-version=0.5.29`、bundle 换成
    `assets/index-H42PeZ3p.js`
  - 真浏览器线上（1280×800）：就绪门属性实测 `data-candles=800`（≥60 即放行），选「垂直线」在
    容器右缘 x=1274 单击 → 画线 0→1 条（#153 的留白可画仍生效），`pageerror` **0**
  - Vercel 生产域 `kline-buty.vercel.app` 也已回到 0.5.29（PR 上的 Vercel 检查仍报账号级
    build-rate-limit，那是预览部署的配额；生产构建已追上，无需处理）
- 风险 / 回滚：**无迁移**——持久化结构未变（画线仍是 `{ id, type, points:[{time, price}] }`），
  设置项、快照、挂单/仓位字段都没动，`data-candles` 只是容器上的只读观测属性。
  回滚 = `git revert` release 提交 0e4a318；视觉基线那 4 张 linux PNG 与 CI 清单条目随之回退
  （清单 17 → 16）。远端 tag 误打用 `gh api` 删除，不移动已有 tag
- 下一里程碑：**v0.5.x 继续**。已排队的下一项：④ 的 CI 覆盖策略仍待成定论（把清单从 ci.yml 的
  硬编码字符串收成一个源，本地/CI 共用）；新发现一条真实浪费（现货品种每 30s 打必然 400 的
  合约端点，一次会话累积上千条 console error），见任务 #41

**v0.5.28 之后（v0.5.29 候补批次，2026-09-23）**
- 状态：**测试侧收口批次，未发版**；分支 `docs/v05-29-batch-record`（本文件），代码侧 #157/#158/#159/#160 全部合并，main **e6d8f8b**
- **#157 → main 6f2d108** `test(e2e)`：**图表就绪门改按 K 线根数把关**，一次挖平整族「画线偶发不生效」。
  定性过程：全量串行 10 轮复现 3 轮红，是**三条不同用例**（`射线:2220`、`平行通道:81`、`十字线:2444`），
  保留的 trace 截图给出同一画面——手势落下那一刻图上只有 1–2 根柱子、左侧榜单仍是骨架、
  可视范围标签首尾同值。根因：`waitCandlesRendered` 只判「画布有没有红绿像素」，首根 WS tick 先到即放行，
  而 adapter 在 `lastCandles.length < 2` 时换不出锚点时间（#153 里写明的约定），手势被正当丢弃 →
  `删除` 按钮 5s 内等不到。两个先前猜测被实测排除：① 工具同步竞态——选工具后容器 cursor 已是
  `crosshair`，18 次即时点击 0 次丢（含 8 进程占核）；② 浮层抢点击——十字光标浮层 `pointer-events: none`。
  - 改动：`ChartView` 容器输出 `data-candles`；就绪门 = 像素 **+** 根数 ≥60（102 处调用点、12 个规格同时受益）；
    新增 `e2e/chart-ready.spec.ts` 把 `klines` 压慢 6s 做**确定性复现**；`docs/agents/acceptance.md`
    写下就绪门约定与「CI 清单只收 `?perf` 规格」这条边界
  - 变异检查：阈值调回 0 → 红在「图表就绪后点击仍未落库」（即原 flake 本身）；去掉 `data-candles` →
    红在 `K 线根数未达 60 / Received: 0`
  - 复验：改前 10 轮 × 40 条 = 3 轮红；改后 10 轮 × 41 条 = **全绿**，轮时长 1.2–1.4m 未变（没有靠放慢换稳定）；
    发布 PR 侧 CI 三浏览器 **15m31s 全绿**
- **#158 → main ab040c8** `test(e2e)`：**画线工具全表契约规格**，CI 清单 15 → 16 条。
  `e2e/drawing-contract.spec.ts` 遍历选择器里的 47 个工具，用同一套手势驱动，断言落库锚点的数量、方向、
  有限性；数据走 `?perf=600`（离线确定性）、吸附关掉（锚点就是落点）。契约表**故意不引用**
  `requiredPoints`——手势与断言都以人写的表为准，代码改了锚点数/排序方向就会红；另有一条用例保证
  「选择器里每个工具都有契约条目」。
  - 首跑即定位到两处此前没人写下来的契约：`hchannel`/`pband`/`pricerange` 按**价格升序**落库
    （其余按时间升序、射线族保留点击顺序）；多段线靠 `pointerdown.detail >= 2` 收尾，而
    Playwright 合成点击的 `detail` 恒为 0
  - 变异检查三处：`fibext` 同时摘出 `requiredPoints` 与 `normalizePoints` 的三锚点分组 →
    `Expected: 1 / Received: 3`（每次点击自成一条线）；只摘 `normalizePoints` →
    `Expected length: 3 / Received length: 2`；`hchannel` 比较符反向 → `Expected: > 52639.19 / Received: 50137.46`
  - 本地 chromium 48 + webkit 48 连跑两次全绿（54.2s / 48.5s）；CI 三浏览器 **18m42s 全绿**
    （firefox 本机起不来，这套手势由 CI 首次吃到）
- **#159 → main 330c5f7** `test(e2e)`：`Visual baseline (Linux)` workflow（仅 `workflow_dispatch`）——
  在 ubuntu 上 `--update-snapshots` 生成 linux 基线，再**不带 update 复跑一遍**当确定性门禁，
  生成完就跑不过的基线不配入库。顺手修掉 `visual.spec.ts` 头注释里写错的基线目录
  （`e2e/__screenshots__/` → 实际的 `e2e/visual.spec.ts-snapshots/`）
- **#160 → main e6d8f8b** `test(e2e)`：run **35790398122** 两步全绿产出的 4 张 `*-chromium-linux.png`
  入库，CI 清单 16 → 17 条加入 `e2e/visual.spec.ts`。本地 darwin 侧基线未动、4/4 绿；
  本 PR 的 CI（三浏览器 job，run 35801793846 success）就是「ubuntu 上拿 linux 基线做真实比对」的验收
- 顺带量过一遍画线死区：容器 1015×687 上 11×8 网格逐点单击「水平线」，88 个点里只有右上角
  约 45×20px 不落线——那里是「当日高低」开关本体，点击归控件属于预期；副图（VOL 区 y 75%–97%）、
  右侧价格轴条、左缘与右缘留白全部可画，#153 之后没有新的静默死区
- 排队项结算：**⑤ 关闭并改判**（不是「多锚点连点被吞」，根因是就绪门，见 #157）；**⑥ 关闭**
  （移动端画完一条自动回只读是文档化预期：`commitDrawing` 的 `if (isMobile) setDrawingTool('none')`
  + `docs/agents/acceptance.md` 手动验收第 6 条，不是缺陷）；**③ 关闭**（#159 + #160）；
  **④ 部分闭合**（CI 15 → 17 条：47 工具契约 + 视觉回归；`smoke*` 仍留本地，原因与边界已写进
  `docs/agents/acceptance.md`）
- 下一里程碑：**v0.5.x 继续**。剩余排队项：④ 的 CI 覆盖策略仍需一次成定论的取舍（跑哪些实时规格、
  在哪些浏览器、可接受多少分钟），以及 v0.5.29 发版判定

**里程碑 v0.5.28 发布完成（2026-09-23）**
- 版本号：**0.5.28**（package.json / package-lock 根两处 / index.html meta `app-version`）
- 分支：`release/v0.5.28`；发布 PR：**#156**（rebase 合并 → main **53b7ed7**，合并后即删远端分支）
- 本版收录（v0.5.27 之后合并的批次，明细见下）：#151 单测超时预算、#152 e2e 纳入类型检查（含一条
  从未生效的 `expect.poll` 选项 → 空转断言）、**#153 留白里的画线点击不再被静默丢弃 + 拖拽起点不再用
  `0` 兜底**、#154 画线命中族最后两处固定像素
- tag：Release Tag workflow 自动打 **tag v0.5.28** @ 53b7ed7（run 35774975247，幂等不覆盖旧 tag）
- 定档门禁：`npm run precheck` **All checks passed in 92.8s**（typecheck 含 e2e 工程 / lint 0 error /
  `audit:i18n` / 单测 **1960**（172 files）/ 含 docs 站合并的完整构建）；
  本地全量 chromium E2E（复用该构建产物，`--retries=2`）**214 passed / 0 failed / 0 flaky，10.2m**
  ——对照 v0.5.27 定档时的 210 passed / 2 flaky / 1 failed，这次没有轮换红也没有需要重生成的视觉基线；
  发布 PR CI 三浏览器 E2E 一次通过
- 部署与 live 抽查（Pages run 35774975215 success @ 53b7ed7）：
  - 首页 200 且 meta `app-version=0.5.28`，bundle 换成 `assets/index-BGnsK3CB.js`
  - 真浏览器线上（1280×800）选「垂直线」→ 在右缘留白 x=1220 单击 → **落库 1 条**、
    overlay 竖线扫到 1217 列（点击列 ±3px）、`pageerror` 0：#153 的修复在线上生效
  - Vercel 侧仍是账号级 **build-rate-limit**（`upgradeToPro=build-rate-limit`，提示 24h 后重试），
    配额恢复的下一次构建自然追上；Pages 是主部署，不阻塞本版
- 风险 / 回滚：**数据结构未变**（画线仍是 `{ id, type, points:[{time, price}] }`，提醒/挂单/仓位字段
  未动），无迁移脚本。唯一的新取值域是「锚点时间可以晚于最新一根」：回滚到 0.5.27 后这些线读作
  `timeToCoordinate → null` 而静默不画，不报错、不影响其他线——用户视角是「那几条线消失了」，
  故回滚前提示用快照画廊导出画线。回滚 = `git revert` release 提交 53b7ed7；远端 tag 误打用 `gh api` 删除
- 同批文档 PR：**#155**（本文件「v0.5.27 之后」批次记录 + 本版发布记录）。其 CI 首跑红在
  `[webkit] period-anchor A2`（`点「回到最新」应让按钮消失`，45s 预算用尽），与 v0.5.27 发布 PR 上
  同名同点的那条一致；**重跑失败作业 → 15m24s 全绿**，其余七项首跑即绿。本 PR 只改 `docs/progress.md`，
  不含任何代码路径
- 下一里程碑：**v0.5.x 继续**，当时排队的 ③④⑤⑥ 结算见上一节（③⑤ 已闭合、⑥ 判定为文档化预期、④ 部分闭合）

**v0.5.27 之后（v0.5.28 候补批次，2026-09-23）**
- 版本号：**0.5.27**（package.json / package-lock 根两处 / index.html meta `app-version`）
- 分支：`release/v0.5.27`；发布 PR：**#148**（rebase 合并 → main **b7ea36d**，合并后即删远端分支）
- 本版收录（v0.5.26 之后合并的批次，明细见下）：#136 右键菜单价位收口、#139 提醒价按价段自适应、
  #140 画线与仓位图上标签、#142 持仓/toast/价格区间框、#144 低价标的档位补齐（四档）、
  #145 VOL-MA 图例缩写、#146 行情信息条 320px 换行；测试侧 #138 画线命中按当前像素 + 空转断言、
  #143 斐波那契时间线改跑 `?perf`；文档 #141/#147
- tag/release：Release Tag workflow 自动打 **tag v0.5.27** @ 28bee4d（run 35742211218，幂等不覆盖旧 tag）
- 定档门禁：`npm run precheck` **All checks passed in 198.1s**（typecheck / lint 0 error /
  audit:i18n / unit **1952**（172 files）/ 全量 build 含 docs 站合并）；
  本地全量 chromium E2E **210 passed / 2 flaky / 1 failed**（12.3m）——唯一红是移动端视觉基线，
  由 #146 换行导致整页下移 22px 超出 `maxDiffPixelRatio: 0.02`，按该规格自述的做法重生成
  （桌面三张基线未受影响、照常通过），重生成后连跑两次 4/4 绿；
  发布 PR CI 三浏览器 E2E 首跑 **1 红**（webkit `period-anchor` A2，`back` 应为 0 实到 1，
  初始 + 两次重试同红）——先排除自身：实测 CI 视口 1280×800 下信息条仍是单行
  （chromium 29px / webkit 27px、容器溢出 0），#146 未改桌面布局，且同内容在 #146 自己的
  PR 上 15m52s 全绿 → 判定 webkit runner 侧偶发，**重跑失败作业 → 15m15s 全绿后才合并**
- 部署与 live 抽查（Pages run 35742211206 success @ 28bee4d）：
  - 首页 200 且 meta `app-version=0.5.27`；`/knowledge/` 200
  - 线上 bundle 换成 `assets/index-CuIKYx4P.js`（574KB），产物内 grep 到四档阈值
    `>=1e3?2:e>=1?4:e>=1e-4?6:8`
  - 真浏览器线上 `?symbol=SHIBUSDT`：8 张 canvas、文档级横向溢出 0、现价 `0.00000596`，
    盘口档位 `0.00000596 / 0597 / 0598 / 0599` **逐档可区分**、价差 `0.00000001`（#144 生效），
    图例 `VOL-MA: 17236.00M` 已缩写（#145 生效，改前是 `1163738465.60` 这样的 10 位原始数字）
  - Vercel 侧仍是账号级 **build-rate-limit**：`kline-buty.vercel.app` 停在 0.5.26 产物
    （线上实测现价仍 `▲0.000006` 旧档位），等配额恢复的下一轮构建自然追上；Pages 是主部署，不阻塞
- 风险 / 回滚：本版全部是展示层格式化与一处 flex 布局，**持久化数据结构与下单口径未变**，
  无 DB / 迁移；回滚 = `git revert` release 提交（b7ea36d）与视觉基线提交（28bee4d），
  远端 tag 误打用 `gh api` 删除
- 下一里程碑：**v0.5.x 继续**。已排队的下一项：
  ① ~~`App.integration.test.tsx` 在 CPU 争用下 6 条同红~~ → **已闭合（#151 → main 79907c2）**；
  ② ~~`e2e/*.spec.ts` 不在 `tsconfig` 的 `include` 里~~ → **已闭合（#152 → main 463c965）**；
  ③ ~~视觉基线只在本地跑、CI 不覆盖~~ → **已闭合（#159 → main 330c5f7 + #160）**：linux 基线由
  手工 workflow 生成并当场复跑验证确定性，`visual.spec.ts` 已进 CI 清单；
  ④ `smoke*` 整族（含 40 条画线用例）不在 CI 清单里，测试侧改动 CI 不执行——**部分闭合**：
  CI 清单 15 → 17 条（#158 的 47 工具契约 + #160 的视觉回归），实时数据规格仍留本地，
  边界与原因已写进 `docs/agents/acceptance.md`「E2E 就绪门」一节；
  ⑤ ~~多锚点工具连点偶发吞点~~ → **已闭合并改判（#157 → main 6f2d108）**：不是连点被吞，
  是就绪门只看像素、手势落在了只有一两根柱子的图上；
  ⑥ ~~移动端画完一条后不重新选工具，第二下被吞~~ → **不是缺陷**：`commitDrawing` 里
  `if (isMobile) setDrawingTool('none')` 是文档化预期（`docs/agents/acceptance.md` 手动验收第 6 条
  「触屏创建 / 编辑 / 删除画线后自动回到只读模式」），且选择器会跟着退回「鼠标」给出可见反馈

**v0.5.27 之后（v0.5.28 候补批次，2026-09-23）**
- **#151 → main 79907c2** `test(unit)`：单测超时预算 5s → 15s。定性过程：本地 26 条同红时逐条读报错，
  100% 是 `Test timed out in 5000ms`、**零条断言失败**，且独占负载下 1952 全绿；两份全量套件并行 +
  8 个占核进程可稳定复现 → 判定为资源饥饿而非应用回归，所以改预算而不是加重试。取 15s ≈ 3× 降速余量，
  注释里写明复现方法与理由，避免后人把它当成又一次「flaky 就调大数字」
- **#152 → main 463c965** `test(e2e)`：把 `e2e/**` 纳入类型检查（新增 `tsconfig.e2e.json`，`typecheck`
  脚本变两段）。一次挖出 43 条从没被检查过的错误，其中**真 bug 一条**：`smoke.spec.ts` 里
  `expect.poll(fn, predicate, {timeout})` 用错签名——第三个参数被当成 `arg`，选项从未生效，于是该用例
  对伊城云带两个阈值的判断实际是空转。改写为把阈值判断放进被轮询的函数体里；变异检查：把阈值调到
  不可能满足，用例即红
- **#153 → main 65338aa + 6e0986b** `fix(chart)`：**留白里的画线点击不再静默失效**（task #36 的正身）。
  根因：`coordinateToTime` 对最新 K 线右侧留白（默认 `rightOffset: 6`，1280×800 实测约 56px）恒返回
  `null`，而 `onPointerDown` 的画线分支要求时间与价格都非空才 arm 手势，于是整条手势被丢弃且无任何提示。
  四处一起改：`anchorTimeInWhitespace`（留白像素 → 整根对齐时间；索引→像素是线性映射，用相邻两根的
  像素差求根宽）、`timeAtPixel`（按下 / 预览 / 编辑拖拽三处统一走它）、`project` 补算越界时间的列坐标
  （否则线提交了却画不出来，变成「画了但没有」）、`snapToCandle` 不再把留白时间吸附回首/末根
  （默认 ohlc 会把「画在未来」的落点拽回最新一根，实测差 50px）。第二个提交补上随之可达的拖拽路径：
  整线/锚点拖拽的起点原写 `time !== null ? Number(time) : 0`，起点换算失败时第一次 pointermove 的位移
  就是「当前时间戳 − 0」≈ 17.9 亿秒，表现为「一拖就消失」
  - 证据：插桩实测 x=1179 / 1218 / 1219 修复前 0 条画线（`down t=NULL`），修复后落在点击列；
    连续 6 点 1003/1063/1123/1163/1193/1215 → 渲染 1001/1065/1121/1161/1193/1217（全部 ±2px），
    跨数据区/留白边界根宽一致（≈7.5px/根）；选中留白里的线拖 40px → 时间 +5 根、线从 1217 列移到 1257 列；
    移动端 390×844 真触屏 x=134（数据区）与 314/326/332（留白）四次点击全部落库且留白时间更晚；
    **线上复核**（Pages 部署 main@6e0986b，`Deploy to GitHub Pages` success）：真浏览器打开
    `sun1090.github.io/kline-buty/`，数据区内 x=1083 → 竖线在 1081/1082，右缘留白 x=1220 → 新增一条、
    时间 `1790104260` 晚于前者 `1790103240`、竖线落在 1217/1218 —— 修复已在线上生效
  - 测试：单测 1952 → 1960（logic 5 + snap 3，逐条变异检查：`round`→`floor` 红 / 去根宽守卫红 /
    方向取反红 / 去吸附守卫红 2 条 / 边界写成 `>=` 红）；`drawing-semantics` 新增 2 条 E2E（右缘落线 +
    留白线可再选中拖动），**三处修复同时关掉 → `Received length: 1`（留白点击被丢），只关吸附与补算
    → `edgePixels=0`（线画到了别处）**；连跑三次 5/5 绿，`smoke-drawings` 40 条、相邻四条规格 44 条全绿
- **#154 → main b79ca03** `test(e2e)`：画线命中族收尾——`十字线`/`多段线` 是 05d4616 漏掉的最后两处
  「沿用创建时像素」，单独跑 3/3 绿、45 条全量串行出现过红（`删除` 等不到），与 #138 的安德鲁叉同成因。
  改现扫像素 + 先点空白取消选中；十字线另加「命中点须离锚点横向 ≤60px」，否则整幅宽的横线会让断言再次空转。
  本地 `smoke-drawings` 全量 `--retries=0` 连跑 6 次：这两条再没红过（改前同批全量出现过 2 条红），
  6 次里唯一一次红在 `斐波那契扩展`——当时归为排队项 ⑤ 的「多锚点连点被吞」，**该定性是错的**：
  #157 复现到同一族红来自就绪门只看像素（手势落在只有一两根柱子的图上），与像素漂移无关。
  注意 `smoke*` 不在 CI 清单里，本条改动 CI 不执行，证据全在本地（见排队项 ④）

**v0.5.27 批次明细（发布前逐条记录）**
- **#136 → main 95861ee** `fix(chart)`：右键菜单价位收口到展示精度。十字光标价格是像素反算的
  浮点尾数（`50766.61229625584`），复制/加提醒/挂限价单三个出口原样带走；改为 `setCtxMenu` 前
  经 `roundPricePrecise` 收口，并把 `fmtPricePrecise`/`fmtPriceLocale` 各写一遍的阈值抽成
  `pricePreciseDigits`。单测 1933 → 1940，三条新用例对应三个出口，撤掉收口即三条全红
- **#138 → main 05d4616** `test(e2e)`：画线命中族改按**当前渲染像素**定位（安德鲁叉隔离态 3/3 常红）。
  三条规矩一起立：坐标现扫（`findDrawnPixels`）、逐候选试到命中（`hitDrawnPixelUntil`，候选按离整体
  中心排序——文字标注的可点区在锚点，最左字形像素在容差外）、选工具后等面板收起（`pickDrawingTool`，
  面板 `position:absolute` 盖在图表上，63 处调用点统一）。**顺带修掉一条空转断言**：画线提交即选中态，
  「删除」一直亮着，所以「点线 → 删除出现」永远为真；现在先取消选中并断言面板收起，命中点下移 60px
  三条同时红才算数。全量 `smoke-drawings` 40 条 `--retries=0` 全绿
- **#139 → main 8d5f014** `fix(alerts)`：提醒价未指定 E10 精度时按价段自适应展示。字段注释写着
  「缺省按价段自适应」，实现却三处写死两位小数（提醒行/触发历史/站内横幅），低价标的整行塌成 `0.00`；
  新增 `fmtPriceWithPrecision`，存储层不动。单测 1940 → 1943，e2e 提醒用例补 0.000123 一条
- **#140 → main 56f3a5b** `fix(chart)`：画线与仓位的价格标签同根因的图表侧，14 处 `toFixed(2)` 换
  `fmtPricePrecise`（比例/百分比/斐波那契 level 不是价位，保持原样）。真实构建产物 + 真浏览器核对：
  XRP/USDT 现价 1.5223656145781868 的水平线标签读到 **`1.5224`**（改前 `1.52`）
- **#142 → main 401a8f9** `fix(ui)`：同一族里剩下的三个出口——持仓面板（入场/止盈/止损/强平 8 处）、
  成交与止盈止损 toast（含 `alertToast.triggeredPrice` 这条自查漏项）、价格区间框标签。
  单测 1943 → 1946，`position-liq` testid 落测
- **#143 → main a2df4c3** `test(e2e)`：斐波那契时间线的竖线计数从「实时行情 + ≥15 像素强列」阈值
  改为跑 `?perf=600` 合成数据——同一份代码在负载高时 7 条只扫到 6 条（本地约 1/8）。
  改完 10/10 次扫出同一组列位 `[200,321,396,456,516,602,712]`；把 `FIB_LEVELS` 去掉 `0.786` 重建后
  用例红在 `Expected length: 7 / Received length: 6`，说明断言仍然抓得住应用回归。
  顺带去掉切周期强制 fitContent 的 hack 与两处固定等待
- **#144 → main 17c3538** `fix(ui)`：价位 < 0.01 的标的（SHIB/PEPE/1000SATS）整列塌成 `0.00`——
  盘口 16 档、成交流、挂单价、深度图轴标、筹码分布、主图价格轴与 MA 图例全中。根因是展示档位缺最小档：
  `fmtPriceCompact` 对 <1 只给两位、`fmtPriceMedium`/`fmtAxisPrice` 只给四位，`pricePreciseDigits`
  的六位对 `0.00000598` 也只剩一位有效数字。补第四档（<1e-4 → 八位）、三个紧凑档改为共用同一套阈值，
  `QuickOrder` 的 `decimals` 与 `MarketList` 的本地阈值一并收口。0.0001 以上行为不变
  （#139 的 `0.000123` 用例仍绿）。单测 1946 → **1951**；变异检验把三个档改回旧值 → 6 条新用例全红，
  报错原文即缺陷（`expected '0.0020.020.0' to contain '0.00001234'`）；真浏览器 `?symbol=SHIBUSDT` 实测：
  桌面 1440 与 320×640 下盘口显示 `0.00000589…0.00000604`、价差 `0.00000001`，单元格无裁切、
  文档级横向溢出 0，深度图最长 SVG 标签右边缘 743 < viewBox 760。CI 三浏览器 E2E 15m18s 全绿后合并
- **#145 → main 67caa34** `fix(chart)`：`chart-indicator-last` 图例与十字光标 tooltip
  对副图线一律 `toFixed(2)`，而 VOL 副图的 `VOL-MA` 是成交量——线上实测同一行里
  `VOL: 2242.77M` 与 `VOL-MA: 1163738465.60` 并排。抽 `fmtSubLineValue` 按副图类型分派
  （volume 走 `fmtVolume`，KDJ/RSI/MACD 等小数值保持两位）。单测 1946 → 1947，
  helper 改回无条件 `toFixed(2)` 后新用例红在 `expected 'VOL: 12750.00M…' to contain 'VOL-MA: 12750.00M'`
- **#146 → main 8a72156** `fix(ui)`：行情信息条是 flex 行 + `overflowX: auto`、字段全
  `flexShrink: 0`，320px 下内容撑到 498px（容器溢出 **178px**）：最新价切在右边缘、
  ⚙（字段配置唯一入口）推到 `right: 480` 不滚动点不到，直接违反「移动端功能区域换行、
  不出现横向滚动条、320px 关键控件立即可见」。改 `flexWrap: wrap` + `gap: '4px 20px'`：
  320 下高 29 → 51px 折两行，1440 仍单行 29px。`recent-features` 补 320px 几何回归
  （容器无横向溢出 + 变高证明确实折行 + 两控件在视口内），改回旧样式重建后红在 `Received: 178`；
  该规格 25 条全绿，CI 三浏览器 E2E 15m52s 通过
- 线上抽查（#144 合并后，Pages run 35730825242 success）：Pages bundle 已换成
  `index-BO_I5MFp.js`，产物里 grep 到新的四档阈值 `>=1e3?2:e>=1?4:e>=1e-4?6:8`；真浏览器打开
  `?symbol=SHIBUSDT` 读到现价 `0.00000609`、盘口档位 `0.00000609 / 0610 / 0611 / 0612 …`
  逐档可区分、价差 `0.00000001`（改前整列 `0.00`），同一屏图例里 `VOL-MA: 1163738465.60`
  正好把 #145 要修的缺陷也拍到了
- Vercel 侧仍是构建限流：线上 `kline-buty.vercel.app` 的现价还停在 `▲0.000006`（旧档位），
  等配额恢复的下一轮构建自然追上；Pages 是主部署，不阻塞
- 部署状态：main CI（含三浏览器 E2E）**15m47s success**、Pages success、线上 bundle 已换成
  `index-CTJTU6hj.js`、`/knowledge/` 200；Vercel 仍是账号级 **build-rate-limit**（`retry in 24 hours`，
  同一天 #139 那轮自己就通过了、#144 这轮也通过了）——非必需检查、不阻塞合并，按既定判断忽略
- 本轮 CI 的一次真实红：#140 首跑 webkit 两条红（A2 flaky 后恢复 + `alerts-features` E6 报
  `page.reload: WebKit encountered an internal error` 浏览器进程崩）。判定为 runner 侧偶发，
  重跑失败作业 → 15m4s 全绿后才合并，没有靠重跑掩盖断言
- **更正一条既有遗留记录**：v0.5.24 记的「`?perf` 模式文档级横向溢出 139px（`chart-indicator-last`
  图例宽度所致）」经实测不成立——合成数据成交量只有 116，改前该位置就是 `VOL-MA: 116.00`，
  320px 下 `?perf` 与真实行情的 `scrollWidth - innerWidth` 都是 0。真正的横向溢出在行情信息条
  （容器级 178px，见 #146），与图例无关

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
  - 真实 bundle ✅ `assets/index-Dl7VHveG.js`（574KB）含本版新文案：随单 / 止盈价 / 隐含盈亏比 / 杠杆，
    以及 `qo-tp` / `qo-sl` / `qo-leverage` / `qo-rr` 四个新 testid
  - 真浏览器抽查 ✅ 线上首页 8 张 canvas、实时价 85539.08 在走；右键「挂限价买入」打开的下单面板
    落在限价态、杠杆默认 10（可选 1/2/5/10/20/50/100）、填入 +3% / −2% 价位后显示「隐含盈亏比 1.50 : 1」
  - 同一轮抽查顺手抓到 **#136 的现场证据**：预填价格框是 `85413.83052287581`——
    菜单上「复制价格 85413.83」是展示值，交给面板的却是像素反算的全精度浮点
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
- 已知遗留（不阻塞发布）：~~`?perf` 压测模式下文档级横向溢出 139px（`chart-indicator-last` 图例宽度所致，
  真实行情模式为 0）~~ **v0.5.27 实测归因有误**：`?perf` 与真实行情在 320px 的文档级溢出都是 0，
  图例不是溢出源；真正的横向滚动在行情信息条容器（178px，见「当前阶段」#146）；
  限价单跨价差成交仍按挂单（Maker）费率计费——交易所会把这类判为 Taker，
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