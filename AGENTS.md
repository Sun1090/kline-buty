# AGENTS.md

This file is the agent entry point: it routes to concrete rules. Don't pile every detail here; keep it scannable.

## Autonomous Execution and Branch Lifecycle

- Work continuously from repository evidence: inspect → choose the highest-priority executable task → implement → test → fix → verify → commit → update progress → inspect again. Do not stop merely because one task, commit, PR, release, or milestone is complete.
- Before coding, inspect the roadmap/milestones, TODO/FIXME markers, CI/build/test status, and `docs/progress.md`; create `docs/progress.md` when the repository uses no equivalent progress log.
- Prioritize blockers, failing quality/security gates, core bugs, milestone critical paths, tests/migrations, performance/CI, dependencies/security, then documentation. Fix discovered issues when feasible instead of only recording them.
- Stop only when all executable work is complete, a product decision or credential/external permission is required, an upstream dependency blocks every remaining task, or a hard tool/context limit prevents further progress.
- Use a focused topic branch and atomic Conventional/Angular commits unless this repository explicitly requires direct-to-main development. Rebase with `git fetch origin && git rebase origin/<base>`; never create merge commits, force-push, rewrite shared history, or change repository protection rules.
- **Remote topic branches are temporary PR transport, not persistent storage.** Do not push `codex/*`, `feat/*`, or any other topic branch merely for backup/checkpoints. Push one only when opening or updating its PR. After a PR is merged or closed, delete its remote branch immediately and prune stale tracking refs. Before starting another branch, audit open PRs and remote branches; finish/merge viable work and remove branches already merged.
- Never push directly to `main`/`master` when the repository uses protected-branch PR review. Where direct-to-main is explicitly documented, that repository-specific rule takes precedence.
- Keep `docs/progress.md` (or the repository equivalent) current with milestone/version, status, branch/commit, completed work, changed files, verification, blockers, risks/rollback, next task, and update date.

## Project

Kline Buty is a real-time K-line web terminal benchmarked against OKX / Binance / Bybit, while also maintaining the `docs/knowledge/` trading knowledge base and the VitePress docs site in the same repository.

## Reuse First

Prefer what's already installed over hand-rolled code: check `package.json` for a dependency that covers the need before writing your own, and grep `src/` for an existing util/hook/adapter before creating a new one. The codebase is layered (`chart/`, `data/`, `indicators/`, `drawings/`, `hooks/`) — extend those layers instead of forking them. Add a new dependency only when nothing installed or built-in fits, and state why in the PR.

## Required Reading

1. [`README.md`](README.md) — product capabilities, preview URLs, tech stack, quick start.
2. [`docs/agents/project.md`](docs/agents/project.md) — architectural boundaries and key directories.
3. Read by task:
   - Before coding: [`docs/agents/coding.md`](docs/agents/coding.md)
   - When reviewing changes: [`docs/agents/review.md`](docs/agents/review.md)
   - At delivery/acceptance: [`docs/agents/acceptance.md`](docs/agents/acceptance.md)
   - When committing/pushing: [`docs/agents/commit.md`](docs/agents/commit.md)
   - When editing the knowledge base or docs site: [`docs/agents/knowledge.md`](docs/agents/knowledge.md)

## Non-reversible Product Decisions

- The top bar stays collapsed; low-frequency controls go under "More". Don't expand the bar or introduce horizontal scroll just to show every entry at once.
- Mobile functional areas wrap to new rows; no horizontal scrollbars. At 320px width the key controls must be immediately visible.
- The main app's README is English by default; Chinese lives in a separate file. External links are grouped and open in new tabs.
- The knowledge base is not a plain-text repo: important concepts should have tables, flowcharts, SVG, or structured navigation.
- Knowledge-base articles must have frontmatter and a "⚠️ Risk Warning" block; referenced images/SVG must be committed to the repo before being referenced — a missing asset breaks the docs-site build.
- VitePress anchor links must scroll the page content to the real target heading, not just update the URL bar.
- Deployment is not done when "push succeeds"; wait for CI / Pages / Vercel results and do a live spot-check.
- Build commands run at the **repo root** only: `cd`-ing into a subdirectory loses relative-path anchors, and `docs:build` / `git` will misreport missing paths.
- When dev/test/acceptance needs the main app running, run `npm run dev` at the repo root and access `http://localhost:5173/` — don't change the port or spawn a random service.
- Commits add no `Co-Authored-By` or any AI sign-off; the author is `sun1090` only.

## Task Dispatch

- Split tasks by module boundary; no large unrelated changes in one pass. UI changes must state how they were verified on desktop and mobile.
- One commit = one logical topic; don't mix in unrelated knowledge-base batch changes.
- For batched knowledge-base work via subagents: ≤ 9 files per agent (use grep summaries), don't read full files.

## Product Boundaries (thesis → queue, not checklist)

Boundaries derive from the project thesis above: a free, no-API-key open-source real-time chart backed by Binance public data — implying no backend, no account system, no native-engineering commitments. Queues derive from this boundary; parked ideas are not backlog items unless their entry conditions are met.

### In Scope (thesis-internal queue)

- Verification and deepening of existing engines (replay / orderbook / drawing / indicators)
- E2E flake source-convergence (synthetic ?perf data contracts, property-based checks instead of pixel drift)
- Pure frontend capabilities

### Out of Scope (parking; every item carries entry conditions)

- I3 multi-device cloud sync: entry = decision to go SaaS + backend/KV cost accepted (H7/H8 settings-snapshot JSON remains the manual web equivalent)
- I11 mobile Widget: entry = Capacitor shell project merge decision + native maintenance commitment (PWA remains the web equivalent)

### Upstream Blocked (blocked maintenance, NOT parking)

- TypeScript 7 upgrade: unblocks = typescript-eslint compatibility with the TS7 Go-native compiler (PR comment recorded; re-evaluate on official support)

### Boundary Review Signals (check before moving any boundary)

- Whether H7/H8 JSON manual migration has become materially insufficient
- Whether native-app scenarios recur and PWA cannot cover them
