# Daily Operations

> Every manual procedure, ordered by frequency. For the reasoning behind the rules see [`plan.md`](plan.md) §3.4; this file is commands only.

---

## 1. The three daily flows

### A. How a web change reaches the app (the standard chain)

```bash
# Single branch — web and app-shell live together on main:
git add -A && git commit -m "feat(xxx): ..." && git push origin main
# CI auto-builds a fresh APK when src/ or app-shell/ changed (paths filter)
```

### B. Preview the latest packaged web locally (no CI)

```bash
npm run build                              # repo root: rebuild dist
cd app-shell && npm run web:sync           # dist → www (syncing without rebuilding = packaging stale web, pitfall 2)
# Browsing http://<Mac IP>:5173 on a real device over Wi-Fi runs the dev server;
# for what the APK actually contains, trust the CI artifact.
```

### C. First-time / environment reset (fresh clone or dependency change)

```bash
npm ci                       # repo root
cd app-shell && npm ci       # shell deps
cd .. && npm run build && cd app-shell && npm run web:sync && npx cap sync
```

## 2. On-device debugging

| Platform | Method |
|---|---|
| Android WebView | enable USB debugging → desktop Chrome opens `chrome://inspect` → pick the app's WebView → full DevTools (console/network/breakpoints) |
| iOS | Mac + Safari Develop menu (this machine has no Xcode yet; applies to simulator builds) |
| Blank-screen triage | check Console via chrome://inspect; nine times out of ten it's **direct Binance connectivity blocked by the network** (the shell auto-falls back to direct mode, plan.md §4) — switch networks or wait for the proxy option |

## 3. Upgrades & extensions (low frequency)

- **Upgrade Capacitor**: bump versions in `app-shell/package.json` → `npm install` → `npx cap sync` → real-device regression (native templates can change a lot; read the changelog first).
- **Add a native plugin** (notifications/status bar/share — M1/M2): `npm install @capacitor/xxx` → `npx cap sync`. **app-shell only — never root package.json** (§3.3 discipline).
- **Change appId / app name**: edit `app-shell/capacitor.config.ts` → `rm -rf android ios` → `npx cap add android && npx cap add ios` (regenerates native projects; appId is locked after first store submission).
- **Bundle the offline knowledge base**: `node scripts/sync-web.mjs --with-knowledge` (+60MB; the in-app "Knowledge" entry stops 404ing).

## 4. One-time cleanup (after the new setup is confirmed stable)

- [ ] Delete `/Users/mianbaopian/Projects/kline-buty-app.bak` (old standalone-repo backup)
- [ ] First real-device APK check: chart rendering, pinch zoom, live WS ticks, reconnect after network loss, language switching

## 5. Hard rules (violating these always ends badly)

1. Keep shell changes inside `app-shell/`; shell deps in `app-shell/package.json` only — never the root. Web-side dynamic imports may reference shell plugins when type declarations are local and the runtime call fails safely outside the shell.
2. Don't break the toolchain-scope boundary: `eslint.config.js` ignores `app-shell`, `tsconfig.json` includes only `src/` — keep it that way
3. `npm run build` gate before push (clean commit ≠ buildable)
4. Uninstall an old ephemeral-CI APK once before installing the first pinned-signature build; later builds upgrade in place
