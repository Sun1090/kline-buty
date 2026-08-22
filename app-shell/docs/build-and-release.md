# Build & Release

> This doc covers only the app shell (app branch): builds, artifacts, installation, release roadmap. Web deployment lives in the root `docs/05-部署.md` on main (untouched here).

---

## 1. CI workflows (the only build entry)

This machine has **no** Android SDK / Xcode — all native builds run on GitHub Actions.

| Workflow | File | Trigger | Artifact | Retention |
|---|---|---|---|---|
| app-android-apk | `.github/workflows/android-app.yml` | push to `app` / manual | `kline-buty-debug-apk` (sideloadable debug APK) | 14 days |
| app-ios-simulator-build | `.github/workflows/ios-app.yml` | **manual only** (macOS runners bill at 10× — save minutes) | `kline-buty-ios-simulator` (unsigned simulator .app.zip) | 14 days |

Both run the same chain: checkout `app` → root `npm ci` → `typecheck + lint + test + build` (dist/) → `app-shell`: `npm ci + web:sync + cap sync` → native build. **Every run is a full rebuild — stale-web-in-APK cannot happen in CI** (local packaging lacks that guarantee; see the trio in operations.md).

## 2. Fetching & installing the APK (Android)

1. GitHub repo → Actions → latest `app-android-apk` → Artifacts → download `kline-buty-debug-apk` (zip; extract `app-debug.apk`);
2. Transfer to the phone (file transfer app / cloud drive / USB);
3. **Uninstall the previous version before installing** (see below);
4. First install requires allowing "install unknown apps".

### Why uninstall first: the debug-signature issue (pitfall 4)

`build.gradle` has no signingConfigs, so debug builds sign with the build machine's ephemeral `~/.android/debug.keystore` — **every CI run produces a different signature**, and Android refuses upgrade-installs across signatures. Uninstalling wipes localStorage (watchlist, drawings, alerts, language preferences).

**M1 fix** (on the todo): generate a keystore once in CI via keytool → GitHub Secrets (`KEYSTORE_BASE64` + passwords) → decode in the workflow → signingConfig in `build.gradle`. Upgrade installs and data retention return to normal.

## 3. iOS simulator build (current verification path)

iOS currently produces an **unsigned, simulator-only** .app:

1. Actions → `app-ios-simulator-build` → Run workflow (pick the `app` branch);
2. Download and unzip `kline-buty-ios-simulator.zip`;
3. Requires a Mac with full Xcode: `xcrun simctl boot "iPhone 16"`, then `xcrun simctl install booted App.app && xcrun simctl launch booted app.klinebuty.chart`.

> This machine (Command Line Tools only) can't run step 3 — the real-device/TestFlight path is §4.

## 4. Release roadmap

### M1: pinned signing

- Android: generate keystore (one-time keytool in CI) → Secrets → decode into the workflow → `signingConfig`; wire both debug and release.
- iOS: Apple Developer ($99/yr) → certs + provisioning into Secrets → switch the workflow to `xcodebuild archive + export`, ship to TestFlight.

### M3: store launch checklist (overseas)

- **Google Play**: developer account ($25 once) → upload an AAB (switch to `bundleRelease`) → privacy-policy URL → content rating questionnaire → crypto category filed as tools/education (no real trading, no custody).
- **App Store**: App Store Connect record → screenshots/description/disclaimer → review note: "market-data tool, paper trading only" → TestFlight external → submit.
- **No mainland launch** (compliance, plan.md §7); mainland users get PWA/sideload.
- Confirm `appId: app.klinebuty.chart` before first submission (locked forever after).

## 5. CI failure quick reference

| Symptom | Cause | Fix |
|---|---|---|
| gradle SDK / license errors | runner missing components/licenses | add an `android-actions/setup-android` step |
| setup-node: Multiple lockfiles | two lockfiles in the repo | already handled via `cache-dependency-path: package-lock.json` — don't drop it when editing |
| root `npm run build` fails | broken web code merged from main (pitfall 1) | reproduce locally with `npm run build`, fix, push — this is exactly what the post-merge gate catches |
| xcodebuild can't find scheme/target | iOS project layout changed | keep `-project App.xcodeproj -target App` (Capacitor 8 has no xcworkspace) |
| cap sync: Could not find TypeScript | app-shell deps incomplete | ensure `app-shell/package.json` has typescript and the lockfile is committed |
