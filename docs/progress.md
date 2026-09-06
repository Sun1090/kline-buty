# 开发进度（progress）

> 自主开发会话恢复入口：先看「当前阶段」→ 按「恢复入口」继续。提交均在本地，大阶段全绿后统一 push。
> 规范：已有实现必须审计并补足测试后才可标记完成；禁止跳过失败测试；禁止只改清单。

## 当前阶段

**阶段 D · 模拟交易与账户（进行中）** — docs/13 阶段 D（D1–D15）
- D1 双向持仓 ✅ 已实现（`trade/positions.ts` hedge 槽位 + PositionPanel）
- D2 保证金率/强平价 ✅ 已实现（`position/pnl.ts` `marginRate` 动态随盈亏 + 持仓行显示 + 单测）
- D3 多品种同时持仓 ✅ 已实现（App `positionsBySymbol: Record<string,Positions>` + PositionPanel `otherSymbols`）
- D4 加权均价 ✅ 已实现（`applyOrder`/`mergePosition`）
- D5 费率可配置 ✅ 已实现（`useTradeSettings` 持久化 + `estimateOrder(feeRate)` + 平仓计费接线）
- D6 盈亏统计 ✅ 已实现（`trade/stats.ts` 胜率/盈亏比/累计 + TradeHistoryPanel 统计行 + 单测）
- D7 一键平仓 ✅ 已实现（`onSettleSymbol` 切品种 + 置空 → 结算 effect 记账 PnL/手续费）
- D8 滑点可配 ✅ 已实现（`useTradeSettings.slippageRatio` 应用到市价单估算 + E2E 持久化）
- D9 强平预警 ◐ 已显示强平价，预警提示待实现
- D10 手续费拆分 ◐ 待审计
- D11 权益曲线导出 ✅ `equityCsv.ts`
- D12 复盘模式 ✅ `replay`
- D13 多账户快照 ✳ **待实现**
- D14 收益目标 ✳ **待实现**
- D15 账户导入/导出 ✳ **待实现**

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

## D 批（已提交）
- D5 费率可配：`estimateOrder(feeRate)` + `useTradeSettings` 持久化 + 平仓计费接线
- D8 滑点可配：`useTradeSettings.slippageRatio` 应用到市价单估算
- D6 盈亏统计：`trade/stats.ts`（胜率/盈亏比/累计）纯函数 + 单测 + TradeHistoryPanel 统计行
- D7 一键平仓：`onSettleSymbol` 由「置空不记账」改为「切品种 + 置空 → 结算 effect 记账（PnL/手续费）」
- D2 补强：`marginRate` 动态保证金率（全额保证金口径随盈亏变化）+ 持仓行显示 + 单测
- 五语 i18n：position.marginRate + trade.stats/winRate/totalPnl/profitFactor/avgWin/avgLoss/settings/feeRate/slippage
- E2E `trade-settings.spec.ts`：费率/滑点改后持久化 → 刷新保留
- 审计补测结论：A14 market-type StattsBar 合约/现货徽标测试 ✓ 已具，无需补充

## 待办审计（标记完成前的补测项）
- B2 信号打点：crossovers.test.ts 已具 ✓；补 marker 渲染 E2E（可延后）
- C 阶段：v0.3 O8 E2E 已覆盖图层/截图/坐标角标 ✓

## 恢复入口
1. `git log --oneline -5` 确认已提交边界
2. `docs/progress.md`「当前阶段」继续 D 批实现
3. 每批：实现 → 补单测 → typecheck/lint/unit → 本地 commit；D 阶段全绿后 push → 查 CI/Pages/CodeQL/依赖扫描