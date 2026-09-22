# 变更日志（CHANGELOG）

> 按版本与阶段记录主要功能交付。提交均出自 `sun1090`（无 AI 署名）。
> 完整提交历史见 `git log`；阶段任务明细见 `docs/04-排期计划.md`、`docs/06-开发任务清单.md`、`docs/07-P3P4-任务清单.md`、`docs/13-下一版本任务清单.md`。

## [v0.5.27] 价格读数精度收口 + 断言真正承重（2026-09-22）

v0.5.26 发布后的批次，两条主线。第一条是**同一个价位在九个出口各写一遍自己的小数位**：
十字光标读数带着像素反算的浮点尾数外泄，低价标的（SHIB / PEPE / 1000SATS 这一级）
则整列塌成 `0.00`。第二条是**测试在骗自己**：画线命中的坐标写死在创建那一刻，
「点线 → 删除出现」是一条永远为真的断言。

- **十字光标读数不再外泄浮点尾数**：`50766.61229625584` 这样的价格是像素反算出来的，
  右键菜单的复制 / 加提醒 / 挂限价单三个出口原样带走。改为进菜单前先经 `roundPricePrecise`
  收口到展示精度，并把 `fmtPricePrecise` 与 `fmtPriceLocale` 各写一遍的阈值抽成
  `pricePreciseDigits` 单一来源
- **提醒价未指定精度时按价段自适应**：字段注释写着「缺省按价段自适应」，实现却三处写死两位
  小数（提醒行 / 触发历史 / 站内横幅），低价标的整行塌成 `0.00`。新增 `fmtPriceWithPrecision`：
  给了小数位就照它，没给按价段走——存储层不动，只改展示
- **图上与面板里的价位标签**：画线标签、仓位入场/止盈/止损/强平价、成交与止盈止损 toast、
  价格区间框标签，共 20 余处 `toFixed(2)` 换成按价段自适应（斐波那契 level、比例、百分比
  不是价位，保持原样）
- **低价标的补齐最小档**：`fmtPriceCompact`（盘口档位 / 成交流 / 挂单价 / 深度图）对 <1 只给
  两位小数，`fmtPriceMedium`（自选列表 / 筹码轴标）与 `fmtAxisPrice`（主图价格轴）只给四位，
  而 `pricePreciseDigits` 的六位对 `0.00000598` 也只剩一位有效数字——SHIBUSDT 的 16 档盘口
  因此全是 `0.00`、价差也是 `0.00`。档位扩到四档（`≥1000 两位 / ≥1 四位 / ≥1e-4 六位 / 更小八位`），
  三个紧凑档改为复用同一套阈值，快速下单的 `decimals` 与行情列表的本地阈值一并收口。
  **0.0001 以上的展示完全不变**
- **VOL 副图均量线走成交量缩写**：图例里 `VOL: 2242.77M` 与 `VOL-MA: 1163738465.60` 并排，
  同一个量两套读法。副图线取值展示按类型分派，volume 走缩写、其余小数值保持两位
- **修复：行情信息条 320px 下横向滚动**：信息条是 flex 行 + `overflowX:auto`、字段全
  `flexShrink:0`，320px 下内容撑到 498px（容器溢出 178px）——最新价切在右边缘，
  ⚙（字段配置的唯一入口）推到视口外，不滚动根本点不到。改为换行：窄屏两行、宽屏仍单行
- **画线命中用例改按当前渲染像素定位**：安德鲁叉从「全量连跑偶发红」恶化成隔离态 3/3 常红，
  同一条用例在平静行情下又 5/5 绿——命中点写死成创建那一刻的像素，能否压线取决于这期间
  价格刻度有没有被行情刷新。三条规矩一起立：坐标现扫、逐候选试到命中（候选按离整体中心的
  距离排序，文字标注的可点区在锚点而不是最左字形）、选工具后等面板收起（63 处调用点统一）。
  **顺带修掉一条空转断言**：画线提交即选中态，「删除」一直亮着，所以「点线 → 删除出现」永远为真
- **斐波那契时间线几何用例改跑 `?perf` 合成数据**：「≥15 像素强列」的阈值在负载高时
  7 条只扫到 6 条（本地约 1/8）。换成合成盘口后 10/10 次扫出同一组列位，顺带去掉
  切周期强制 `fitContent` 的 hack 与两处固定等待
- **测试与门禁**：单测 1933 → **1952**（172 files）
- 本批每条新断言都做了变异校验：撤掉右键菜单的收口 → 三条出口用例同时红；三个紧凑档改回旧
  阈值 → 6 条红，报错原文就是缺陷本身（`expected '0.0020.020.0' to contain '0.00001234'`
  是整列 `0.00` 的盘口行）；helper 改回无条件 `toFixed(2)` → 红在
  `expected 'VOL: 12750.00M…' to contain 'VOL-MA: 12750.00M'`；信息条改回 `overflowX:auto`
  重建 → 红在容器溢出 `Received: 178`；画线命中点整体下移 60px → 三条同时红；
  `FIB_LEVELS` 去掉 `0.786` → 红在 `Expected length: 7 / Received length: 6`
- 线上抽查：Pages 产物 grep 到四档阈值，真浏览器 `?symbol=SHIBUSDT` 读到盘口档位
  `0.00000609 / 0610 / 0611 / 0612 …` 逐档可区分、价差 `0.00000001`（改前整列 `0.00`）
- 回滚：`git revert` 本次 release 提交；远端 tag 误打用 `gh api` 删除；无 DB / 迁移

