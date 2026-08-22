# app-shell · Kline Buty 的多端壳工程

> 本目录只存在于 **`app` 分支**。main 分支是纯 Web 仓库，不含任何 App 代码。

Capacitor 8 壳工程：把根目录构建出的 Web 产物（`dist/`）打包为 iOS / Android App。本机零原生工具链（无 Android Studio / Xcode），构建全部在 GitHub Actions。

## 文档导航

| 文档 | 内容 |
|---|---|
| [docs/plan.md](docs/plan.md) | 架构决策、选型依据、市场调研、里程碑、风险表、**六坑六规**（§3.4） |
| [docs/build-and-release.md](docs/build-and-release.md) | CI 工作流、取 APK/装真机、iOS 模拟器包、签名与上架路线 |
| [docs/operations.md](docs/operations.md) | 三个日常流程、冲突食谱、真机调试、升级扩展、铁律速查 |

English: [README.md](README.md)（docs/ 全英文）。

## 最常用的三条命令

```bash
npm run web:sync     # dist → www（改过 Web 代码先在根目录 npm run build）
npm run cap:sync     # web:sync + 灌进 android/ios 原生工程
npx cap sync         # 仅同步原生工程
```

（均在 `app-shell/` 目录内执行；根目录的 npm 脚本属于 Web 侧。）

## 吸收 Web 更新（唯一正确的姿势）

```bash
# 本目录根下执行：
git fetch origin && git merge origin/main
npm run build     # 快检
git push origin app
```

## 硬性纪律

对 main 已有文件零修改（唯一例外：根 `eslint.config.js` 忽略列表含 `'app-shell'`）；本分支不向 main 发 PR；不在本克隆 checkout main 干活。提交前先 `git fetch origin && git merge origin/main`。原理与实测见 docs/plan.md §3.3–3.4。
