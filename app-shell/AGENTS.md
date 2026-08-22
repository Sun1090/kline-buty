# AGENTS.md (app-shell)

Entry point for agents working on the app branch shell. The root AGENTS.md governs the web side; do not cross the boundary.

## One-liner

`app-shell/` is the Capacitor shell of Kline Buty: it consumes root `dist/`, produces Android/iOS builds, and all native building happens in CI.

## Read before any change

1. [`docs/plan.md`](docs/plan.md) §3.3 discipline & §3.4 six pitfalls — **required reading before touching anything**.
2. Build/artifacts/signing questions → [`docs/build-and-release.md`](docs/build-and-release.md)
3. Daily flows/debugging → [`docs/operations.md`](docs/operations.md)

## Hard rules for this directory

- Only modify files inside `app-shell/`. Root web files (src/, package.json, vite.config.ts, …) are main-branch territory — never touch them here.
- Shell dependencies go into `app-shell/package.json`, followed by `npx cap sync`.
- Reject on sight any proposal to "move android/ios to the repo root" or "add Capacitor deps to the root package.json" — both break the merge-conflict-free contract.
- Local verification order: root `npm run build` → inside `app-shell`: `npm run web:sync && npx cap sync`. Never run gradle/xcodebuild locally (no SDKs by design; that's CI's job).
- **Before committing app-shell changes**: fetch and merge `origin/main` first (`git fetch origin && git merge origin/main`), resolve any conflict, rebuild, then commit. Keeps the app branch current and surfaces main-side edits before they compound.
- Commit style follows the root AGENTS.md (Angular Convention, no AI attribution).
