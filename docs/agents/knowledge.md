# 知识库与文档站工作规则

`docs/knowledge/` 是交易知识库的唯一内容源（双语树）；`docs-site/docs/` 是构建产物。本页是改这两处之前的必读清单。

## 目录边界

| 路径 | 性质 | 规则 |
|---|---|---|
| `docs/knowledge/zh/<chapter-slug>/` | **中文源**（全量 173 篇 + 章节 README + `_assets/`） | 唯一允许手改的中文内容区 |
| `docs/knowledge/en/<chapter-slug>/` | **英文源**（渐进翻译，en 为站点根 locale） | 新增英文篇目按既有 slug 命名 |
| `docs/knowledge/README.md` | 全库索引（zh 树口径） | 「目录」部分由脚本生成，**不要手改**；其余可手改 |
| `docs/knowledge/scripts/` | 维护脚本 | 改动需同步更新本页说明 |
| `docs-site/docs/index.md`、`docs-site/docs/zh/index.md` | 双语落地页（手写源，入库） | 改动后必须本地构建验证 |
| `docs-site/docs/` 其余 | 构建产物（prepare 脚本拷贝生成） | **禁止手改**，会被下次构建覆盖 |
| `docs-site/` 其余 | VitePress 配置、主题组件、样式 | 改动后必须本地构建验证 |

## 命名规范（2026-08 重构后）

- 章节目录与文档文件一律**英文 kebab-case slug，无序号**：`futures/margin-leverage-liquidation.md`。
- 阅读顺序由两处定义且必须保持一致：`docs-site/.vitepress/config.mjs` 的 `CHAPTER_ORDER` 与 `docs/knowledge/scripts/sync-index.py` 的 `CHAPTER_ORDER`。章内篇目顺序统一按正文 H1 的「NN ·」编号排序（config 的 `sortByDocNo` 与 sync-index 同口径），不要依赖文件名字母序。
- 新增文档需同步：sync-index（根索引）、config 侧边栏（自动按目录生成）、如新增章节则更新两处 CHAPTER_ORDER。
- 中文与英文正文的 H1 标题及 frontmatter `title` 均保留「NN ·」编号供阅读序（en 与 zh 同篇同号）；章节 README 的 H1 同样带章节号（如 `# 12 · 市场生态篇`）。
- slug 映射的历史对照见 git 历史（重构提交前为 `NN-中文名/NN-中文篇名.md`）。

## 新增 / 修改文档的硬性要求

1. **frontmatter 必须存在**：文首 `---` 块含 `title` 与一句 `description`。英文 title 含冒号时必须用引号包裹（YAML），如 `title: "Your First Trade: ..."`。
2. **正文必须有标准风险提示容器**：zh 树用 `::: warning ⚠️ 风险提示`，en 树用 `::: warning ⚠️ Risk Warning`；内容一到两句贴合本篇，不要复制通用废话。CI 校验按 locale 匹配。
3. **图片/SVG 先落盘再引用**：资产放所在篇章的 `_assets/`，引用前确认文件已存在——**引用不存在的资产会直接打挂 `docs:build`**。
4. **链接规范**：
   - 跨章引用用目录链接：`[Futures](../futures/)`；同章用文件链接：`[margin & liquidation](margin-leverage-liquidation.md)`。
   - en 树中未翻译章节的跨章链接可指向 slug 路径——校验脚本会回退到 zh 树同名文件，翻译落盘后自动生效。
   - 锚点链接改后必须在浏览器实际点击验证页面滚动。
5. **章节内卡片导航**：zh 章节用 `<DocCards dir="zh/<slug>" />`，en 章节用 `<DocCards dir="<slug>" />`。

## 双语架构

- 站点根 locale = English（`/knowledge/…`），`/knowledge/zh/…` = 简体中文；导航栏自动出现语言切换下拉。
- `scripts/docs-prepare.mjs` 把 `en/` 与 `zh/` 两树分别同步到 `docs-site/docs/` 与 `docs-site/docs/zh/`，章节 README 拷贝时改名为 index.md。
- 中文是全量基准；英文按阅读顺序渐进翻译（已完成：getting-started）。翻译时保留 `<mark>`、表格、SVG 引用、交互组件标签与 slug 相对链接。

## 改动后的必跑命令

```bash
python3 docs/knowledge/scripts/sync-index.py   # 根 README 索引同步（新增/删除/改名文档后必跑）
python3 docs/knowledge/scripts/validate-knowledge.py  # CI 同款校验（frontmatter/风险容器/链接/索引）
npm run docs:build                              # 文档站构建验证（含 prepare 拷贝）
```

构建通过 ≠ 完成：涉及导航、锚点、侧栏、语言切换的改动还要浏览器实测（e2e/docs.spec.ts 覆盖双语路由与切换器；主端口 5173 被占时用临时 config 起在 4173）。

## VitePress 调试陷阱（改样式 / 验证渲染时必读）

- **小 SVG 会被内联成 `data:image/svg+xml;base64,...`**。验证图片是否渲染，数 `<img>` 标签数量，别 grep 文件名。
- **容器类名顺序是 `class="danger custom-block"`**（类型在前）。CSS 用 `.custom-block.danger` 组合选择器匹配，别因 grep 不到就误判容器没渲染。
- **`docs:build` 必须在仓库根目录跑**：`cd` 进子目录后相对路径全部失锚。
- **`docs-site/docs/` 下除两个手写落地页外都是生成物**（已 gitignore），不要手改、不要提交。
- **语言切换器是导航栏「Change language」下拉**：E2E 要先点开菜单再点目标语言链接。

## 内容红线

- 法律、监管、税务表述一律标注「以最新法规/规定为准」，不写死具体法条原文。
- 数字示例使用虚构数据并注明；收益类统计标注「历史数据，不代表未来」。
- 不点名未定罪的公司做负面分析；骗局识别只讲公开事实与识别方法。
- 各篇正文行数参考 200-400 行；章节 README 篇内索引保持简短。

## 并行会话风险

多人/多会话同时编辑知识库时：

- 开工前先 `git status` 检查半成品（如 md 已写入但 `_assets/` 资产缺失）。
- 不要覆盖他人未提交的新文件；发现引用缺失先确认是否为对方正在写入。
- 收尾前重跑一次 `sync-index.py` + `validate-knowledge.py` + `docs:build` 作为最终验收。
