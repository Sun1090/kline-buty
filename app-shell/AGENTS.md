# AGENTS.md (app-shell)

Entry point for agents working on the app-shell. The root AGENTS.md governs the web side; do not cross the boundary.

## Autonomous Execution and Branch Lifecycle

- Work continuously from repository evidence: inspect → choose the highest-priority executable task → implement → test → fix → verify → commit → update progress → inspect again. Do not stop merely because one task, commit, PR, release, or milestone is complete.
- Before coding, inspect the roadmap/milestones, TODO/FIXME markers, CI/build/test status, and `docs/progress.md`; create `docs/progress.md` when the repository uses no equivalent progress log.
- Prioritize blockers, failing quality/security gates, core bugs, milestone critical paths, tests/migrations, performance/CI, dependencies/security, then documentation. Fix discovered issues when feasible instead of only recording them.
- Stop only when all executable work is complete, a product decision or credential/external permission is required, an upstream dependency blocks every remaining task, or a hard tool/context limit prevents further progress.
- Use a focused topic branch and atomic Conventional/Angular commits unless this repository explicitly requires direct-to-main development. Rebase with `git fetch origin && git rebase origin/<base>`; never create merge commits, force-push, rewrite shared history, or change repository protection rules.
- **Remote topic branches are temporary PR transport, not persistent storage.** Do not push `codex/*`, `feat/*`, or any other topic branch merely for backup/checkpoints. Push one only when opening or updating its PR. After a PR is merged or closed, delete its remote branch immediately and prune stale tracking refs. Before starting another branch, audit open PRs and remote branches; finish/merge viable work and remove branches already merged.
- Never push directly to `main`/`master` when the repository uses protected-branch PR review. Where direct-to-main is explicitly documented, that repository-specific rule takes precedence.
- Keep `docs/progress.md` (or the repository equivalent) current with milestone/version, status, branch/commit, completed work, changed files, verification, blockers, risks/rollback, next task, and update date.

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
