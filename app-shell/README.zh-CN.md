# app-shell · Kline Buty 的多端壳工程

> Capacitor 8 壳工程：把根目录构建出的 Web 产物（`dist/`）打包为 iOS / Android App。与 Web 代码同居于 `main` 分支。本机零原生工具链（无 Android Studio / Xcode），构建全部在 GitHub Actions。

## 文档导航

| 文档 | 内容 |
|---|---|
| [docs/plan.md](docs/plan.md) | 架构决策、选型依据、市场调研、里程碑、风险表、**坑与规**（§3.4） |
| [docs/build-and-release.md](docs/build-and-release.md) | CI 工作流、取 APK/装真机、iOS 模拟器包、签名与上架路线 |
| [docs/operations.md](docs/operations.md) | 日常流程、真机调试、升级扩展、铁律速查 |

English: [README.md](README.md)（docs/ 全英文）。

## 最常用的三条命令

```bash
npm run web:sync     # dist → www（改过 Web 代码先在根目录 npm run build）
npm run cap:sync     # web:sync + 灌进 android/ios 原生工程
npx cap sync         # 仅同步原生工程
```

（均在 `app-shell/` 目录内执行；根目录的 npm 脚本属于 Web 侧。）

## 刷新打包的 Web 产物

```bash
# 根目录执行：
npm run build                       # 重建 dist/
cd app-shell && npm run cap:sync    # dist → www → 原生工程
```

## 硬性纪律

壳工程改动限于 `app-shell/`。壳依赖进 `app-shell/package.json`（绝不进根目录）。Web 工具链只扫 `src/` 且忽略 `app-shell/`——别破坏这条边界。原理与实测见 docs/plan.md §3.3–3.4。
