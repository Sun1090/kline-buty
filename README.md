# Kline Buty · Real-time K-line Chart

**English** | [中文](README.zh-CN.md)

> **Disclaimer**: This project is for educational and research purposes only. It does not constitute any investment advice. Cryptocurrency trading carries significant risk.

---

## Features

- **Real-time K-line charts** — Candlestick, line, area with 14 timeframes (1s to 1M)
- **49 drawing tools** — Trend lines, channels, Fibonacci, R:R, Gann, wedge, text annotations, and more, with undo/redo, templates, copy/paste, grouping, snap-to-OHLC alignment, per-line opacity
- **26 indicators** — Main: MA, EMA, BOLL, VWAP, SAR, Ichimoku, Supertrend · Sub: VOL, MACD, KDJ, RSI, WR, OBV, ATR, DMI, CCI, PSY, STOCH, ROC, MOM, BBW, MFI, AO, CMF, Donchian, Aroon — all with customizable parameters and presets
- **Order book & depth chart** — Real-time order book (8 bids/asks) and depth curve via WebSocket
- **Multi-chart layout** — 1/2/4 panel layouts with synchronized time axes
- **Market replay** — Historical tick-by-tick replay with speed control (1x–50x)
- **Simulated trading** — Leverage/margin/liquidation price, weighted-average cost merge, TP/SL simulated fills, slippage model, P&L tracking, equity curve, CSV trade history export, account reset
- **Price alerts** — Conditional triggers (≥/≤) with browser notifications, one-shot or repeat, time-window compound conditions, 4 selectable alert sounds
- **i18n** — 中文 · English · 日本語 · 한국어 · Español
- **Dark/Light themes** — 4 color presets (classic blue, red-up-green-down, purple, teal)
- **PWA support** — Installable, offline cache, background notifications
- **Keyboard shortcuts** — ⌘K symbol search, `1`/`2`/`3` layouts, `[`/`]` periods, `Space` replay, `?` help
- **CSV export** — OHLCV + indicators
- **Region screenshot** — Drag-select to export PNG
- **Mobile touch** — Pinch zoom, crosshair with 2s linger, touch drawing editing, long-press quick actions
- **Layer management** — Show/hide, lock/unlock, group/fold, delete drawings
- **Reliability** — Local K-line cache for instant cold start, rAF frame coalescing, WS watchdog with exponential backoff reconnect, multi-source fallback, load-failure retry
- **Keyboard accessibility** — Full keyboard flow: after Tabbing into a panel, arrow keys move focus across tool/symbol/layer grids (wraps around), Enter/Space selects; Esc closes overlays one layer at a time (no global Esc leak); replay seek bar supports arrow-key stepping and click-to-jump; drawing/period/layout buttons use aria-pressed for selected state, lists expose role=listbox/option + aria-selected for screen readers

## Online Preview

| Platform | URL | Note |
|---|---|---|
| GitHub Pages | <a href="https://sun1090.github.io/kline-buty/" target="_blank">预览地址</a> | Auto-deploy on push main |
| Vercel | <a href="https://kline-buty.vercel.app/" target="_blank">预览地址</a> | Preview, root path mode |

## Knowledge Base

27 chapters, 201 docs covering: spot, futures, stocks, crypto, forex, options, macro, quantitative trading, regulation, data interpretation, and global markets.

| Platform | URL |
|---|---|
| GitHub Pages | <a href="https://sun1090.github.io/kline-buty/knowledge/" target="_blank">预览地址</a> |
| Vercel | <a href="https://kline-buty.vercel.app/knowledge/" target="_blank">预览地址</a> |

## Quick Start

```bash
npm install && npm run dev   # → http://localhost:5173
npm run typecheck            # TypeScript type check
npm run test                 # Unit tests (Node ≥ 22)
npm run e2e                  # Playwright E2E
npm run build                # Production build
```

Data source: <a href="https://www.binance.com/" target="_blank">Binance</a> public API (REST + WebSocket), proxied via Vite dev server — no API key required.

## Tech Stack

<a href="https://react.dev/" target="_blank">React 19</a> + <a href="https://www.typescriptlang.org/" target="_blank">TypeScript 6</a> + <a href="https://vite.dev/" target="_blank">Vite 8</a> + <a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts v5</a> (TradingView, Apache-2.0)

```
src/
├── chart/           # Domain types + rendering adapter (swappable engine)
├── components/      # ChartView / ChartPair / ChartQuad / OrderBook / DepthChart / panels
├── data/
│   ├── binance/     # REST pagination, WS client (watchdog, backoff reconnect, backfill)
│   ├── market.ts    # K-line store: ordered cache, idempotent merge
│   └── cache.ts     # Local K-line cache (cold-start speedup)
├── drawings/        # Drawing logic: 49 tools, undo/redo, templates, grouping, snap
├── indicators/      # Indicator engine (pure functions, 26 indicators)
├── alerts/          # Price alert engine (one-shot/repeat, time window)
├── trade/ position/ # Simulated trading: orders, positions, P&L
├── replay/          # Market replay engine
├── depth/ volumeProfile/  # Order book aggregation, VPVR
├── hooks/           # useKlineData, usePriceAlerts, usePaperAccount, etc.
├── i18n/            # Dictionary-driven i18n (5 languages)
└── utils/           # format / csv / equity / sparkline path
```

## Data Compliance

