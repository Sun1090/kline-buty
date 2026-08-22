# Daily Operations

> Every manual procedure, ordered by frequency. For the reasoning behind the rules see [`plan.md`](plan.md) §3.4; this file is commands only.

---

## 1. The three daily flows

### A. How a web change reaches the app (the standard chain)

```bash
# ① Original directory (kline-buty): edit → commit → push main
#    (uncommitted WIP never reaches the app — pitfall 5)
cd /Users/mianbaopian/Projects/kline-buty
git add -A && git commit -m "feat(xxx): ..." && git push origin main

# ② This directory (kline-buty-app): absorb main → gate → push app
cd /Users/mianbaopian/Projects/kline-buty-app
git fetch origin && git merge origin/main
npm run build          # ~15s gate (pitfall 1: clean merge ≠ buildable)
git push origin app    # CI builds a fresh APK
```

### B. Preview the latest packaged web locally (no CI)

```bash
npm run build                              # repo root: rebuild dist
cd app-shell && npm run web:sync           # dist → www (syncing without rebuilding = packaging stale web, pitfall 3)
# Browsing http://<Mac IP>:5173 on a real device over Wi-Fi runs the dev server;
# for what the APK actually contains, trust the CI artifact.
```

### C. First-time / environment reset (fresh clone or dependency change)

```bash
npm ci                       # repo root
cd app-shell && npm ci       # shell deps
cd .. && npm run build && cd app-shell && npm run web:sync && npx cap sync
```

## 2. Conflict cookbook (the only expected conflict: the eslint ignore line)

```bash
git merge origin/main        # if CONFLICT eslint.config.js
git diff --name-only --diff-filter=U   # confirm it's the only file
# Open eslint.config.js, replace the <<<<<<< … >>>>>>> block with one line keeping BOTH sides:
#   { ignores: ['dist', ..., 'docs-site/docs/knowledge', '<new-from-main>', 'app-shell'] },
git add eslint.config.js
git commit --no-edit
# Full reset anytime: git merge --abort (pitfall 6)
```

## 3. On-device debugging

| Platform | Method |
|---|---|
| Android WebView | enable USB debugging → desktop Chrome opens `chrome://inspect` → pick the app's WebView → full DevTools (console/network/breakpoints) |
| iOS | Mac + Safari Develop menu (this machine has no Xcode yet; applies to simulator builds) |
| Blank-screen triage | check Console via chrome://inspect; nine times out of ten it's **direct Binance connectivity blocked by the network** (the shell auto-falls back to direct mode, plan.md §4) — switch networks or wait for the proxy option |

## 4. Upgrades & extensions (low frequency)

- **Upgrade Capacitor**: bump versions in `app-shell/package.json` → `npm install` → `npx cap sync` → real-device regression (native templates can change a lot; read the changelog first).
- **Add a native plugin** (notifications/status bar/share — M1/M2): `npm install @capacitor/xxx` → `npx cap sync`. **app-shell only — never root files** (§3.3 discipline).
- **Change appId / app name**: edit `app-shell/capacitor.config.ts` → `rm -rf android ios` → `npx cap add android && npx cap add ios` (regenerates native projects; appId is locked after first store submission).
- **Bundle the offline knowledge base**: `node scripts/sync-web.mjs --with-knowledge` (+60MB; the in-app "Knowledge" entry stops 404ing).

## 5. One-time cleanup (after the new setup is confirmed stable)

- [ ] Delete `/Users/mianbaopian/Projects/kline-buty-app.bak` (old standalone-repo backup)
- [ ] First real-device APK check: chart rendering, pinch zoom, live WS ticks, reconnect after network loss, language switching

## 6. Hard rules (violating these always ends badly)

1. On the app branch, only edit files inside `app-shell/` (the eslint ignore line excepted)
2. Web changes go through main only, **committed and pushed** before the app can see them
3. Never check out main in this clone; absorb updates only via `git fetch && git merge origin/main`
4. Never open an app→main PR
5. `npm run build` gate after every merge, before push
6. Uninstall the old APK before installing a new one (until M1 pins the signature)