## [v0.5.26] 挂单随单保护 + 快速下单口径补齐（2026-09-22）

v0.5.25 发布后的批次。主线是一件事：**限价挂单成交的那一刻，人往往不在屏幕前**——所以保护线、
杠杆口径、风险反馈都必须跟着单子一起走，而不是等用户回来手动补。

- **挂单附带止盈/止损**：下单面板多两行可选价位，随单排队、成交那一刻直接写进新开仓位。
  入单即校验「站在挂单价的正确一侧」（买单止盈更高、止损更低，卖单反之；**相等按不成立**，
  那条线会在成交一瞬即触发，是误输入不是策略），不成立则整单被拒而不是静默丢掉保护线。
  持久化对不可信存量数据分两种处理：两价之一越界 → 整对摘掉但**保住单子**；某条字段本身坏了 →
  只丢那一条；老数据缺字段按未附带还原。改价后逐条复检，只摘不再成立的那条。
  成交前再按**成交价**复检（`levelsAtFill`）：成交价可能优于挂单价（价格改善），
  站错一侧的线不写进持仓，否则会造出「止损卡在开仓价之上」这种持仓编辑器自己都拒绝的仓
- **快速下单携带杠杆**：此前市价直开与限价成交两条路径都不写 `Position.leverage`，
  挂单成交出来的仓位按 1x 全额口径显示保证金率、连强平价都不给，而同一品种手动开仓默认 10x——
  同一个下单动作两套口径。现在面板有杠杆选择器（默认与手动表单一致 10x），随单透传到成交仓位；
  `LEVERAGE_OPTIONS` / `DEFAULT_LEVERAGE` 提到 `src/position/pnl.ts` 供两处共用。
  杠杆只影响展示口径，余额承接仍按全额名义金额 + 手续费判定（未引入强平模拟）
- **隐含盈亏比**：两条随单价位都成立时，预估区给出 `隐含盈亏比 R : 1`——复用图上 RR 画线的
  `riskRewardRatio`，不另写一套算法。只填一条不显示（谈不上风险回报），校验未过也不显示
  （否则会给出了一个看着合理、实则方向反了的比值）
- **修复：快速下单面板 320px 下被裁出屏幕**：面板是 `absolute + right:16` 的 shrink-to-fit，
  宽度按最宽一行的 max-content 撑到 375px、左边界 −71，「价格/数量」标签整列跑到屏幕外，
  只剩两个没有说明的输入框。三行按钮允许换行 + 面板按包含块限宽；实测**只留限宽仍越界 14px**，
  两者缺一不可
- **修复：`?perf` 压测模式的「不联网」契约补齐**：合成盘口档位（`src/data/syntheticDepth.ts`）
  让订单簿在压测模式下有确定性数据，并停掉预取真实历史——此前 perf 模式仍会发出对外请求
- **测试与门禁**：单测 1902 → **1933**（172 files）。把 5952 行的 `e2e/smoke.spec.ts` 按域拆成
  冒烟 / 画线 / 盘口深度 / 移动端四份 + `e2e/helpers/smoke.ts` 共享辅助，**87 个用例标题逐条 diff
  确认无增删改**；拆分当场抓出两条从 v0.5.21 起一直红着、却因 smoke 不在 CI 清单而无人看见的用例
  （`locator('input').last()` 被面板新增的「自定义%」输入框顶掉了目标）。另补 320px 改价编辑器回归、
  挂单随单价位与杠杆的端到端用例
- 本批每条新断言都做了变异校验：撤掉编辑器 `flexWrap` → 320px 用例**先仍绿**（控件只是被压扁、
  并不溢出），补上「控件排成 ≥2 行」断言后才真正承重；去掉 attach 写入 → E2E 精确只红附带那一例
  （`takeProfit 76077.69 ≠ 52240.02`）；`levelsAtFill` 边界改成严格不等 → 单测红；
  存量复检取消 / 加仓也覆盖价位线 → 各 1–2 红；面板去掉 `attachOk` 闸门 → 单测红；
  不渲染盈亏比或忽略校验闸门 → 组件用例红
- 已知遗留（不阻塞发布）：`period-anchor` A2 与画线命中族在本地全量连跑时各有一次重试即绿的时序抖动
  （预算已在 #131 修成盖得住自己声明的每步上限之和）；图表右键预填的挂单价显示完整浮点位
  （50766.61229625584 这类），纯观感问题；marketable 即时成交仍不计滑点（沿用既有简化）

## [v0.5.25] 持仓加减仓 + 挂单改价 + 费率口径纠偏（2026-09-22）

v0.5.24 发布后的批次：把持仓管理补成完整生命周期（开仓 → 减仓 → 加仓 → 平仓），给限价挂单加上交易所同级的「改价」，并纠偏两处与真实撮合口径不符的地方。

- **部分平仓（减仓）**：每个持仓行在「全平」之后新增「减仓」，展开给 25/50/75% 三档与一个数量格（默认预填一半），
  按现价结算减掉的那一份——流水记一条 `close`（qty 为减仓量、pnl 为该部分价差、手续费按 taker 费率），
  剩余仓位**沿用原开仓价与止盈/止损/移动止损设置**，已推进的移动止损线不丢；减到全量等价于全平，走既有显式平仓路径不重复记账。
  纯函数层新增 `planReduce`（数量非法或超过持仓量返回 null，浮点尘按容差放行），面板与 App 双重校验，非法输入只在面板内提示、不写库
