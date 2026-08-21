# 代码编写规范

## 开始前

1. 用 `git status` 确认工作区，不吞并用户或其他任务的未提交改动。
2. 找到最近相关实现，而不是凭描述猜接口。
3. 明确本次属于：图表渲染、数据层、UI 面板、交互手势、i18n、文档站还是知识库内容。
4. 若需求会影响视觉或交互，先说清桌面端 / 移动端的预期行为。

## React 与 TypeScript

- 函数组件 + 显式 props 类型；导出组件写返回类型。
- 优先抽纯函数处理计算、命中检测、定位钳制、聚合逻辑，便于 Vitest 覆盖。
- 状态持久化复用 `usePersistedState` 或既有 storage key 约定，避免散落 localStorage。
- effect 只做外部系统订阅；派生数据优先 `useMemo` 或模块内纯函数。
- 不要在组件里硬编码交易所域名；请求必须经过相对代理路径。

## 图表与交互

- lightweight-charts 的 API 变更集中在 `src/chart/adapter.ts` 一类适配层，不在业务组件散调。
- 实时行情更新不得打断用户的缩放、平移、画线编辑。
- 触屏事件要区分单击、拖拽、长按、双指缩放，且不能互相抢事件。
- 浮层必须做视口钳制：右侧不溢出，底部翻转到手指上方，日期轴和 OHLC 不能被遮挡。
- 画线工具需要支持创建、选中、拖动、锚点编辑、删除、持久化和图层管理。

## 样式与响应式

- 移动端优先检查 320 / 390px；要求 `scrollWidth === clientWidth`，不出现水平滚动条。
- 功能按钮允许换行；不要用 `overflow-x: auto` 掩盖信息架构问题。
- 低频操作折叠；高频操作保持一行直达。
- 深浅主题都要检查对比度、边框、浮层与 SVG 配色。

## i18n

- 所有用户可见文案进字典，禁止 JSX 里散落中文或英文句子。
- 中文 / English / 日本語 / 한국어 / Español 五份都要同步。
- 可运行：

```bash
npm run audit:i18n
```

## 文档站与知识库

改 `docs/knowledge/` 或 `docs-site/` 前，先读 [`docs/agents/knowledge.md`](knowledge.md)。

## 自查命令

最小闭环：

```bash
npm run typecheck && npm run lint && npm test
```

涉及构建、路由、静态产物或文档站时追加：

```bash
npm run build
npm run e2e
```
