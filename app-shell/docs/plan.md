# kline-buty-app · Multi-platform App Plan

> TL;DR: **No rewrite — "shell + shared tree" in two steps.** Phase 1 packages the existing kline-buty web app into iOS/Android apps via Capacitor (≈95% code reuse); the shell lives on a dedicated `app` branch inside the same repo, with all app work confined to `app-shell/`. Desktop via Tauri is a later, optional step. Store launches target overseas first; mainland China is covered by PWA/sideload to stay clear of crypto-content and filing (备案) compliance risk.

- Source 1: `alpha/docs/多端技术调研.md` (2026-08 framework landscape & selection guide)
- Source 2: the existing `kline-buty` repo (React 18 + TS + Vite + lightweight-charts v5, 597 unit tests / 88 E2E)
- Source 3: market research, Aug 2026 (summary in §8)

---

## 1. What we already have

kline-buty is a complete web terminal (benchmarked against OKX/Binance/Bybit charting):

| Capability | State | Reuse for app |
|---|---|---|
| Data layer (Binance REST/WS, reconnect, gap fill, idempotent merge) | `src/data/`, pure TS, zero DOM | ★ reuse as-is |
| Indicator engine (13+) | `src/indicators/`, pure functions | ★ reuse as-is |
| Chart adapter (isolates lightweight-charts) | `src/chart/adapter.ts` (2,801 lines) | ★ reuse inside WebView |
| Drawing tools (40) + layers panel | `src/drawings/` | ★ reuse as-is |
| Replay / paper positions / order book / VPVR / price alerts | `src/replay` `position` `depth` `volumeProfile` `alerts` | ★ mostly reusable; alerts need native rework |
| Touch gestures (pinch zoom, touch drawing, OHLC hold) | `src/chart/touchGestures.ts` etc. | ★ built for mobile already |
| i18n (5 langs), themes, PWA | `src/i18n/` etc. | ★ reuse; PWA coexists with the shell |
| Knowledge base (27 chapters, 201 docs) | `docs/knowledge/` + VitePress | later: offline content module |

**The key precondition already holds**: kline-buty's tech plan §6 reserved "data layer fully decoupled from rendering" with a mobile phase-2 route of "WebView shell first (PWA/Capacitor), reuse everything". The alpha research agrees — hybrid shells have a lower experience ceiling than native but the lowest cross-platform cost. The chart is Canvas-rendered; even a React Native rewrite would embed a WebView or re-implement 2,800 lines of adapter + 40 drawing tools in Skia — not worth it.

## 2. Market positioning (summary; details §8)

- **Space**: 560M+ global crypto owners (~7–9% of population); Q1 2026 retail crypto activity $979B (TRM Labs). TradingView claims 100M traders — professional charting demand is proven.
- **Gap**: TradingView is heavy, social, subscription-gated; exchange apps treat charts as an afterthought (weak drawing, no replay/teaching features); open-source klinecharts demos are far behind.
- **Differentiation**: **login-free, free, privacy-friendly** advanced charting terminal: 40 drawing tools + market replay + paper positions + VPVR + a 27-chapter offline knowledge base. Target: serious chartists and learners.
- **Compliance red line**: market data + paper trading only. **No real trading, no API-key custody** in v1 — minimizes store-review and financial-compliance risk. Crypto apps can't ship mainland stores (filing regime, content policy) — **overseas first**.

## 3. Tech selection

### 3.1 Decision table

| Target | Choice | Why (vs alpha research) |
|---|---|---|
| iOS + Android (phase 1) | **Capacitor** (8.x) | Most mature plugin ecosystem (notifications/status bar/splash/share all covered); the mainstream "web code in a native shell" route |
| Desktop (phase 2, optional) | **Tauri v2** | Alpha's quick-pick: Web + desktop → Tauri (small bundle); desktop needs no mobile plugin ecosystem |
| Mini-programs / HarmonyOS | not now | Crypto content fails CN platform review; revisit Taro/uni-app only if non-crypto data sources (stocks/FX) arrive |
| RN / Flutter rewrite | rejected | Canvas charts still need a WebView inside RN; high cost, low gain. Revisit only for hard native-experience gaps |

### 3.2 Why not Tauri v2 for mobile

The app needs local notifications (price alerts), push, status bar/safe-area, splash, share — Capacitor ships first-class plugins for all; Tauri v2's mobile plugin ecosystem is still young (community consensus). Desktop flips the trade-off — Tauri's bundle is far smaller. Same web core feeds both.

### 3.3 Target architecture (final: same repo + `app` branch + `app-shell/`)

**Decision (2026-08-22, final)**: the original kline-buty working directory is under active development, so app work is isolated in a clean clone pulled from remote `main` (this directory), on a dedicated `app` branch. Web and app build from the same tree (no cross-repo sync); `main` stays pure web.