- **挂单改价**：挂单列表每行新增「改价」，展开预填该单挂价与数量，确认即替换这一条——`id / 品种 / 方向 / 入单时刻` 不变，
  同价多条的 FIFO 顺位不会因为改了一次价而跳队；数值非法或该单已被撮合撤销时行内报错、列表与存储都不动。
  改价同时按**当下最新价**重算跨价差归属：把买单抬过现价，这单从改价起就在吃单，费率随之从 Maker 切到 Taker
- **修复：同方向再开仓不再吞掉旧仓**——仓位面板的「开仓」原先直接覆盖对应槽位，已持 0.002 多单再开 0.001 会让旧仓连同盈亏凭空消失、
  且不记任何平仓流水；`applyOrder` 的合并分支又会按新均价 `suggestLevels` 重算止盈/止损，把用户行内编辑、图上拖拽设定的线和已推进的移动止损抹回默认值。
  现在合并规则收在 `mergePosition`：数量相加、开仓价加权，价位线与杠杆沿用既有持仓，只有新开槽位才给百分比参考价
- **修复：下单即跨过价差的限价单按 Taker 计费**——此前一律按挂单（Maker）费率记账，与交易所口径不符：
  挂价已越过最新价的单（marketable limit）从提交那刻就在吃单。`PendingOrder` 新增 `marketable` 标记（入单时按当时最新价判定，
  贴价与缺价按未跨计；持久化原样还原、重载不改判），撮合与记账按该标记取费率，余额承接判定也按各自手续费累计；
  下单浮层的费用预估同步切换。仍留的简化：即时成交不计滑点
- **修复：图表指标信息条超宽换行**——均线周期多时（7 条 + EMA 叠加 + VOL）末尾值信息条按单行排布会宽过图表容器，
  把文档顶出 100 多像素横向滚动；限宽为图表宽度并允许换行
- **文案**：`trade.limitHint` 仍写「触达即按挂单价成交」，实际口径已是「按当时最新价成交、优于挂单价时给价格改善」，五语同步
- **测试与门禁**：单测 1862 → **1902**（172 files）；`?perf` 确定性 E2E 清单补上 `limit-orders` / `tpsl-guard` / `partial-close`；
  新增 `partial-close`（4 例）与改价（2 例）、加仓保留价位线（1 例）、信息条换行（1 例）等规格；
  修掉冒烟里持仓行按钮数变化导致的 strict mode violation、榜单前缀选择器计数虚高，以及移动端触摸用例的两处不稳定
  （逐个手势开关触摸模拟会静默丢事件；价格区间框在窄屏被拖窄后横向边凑不满像素行阈值）
- 本批每条新断言都做了变异校验：去掉「减到空=全平」分流 → App 2 红；面板绕过数量校验 → 2 红；
  `applyOrder` 换回按新均价重算价位线 → 单测 2 红；面板换回覆盖写槽位 → E2E 红；
  App 去掉 `marketPrice` → E2E 2 红而「挂在盘口的单」仍绿；改价不重算费率归属 → E2E 费率断言红 + 单测 2 红；
  信息条换行用例在未修复构建上首条断言即红

## [v0.5.24] 持仓止盈止损可编辑 + 移动止损（2026-09-22）

v0.5.23 发布后的批次：让已开仓位也能改止盈/止损，并让止损跟着行情走，与刚补全的触价结算链路闭环。

- **行内编辑器**：仓位面板每个持仓行新增「止盈/止损」开关，以现值预填两条价位、留空即清除该线；
  一键**保本止损**把止损推到开仓价（保留止盈与数量），多空各自独立展开、互不影响
- **校验**：多头要求止盈 ≥ 开仓价 ≥ 止损、空头方向相反；两线重合报「不能重合」，
  非正数/非有限数报「非法」——失败时面板内提示错误且不写回。止损的上界取
  「开仓价与现价中的较有利者」，因此移动止损推进后的止损价可以被存回去
- **移动止损 `trailPct`**：编辑器第三格填百分比（留空即关闭该档），持仓行显示「移动止损 t%」徽标。
  每次价格刷新把止损朝有利方向推进到距现价 t% 的位置，**价格回落时不回撤**；
  回落到推进后的止损线即按既有口径结算一次。实现分两步且互不越界：
  `planTpSlExits` 只认持仓上的存值止损，`planTrailMoves` 负责把推进后的线写回状态
  （同一轮已命中的槽位不再写回），写回值随 `positionsBySymbol` 持久化——
  图表上的止损线因此自己会跟着走
- **结算链路合并**：原先「当前图表品种的 K 线级结算」与「跨品种守护」两条路径各写一遍判定与记账，
  现统一为 `usePositionSettlement` 一条链路（当前品种取 K 线最新价、其他品种取 30s 轮询价），
  `autoSettled` WeakSet + claim key 双保险，避免与显式平仓簿记重复记账
- 纯函数层新增 `src/position/levels.ts`（`parseLevel` / `parseTrail` / `applyLevels` /
  `levelsOrdered` / `effectiveStopLoss` / `breakevenStop`，均不改入参）与
  `src/trade/tpsl.ts`（`planTpSlExits` / `planTrailMoves`）
- 五语 i18n 新增 `position.levels/levelBreakeven/levelClearHint/levelErrInvalid/levelErrCrossed/levelTrail/levelTrailHint`
- 修复（开发过程中）：价位编辑器加入第三格后，320px 下三个输入被挤到视口外并撑出横向滚动
  （违反「移动端功能区换行、不得横向滚动」）→ 改用 `grid auto-fit`，窄屏每格独占一行
