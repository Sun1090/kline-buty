# 提交与推送规范

## 提交拆分

一个提交只做一个主题。常见拆分：

- `feat(chart): ...`
- `fix(mobile): ...`
- `refactor(data): ...`
- `test(e2e): ...`
- `docs(knowledge): ...`
- `chore(docs-site): ...`

禁止混合示例：修移动端横滚时顺带提交几十个知识库 frontmatter 改动。

## Commit Message

使用中文正文解释“为什么 + 做了什么 + 如何验证”：

```text
fix(mobile): 防止顶栏横向滚动

- 周期按钮改为换行布局
- 符号选择器窄屏收缩省略
- 补充 320px 无横滚断言

验证：unit/e2e 通过，320/390px scrollWidth 等于 innerWidth
```

## 提交前检查

```bash
git status --short
git diff --check
git diff --stat
git diff -- <本次相关路径>
npm run typecheck && npm run lint && npm test
```

若影响构建或浏览器行为：

```bash
npm run build && npm run e2e
```

## Push 与部署

1. 确认分支基于最新 `origin/main`，必要时 rebase。
2. Push 前再次确认 staged 内容。
3. Push 后观察：
   - `CI` workflow
   - `Deploy to GitHub Pages` workflow
4. Pages 成功后访问应用和知识库 URL。
5. 如 Vercel 已接入，也等待部署完成并抽查。
6. 部署失败时不要口头说“稍后重试”，要给出失败日志定位和下一步修复。

## 紧急回滚

优先 `git revert` 生成反向提交；不要 force-push 共享 main。部署产物异常时，先确认是构建输入错误还是平台配置问题。
