# AGENTS.md

本文件是 Agent 工作入口，负责路由到具体规则；不要把所有细则堆在这里。

## 项目一句话

Kline Buty 是对标 OKX / Binance / Bybit 的实时 K 线 Web 终端，同时同仓维护 `docs/knowledge/` 交易知识库与 VitePress 文档站。

## 必读顺序

1. [`README.md`](README.md)：产品能力、预览地址、技术栈与快速开始。
2. [`docs/agents/project.md`](docs/agents/project.md)：架构边界与关键目录。
3. 按任务读取：
   - 改代码前：[`docs/agents/coding.md`](docs/agents/coding.md)
   - 审查变更时：[`docs/agents/review.md`](docs/agents/review.md)
   - 交付验收时：[`docs/agents/acceptance.md`](docs/agents/acceptance.md)
   - 提交推送时：[`docs/agents/commit.md`](docs/agents/commit.md)

## 当前不可回退的产品决策

- 顶栏保持折叠式布局；低频功能收进“更多”，不要为了展示全部入口而展开或引入横向滚动。
- 移动端功能区域优先换行，不允许横向滚动条；320px 也要能直接看到关键操作。
- 主应用默认英文 README，中文放在独立文档；外链集中分组并使用新标签页。
- 知识库不是纯文字仓库，重要概念应有表格、流程图、SVG 或结构化导航。
- VitePress 锚点链接必须让页面内容真实滚动到目标标题，不能只改地址栏。
- 部署不是“push 成功”就算完成，必须等到 CI / Pages / Vercel 结果并做线上抽查。

## 快速命令

```bash
npm run dev          # 本地开发
npm run typecheck    # 类型检查
npm run lint         # ESLint
npm test             # Vitest 单测
npm run e2e          # Playwright 生产构建 E2E
npm run build        # 应用 + 知识库文档站构建
npm run docs:dev     # 知识库文档站开发
```

## 任务分派原则

- 先判断影响面：主图表、数据层、面板、i18n、文档站、知识库源文档是不同边界，避免一次无关联大改。
- UI 变更必须说明桌面端与移动端如何验证。
- 数据或指标算法变更必须有确定性单测。
- 文档站行为变更必须本地构建并用浏览器检查锚点、侧栏、移动端宽度。
- 提交只包含一个逻辑主题；不要把无关的知识库批量改动混进工程修复。