- **修复：限价单跨过价差时按挂单价成交** — 结算链路诚实化之后暴露出这个问题：市价 50,700 时挂 60,800
  买入单会以 60,800 成交，默认止损（开仓价 −2%）立刻被击穿，刚开的仓当场以亏损平掉。
  现在撮合按交易所口径给价格改善：买单价高于市场价即按市场价成交（卖单镜像），
  名义金额、手续费、余额承接判定与持仓开仓价全部改用成交价；
  纯函数层新增 `fillPrice`，`planFills` 接受成交价取值函数（默认仍为挂单价）
- **修复：图上拖拽止盈/止损线走同一套价位校验** — 拖价位线此前把指针价直接写进持仓、不做校验，
  可以把多头止盈拖到开仓价之下、把两条线拖成交叉，这笔仓就会在下一次触价时按错线结算掉。
  现在与面板行内编辑共用 `validateLevels`（新增 `dragLevel`，越界/交叉/非法价一律拒绝），
  拖拽回调可返回夹紧价或 null——返回 null 时线停在原位，表现为「拖到边界就停住」
  （纯函数侧新增 `acceptDragPrice` 承接这条裁定；拖开仓价的行为保持向后兼容）
- **修复：顶栏层级低于停靠面板** — 面板（仓位/流水/提醒/指标设置/钉选/性能）都是 `z-index: 100`，
  头部层只有 95：面板打开时再展开顶栏 More，下拉下半部分正落在面板之上，
  点击被面板里的「开仓」按钮吃掉（`limit-orders` E2E 表现为 60s 超时）。
  头部的层根抬到 **130**——仍低于快捷键帮助 999 / 快捷设置 1000 / StatsBar 弹层 1200 / 模态 2000，
  层序恢复为「顶栏 > 停靠面板 > 图表内容」
- 测试：单测 1796 → **1862**（价位编辑与移动止损纯函数、结算 hook、面板编辑器、App 集成、
  撮合成交价、价位线拖拽校验），E2E `tpsl-guard` 五条：改止盈价到现价下方即结算、
  面板设 t% 后回落结算一次、320px 窄屏三格输入换行且面板不横向滚动；
  另新增层叠回归用例（`elementFromPoint` 直接断言菜单项在最上层）

## [v0.5.23] 成交明细筛选 + 图表右键挂单 + 跨品种止盈止损（2026-09-22）

v0.5.22 发布后的特性批次：给刚落地的 Time & Sales 面板补上交易所同级的筛选能力，把限价挂单入口搬到图表上，并补齐模拟盘的止盈止损结算覆盖。

- **Tape 筛选行**：方向（全部 / 主动买 / 主动卖）+ 大单档循环（关 → ×5 → ×10）；
  大单口径为「数量 ≥ 窗口均值 × 倍数」，与方向叠加过滤，用于盯大单/单边吃单
- 筛选后无命中展示「无符合筛选的成交」空态（与首载骨架屏区分）；头部买卖笔数仍统计整个窗口
- 纯函数层新增 `filterTape` / `avgTradeQty` / `TAPE_BIG_STEPS` / `TAPE_FILTER_DEFAULT`；
  五语 i18n 新增 `tape.filterAll/filterBuy/filterSell/filterSideHint/bigOrder/bigOrderHint/emptyFilter`
- 测试：单测 +6（均值 / 方向 / 阈值 / 组件筛选与档位循环），E2E market-tape 新增筛选控件用例
- 验证：typecheck / lint 0 error / audit:i18n / unit **1780** / chromium E2E market-tape 4 例
- **图表右键挂限价单**：右键菜单新增「挂限价买入/卖出」，直接以点击处的价位开单——
  快捷下单面板以限价模式打开并预填该价，确认后进入 v0.5.22 已有的挂单队列（触价按挂单价成交）；
  `QuickOrder` 增 `initialType`，App 以 `chart-request-limit-order` 事件接线并对非法载荷免疫；
  五语 i18n 新增 `ctx.limitBuy/ctx.limitSell`
- 测试：右键入口单测 +3（`initialType` 预设、事件 → 挂单入队、非法事件不弹面板），
  E2E limit-orders 新增右键用例（按现价另一侧选方向以确保挂起）
- **跨品种止盈止损守护**：切走图表后，其他品种的持仓不再「失明」——按 30s 轮询最新价判定止盈/止损，
  命中即以该价反向平仓结算（净额入交易流水、清空对应槽位）并弹站内横幅，多笔命中合并提示；
  当前图表品种仍由 K 线级结算负责，守护不接管。纯函数层新增 `planTpSlExits` + hook `useTpSlGuard`，
  挂单撮合与守护共用一份 `useSymbolPrices` 价源（少一次请求）；`?perf` 压测无价源时自然静默，不违反不联网契约；
  五语 i18n 新增 `trade.tpslToast/tpslToastMulti/tpWord/slWord`
- 测试：单测 +13（判定纯函数 6、守护 hook 5、App 接线 2），E2E 新增 `tpsl-guard` 两条
  （当前品种只结算一次、压测模式下其他品种保持挂账）
- **修复：止盈止损此前只在「持仓翻转 / 切换品种」时才检查**——结算 effect 的依赖里没有最新价，
  静止持仓即使行情触价也不结算；改为最新收盘价进依赖后立即触发，并用持仓对象身份去重，
  避免结算写回再次触发 effect 造成同一笔持仓重复记账
- **E2E 稳定性**：A1 周期边界的 canvas 渲染判据改取主题涨跌色（旧判据的涨色条件与 `--up` 脱节，
  实际只认跌色像素，可视窗口全涨时整帧判空）；限价单用例先收起「交易流水」浮层，
  它此前会遮挡侧栏盘口买入按钮并把用例拖到 60s 测试级超时
