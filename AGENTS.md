# AGENTS.md

This file is the agent entry point: it routes to concrete rules. Don't pile every detail here; keep it scannable.

## Project

Kline Buty is a real-time K-line web terminal benchmarked against OKX / Binance / Bybit, while also maintaining the `docs/knowledge/` trading knowledge base and the VitePress docs site in the same repository.

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
