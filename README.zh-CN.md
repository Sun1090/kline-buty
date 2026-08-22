# Kline Buty · 实时 K 线图表

[English](README.md) | **中文**

> **免责声明**：本项目仅用于技术学习与研究，不构成任何投资建议。加密货币交易有风险，据此操作风险自负。

---

## 功能特性

- **实时 K 线图表** — 蜡烛图 / 折线图 / 面积图，14 档周期（1s 至 1M）
- **40 种画线工具** — 趋势线、通道、斐波那契、R:R、江恩、楔形、文本标注、圆弧、椭圆、多段线、量度、周期线、平行射线、宽度通道、趋势角度、时间区间、价格带、斐波那契时间区间等
- **13 种指标** — MA、EMA、BOLL、MACD、KDJ、RSI、SAR、Ichimoku、STOCH、ROC、MOM、WR、ATR、DMI、CCI、PSY、OBV，参数全量可调
- **盘口深度图** — 实时 8 档买卖盘口 + 深度曲线，WebSocket 驱动
- **多图同屏** — 1/2/4 图布局，时间轴联动
- **市场回放** — 历史逐根回放，1x–50x 变速
- **模拟仓位** — 多空开仓、止盈止损、浮动盈亏
- **价格提醒** — 条件触发（≥/≤），浏览器通知 + SW 后台提醒
- **多语言** — 中文 · English · 日本語 · 한국어 · Español
- **主题色** — 4 套预设（经典蓝、红涨绿跌、紫调、青调）
- **PWA 支持** — 可安装、离线缓存、后台通知
- **键盘快捷键** — ⌘K 搜索、`1`/`2`/`3` 布局切换、`[`/`]` 周期、`Space` 回放、`?` 帮助
- **CSV 导出** — OHLCV + 指标列
- **区域截图** — 框选导出 PNG
- **移动端触屏** — 双指缩放、OHLC 十字光标 2s 保留、触屏画线编辑
- **图层面板** — 显示/隐藏、锁定/解锁、单行删除、全部清空

## 在线体验

| 平台 | 地址 | 说明 |
|---|---|---|
| GitHub Pages | <a href="https://sun1090.github.io/kline-buty/" target="_blank">预览地址</a> | push main 自动部署 |
| Vercel | <a href="https://kline-buty.vercel.app/" target="_blank">预览地址</a> | 预览版，根路径模式 |

## 知识库

27 篇章、201 篇文档、4.2 万+ 行深度内容：现货 / 期货 / 股票 / 加密 / 外汇 / 期权 / 宏观 / 量化 / 监管 / 数据解读 / 全球市场。

| 平台 | 地址 |
|---|---|
| GitHub Pages | <a href="https://sun1090.github.io/kline-buty/knowledge/" target="_blank">预览地址</a> |
| Vercel | <a href="https://kline-buty.vercel.app/knowledge/" target="_blank">预览地址</a> |

## 快速开始

```bash
npm install && npm run dev   # → http://localhost:5173
npm run typecheck            # 类型检查
npm run test                 # 单测（Node ≥ 22）
npm run e2e                  # Playwright 端到端
npm run build                # 生产构建
```

数据源为 <a href="https://www.binance.com/zh-CN" target="_blank">币安</a> 公开 API（REST + WebSocket），经 Vite 代理转发，无需 API Key。

## 技术栈

<a href="https://react.dev/" target="_blank">React 18</a> + <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> + <a href="https://vite.dev/" target="_blank">Vite</a> + <a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts v5</a>（TradingView 出品，Apache-2.0）

```
src/
├── chart/           # 领域类型 + 渲染适配层（可替换渲染引擎）
├── components/      # ChartView / PeriodBar / SymbolPicker / MarketList
├── data/
│   ├── binance/     # REST 分页、WS 客户端（心跳/退避重连/补数）
│   └── market.ts    # K 线仓库：有序缓存 + 幂等合并
├── hooks/           # useKlineData、useTickerList 等
├── i18n/            # 字典驱动多语言（5 语）
├── indicators/      # 指标引擎（纯函数）
└── drawings/        # 画线工具（40 种）与图层面板
```

## 数据与版权合规