- 批次对应 PR：#102 成交明细筛选、#105 图表右键挂限价单、#107 止盈止损结算覆盖（含 #104 发布记录、#106 渲染判据加固）
- 本版门禁：typecheck / lint 0 error / audit:i18n / unit **1796**（170 files）/ 全量 build / 三浏览器 E2E

## [v0.5.22] 成交明细 Tape + 模拟盘限价挂单 + 提醒列表筛选（2026-09-22）

I3（云同步）/ I11（移动端 Widget）两项外部能力暂缓；本地先行的三个特性批次积累后一并发布。

- **提醒面板·列表筛选**（#96）：新增方向（≥ / ≤）与状态（全部/待触发/已触发/已过期）过滤，
  联动列表与批量「全选」；`visibleAlerts` memo 稳定引用；五语 i18n `alert.filter/filterAll/filterActive`
- **侧栏「成交明细」面板（Time & Sales）**（#98）：现货 `/api/v3/trades` 逐笔成交 5s 轮询累积
  （交易对仅存在于永续时回退 `/fapi/v1/trades`），按成交 id 去重（窗口 60 笔 / 渲染 20 行）、
  主动买卖着色 + 笔数汇总、点击行联动主图标记线；参与 F16 侧栏顺序换位与 F18 布局快照；
  `?perf` 压测模式禁止真实 REST；纯函数层 `src/data/trades.ts` + `useRecentTrades`
- **模拟盘限价挂单（Maker 单）**（#99）：快速下单上市价/限价两档，限价单进挂单队列、价格触达即按**挂单价**成交
  （无滑点、按挂单费率计费），跨品种撮合（当前图表品种 tick 级 + 其他品种 30s 批量 ticker），
  余额承接不下按 FIFO 撤销，同品种上限 10 条 / 全局 50 条；持仓面板新增「当前挂单」列表
  （撤销 + 点行切品种 + localStorage 清洗）；补齐 D5 挂单费率设置项；`src/trade/pending.ts` +
  `usePendingOrders` / `useSymbolPrices` / `useLimitOrderFills`
- 附带修复：`DrawingLayers` I15 导入两条用例的固定 20ms sleep 改为 `waitFor`，消除全量并发跑的偶发失败
- 验证：typecheck / lint 0 error / audit:i18n / unit **1774**（较 v0.5.21 的 1713：提醒筛选 +3、成交明细 +20、限价挂单 +38） /
  E2E recent-features + alerts-features + market-tape + limit-orders

## [v0.5.21] 交易流水导出筛选 + 自定义百分比仓位（2026-09-21）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **交易流水·导出当前筛选结果**：CSV 导出改为导出当前筛选视图（品种/方向/关键词过滤后），
  `onExport` 携带筛选子集；组件测试 +1
- **QuickOrder·自定义百分比仓位**：仓位预设行新增「自定义%」输入 + 应用（余额 × pct ÷（价 ×(1+费率)）），
  五语 i18n 新增 `quickOrder.customPct/apply`；组件测试 +2
- 验证：typecheck / lint 0 error / audit:i18n / unit **1713** / E2E recent-features 22/22

## [v0.5.20] 提醒清理已过期（2026-09-21）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **提醒面板·一键清理已过期**：批量操作行新增「清理已过期 (N)」按钮（`alert-clear-expired`），
  有到期失效提醒时显示并一键移除（E6 到期收尾）；五语 i18n 新增 `alert.clearExpired`；
  组件测试 +2（仅移除过期项 / 无过期不显示），E6 徽标断言限定 alert-row 避免文案匹配冲突
- 验证：typecheck / lint 0 error / audit:i18n / unit **1710** / E2E recent-features 22/22

## [v0.5.19] 资金费率结算倒计时（2026-09-20）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **行情信息条·资金费率结算倒计时**：资金费率行追加距下次结算倒计时（`funding-countdown`，
  复用已有 `formatRemaining` 与 1s 计时器，`nextFundingTime` 为既有拉取数据此前未展示）；
  五语 i18n 新增 `stats.fundingNext`；组件测试 +2（mm:ss 显示 / 无 nextFundingTime 不渲染）
- 验证：typecheck / lint 0 error / audit:i18n / unit **1708** / E2E recent-features 22/22

## [v0.5.18] 盘口买卖失衡（2026-09-20）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **盘口买卖失衡指示**：订单簿头部新增买/卖占总量的百分比徽标（`ob-imbalance`），
  一眼识别买方/卖方压力；`src/depth/orderbook.ts` 纯函数 `depthImbalance`（前 limit 档量差/总量，∈[-1,1]）
  + 单测 +5；OrderBook 徽标随聚合精度/档位联动；无盘口显占位；五语 i18n 新增
  `orderBook.bid/ask/imbalance`；组件测试 +2
- 验证：typecheck / lint 0 error / audit:i18n / unit **1706** / E2E recent-features 22/22

## [v0.5.17] 自选行情面板增强（2026-09-20）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **自选价格实时面板（PinnedPanel）增强**：补齐缺失的 24h 涨跌幅显示（涨绿/跌红）；
  新增当前品种高亮（accent 左框 + 淡蓝背景，`activeSymbol`）；新增排序切换
  （按价格 / 按涨跌，降序，`pinned-sort`）；五语 i18n 新增 `pinned.sortBy/sortPrice/sortChange`；
  单测 +3、E2E 不变
- 验证：typecheck / lint 0 error / audit:i18n / unit **1699** / E2E recent-features 22/22