- **Data source**: <a href="https://www.binance.com/" target="_blank">Binance public API</a> (REST + WebSocket), no API key needed. Please comply with <a href="https://www.binance.com/en/terms" target="_blank">Binance Terms of Service</a> and data usage restrictions.
- **Chart engine**: <a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts</a> by TradingView (Apache-2.0). Attribution logo is displayed per license requirements.
- **License**: MIT — see [LICENSE](LICENSE). Note: Binance data and TradingView engine are governed by their respective terms.

## Ecosystem

| Project | Description |
|---|---|
| [Kline Buty](https://github.com/sun1090/kline-buty) | The core charting application |
| [Knowledge Base](https://kline-buty.vercel.app/knowledge/) | Trading knowledge base (27 chapters) |
| [Documentation](docs/) | Project docs: research, requirements, architecture, timeline, deployment |

## Progress

<img src="https://img.shields.io/badge/drawing_tools-49-blueviolet" alt="49 drawing tools" /> <img src="https://img.shields.io/badge/indicators-26-success" alt="26 indicators" /> <img src="https://img.shields.io/badge/E2E-121-blue" alt="121 E2E tests" /> <img src="https://img.shields.io/badge/unit_tests-1000-yellow" alt="1000 unit tests" /> <img src="https://img.shields.io/github/actions/workflow/status/sun1090/kline-buty/ci.yml?branch=main" alt="CI" />

- ✅ M0 Research & Planning — docs complete
- ✅ M1 Data foundation — Binance REST/WS, MarketStore, reconnection
- ✅ M2 Chart MVP — Candlestick, volume, MA, crosshair, 7 timeframes
- ✅ M3 Indicators & interaction — 13 indicators, subchart switching, pagination
- ✅ M4 UX polish — Chart types, custom params, fullscreen, layout persistence
- ✅ M5 Performance — 20k bars: all indicators < 60ms, render < 65ms, update < 0.4ms
- ✅ P2-3 Market replay — Tick-by-tick, speed control, seek
- ✅ P2-2 Multi-chart — Dual/quad panels, synced time axis
- ✅ P2-4 Derivatives data — Funding rate, open interest, mark price
- ✅ P2-1 Order overlay — Simulated positions, TP/SL, P&L
- ✅ P2-5 Price alerts — Conditional triggers, browser notifications, SW background
- ✅ P2-6 Mobile base — PWA manifest, responsive layout
- ✅ M10–M21 Drawing tools — 40 tools, full editing, layer management
- ✅ M22 Mobile pinch zoom — Touch zoom for time & price axes
- ✅ M23 i18n — Japanese, Korean, Spanish
- ✅ M24 Order book quick trade — Hover → quick order panel
- ✅ M25 Region screenshot — Drag-select → PNG export
- ✅ M26 Keyboard shortcuts — Comprehensive shortcut map
- ✅ M27–M30 Drawing completion — Fib time zones, Gann, polyline, measure, wedge, cycle, channel, etc.
- ✅ Mobile — OHLC tooltip overflow prevention, 2s linger, touch drawing, auto-return to read mode
- ✅ P1-2–P1-6 Drawing tools, depth chart, order book, period completion, chart screenshot
- ✅ Production — Docker, nginx proxy, deployment docs
- ✅ Robustness — ErrorBoundary, offline banner, empty state, partial failure tolerance
- ✅ VPVR — Volume profile visible range
- ✅ Engineering — ESLint 0 error, CI (typecheck/lint/test/build), 89 E2E tests
- ✅ P3/P4 — 47 items implemented of the 100-item deepening list (see `docs/07-P3P4-任务清单.md` + `docs/11-P3P4-完成状态盘点.md`): 5 new sub-indicators (MFI/AO/CMF/Donchian/Aroon), drawing undo/redo/templates/grouping/snap/hover-highlight/text-align, simulated trading (leverage/margin/liquidation, weighted-cost merge, TP/SL fills, slippage, equity curve), alerts (repeat mode, 4 sounds, time-window), paper account CSV export & reset, K-line cache, frame coalescing, error retry, keyboard navigation, locale number formatting

## Changelog

See <a href="https://github.com/sun1090/kline-buty/releases" target="_blank">GitHub Releases</a> for a full changelog.

## Design Highlights

- **Decoupled data & rendering** — `ChartApi` interface abstracts the rendering engine, swappable without touching data layer
- **Incremental rendering** — WS real-time frames go through `update` path, never interrupting user zoom/pan
- **Auto endpoint detection** — `detectMode()` probes proxy vs direct at startup; static hosting (Pages/Vercel) goes direct with CORS-enabled Binance domains, self-hosted/CI uses a proxy — zero config per environment
- **Self-healing connection** — WS watchdog + exponential backoff reconnect (max 30s) + REST gap-fill, idempotent merge at store layer; fapi→dapi multi-source fallback
- **Pure-function business logic** — indicator engine, drawing geometry, trade/position/alert rules are all pure functions with unit tests, decoupled from the renderer

## How to Contribute

1. Fork the repo
2. Create your branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -am 'feat(scope): description'`
4. Push: `git push origin feat/your-feature`
5. Submit a Pull Request

Commit convention follows [Angular Convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular).

## Sponsor

If you find this project helpful, consider buying the author a coffee to support ongoing development ☕

<table>
  <tr>
    <td align="center"><img src="public/donate-alipay.jpg" width="200" alt="Alipay QR" /><br/>Alipay</td>
    <td align="center"><img src="public/donate-wechat.jpg" width="200" alt="WeChat QR" /><br/>WeChat</td>
  </tr>
</table>

## License

[MIT](LICENSE) © sun1090