```
kline-buty repo (one tree, two branches)
├── main branch          # pure web: app code, tests, E2E, Pages/Vercel deploys (zero app code)
│      │ npm run build → dist/
│      ▼
└── app branch = main + only app-shell/ and two workflows
   app-shell/
   ├── README.md             # shell entry: command quick-ref + rules
   ├── AGENTS.md             # agent entry (hard rules)
   ├── scripts/sync-web.mjs  # in-tree copy: ../dist → www/ (excludes knowledge/ by default)
   ├── capacitor.config.ts   # appId app.klinebuty.chart, webDir: www
   ├── android/              # native project (generated locally; no Android SDK needed; builds in CI)
   ├── ios/                  # native project (Capacitor 8 uses SPM; no CocoaPods)
   ├── docs/                 # plan / build-and-release / operations (English only)
   └── package.json          # shell-only deps (Capacitor); never touches root package.json
   .github/workflows/android-app.yml / ios-app.yml   # trigger: branches [app]
```

**Discipline (keeps `git merge main` into app near-conflict-free forever):**

1. The app branch makes **zero modifications** to files that exist on main — sole exception: `'app-shell'` added to the `eslint.config.js` ignore list (otherwise lint scans the minified www/ output: 6,309 false errors).
2. All shell deps live in `app-shell/package.json`; root package.json is never touched.
3. **Never open an app→main PR**; the app branch only absorbs updates via one-way `git merge main`.
4. **Never check out main to work in this clone** (web changes belong in the original kline-buty directory). Checking out main removes app-shell's tracked .gitignore files, leaving generated files (android assets etc.) unprotected — a subsequent `git add -A` on main would commit junk. Absorb updates with:
   ```bash
   git fetch origin && git merge origin/main
   ```
5. kline-buty's own CI (ci.yml/pages.yml) triggers only on main/PR — pushing the app branch never runs them.

- The daily dev loop is unchanged: `npm run dev` on main (browser + real-device browser). Refreshing the packaged web only needs a root build followed by `npm run cap:sync` inside app-shell.
- Extracting a shared `packages/core` is postponed indefinitely: with a single consumer it's premature abstraction, and src/ module boundaries are already clean.

### 3.4 Six pitfalls & six rules (live-demonstrated 2026-08-22 in throwaway repos)

| # | Pitfall (reproduced live) | Rule |
|---|---|---|
| 1 | A bad commit on main (type error) merges cleanly, but the app branch CI dies at the very first `tsc` step | **Post-merge local gate**: `npm run build` (~15s) must pass before push |
| 2 | Editing src/ on the app branch: the change never reaches main (web users never get it), and when main later touches the same area a bogus conflict erupts | **Only edit files inside `app-shell/`** (the eslint line excepted); web changes always go through main |
| 3 | Merging then syncing without rebuilding → the APK contains the old web (src is v2, www still v1) | **Local packaging trio**: root `npm run build` → `npm run web:sync` in app-shell → push. CI is inherently safe (full rebuild every run) |
| 4 | Debug APKs are signed with the ephemeral runner's `~/.android/debug.keystore` — a different signature every CI run → upgrade-install fails; uninstalling wipes localStorage (layouts/alerts/preferences) | M0 accepted: uninstall before installing. **M1 TODO: pin the keystore** (generate once in CI, store in secrets or commit it) |
| 5 | Uncommitted WIP in the original directory belongs to no branch — merges never carry it over | **Web changes must be committed & pushed to main** before the app can get them |
| 6 | Conflict resolution spiraling | **Escape hatch**: `git diff --name-only --diff-filter=U` to scope it; `git merge --abort` to reset. Never commit conflict markers |
| 7 | Committing app-shell work while main has drifted → the gap widens; a later merge piles up unrelated hunks | **Pre-commit fetch**: `git fetch origin && git merge origin/main` before staging app-shell changes; resolve, rebuild (`npm run build`), then commit |

package.json conflicts ruled out by test: the app branch never touches root package.json, so a new dependency added on main auto-merges (verified with a simulated lodash addition). The only conflict surface is the eslint.config.js ignore line (resolution: keep both words).

## 4. Network layer (verified: zero changes)

The shell has no Vite proxy, but kline-buty's `src/data/binance/endpoints.ts` **already auto-detects the mode**: it probes `/api/v3/ping`; inside the shell (`https://localhost` / `capacitor://localhost`) the probe fails → automatic `direct` mode against Binance (`data-api.binance.vision` + `wss://stream.binance.com:9443`, both CORS-enabled). This capability was built for static GitHub Pages hosting; the app shell inherits it — **not a single line of the data layer changes**. A self-hosted proxy option remains for restricted-network users in a later version.

## 5. Mobile-specific work items

| Item | Notes | Priority |
|---|---|---|
| Safe area / notch / status bar / splash | capacitor-status-bar / splash-screen | P0 |
| Android back button & edge gestures | back-stack vs chart-gesture conflicts | P0 |
| Native price alerts | Web SW notifications don't work inside the shell → Local Notifications; foreground WS triggers instantly | P0 |
| Background price alerts | true background needs a native task or a lightweight serverless poller; v1 states "alerts while app is running", background is P2 | P1 |
| Screenshot/CSV share | capacitor-share | P1 |
| Crash monitoring | Sentry Capacitor SDK | P1 |
| Build pipeline | GitHub Actions: both platforms + signing + TestFlight / Play internal track | P0 |
| Update strategy | store releases; hot-update only if a Capgo-style solution passes store policy (alpha warning) | P2 |
| App icon/copy/store assets | disclaimer, no-login note, privacy policy page | P0 |

