# AGENTS.md (app-shell)

Entry point for agents working on the app-shell. The root AGENTS.md governs the web side; do not cross the boundary.

## One-liner

`app-shell/` is the Capacitor shell of Kline Buty: it consumes root `dist/`, produces Android/iOS builds, and all native building happens in CI. It lives on `main` alongside the web code.

## Read before any change

1. [`docs/plan.md`](docs/plan.md) §3.3 architecture & §3.4 pitfalls — **required reading before touching anything**.
2. Build/artifacts/signing questions → [`docs/build-and-release.md`](docs/build-and-release.md)
3. Daily flows/debugging → [`docs/operations.md`](docs/operations.md)

## Hard rules for this directory

- Keep shell changes inside `app-shell/`. Root web files (src/, package.json, vite.config.ts, …) belong to the web side — edit them at the repo root, not here.
- Shell dependencies go into `app-shell/package.json`, followed by `npx cap sync`. Never add Capacitor deps to the root `package.json`.
- Reject on sight any proposal to "move android/ios to the repo root" — it breaks the toolchain-scope contract (eslint/tsconfig/vite all scope to `src/` or ignore `app-shell/`).
- Local verification order: root `npm run build` → inside `app-shell`: `npm run web:sync && npx cap sync`. Never run gradle/xcodebuild locally (no SDKs by design; that's CI's job).
- Commit style follows the root AGENTS.md (Angular Convention, no AI attribution).
