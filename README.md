# Kline Buty · Real-time K-line Chart

**English** | [中文](README.zh-CN.md)

> **Disclaimer**: This project is for educational and research purposes only. It does not constitute any investment advice. Cryptocurrency trading carries significant risk.

---

## Features

- **Real-time K-line charts** — Candlestick, line, area with 14 timeframes (1s to 1M)
- **40 drawing tools** — Trend lines, channels, Fibonacci, R:R, Gann, wedge, text annotations, and more
- **13+ indicators** — MA, EMA, BOLL, MACD, KDJ, RSI, SAR, Ichimoku, STOCH, ROC, MOM, WR, ATR, DMI, CCI, PSY, OBV, with customizable parameters
- **Order book & depth chart** — Real-time order book (8 bids/asks) and depth curve via WebSocket
- **Multi-chart layout** — 1/2/4 panel layouts with synchronized time axes
- **Market replay** — Historical tick-by-tick replay with speed control (1x–50x)
- **Simulated positions** — Long/short orders with TP/SL lines, P&L tracking
- **Price alerts** — Conditional triggers (≥/≤) with browser notifications
- **i18n** — 中文 · English · 日本語 · 한국어 · Español
- **Dark/Light themes** — 4 color presets (classic blue, red-up-green-down, purple, teal)
- **PWA support** — Installable, offline cache, background notifications
- **Keyboard shortcuts** — ⌘K symbol search, `1`/`2`/`3` layouts, `[`/`]` periods, `Space` replay, `?` help
- **CSV export** — OHLCV + indicators
- **Region screenshot** — Drag-select to export PNG
- **Mobile touch** — Pinch zoom, crosshair with 2s linger, touch drawing editing
- **Layer management** — Show/hide, lock/unlock, delete drawings

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

<a href="https://react.dev/" target="_blank">React 18</a> + <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> + <a href="https://vite.dev/" target="_blank">Vite</a> + <a href="https://github.com/tradingview/lightweight-charts" target="_blank">lightweight-charts v5</a> (TradingView, Apache-2.0)

```
src/
├── chart/           # Domain types + rendering adapter (swappable engine)
├── components/      # ChartView / PeriodBar / SymbolPicker / MarketList
├── data/
│   ├── binance/     # REST pagination, WS client (heartbeat, reconnect, backfill)
│   └── market.ts    # K-line store: ordered cache, idempotent merge
├── hooks/           # useKlineData, useTickerList, etc.
├── i18n/            # Dictionary-driven i18n (5 languages)
├── indicators/      # Indicator engine (pure functions)
└── drawings/        # Drawing tools (40) and layer management
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

<img src="https://img.shields.io/badge/drawing_tools-40-blueviolet" alt="40 drawing tools" /> <img src="https://img.shields.io/badge/indicators-13-success" alt="13 indicators" /> <img src="https://img.shields.io/badge/E2E-88-blue" alt="88 E2E tests" /> <img src="https://img.shields.io/badge/unit_tests-597-yellow" alt="597 unit tests" /> <img src="https://img.shields.io/github/actions/workflow/status/sun1090/kline-buty/ci.yml?branch=main" alt="CI" />

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
- ✅ Engineering — ESLint 0 error, CI (typecheck/lint/test/build), 88 E2E tests

## Changelog

See <a href="https://github.com/sun1090/kline-buty/releases" target="_blank">GitHub Releases</a> for a full changelog.

## Design Highlights

- **Decoupled data & rendering** — `ChartApi` interface abstracts the rendering engine, swappable without touching data layer
- **Incremental rendering** — WS real-time frames go through `update` path, never interrupting user zoom/pan
- **Consistent proxy routing** — All requests use `/api` `/ws` prefixes, zero config change when switching environments
- **Self-healing connection** — Exponential backoff reconnect + REST gap-fill, idempotent merge at store layer

## How to Contribute

1. Fork the repo
2. Create your branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -am 'feat(scope): description'`
4. Push: `git push origin feat/your-feature`
5. Submit a Pull Request

Commit convention follows [Angular Convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular).

## License

[MIT](LICENSE) © sun1090