### 5.1 Local toolchain strategy (zero new installs)

Principle: **Node only on this machine (already present); native builds in the cloud.** Flutter/Dart never needed; Capacitor itself is a plain npm dependency.

| Target | Conventional install | This machine | Zero-install approach |
|---|---|---|---|
| Android | Android Studio + SDK + JDK (5–8GB) | none installed | GitHub Actions Linux runner builds the APK; sideload on device |
| iOS | full Xcode (~15GB) + CocoaPods | CLT only, no pods | GitHub Actions macOS runner; **Capacitor 8 uses SPM — CocoaPods never needed** |
| Desktop (Tauri) | Rust toolchain | rustc/cargo present | zero new installs; local .app/.dmg anytime |
| Web | Node | Node 26 present | zero new installs |

Honest costs:

- iOS cloud builds need one-time App Store Connect API key + signing setup; macOS runners bill at 10× on the free tier (~15–20 iOS builds/month). Milestone-based releases fit; frequent debugging doesn't (fallback: Codemagic, 500 free min/month).
- Local iOS-simulator debugging would want full Xcode — optional later, never a prerequisite.
- Cloud artifacts must be spot-checked on a real device before distribution (same discipline as kline-buty's deploy rules).

## 6. Milestones

| Phase | Scope | Acceptance |
|---|---|---|
| M0 shell validation ✅ (2026-08-22, local) | app branch + app-shell/ + Android/iOS projects + in-tree sync script + cloud-build workflows; lint/typecheck at parity with main | pending: push app branch → CI APK → real-device check of chart/gestures/direct connection |
| M1 mobile experience (~2 wks) | all P0 items + notifications + pipeline | installable via TestFlight / Play internal |
| M2 app polish (~2 wks) | safe-area/status-bar/back button, share, Sentry, splash | real-device checklist green |
| M3 v1.0 release | store assets, privacy policy, overseas launch | App Store (non-CN) + Google Play approved |
| M4 later | Tauri desktop (separate dir), background alerts, drawing cloud-sync (first paid feature), offline knowledge pack | — |

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Ephemeral CI debug signature blocks upgrade installs | M0 uninstall/reinstall (data loss acknowledged); M1 pinned keystore (§3.4 pitfall 4) |
| "Knowledge base" entry 404s in-app | sync script excludes dist/knowledge (59MB) by default; M1 decides: `--with-knowledge` offline pack vs external link |
| WebView rendering ceiling (old devices, Canvas jank) | re-verify the 20k-candle <60ms budget on mainstream devices; existing windowing; degrade on extreme devices |
| Binance API unreachable in some networks | dual domains + configurable self-hosted proxy; data layer is pluggable (OKX/Bybit candidates) |
| Store review (crypto category) | market data + paper trading only; no real trading, no key custody; copy emphasizes tools/education; overseas first |
| Mainland compliance (filing, crypto content) | no mainland launch; PWA + APK sideload; revisit only with non-crypto data sources |
| Branch drift from main | one-way `git merge main`; the only main-file touch is the eslint ignore line — conflict probability ≈ 0; app→main PRs forbidden |
| Hot-update policy | not relied upon; store release cadence |

## 8. Market research summary (2026-08)

- **Users**: ~560–740M global crypto owners (Triple-A 2024: 562M; 2026 estimates 7–9% of population). triple-a.io / solcard.cc
- **Activity**: TRM Labs Q1 2026 global retail crypto activity $979B, US first. trmlabs.com
- **Market size**: Statista projects $85.3B global crypto revenue in 2026, ARPU $109; crypto payment apps $646M (2025) → $2.4B (2033, CAGR 18%). Wide methodological variance — order of magnitude only.
- **Benchmark**: TradingView claims 100M traders (pricing page); third-party history 30–50M users (2023–24) — proof that professional charting has mass demand; its free-tier limits (indicators, alerts, multi-chart) are exactly the wedge for a free, login-free tool.
- **Framework landscape** (cross-checked with alpha): Capacitor ~15% of hybrid share, most mature plugins; Tauri v2 mobile young, desktop strong; RN for native-first new apps. reddit r/sveltejs, oflight.co.jp 2026 overview, bacancytechnology.com guide.

## 9. Open items (need a decision)

1. ~~Repo shape~~ → **Decided (2026-08-22, final): same repo + `app` branch + `app-shell/`.** The earlier standalone-repo variant is retired (backup at kline-buty-app.bak, delete once confirmed).
2. `appId: app.klinebuty.chart` is a placeholder (changeable until first store submission, fixed forever after).
3. Background price alerts: serverless poller vs native background task — M4.
4. Monetization timing: does cloud-sync/multi-device Pro subscription enter v1.x?