## [v0.5.16] 行情列表排序/视图持久化（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **行情列表·排序与视图持久化**：排序键/方向（`marketSort`）与视图 tab（全部/自选/榜单，`marketView`）
  经 localStorage 持久化，刷新后恢复；`useTickerList`/`MarketList` 接入 `usePersistedState`；
  单测 +2（hook 排序持久化 / 组件视图持久化）、E2E +1（点列头排序 → 刷新仍高亮）
- 验证：typecheck / lint 0 error / audit:i18n / unit **1696** / E2E recent-features 22/22

## [v0.5.15] 流水定位图表（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **交易流水行点击 → 图表定位该时刻**：直播成交行点击后主图可视范围跳到该成交时刻
  （跨品种先切品种；展开明细按钮 stopPropagation 不误触）；`src/trade/locate.ts` 纯函数
  `locateRangeFor`（±span 根钳制）+ 单测 +4；App 经 ChartView `externalRange` 接线；
  五语 i18n 新增 `trade.locate`；组件测试 +3
- 验证：typecheck / lint 0 error / audit:i18n / unit **1694** / E2E recent-features 21/21

## [v0.5.14] 图表成交进出场标记（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **主图模拟成交 B/S 落点**：当前品种成交流水在图上以点标标出（buy=涨绿 / sell=跌红），
  时间戳对齐 K 线秒口径；`src/trade/markers.ts` 纯函数 `tradeMarkersFor` + 单测 +3；
  adapter 新增独立 `setTradeMarkers` 序列（跨指标切换持久）；App 接线 `paper.trades`
- 验证：typecheck / lint 0 error / audit:i18n / unit **1687** 全绿

## [v0.5.13] 行情列表 24h 成交额列（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **行情列表·24h 成交额列（可排序）**：新增 quoteVolume 列（`market-sort-quoteVolume` 点击排序，
  复用既有 quoteVolume 排序口径）；行内 `fmtVolumeBM` B/M 缩写显示；成交额列设为收缩列
  保证 320px 无横向滚动；复用既有 `marketList.volume` 文案；单测 +2

## [v0.5.12] 提醒快捷设置（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **提醒面板·现价 ±% 快捷填充**：价格输入下新增「快捷 ±%」按钮行（±1%/±2%/±5%），
  一键填充现价上浮/下浮价并联动方向（+N%→above、−N%→below），无现价时不渲染；
  `fmtPricePrecise` 按档位精度；五语 i18n 新增 `alert.quickPct`；单测 +3

## [v0.5.11] 交易期间盈亏条（2026-09-19）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **交易流水面板·期间已实现盈亏条**：统计条下方新增「今日 / 本周 / 本月」已实现盈亏
  （UTC 口径，正负着色）；`src/trade/daily.ts` 新增纯函数 `weekKeyFor` / `monthKeyFor` /
  `realizedPnlWhere` / `realizedPnlIn` / `periodPnl`；五语 i18n 新增
  `trade.weekPnl`/`trade.monthPnl`/`trade.period`；单测 +8、E2E 断言增强（流水面板期间盈亏真实数值）

## [v0.5.10] 今日已实现盈亏（2026-09-18）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **仓位面板账户总览·今日已实现盈亏**：汇总头部新增「今日已实现」（UTC 今日平仓 pnl 合计，
  正负着色）；`src/trade/daily.ts` 新增纯函数 `todayRealizedPnl`；App 接入 `paper.trades`；
  五语 i18n 新增 `position.todayPnl`；单测 +6、E2E 断言增强（总览 +0.00 / 反手后真实数值）

## [v0.5.9] 持仓反手（2026-09-18）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **持仓一键反手**：仓位面板每行新增「反手」按钮——以现价同量平掉当前方向并开反向仓
  （已有反向持仓加权合并，不覆盖）；含滑点/手续费记账，流水落 close+open 两条；
  无现价或余额不足（名义金额 ≥ 可用余额）时按钮禁用；五语 i18n 新增 `position.reverse`
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1665** 全绿 /
  chromium E2E recent-features **21/21**

## [v0.5.8] 指标参数重置（2026-09-18）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **指标参数一键重置为默认**：IndicatorSettings 头部新增「重置默认」按钮（`indicator-reset`），
  一键还原为 `DEFAULT_INDICATOR_PARAMS`；五语 i18n 新增 `indicator.resetDefault`；单测 +1
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1657** 全绿 /
  chromium E2E recent-features **20/20** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.7] 行情收藏星标（2026-09-18）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **行情列表收藏星标**：每行左侧新增 ★/☆ 快捷收藏按钮（独立按钮，点击不切换品种），
  localStorage `kline-buty:favorites` 持久化（≤50 上限）；五语 i18n 新增
  `marketList.addFavorite`/`removeFavorite`；单测 +1、行结构重构（星标 + 选择按钮）
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1656** 全绿 /
  chromium E2E recent-features **20/20** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.6] 仓位账户总览（2026-09-17）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **仓位面板账户总览**：顶部显示可用余额 + 当前品种浮动盈亏（多空合计，无持仓/无现价显 `—`）；
  `balance` prop 由 App 传入；五语 i18n 新增 `position.balance`/`position.unrealized`；单测 +3、E2E +1
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1655** 全绿 /
  chromium E2E recent-features **20/20** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.5] 快照导出（2026-09-17）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **快照画廊导出图片**：每张快照新增「下载图片」按钮（⬇，`snapshot-download-<id>`）→ `<a download>` 下载
  `快照名.png`（文件名非法字符清洗）；五语 i18n 新增 `snap.download`；E2E +1（下载事件 .png 校验）
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1652** 全绿 /
  chromium E2E snapshot-gallery 2/2 / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.4] 图表交互增强（2026-09-16）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **图表右键「复制 OHLC」**：右键菜单新增复制整根 K 线 OHLCV 文本（`O:H:L:C:V` 紧凑格式，8 位小数去尾零）；
  `src/utils/ohlc.ts` 纯函数 `formatOhlc` + 单测 +3；E2E +1（含剪贴板校验）
