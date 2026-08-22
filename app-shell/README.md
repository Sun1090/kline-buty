# app-shell · Multi-platform shell for Kline Buty

> A Capacitor 8 shell that packages the web build (`dist/` at repo root) into iOS / Android apps. Lives on `main` alongside the web code. Zero native toolchain on this machine (no Android Studio / Xcode) — all native builds run on GitHub Actions.

## Docs

| Doc | Contents |
|---|---|
| [docs/plan.md](docs/plan.md) | Architecture decisions, tech selection, market research, milestones, risk table, and the **pitfalls & rules** (§3.4) |
| [docs/build-and-release.md](docs/build-and-release.md) | CI workflows, fetching & sideloading the APK, iOS simulator builds, signing & store release roadmap |
| [docs/operations.md](docs/operations.md) | Daily flows, on-device debugging, upgrades, hard rules |

中文版：[README.zh-CN.md](README.zh-CN.md)（仅 README 双语；docs/ 全英文）。

## The three commands you'll actually use

```bash
npm run web:sync     # dist -> www (run `npm run build` at repo root first if web code changed)
npm run cap:sync     # web:sync + push assets into android/ios projects
npx cap sync         # native sync only
```

(Run inside `app-shell/`; npm scripts at repo root belong to the web side.)

## Refreshing the packaged web

```bash
# From repo root:
npm run build                  # rebuild dist/
cd app-shell && npm run cap:sync   # sync dist -> www -> native
```

## Hard rules

Keep shell changes inside `app-shell/`. Shell deps go in `app-shell/package.json` (never the root). The web toolchain scopes to `src/` and ignores `app-shell/` — don't break that boundary. Rationale: docs/plan.md §3.3–3.4.
