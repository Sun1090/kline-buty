---
title: "04 · Analysis & Scripting"
description: "From TradingView to a Python workflow, making analysis reproducible — the right way to script your analysis."
---

# 04 · Analysis & Scripting

> The earlier chapters settled "what to watch with, where to get data, where to trade." This one solves "how to make analysis something you can repeat."
>
> The problem with manual analysis isn't lack of effort — it's that it's **not reproducible**: the same candles get different trendlines yesterday and today; the same logic must be redone for each new instrument. This article goes from advanced TradingView usage to TDX formulas, Excel **<mark>review</mark>** sheets, and Python workflows, then the limits of AI-assisted analysis — ending with the right way to do "scripted analysis."

> **⚠️ Risk Warning**
>
> Any tool's signals and backtest results are historical statistics, not predictions; Pine Script/TDX formula backtests differ from live trading through **<mark>slippage</mark>**, fees, **<mark>look-ahead bias</mark>**, and other systematic distortions. AI-generated analysis may contain factual errors and **<mark>hallucinations</mark>** — always verify by hand. All examples here are for learning and research only and constitute no investment advice. Markets carry risk; invest with caution.

---

## 1. Advanced TradingView Usage

TradingView's value isn't just "pretty charts" — it puts "watch → analyze → **<mark>backtest</mark>** → monitor" into a single workflow.

### 1.1 Charts and Multi-Timeframe Linking

- **Multi-chart layout**: open several charts of the same instrument for daily/hourly/minute views, or stack timeframes on one chart with the multi-timeframe view;
- **<mark>Multi-timeframe linking</mark>**: daily main chart with shorter-timeframe sub-indicators is the standard way to judge "higher-timeframe direction + lower-timeframe entry" (methodology in [06 - Technical Analysis](../technical-analysis/));
- **Drawing tools**: saving and layout management of trendlines, horizontals, Fibonacci, channels, rays — analytical conclusions should persist in a form you can save and export, not vanish after drawing;
- **Alerts**: notifications when price/indicator conditions trigger (email, Telegram, etc.) — a free starting point for "semi-automatic monitoring."

### 1.2 Pine Script: What It Can and Cannot Do

**<mark>Pine Script</mark>** is TradingView's scripting language; even free accounts can write and publish indicators publicly/privately:

| Can do | Cannot do (or restricted) |
|---|---|
| Custom indicators, candlestick pattern detection, multi-condition signal annotation | Full multi-instrument portfolio strategies, event-driven logic |
| Draw arbitrary series and shapes on charts | Place orders directly (official API has limits; conditions vary by region and qualification) |
| Strategy backtesting (`strategy()` framework, with fee/slippage parameters) | Large-scale parameter optimization, rigorous out-of-sample testing |
| Call built-in indicators and function libraries | Read external data sources (fundamentals/alternative data) |

- Backtesting positioning: Pine Script backtests suit **quickly validating ideas**; their matching assumptions, slippage models, and commission handling are simplified — treat conclusions as indicative only;
- For deeper work: after validating an idea, reproduce it in Python with more rigorous data and backtest frameworks (see [15 - Quant Practice](../quant-practice/)).

### 1.3 Strategy Backtest Features

- Parameters: initial capital, fee rate, slippage, per-trade risk share, etc.;
- Metrics: net return, max **<mark>drawdown</mark>**, **<mark>win rate</mark>**, profit factor, Sharpe, etc.;
- **Note**: default fills happen at close or next bar open, without handling suspensions, price limits, or **<mark>liquidity</mark>** — results skew optimistic.

---

## 2. TDX Formulas: Custom Indicators for A-Share Retail

- For TDX formulas' positioning, syntax, and three usage tiers (indicators/screening/trading systems), see [01 - Market Data Software](charting-platforms.md);
- **Custom indicators**: write "your own rules" as formulas ("bullish MA alignment," "MACD bottom-divergence alert") so the software watches for you instead of you watching the software;
- **Conditional screening**: `Screener → conditional selection` uses formulas to filter a candidate pool across the whole market, followed by human review — **formulas only do first-pass filtering; results must be checked manually** (to avoid picking up problem stocks);
- **The right approach**:
  - Start simple: first reproduce a public indicator you trust, then tweak parameters to understand its behavior;
  - Cross-validate formula output against manual drawing: a formula is only right if its **rules are clearly expressed**;
  - Most "paid cracked indicators" online are renamed public ones — not worth buying.

```text
// Teaching example: stocks making N-day highs (syntax per your version)
HHV(H, N) = H;
```

---

## 3. Excel in Trading

Excel is "the best scripting language for non-programmers," and its value in trading is underrated:

| Use | How |
|---|---|
| Daily review sheet | Date/instrument/direction/entry/exit/P&L/**<mark>R-multiple</mark>**/subjective notes — one sheet throughout, monthly rollups |
| Trade statistics | Win rate, profit-loss ratio, max consecutive losses, monthly returns — pivot tables plus basic functions suffice |
| Data wrangling | CSVs exported from market software/data platforms go straight into Excel for cleaning, pivoting, charting |
| Plan & execution tracking | Checklists for trading plans: conditions, **<mark>position size</mark>**, **<mark>stop loss</mark>**, **<mark>take profit</mark>**, ticked item by item |

**Review-sheet template essentials** (suggested columns): trade date, time, instrument, direction, entry price, stop price, target price, actual exit, P&L amount, R-multiple, holding duration, strategy type, signal rationale, lesson learned. Review methodology in [07 - Trading System](../trading-system/).

Example sheet structure (one row per trade; freeze the header row and add validation dropdowns):

| Date | Instrument | Direction | Entry | Stop | Target | Exit | P&L% | Duration | Strategy | Trigger reason | Lesson |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-03 | Rebar | Long | 3420 | 3380 | 3520 | 3510 | +2.6% | 2 days | Breakout | Volume-backed break of 20-day high | Took profit too early |
| 2026-08-05 | BTCUSDT | Short | 58200 | 59000 | 56000 | 56500 | +2.9% | 1 day | MA reversion | Rejection at MA60 rally | None |

- Each month, summarize via pivot table: win rate/profit-loss ratio per strategy, largest single loss, consecutive-loss streaks — **turning "feelings" into "statistics"** is the only correct way to review.

::: warning ⚠️ Excel's Limits
Note: Excel suits "recording and summarizing," not "backtesting and automation" — when your analysis starts showing "circular references, hundreds of VBA lines, stacked formulas," it's time to move to Python.
:::

---

## 4. A Python Analysis Workflow

Python is the de facto standard for personal quant research, connecting seamlessly to [15 - Quant Practice](../quant-practice/):

```python
# Teaching example: pandas for quotes + matplotlib plotting (install deps yourself)
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("btc_daily.csv", parse_dates=["date"])
df["ma20"] = df["close"].rolling(20).mean()

plt.figure(figsize=(10, 4))
plt.plot(df["date"], df["close"], label="close")
plt.plot(df["date"], df["ma20"], label="MA20")
plt.legend()
plt.show()
```

| Stage | Common libraries | Notes |
|---|---|---|
| Data processing | pandas | Quote cleaning, resampling, merging, missing values |
| Indicator computation | TA-Lib / hand-written pandas | MAs, MACD, RSI, etc.; hand-writing gives more control |
| Visualization | matplotlib / plotly | matplotlib stable, good for reports; plotly interactive, good for exploration |
| Data acquisition | AKShare / Tushare / exchange SDKs | See [02 - Data & Research Platforms](research-platforms.md) |
| Backtesting | Hand-written / backtrader etc. | Start simple; understanding before frameworks |

**Workflow advice**: organize analysis around "script files + input/output directories" (one script does one thing), with outputs and figures going into `results/` so every run is reproducible and comparable — this matches the directory conventions of [15 - Quant Practice](../quant-practice/).

A complete minimal analysis workflow (teaching example; interfaces and fields per actual docs):

```python
# step1_fetch.py —— fetching (see 02 - Data & Research Platforms)
# step2_analyze.py —— computation and plotting
import pandas as pd
import plotly.graph_objects as go

df = pd.read_csv("data/btc_daily.csv", parse_dates=["date"])
df["ma20"] = df["close"].rolling(20).mean()
df["ma60"] = df["close"].rolling(60).mean()

# golden/death cross signals (for logging only; not any trading instruction)
df["golden"] = (df["ma20"] > df["ma60"]) & (df["ma20"].shift(1) <= df["ma60"].shift(1))

fig = go.Figure()
fig.add_trace(go.Candlestick(x=df["date"], open=df["open"],
                             high=df["high"], low=df["low"], close=df["close"], name="K线"))
fig.add_trace(go.Scatter(x=df["date"], y=df["ma20"], name="MA20"))
fig.add_trace(go.Scatter(x=df["date"], y=df["ma60"], name="MA60"))
fig.write_html("results/btc_ma_signal.html")   # interactive report you can revisit anytime
print("Signal dates:", df.loc[df["golden"], "date"].tolist())
```

::: tip 💡 Split Fetching from Analysis into Two Scripts
Key point: **split fetching and analyzing into two scripts** — fetching runs daily, analysis reruns anytime, neither disturbs the other; outputs go uniformly into `results/` for easy version comparison.
:::

