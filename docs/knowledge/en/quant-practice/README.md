---
title: "Quant Practice"
description: "How an individual trader with some coding skills can go from zero to a working pipeline of data → backtest → strategy → (compliant) automation."
---

# Quant Practice

> Earlier chapters taught you how to **read markets and manage positions**; Chapter 10 (System Integration) teaches software teams **how to build trading systems**. This chapter lands on the plainest spot between the two — **how an individual trader who knows some code can actually run the full pipeline of data → backtest → strategy → (compliant) automation from scratch**.
>
> Practical and individual-focused: every article ships runnable Python examples and assumes no production infrastructure. It complements Chapter 10 (the team engineering perspective): that one covers system architecture and engineering red lines, this one covers pragmatic trade-offs on your own machine.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets are risky; invest with caution.

---

## About Each Article

### 01 · Quant Toolchain

Arm yourself first: why Python is the primary language and when C++/Rust actually matter; which segment each core library (pandas/TA-Lib/backtrader, etc.) covers; how to divide work among Anaconda, venv, Jupyter, and scripts. Includes a free-vs-paid data source comparison table, a standard research directory layout, and git versioning for reproducibility. Ends by exposing the three pitfalls every beginner hits: time zones, data alignment, and look-ahead bias.

### 02 · Data Acquisition in Practice

Data is the foundation of quant research. This article provides three directly runnable data-fetching snippets — China A-shares (AKShare/Tushare), futures (dominant contracts), and crypto (Binance klines with rate-limit handling); explains suspended days, missing values, and the trade-offs of forward/backward/no adjustment; then covers daily incremental updates, CSV/SQLite storage choices, and the "cross-check against market software" data quality method, closing with usage limits of free APIs and data licensing reminders.

### 03 · Your First Backtest

Run through the minimal backtest loop — load data → generate signals → simulate fills → compute performance — with one complete runnable Python script (dual moving average, including fee and slippage parameters). Covers signal-to-fill timing assumptions, engine choice boundaries (write it yourself vs backtrader vs vn.py), how annualized return/max drawdown/Sharpe ratio/win rate are computed, and how to read equity curves and drawdowns. Uses "5/20 beating 3/17 says nothing about the future" as a first encounter with backtest overfitting, plus the in-sample/out-of-split research workflow.

### 04 · Live Automation

From backtest to live trading, compliance and engineering are the two hurdles. This article first maps the compliance boundaries of individual automation (China A-share programmatic-trading registration, per-exchange risk controls in crypto, offshore broker API restrictions — subject to the latest regulations), then gives the full crypto spot playbook: API key permissions, order placement, rate limits and weights, WebSocket market data with reconnection, VPS deployment and logging. It faces the reality that China brokers do not open APIs to individuals, offers the "signal push + manual execution" semi-automatic route, and closes with key security and monitoring checklists.

### 05 · Strategy Coding in Practice

Five complete strategy examples, from simple to advanced: dual moving average trend, Bollinger Band mean reversion, RSI overbought/oversold, crypto grid trading, and a statistical arbitrage prototype (cointegration and pairs). Each includes core logic, code snippets, applicable markets and risks, plus "parameters and boundaries" — when it fails and what failure looks like. Ends with combining low-correlation strategies to reduce drawdowns, the reality that quant is "20% code, 80% maintenance", and a personal roadmap: week 1 → month 1 → month 3 → small capital → continuous iteration.

---

## Suggested Reading Order

```text
① 01-Quant Toolchain (set up environment and tools)
   ↓
② 02-Data Acquisition (get clean data first)
   ↓
③ 03-Your First Backtest (run the minimal loop)
   ↓
④ 05-Strategy Coding (expand your strategy library)
   ↓
⑤ 04-Live Automation (read compliance before code)
```

- ① → ③ is the **required main line**: nothing else matters until you can run one backtest end to end.
- Article 04 involves live capital and regulation — finish it, especially the compliance boundaries, before any real money moves.
- Relationship with [Chapter 10: System Integration](../system-integration/): this chapter is about "what one person can run"; that one is about "what a team can ship". Both describe the same concepts (backtest, risk control, rate limits) and are worth reading side by side.

---

## Conventions

- All code examples run directly in a local Python 3.9+ environment. They are for teaching only; live-trading risk is yours.
- API fields, rate limit values, and policy details change with exchanges and regulators; wherever relevant we mark them "subject to official docs / latest regulations".
- Free data sources have different terms of service and commercial licenses — confirm them yourself before use.

---

> **⚠️ Risk Warning**
>
> Quant does not mean guaranteed profit. Passing a backtest ≠ profitable live trading; once automation goes live, strategy decay, API changes, key leaks, or extreme markets all cause real losses. All code and strategy descriptions here are for learning and research only and do not constitute investment advice; any automation touching real money should be verified long-term with minimal capital after fully understanding the risks and completing compliance checks.

---

## Articles in This Chapter

<DocCards dir="quant-practice" />