- **按品种盈亏汇总点击切品种**：交易流水「按品种汇总」行可点击 → 切主图品种并关闭流水面板
  （`onSwitchSymbol` 回调 + App 接线）；单测 +1、E2E +1
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1652** 全绿 /
  chromium E2E recent-features **19/19** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.3] 深链直达（2026-09-16）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **图表面板深链增强（?tab=）**：`?tab=position` / `?tab=trades` / `?tab=alerts` 打开即直达对应面板
  （未知值静默忽略）；与 `?symbol=`/`?period=`/`?drawing=`/`?ind=`/`?sub=` 组合构成完整图表视图深链；E2E +1
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1648** 全绿 /
  chromium E2E recent-features **17/17** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.2] 交互增强（2026-09-16）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **QuickOrder 键盘支持**：Enter 确认下单（有效且保证金充足时）、Esc 关闭弹层；
  提示文案补快捷键说明（五语 i18n）；单测 +3
- **图表面板深链增强**：分享链接支持 `?ind=` / `?sub=` 直达主图/副图指标（白名单校验、非法静默忽略）；
  复制分享链接自动携带非默认指标参数（`?ind=boll&sub=rsi` 打开即应用）；E2E +1
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1648** 全绿 /
  chromium E2E recent-features **16/16** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

## [v0.5.1] 交易流水增强（2026-09-16）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **按品种盈亏汇总**：`src/trade/breakdown.ts` 纯函数 `symbolBreakdown`（按品种聚合笔数/已平仓数/净盈亏/
  胜率，净盈亏降序）；TradeHistoryPanel 统计行下折叠区「按品种汇总」（默认收起）；五语 i18n 新增
  `trade.bySymbol`；单测 +3
- **交易流水按日分组 + 每日小计**：`src/trade/daily.ts` 纯函数 `dayKeyFor` / `groupTradesByDay` /
  `dailySummary`（UTC 日键、新日在前组序、笔数/已平仓数/净盈亏）；TradeHistoryPanel 流水列表按 UTC 日分组，
  日标题 + 每日小计（笔数 / 当日盈亏，仅已平仓>0 显示）；五语 i18n 新增 `trade.dailyCount`/`trade.dailyPnl`；
  单测 +7
- **app-shell M2 · 原生分享适配层**：新增 `@shell/share` 适配层（与 `@shell/notifications` 同构）——
  桩 `src/shellShare.ts`（Web/测试恒 'fallback'，导出行为不变）+ 真实 `app-shell/native-share.ts`
  （Capacitor Share 系统分享面板）；App.tsx 三个文本导出（流水 CSV / 权益 CSV / 账户 JSON）改走
  `exportTextFile`：壳内先原生分享、未分享回退下载；CSV 保留 BOM、JSON 不加 BOM；
  `@capacitor/share@8.0.1` 装入 app-shell；单测 +2；Web 端零行为变化
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1645** 全绿 /
  chromium E2E recent-features **15/15** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署
  `@capacitor/share@8.0.1` 装入 app-shell；单测 +2；Web 端零行为变化

## [v0.5.0] 交易绩效阶段（2026-09-15）

I3（云同步）/ I11（移动端 Widget）外部能力暂缓，本地先行新特性完成一批。

- **当日高低线（Session H/L）**：图表右上角「当日高低」开关（持久化）——`src/data/session.ts` 纯函数
  `sessionExtremes`（最新 K 线所在 UTC 日聚合会话高/低，含未收盘 K 线实时高低）；adapter 新增
  `setSessionHighLow`（H/L 虚线价格线）；五语 i18n 新增 `chart.sessionLines`；单测 +5
- **交易流水过滤**：交易流水面板多品种时显示过滤行——品种下拉 + 方向下拉 + 关键词搜索
  （`src/trade/filter.ts` 纯函数 `filterTrades` / `tradeSymbols`，仅过滤列表，统计/权益曲线/盈亏条用全量）；
  五语 i18n 新增 `trade.filterSymbol/filterSide/filterQuery/filterEmpty/all`；单测 +13
- **逐笔盈亏条形图**：交易流水面板权益曲线下方新增 `PnlBars`——已平仓记录按时间升序排布，
  盈利向上 / 亏损向下，零轴 + 按最大 |pnl| 归一化；`src/trade/perf.ts` 新增 `pnlBars` 纯函数；
  五语 i18n 新增 `trade.pnlBars`；单测 +10
- **交易绩效面板**：交易流水面板内 280×48 权益 sparkline 升级为**可交互权益曲线**（`EquityCurve`）——
  悬停十字定位 + tooltip（时点权益/回撤）、初始权益基准虚线、终值涨跌着色；
  新增**最大回撤 / 当前回撤**指标（`src/trade/perf.ts` 纯函数，回撤口径含初始资金峰值参考）；
  五语 i18n 新增 `trade.maxDrawdown` / `trade.drawdown`；单测 +20、E2E +1
