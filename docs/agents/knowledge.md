# 知识库与文档站工作规则

`docs/knowledge/` 是交易知识库的唯一内容源；`docs-site/docs/` 是构建产物。本页是改这两处之前的必读清单。

## 目录边界

| 路径 | 性质 | 规则 |
|---|---|---|
| `docs/knowledge/NN-*/` | **源文件**（Markdown + `_assets/` SVG） | 唯一允许手改的内容区 |
| `docs/knowledge/README.md` | 全库索引 | 「目录」部分由脚本生成，**不要手改**；「按读者角色快速导航」「学习路线图」可手改 |
| `docs/knowledge/scripts/` | 维护脚本 | 改动需同步更新本页说明 |
| `docs-site/docs/` | 构建产物（prepare 脚本拷贝生成） | **禁止手改**，会被下次构建覆盖 |
| `docs-site/` 其余 | VitePress 配置、首页、样式 | 改动后必须本地构建验证 |

## 新增 / 修改文档的硬性要求

1. **frontmatter 必须存在**：文首 `---` 块含 `title: NN · 标题` 与一句 `description`（纯文本，不带 HTML 标签）。缺失时可用脚本补齐：
   ```bash
   python3 docs/knowledge/scripts/add-frontmatter.py
   ```
2. **正文必须有「⚠️ 风险提示」块**：统一用 VitePress 容器语法收尾或嵌在相关小节：
   ```md
   ::: warning ⚠️ 风险提示
   一到两句贴合本篇内容的定制提示，不要复制粘贴通用废话。
   :::
   ```
3. **图片/SVG 先落盘再引用**：资产放所在篇章的 `_assets/`，引用前确认文件已存在——**引用不存在的资产会直接打挂 `docs:build`**（真实事故：`05-杠杆的数学.md` 引用未落盘 SVG 导致全站构建失败）。
4. **链接规范**：
   - 跨篇章引用用目录链接：`[03-期货篇](../03-期货篇/)`（文档站下命中该篇 `index.html`）。
   - 同篇章内用文件链接：`[02-风险管理](02-风险管理.md)`。
   - 锚点链接改后必须在浏览器实际点击验证页面滚动（历史 bug：地址变了页面不动）。

## 改动后的必跑命令

```bash
python3 docs/knowledge/scripts/sync-index.py   # 根 README 索引同步（新增/删除/改名文档后必跑）
npm run docs:build                              # 文档站构建验证（含 prepare 拷贝）
```

构建通过 ≠ 完成：涉及导航、锚点、侧栏的改动还要 `npm run docs:dev` 打开浏览器抽查对应页面。

## VitePress 调试陷阱（改样式 / 验证渲染时必读）

- **小 SVG 会被内联成 `data:image/svg+xml;base64,...`**（受 `assetsInlineLimit` 控制）。验证图片是否渲染，数 `<img>` 标签数量，别 grep 文件名——grep 不到 `.svg` 字符串不等于图没显示，它可能已变成 base64。
- **容器类名顺序是 `class="danger custom-block"`**（类型在前），不是 `class="custom-block danger"`。CSS 用 `.custom-block.danger` 组合选择器照样匹配（类顺序无关），别因 grep 不到 `custom-block danger` 就误判「容器没渲染」。
- **`docs:build` 必须在仓库根目录跑**：`cd` 进 `docs/knowledge` 后，`npm run docs:build` 的相对路径会全部失锚并报「目录不存在」。
- **`docs-site/docs/0*`、`docs-site/docs/1*`、`docs-site/docs/2*` 是 prepare 脚本生成的章节拷贝**（已在 `.gitignore`），改知识库源文档后它们会在下次 `docs:build` 自动刷新——不要手改、不要提交。

## 内容红线

- 法律、监管、税务表述一律标注「以最新法规/规定为准」，不写死具体法条原文。
- 数字示例使用虚构数据并注明；收益类统计标注「历史数据，不代表未来」。
- 不点名未定罪的公司做负面分析；骗局识别只讲公开事实与识别方法。
- 各篇正文行数参考 200-400 行；README 篇内索引保持简短。

## 并行会话风险

多人/多会话同时编辑知识库时：

- 开工前先 `git status` 检查半成品（如 md 已写入但 `_assets/` 资产缺失）。
- 不要覆盖他人未提交的新文件；发现引用缺失先确认是否为对方正在写入。
- 收尾前重跑一次 `sync-index.py` + `docs:build` 作为最终验收。