- **数据来源**：<a href="https://www.binance.com/zh-CN" target="_blank">币安公开行情 API</a>（REST + WebSocket），无需 API Key。使用时请遵守<a href="https://www.binance.com/zh-CN/terms" target="_blank">币安服务条款</a>及其数据使用限制。
- **图表引擎**：<a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts</a>（TradingView 出品，Apache-2.0）。按协议要求，页面内已包含 TradingView 署名。
- **项目许可**：MIT（见 [LICENSE](LICENSE)）。注意：币安数据与 TradingView 引擎均受其各自条款约束。

## 生态

| 项目 | 说明 |
|---|---|
| [Kline Buty](https://github.com/sun1090/kline-buty) | 核心图表应用 |
| [知识库](https://kline-buty.vercel.app/knowledge/) | 交易知识库（27 篇章） |
| [项目文档](docs/) | 调研报告、需求清单、技术方案、排期、部署 |

## 进度

<img src="https://img.shields.io/badge/%E7%94%BB%E7%BA%BF%E5%B7%A5%E5%85%B7-40-blueviolet" alt="40 种画线工具" /> <img src="https://img.shields.io/badge/指标-13-success" alt="13 种指标" /> <img src="https://img.shields.io/badge/E2E-89-blue" alt="89 个 E2E 测试" /> <img src="https://img.shields.io/badge/单测-601-yellow" alt="601 个单测" /> <img src="https://img.shields.io/github/actions/workflow/status/sun1090/kline-buty/ci.yml?branch=main" alt="CI" />

- ✅ M0 调研立项
- ✅ M1 数据地基：币安 REST/WS 封装、MarketStore、断线重连
- ✅ M2 图表 MVP：蜡烛图 + 成交量 + MA + 十字光标 + 7 档周期
- ✅ M3 指标与交互：13 种指标、副图切换、分页
- ✅ M4 体验补全：图表类型、参数自定义、全屏、布局持久化
- ✅ M5 性能压测：2 万根 K 线全指标 < 60ms
- ✅ P2-3 市场回放：历史逐根回放、变速、进度条
- ✅ P2-2 多图表联动：双图/四图、时间轴同步
- ✅ P2-4 加密数据层：资金费率、未平仓、标记价
- ✅ P2-1 订单叠加：模拟仓位、止盈止损、浮动盈亏
- ✅ P2-5 价格提醒：条件触发、浏览器通知、SW 后台
- ✅ P2-6 移动端基础：PWA manifest、响应式布局
- ✅ M10–M21 画线工具：40 种、完整编辑、图层面板
- ✅ M22 移动端双指缩放
- ✅ M23 多语言：日/韩/西语
- ✅ M24 盘口快速下单
- ✅ M25 区域截图
- ✅ M26 键盘快捷键
- ✅ M27–M30 画线补齐：斐波那契时间区间、江恩、多段线、量度、楔形等
- ✅ 移动端：OHLC 浮层防溢出、2s 保留、触屏画线、自动切回只读
- ✅ P1 画线工具、盘口深度图、盘口订单簿、周期补全、图表截图
- ✅ 生产部署：Docker、nginx 代理、部署文档
- ✅ 健壮性：ErrorBoundary、离线提示、空状态、部分失败容错
- ✅ 筹码分布 VPVR
- ✅ 工程规范：ESLint 0 error、CI、89 E2E

## 设计要点

- **数据层与渲染层解耦**：ChartApi 接口隔离渲染引擎，可替换
- **增量渲染**：WS 实时帧走 update 增量路径，不打断用户缩放/平移
- **前端相对路径规范**：所有请求走 `/api` `/ws`，生产环境换代理零改动
- **断线自愈**：指数退避重连 + REST 补齐缺口，仓库层幂等去重

## 更新日志

查看 <a href="https://github.com/sun1090/kline-buty/releases" target="_blank">GitHub Releases</a> 获取完整更新记录。

## 贡献指南

1. Fork 本仓库
2. 创建分支：`git checkout -b feat/your-feature`
3. 提交：`git commit -am 'feat(scope): description'`
4. 推送：`git push origin feat/your-feature`
5. 发起 Pull Request

提交规范遵循 <a href="https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular" target="_blank">Angular Convention</a>。

## 许可

[MIT](LICENSE) © sun1090