- **工程与依赖**：CI 构建顺序修复（PR #15：VITE_CAPACITOR 构建前先装 app-shell 依赖，恢复 Android/iOS CI）；
  app-shell M1 真实插件 + 原生提醒（PR #12）；O1 错误监控测试（PR #13）；typescript-eslint 8.70（PR #18）
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit **1633** 全绿 /
  chromium E2E recent-features **15/15** / CI+CodeQL+Pages+Android+iOS 全绿；Pages+Vercel 双平台部署

承接 `docs/13-下一版本任务清单.md`。A–H 阶段全部闭合，I 阶段除 I3（云同步需登录态+云端 KV）、
I11（移动端 Widget 需原生平台）外全部闭合。版本历史入口（H5 ChangelogModal）新增 v0.4.0 条目。

- **I9 定时主题切换**：新增 `schedule` 主题档，按用户设定深/浅色时刻（HH:mm，跨午夜）自动切换；
  配置持久化；桌面/移动 Header 在 schedule 档显示时刻输入；五语 i18n；单测 12 + E2E
- **I1 PWA 离线可安装**（既有，本版收口）：`public/sw.js` + `manifest.webmanifest`，PROD 注册
- **I2/I4–I8/I10/I12–I15**（既有，本版收口）：画线分享、自选实时行情、语义识别、智能提醒、
  语音播报、深链、指标推荐、策略笔记、区间导出、快照画廊、模板市场
- **依赖升级**：react/react-dom/@types-react/react-dom → 19.3.0；vite → 8.3.0
- 验证：typecheck / lint 0 error / audit:i18n 五语键集一致 / unit 1561 全绿 /
  chromium E2E recent-features 13/13 + visual 4/4

## [v0.4] 数据正确性阶段（2026-09-06 ~ 09-12）

承接 `docs/13-下一版本任务清单.md`，第一优先级 A 阶段数据正确性与稳定性。完成状态见该清单（★ 标注）。

### I9 定时主题切换（2026-09-12）
- 新增 `schedule` 主题档：主题档循环 dark→light→auto→schedule；schedule 档按用户设定深/浅色时刻
  （HH:mm，跨午夜支持）自动切换，配置持久化 `kline-buty:scheduleTheme`（默认深 18:00 / 浅 07:00）
- `src/theme.ts` 纯函数 `timeToMinutes` / `resolveScheduledTheme` / `currentScheduledTheme` +
  新 hook `useScheduledTheme`（30s 重算，仅变化时 setState）；桌面/移动 Header 在 schedule 档显示
  深/浅色时刻 `<input type="time">`；五语 i18n（toSchedule/scheduleDark/scheduleLight）；
  设置快照导出自动纳入新持久化键
- 验证：typecheck / lint 0 error / i18n 五语键集一致 / unit 1561 全绿 / chromium E2E
  recent-features 13/13（含 I9 用例）+ visual 4/4 基线不变

### 依赖批次（2026-09-10）
- dependabot 首批 9 个更新 PR 评估合并 8 个：eslint 10.10、@playwright/test 1.63、@vitest/coverage-v8 5.0、vitest 5.0、typescript-eslint 8.69、eslint-plugin-react-refresh 0.5.6、actions/github-script 9、@types/react-dom 19.2.7
- 升级后全量验证：typecheck / lint 0 error / unit 1532 / build（tsc+vite+docs 47s）全绿
- typescript 7.0.2 暂缓（#8）：TS7 与 typescript-eslint 尚不兼容致 lint 加载崩溃，待官方支持

### CI E2E 确定性回归（2026-09-12）
- `ci.yml` 新增 `e2e-tests` job：3 浏览器（chromium/firefox/webkit）× 确定性规格集
  （?perf 合成数据，不依赖币安网络）+ `--grep-invert "模拟交易"`（盘口走实时 WS）
- 补齐 H11：本地 firefox nightly 有 macOS headless 上游 bug，Linux CI 全跑三浏览器
- 实时数据冒烟（smoke/feature-gaps）留本地，避免 GitHub 运行器到币安出口/geo 不可控
- 失败自动上传 test-results 工件（retention 7 天）便于诊断
- 首跑暴露 4 类可移植性问题并修复（4d17ca9）：
  - marker-render 截图基线按本机平台提交 → CI linux 按 `fs.existsSync` 平台守卫，功能断言仍执行
  - 币安 WS 被 GH runner geo 阻断（HTTP 451）污染 error 断言 → 过滤环境性 Binance WS 错误
  - period-anchor firefox 拖拽时序 → 回看步骤重试式（≤5 次）
  - recent-features 下拉刷新 firefox 无 Touch 构造器 → firefox 跳过（chromium/webkit 覆盖）
- **perf 模式真正离线**（docs 契约「不联网」此前被违反，仍连 WS/REST 生成环境性错误）：
  `synthetic.ts` 新增 `isPerfMode()`；`useMarketStats`/`useSentiment`/`useTickerList`/
  `useMarketSnapshots` 加 perf 守卫（`useDepth` 保留实时——「模拟交易」用例 ?perf 下仍用实时盘口）

### 覆盖率补强（statements 81.71%→82.62%，lines 破 85%）
- vitest.setup 加 jsdom WebSocket 桩（WS 面板单测渲染空态；连接行为由 E2E 覆盖）
- App 集成 +8 用例（模拟交易开平仓、提醒增删、设置持久化、布局循环、快捷键配置、
  WS 面板路径、交易流水、回放）；DesktopHeader +9；MobileHeader +3
- 验证：typecheck/lint 0 error、npm test 1549 全绿、coverage statements 82.62 /
  branches 76.91 / functions 74.4 / lines 85.22

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