---

## 5. AI-Assisted Analysis: Uses and Limits

LLMs can already help you read reports, tidy data, and write analysis code — but know their boundaries:

| Use (recommended) | Limitation (must know) |
|---|---|
| Summarizing report/announcement key points, extracting key numbers | It **hallucinates**: may fabricate nonexistent numbers, dates, conclusions |
| Translating "natural language rules" into queries/code snippets | Unreliable computation: **never let AI do numeric computation** — let it write code, you run and verify |
| Explaining unfamiliar terms, untangling logic chains | Knowledge has a cutoff; policies/fees/rules defer to latest official info |
| Review dialogues: feed it trade logs to find patterns | Text lacks candle context; it only sees what you wrote down |

**Three disciplines**:

1. **Every fact AI outputs must be traceable**: make it give sources (links/quotes); if it can't, treat it as unsaid;
2. **Always run AI-written code yourself**: treat it as a draft; cross-check results against market software;
3. **Never let AI decide**: it may assist information gathering, but position sizing, stops, and buy/sell judgments must come from your system (see [07 - Trading System](../trading-system/)).

**Reusable prompt templates** (break tasks down to the smallest unit AI can complete in one pass):

```text
Task: summarize the key points of the following research report.
Requirements:
1. Use only content present in the text; add nothing the report doesn't say;
2. Output a table: dimension | point from original text | source location (page/paragraph);
3. For every number, mark which sentence it appears in;
4. If information is absent, explicitly write "not mentioned in the text."
```

The two requirements "make AI cite sources + allow it to say 'I don't know'" push hallucination rates down to an acceptable range.

::: warning 🛑 Never Let AI Decide or Do Numeric Computation
**Never let AI decide, and never let it compute numbers.** Every fact AI outputs must be traceable, code must be run by you, and position and buy/sell judgments must come from your own system — AI may assist information gathering, but decision authority always stays human.
:::

---

## 6. The Right Way to Do "Scripted Analysis"

Turning analysis into scripts pays off not by "saving time" but by being **reproducible, reviewable, and upgradeable**:

### 6.1 Logic First, Code Second

- The order must be: **rules (natural language) → pseudocode → code**. State in one sentence "what I'm computing and what triggers it" before writing anything;
- Scripts written the other way round (code first, logic patched later) become unreadable to even yourself in two weeks, and unverifiable;
- Every rule should answer "if it's wrong, what does wrong look like" — this is how you catch look-ahead bias and logic holes.

### 6.2 Version Control

- Manage scripts and configs with git (intro in [15 - Quant Practice - 01](../quant-practice/quant-toolchain.md));
- One script = one file + a comment stating "inputs, outputs, dependencies, last updated";
- **Never commit <mark>API keys</mark> to the repository** — any key that entered git history counts as leaked (see [05 - Runtime & Automation Environment](automation-environment.md)).

### 6.3 Automating Review

- After each daily close, auto-run a "today's signals recap + position monitoring" script producing comparison charts and key numbers, replacing manual review;
- Weekly/monthly automated statistics rollups (win rate, profit-loss ratio, drawdown), matching your Excel review sheet;
- The boundary of automation: **auto-produce analysis and alerts, but keep order decisions with a human or strictly validated strategies** (see [15 - Quant Practice - 04](../quant-practice/live-automation.md)).

### 6.4 Reproducibility Self-Check

After writing any analysis script, check against:

| Item | Standard |
|---|---|
| Explicit inputs | Data paths, date ranges, instruments fixed in config or CLI arguments |
| Clear logic | Every rule explainable in one sentence to someone else (if you can't say it, you haven't written it clearly) |
| No look-ahead | Day-N signals use only data up to day N (self-check with `shift`) |
| Traceable outputs | Figures and tables carry dates and source watermarks; filenames include generation dates |
| Controlled versions | Changes go through git with notes on "what changed and why" |

---

## 7. Next Steps

- To actually run data and backtests → [15 - Quant Practice](../quant-practice/);
- To keep analysis scripts running 24×7 with automatic pushes → [05 - Runtime & Automation Environment](automation-environment.md).

---

::: warning ⚠️ Risk Warning
Every analysis tool's output is "processed historical data," not prediction: backtests carry systematic optimistic bias (slippage, fees, look-ahead bias, survivorship bias); AI-assisted content may include hallucinations and factual errors; bugs in formulas and scripts can silently influence decisions without your knowledge. Before using any signal in live trading, cross-validate on independent data sources and defer to human review. All code and examples here are for learning and research only and constitute no investment advice. Markets carry risk; invest with caution.
:::
