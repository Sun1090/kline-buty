# app-shell · Multi-platform shell for Kline Buty

> This directory exists **only on the `app` branch**. The `main` branch stays a pure web repo with zero app code.

A Capacitor 8 shell that packages the web build (`dist/` at repo root) into iOS / Android apps. Zero native toolchain on this machine (no Android Studio / Xcode) — all native builds run on GitHub Actions.

## Docs

| Doc | Contents |
|---|---|
| [docs/plan.md](docs/plan.md) | Architecture decisions, tech selection, market research, milestones, risk table, and the **six pitfalls & rules** (§3.4) |
| [docs/build-and-release.md](docs/build-and-release.md) | CI workflows, fetching & sideloading the APK, iOS simulator builds, signing & store release roadmap |
| [docs/operations.md](docs/operations.md) | The three daily flows, conflict cookbook, on-device debugging, upgrades, hard rules |

中文版：[README.zh-CN.md](README.zh-CN.md)（仅 README 双语；docs/ 全英文）。

## The three commands you'll actually use

```bash
npm run web:sync     # dist -> www (run `npm run build` at repo root first if web code changed)
npm run cap:sync     # web:sync + push assets into android/ios projects
npx cap sync         # native sync only
```

(Run inside `app-shell/`; npm scripts at repo root belong to the web side.)

## Absorbing web updates (the only correct way)

```bash
# From repo root of this clone:
git fetch origin && git merge origin/main
npm run build     # quick gate
git push origin app
```

## Hard rules

Zero modifications to files that exist on `main` (sole exception: `'app-shell'` added to the root `eslint.config.js` ignore list). Never open an app→main PR. Never check out `main` to work in this clone. Rationale and live-demonstrated pitfalls: docs/plan.md §3.3–3.4.
