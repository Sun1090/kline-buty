# 项目上下文

## 目录地图

| 路径 | 职责 | 修改约束 |
|---|---|---|
| `src/App.tsx` | 应用装配、全局状态与页面级联动 | 谨慎改公共状态，先确认多图、提醒、回放影响 |
| `src/components/` | 头部、图表容器、订单簿、持仓、提醒、市场列表等 UI | 保持响应式与键盘可达性 |
| `src/components/DesktopHeader.tsx` / `MobileHeader.tsx` | 顶部功能入口 | 保持折叠策略，禁止横向滚动 |
| `src/chart/` | 渲染适配层、裁剪、拖拽、捏合、截图等图表基础 | 不直接耦合币安数据结构 |
| `src/data/binance/` | REST / WebSocket / endpoint 封装 | 只走 `/api`、`/ws`、`/fapi` 相对路径 |
| `src/data/market.ts` | K 线缓存、排序、幂等合并 | 断线补数与实时帧不能破坏顺序 |
| `src/hooks/useKlineData.ts` | 历史 + 实时数据编排 | 周期切换、重连、回放路径都要考虑 |
| `src/indicators/` | 指标纯函数引擎 | 新指标必须有算法与边界测试 |
| `src/drawings/` | 画线命中、序列化、编辑逻辑 | 桌面鼠标与移动触屏都要覆盖 |
| `src/i18n/` | 五语文案与一致性校验 | 新文案不能漏 key |
| `e2e/` | 生产构建后的浏览器回归 | 不用 dev server 冒充线上行为 |
| `docs/knowledge/` | 知识库 Markdown 源 | 是文档站的唯一内容源 |
| `docs-site/` | VitePress 配置、首页与自定义样式 | 篇章目录由脚本同步，不手改生成物 |
| `scripts/` | 构建准备、静态服务、审计工具 | 影响构建/E2E 时必须跑完整命令 |

## 架构原则

- 数据层与渲染层解耦：`ChartApi` 屏蔽 lightweight-charts，业务数据不应知道渲染细节。
- 实时更新走增量路径，周期切换或历史回补才走全量刷新。
- 前端统一相对代理路径，生产由 Pages / Vercel / nginx / Docker 决定转发。
- 缓存层必须幂等去重、保持时间序，重连后可 REST 补洞。
- 知识库源文件在 `docs/knowledge/`，`docs-site/docs/0*` 到 `2*` 是同步产物。

## 外部部署形态

| 目标 | 应用 | 知识库 |
|---|---|---|
| GitHub Pages | `https://sun1090.github.io/kline-buty/` | `/kline-buty/knowledge/` |
| Vercel | `https://kline-buty.vercel.app/` | `/knowledge/` |

构建时需注意：

```bash
VITE_BASE_PATH=/kline-buty/ DOCS_BASE_PATH=/kline-buty/knowledge/ npm run build
```
