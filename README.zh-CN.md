# Kline Buty · 实时 K 线图表

[English](README.md) | **中文**

> **免责声明**：本项目仅用于技术学习与研究，不构成任何投资建议。加密货币交易有风险，据此操作风险自负。

---

## 功能特性

- **实时 K 线图表** — 蜡烛图 / 折线图 / 面积图，14 档周期（1s 至 1M）
- **49 种画线工具** — 趋势线、通道、斐波那契、R:R、江恩、楔形、文本标注、圆弧、椭圆、多段线、量度、周期线、平行射线、宽度通道、趋势角度、时间区间、价格带、斐波那契时间区间等；支持撤销/重做、模板、跨品种复制粘贴、分组折叠、OHLC 吸附对齐、单条透明度
- **26 种指标** — 主图：MA、EMA、BOLL、VWAP、SAR、Ichimoku、Supertrend；副图：VOL、MACD、KDJ、RSI、WR、OBV、ATR、DMI、CCI、PSY、STOCH、ROC、MOM、BBW、MFI、AO、CMF、Donchian、Aroon，参数全量可调 + 预设持久化
- **盘口深度图** — 实时 8 档买卖盘口 + 深度曲线，WebSocket 驱动
- **多图同屏** — 1/2/4 图布局，时间轴联动
- **市场回放** — 历史逐根回放，1x–50x 变速
- **模拟交易** — 杠杆/保证金/强平价、加权成本合并加仓减仓、止盈止损单模拟触发、滑点模型、浮动盈亏、权益曲线、流水 CSV 导出、账户重置
- **价格提醒** — 条件触发（≥/≤），浏览器通知，一次性/循环模式，时间窗口复合条件，4 种音效可选
- **多语言** — 中文 · English · 日本語 · 한국어 · Español
- **主题色** — 4 套预设（经典蓝、红涨绿跌、紫调、青调）
- **PWA 支持** — 可安装、离线缓存、后台通知
- **键盘快捷键** — ⌘K 搜索、`1`/`2`/`3` 布局切换、`[`/`]` 周期、`Space` 回放、`?` 帮助
- **CSV 导出** — OHLCV + 指标列
- **区域截图** — 框选导出 PNG
- **移动端触屏** — 双指缩放、OHLC 十字光标 2s 保留、触屏画线编辑、长按快速操作
- **图层面板** — 显示/隐藏、锁定/解锁、分组/折叠、单行删除、全部清空
- **可靠性** — K 线本地缓存冷启动秒开、实时帧 rAF 合并、WS 看门狗 + 指数退避重连、多源降级、加载失败重试
- **键盘可达性** — 全键盘操作链路：Tab 进入面板后方向键在工具/交易对/图层网格间移动焦点（首尾环绕），Enter/Space 选中；Esc 链式收起弹层（一次关一层，不冒泡到全局）；回放进度条方向键步进、点击跳转；画线/周期/布局按钮 aria-pressed 标记选中态，列表补 role=listbox/option + aria-selected，屏幕阅读器可识别

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

<a href="https://react.dev/" target="_blank">React 19</a> + <a href="https://www.typescriptlang.org/" target="_blank">TypeScript 6</a> + <a href="https://vite.dev/" target="_blank">Vite 8</a> + <a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts v5</a>（TradingView 出品，Apache-2.0）

```
src/
├── chart/           # 领域类型 + 渲染适配层（可替换渲染引擎）
├── components/      # ChartView / ChartPair / ChartQuad / OrderBook / DepthChart / 各面板
├── data/
│   ├── binance/     # REST 分页、WS 客户端（看门狗/退避重连/补数）
│   ├── market.ts    # K 线仓库：有序缓存 + 幂等合并
│   └── cache.ts     # K 线本地缓存（冷启动加速）
├── drawings/        # 画线逻辑：49 种工具、撤销/重做、模板、分组、吸附
├── indicators/      # 指标引擎（纯函数，26 种指标）
├── alerts/          # 价格提醒引擎（一次性/循环、时间窗口）
├── trade/ position/ # 模拟交易：订单、持仓、盈亏
├── replay/          # 市场回放引擎
├── depth/ volumeProfile/  # 盘口聚合、筹码分布 VPVR
├── hooks/           # useKlineData、usePriceAlerts、usePaperAccount 等
├── i18n/            # 字典驱动多语言（5 语）
└── utils/           # 格式化 / CSV / 权益曲线 / 迷你图路径
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

<img src="https://img.shields.io/badge/%E7%94%BB%E7%BA%BF%E5%B7%A5%E5%85%B7-49-blueviolet" alt="49 种画线工具" /> <img src="https://img.shields.io/badge/指标-26-success" alt="26 种指标" /> <img src="https://img.shields.io/badge/E2E-121-blue" alt="121 个 E2E 测试" /> <img src="https://img.shields.io/badge/单测-1000-yellow" alt="1000 个单测" /> <img src="https://img.shields.io/github/actions/workflow/status/sun1090/kline-buty/ci.yml?branch=main" alt="CI" />

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
- ✅ P3/P4 深化：100 项清单已实现 47 项（见 `docs/07-P3P4-任务清单.md` + `docs/11-P3P4-完成状态盘点.md`）——新增 MFI/AO/CMF/Donchian/Aroon 五个副图指标；画线撤销/重做、模板、分组、吸附、悬停高亮、文字对齐；模拟交易（杠杆/强平/加权成本/止盈止损单/滑点/权益曲线）；提醒（循环模式、4 音效、时间窗口）；流水 CSV 导出与账户重置；K 线缓存、帧节流、错误重试、键盘导航、数字千分位

## 设计要点

- **数据层与渲染层解耦**：ChartApi 接口隔离渲染引擎，可替换
- **增量渲染**：WS 实时帧走 update 增量路径，不打断用户缩放/平移
- **端点自动探测**：`detectMode()` 启动时探测 proxy/direct；静态托管（Pages/Vercel）直连带 CORS 的币安域名，自建部署走代理，每环境零配置
- **断线自愈**：WS 看门狗 + 指数退避重连（上限 30s）+ REST 补齐缺口，仓库层幂等去重；fapi→dapi 多源降级
- **纯函数业务逻辑**：指标引擎、画线几何、交易/持仓/提醒规则均为可单测纯函数，与渲染层解耦

## 更新日志

查看 <a href="https://github.com/sun1090/kline-buty/releases" target="_blank">GitHub Releases</a> 获取完整更新记录。

## 贡献指南

1. Fork 本仓库
2. 创建分支：`git checkout -b feat/your-feature`
3. 提交：`git commit -am 'feat(scope): description'`
4. 推送：`git push origin feat/your-feature`
5. 发起 Pull Request

提交规范遵循 <a href="https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular" target="_blank">Angular Convention</a>。

## 赞助

如果这个项目对你有帮助，可以请作者喝杯咖啡，支持持续更新 ☕

<table>
  <tr>
    <td align="center"><img src="public/donate-alipay.jpg" width="200" alt="支付宝赞赏码" /><br/>支付宝</td>
    <td align="center"><img src="public/donate-wechat.jpg" width="200" alt="微信赞赏码" /><br/>微信</td>
  </tr>
</table>

## 许可

[MIT](LICENSE) © sun1090