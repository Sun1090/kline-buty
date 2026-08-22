---
title: "Quantitative Strategies and Backtesting"
description: "An engineer's guide to quant strategy R&D: from logic validation to a deployable, monitorable code system."
---

# Quantitative Strategies and Backtesting

> A quant strategy R&D guide for software companies and engineering teams. Earlier articles taught traders "how to read the market and place orders"; this article covers the engineer's view: "how to turn a piece of trading logic into a code system that is verifiable, deployable, and monitorable".
>
> **Disclaimer**: all content on this site is for study and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. The Complete Quant Workflow

From idea to scaled capital, a standard quant R&D pipeline:

```text
Data → factors/signals → strategy logic → backtest → parameter optimization → paper trading → small-capital live → scale up
```

| Stage | Key output | Questions the engineer must answer | Typical duration |
|---|---|---|---|
| Data | Cleaned market data/order/funds stores | Is the data complete? Aligned? Free of survivorship bias? | 1–4 weeks |
| Factors/signals | Computable candidate features | Is the factor effective? Is the correlation with returns stable? | 2–6 weeks |
| Strategy logic | Backtestable strategy code | Are the entry/exit rules, **position sizing**, **<mark>stop-loss</mark>** quantifiable? | 1–3 weeks |
| Backtest | Performance report | Is there alpha left after removing every bias? | 2–8 weeks |
| Parameter optimization | Robust parameter ranges | Do the parameters hold out-of-sample? Any overfitting? | 1–4 weeks |
| Paper trading | Simulated trading records | Does the strategy still hold under live latency/matching? | 4–12 weeks |
| Small-capital live | Real fill records | Do **<mark>slippage</mark>**, capacity, and execution match expectations? | 4+ weeks |
| Scale up | More capital / more instruments | Where is the capacity ceiling? Does return decay with size? | Ongoing |

> Key insight: **every stage can flow back to a previous one**. If small-capital live trading shows slippage eating 80% of returns, go back and redo the execution layer; that is fine — what is not fine is skipping stages and jumping straight to big money.

---

## 2. Strategy Type Landscape

| Strategy | Principle | Typical instruments | Difficulty | Capacity |
|---|---|---|---|---|
| CTA trend following | Follow price trends; cut losses, let profits run | Commodity futures, equity indices, crypto | ★★ | Large |
| Mean reversion | Price reverts after deviating from the mean; profit from reversals | Stocks, ETFs, crypto spot | ★★ | Medium |
| Statistical **arbitrage** | Profit when the **spread** between correlated instruments reverts; market neutral | Stock pairs, ETF baskets | ★★★ | Medium |
| Calendar / inter-commodity spread | Same product across months, or spreads between related products | Commodity futures | ★★★ | Medium |
| Cash-futures arbitrage | Convergence of the futures-spot spread; earn the **basis** | Index futures + ETF, commodity futures + spot | ★★★ | Medium |
| Market making | Rest both bid and ask; earn the bid-ask spread and rebates | Options, crypto futures, active stocks | ★★★★ | Small (speed game) |
| High-frequency T0 | Multiple intraday round trips; profit from micro-spreads / book fluctuation | T+0 instruments (futures, crypto, HK stocks) | ★★★★★ | Tiny |
| Event driven | Trade on announcements, macro data, news, on-chain data | Stocks, crypto | ★★★ | Large |

### 2.1 CTA Trend Following

**Principle**: once formed, a trend tends to persist; enter with the trend, cut losses with stops, let profits run. Typical signals: moving-average crossovers, Donchian channel breakouts, momentum breakouts.

- Typical instruments: commodity futures (rebar, iron ore, PTA), index futures, high-volatility names like BTC.
- Difficulty: ★★. Simple logic but a **low win rate (~30–40%) with a high win/loss ratio**; the test is whether you can keep executing through the **drawdown**.
- Capacity: large. Mostly low-to-mid frequency; a single strategy can absorb tens of millions to hundreds of millions.

### 2.2 Mean Reversion

**Principle**: after a short-term deviation from the mean (e.g., a moving average, Bollinger Bands), price reverts with high probability. Typical signals: fading Bollinger excursions, RSI overbought/oversold.

- Typical instruments: stocks, ETFs, and crypto spot with good **liquidity**.
- Difficulty: ★★. Hard because "how long until reversion" is uncontrollable — great in range-bound markets, catching falling knives in one-way trends.
- Capacity: medium. Trades more frequently than CTA with limited per-trade size; wins on frequency.

### 2.3 Statistical Arbitrage

**Principle**: find cointegrated asset pairs (e.g., two highly correlated stocks); when the spread widens past a threshold, short the rich one and buy the cheap one; close when the spread converges. Holding period is usually days to weeks; **market neutral** (bears almost no broad-market risk).

- Typical instruments: same-industry stock pairs, ETFs vs constituents, perpetuals vs futures.
- Difficulty: ★★★. Requires solid statistics (cointegration tests, Kalman filters), and spread relationships do break — they need dynamic monitoring.
- Capacity: medium. Neutral-strategy capacity depends heavily on the number of tradable pairs in the market.

### 2.4 Calendar / Inter-Commodity Spreads

**Principle**: calendar — when the spread between different expiries of the same product (e.g., rebar Jan vs May) leaves its fair range, buy low and sell high, and close on convergence. Inter-commodity — when the strength relationship between related products (e.g., soybean meal vs soybean oil, hot-rolled coil vs rebar) misaligns, trade the strength **hedge**.

- Typical instruments: mostly commodity futures.
- Difficulty: ★★★. The "fair range" of the spread shifts with supply-demand, inventories, and positioning structure; static ranges go stale easily.
- Capacity: medium.

### 2.5 Cash-Futures Arbitrage

**Principle**: when the futures price is above spot (positive basis), buy spot/ETF and short futures; close on delivery or basis convergence to harvest a fairly certain spread. Index cash-futures arbitrage (IF/IC + ETF) is the classic version.

- Typical instruments: index futures + spot ETF, commodity futures + spot warehouse receipts.
- Difficulty: ★★★. Capital-hungry, and you must handle dividends, ex-rights, and index-tracking error details.
- Capacity: large, but opportunities are infrequent and thin per trade.

### 2.6 Market Making

**Principle**: rest orders on both sides, get hit by takers to earn the **bid-ask spread**, plus exchange maker rebates (reduced or even negative fees). The core is inventory risk management — after being hit you must not accumulate directional exposure.

- Typical instruments: options (the classic), crypto futures, inactive stocks.
- Difficulty: ★★★★. A contest of quoting models, inventory management, and low latency; retail traders and startups rarely beat top **market makers**.
- Capacity: small. Per-instrument capacity is limited; scale across many instruments.

### 2.7 High-Frequency T0

**Principle**: high-frequency intraday round trips, earning micro book spreads, queue advantages, or the impact-cost rebate of splitting large orders. Holding periods run from seconds to minutes; returns are extremely latency-dependent (milliseconds, even microseconds).

- Typical instruments: futures, crypto futures, HK stocks (T+0 and shortable).
- Difficulty: ★★★★★. Hardware (FPGA, same-datacenter colocation), network, and system tuning are all mandatory.
- Capacity: tiny, with extreme winner-take-most effects.

### 2.8 Event Driven

**Principle**: anticipate price reactions to earnings, dividends, macro data, policy, or large on-chain transfers. Can be manually triggered (a human confirms after the event) or fully automated (data streams trigger signals).

- Typical instruments: stocks (earnings season), crypto (regulatory/on-chain events), commodities (inventory/weather reports).
- Difficulty: ★★★. The hard part is data acquisition and cleaning; event data is extremely noisy.
- Capacity: large. Event-driven at low-to-mid frequency is among the highest-capacity categories.

---

## 3. The Factor System

Factors are the "raw material" of strategies: a computable historical data feature with predictive power over an instrument's future returns.

### 3.1 Common factor categories

| Category | Representative factors | Logic |
|---|---|---|
| Momentum | N-day **return**, moving-average deviation | The strong stay strong; the institutionalized form of momentum chasing |
| Reversal | Negative of the N-day cumulative gain | What ran up too much pulls back; what fell too much bounces |
| **Volatility** factors | Realized volatility, ATR, BVOL | Low-volatility instruments often carry a risk premium |
| Volume-price | Volume amplification ratio, volume-price divergence, turnover | Volume leads price; volume confirms signals |
| Term structure | Futures near-far month spread (contango/backwardation) | **Rollover** returns and market sentiment |
| Alternative | Sentiment, fund flow, on-chain metrics | Compensation for information asymmetry |

### 3.2 Factor research and evaluation metrics

The standard factor research flow: **pose the hypothesis → compute the factor → layered backtest → evaluate → combine → track live**.

Core evaluation metrics:

| Metric | Definition | Rule-of-thumb |
|---|---|---|
| IC (information coefficient) | Rank correlation (Spearman) between factor value and next-period return; higher \|IC\| = stronger predictive power | \|IC\| > 0.02 noteworthy, > 0.05 excellent |
| IR (information ratio) | IC mean / IC standard deviation; measures factor stability | IR > 0.3 good, > 0.5 excellent |
| Layer monotonicity | Split into 5–10 factor layers; do layer returns line up monotonically | Monotonic means the factor logic is self-consistent |
| Turnover | Factor rebalancing ratio | Too high and costs eat the alpha |
| Capacity | Capital the factor can absorb when ranking the market by liquidity | The more niche the factor, the smaller the capacity |

> A factor's "mortality rate" is high: screen 100 candidates, and after IC stability, layer monotonicity, cost deduction, and out-of-sample tests, usually no more than 5 survive.

---

## 4. Backtesting Framework Selection

| Framework | Language | Strengths | Weaknesses | Fits |
|---|---|---|---|---|
| vn.py | Python | Mature domestic ecosystem, built-in CTA/arbitrage/options templates, direct connection to domestic futures OMSs | Steep learning curve; some features tied to its own architecture | Domestic futures/equities teams |
| backtrader | Python | Lightweight and easy to start, rich docs and community, simple backtest→paper switch | Mediocre performance (pure Python loops); slow on big data | Individuals/small teams at low-to-mid frequency |
| In-house framework | Any | Fully controllable; custom matching simulation, parallel backtests, parameter sweeps on demand | Long development cycle; reinventing wheels and planting bugs | Teams with engineering strength planning to scale |
| Others | Python/R | vectorbt, QuantConnect (cloud), Zipline, qlib (Microsoft) | Each has its own orientation | Choose per need |

Selection advice:

- Start with backtrader or vn.py to validate ideas fast; **do not build in-house on day one**.
- Build in-house only when: the existing backtest engine is the bottleneck (parameter sweeps too slow, matching model unrealistic) and the team has 2+ dedicated backtest engineers.
- The backtest engine's matching model matters more than the framework's fame: "fill at the next bar's open" vs "fill against the order book tick by tick" produces wildly different results.

---

## 5. Core Backtesting Metrics

| Metric | Formula/definition | Notes |
|---|---|---|
| Annualized return | (ending equity / starting equity)^(252/trading days) − 1 | **Compounded** basis; extrapolation distorts when the backtest spans under a year |
| Sharpe ratio | (annualized return − risk-free rate) / annualized volatility | Excess return per unit of volatility; >1 good, >2 excellent |
| Max drawdown | Largest drop from any equity peak: max(peak − trough) / peak | How bad the worst case is; deserves more attention than returns |
| Calmar ratio | Annualized return / max drawdown | Return per unit of "worst pain"; >1 good |
| **Win rate** | profitable trades / total trades | A high win rate ≠ a good strategy; read with the win/loss ratio |
| Win/loss ratio | average win / average loss | Trend strategies usually have low win rate, high win/loss ratio |
| Turnover | traded volume / open interest (or traded value / account equity) | Determines the share of fees and slippage in returns |
| Return/drawdown curve | Time-series visualization | See when drawdowns happened and in what market regime |

> The order to read a backtest report: **max drawdown** and **drawdown duration** first, then annualized return and Sharpe, then win rate and win/loss ratio. A strategy with 100% annualized return and a 60% max drawdown will be abandoned mid-way by nearly everyone in live trading.

---

## 6. Backtesting Pitfall Checklist

| Pitfall | Plain-language explanation | Concrete example |
|---|---|---|
| Look-ahead function | The backtest used data unavailable at the time | Using volume data "published only after the close" to trade that same close |
| Look-ahead bias | Parameters estimated on the full sample applied to every historical point | The best moving-average window computed on all of 2015–2025, used to backtest 2018 |
| Survivorship bias | Keeping only instruments that still exist today | A stock pool holding only current constituents — delisted and blown-up names removed, returns inflated |
| Overfitting | Parameters tuned to fit historical noise exactly | A strategy with 12 parameters, grid-searched one by one to "historical perfection"; live is a mess |

::: danger 💀 Backtest returns are not live returns
**Backtest returns ≠ live returns.** A backtest is walking repeatedly over known history: it underestimates slippage, overestimates capacity, and misses real-world constraints by construction; a parameter-optimized strategy adds overfitting risk on top. Rule of thumb: a paper-trading strategy at 30% annualized mostly keeps only 10–20% after real slippage and fees; if paper returns are only 10% to begin with, don't go live.
:::
| Fees and slippage unaccounted | Ignoring or underestimating transaction costs | A high-frequency strategy backtested at zero fees; live fees + slippage eat all the profit |
| Infinite-liquidity assumption | The backtest assumes any size fills | A stock trading 100k shares a day, with the backtest buying 50k lots daily |
| Period bias | The backtest window is the strategy's "good weather" | Backtesting a trend strategy only through the 2020–2021 bull run, ignoring the 2018 and 2022 choppy bears |
| Time/timezone errors | Data misalignment | Mixing unadjusted prices with K-lines in different time zones |
| Limit-up-down / T+1 ignored | The backtest does what live trading cannot | An A-share strategy buying and selling same-day, ignoring the T+1 rule |

> Self-check method: print the signal log for every trading day and manually audit a few random days — "could I really get this data at the time? Could I really fill at this price?"

---

## 7. Parameter Optimization and Overfitting Prevention

### 7.1 Three common approaches

| Approach | Description | Risk |
|---|---|---|
| Grid search | Sweep parameter combinations for the highest return | High (nearly guaranteed overfit) |
| Out-of-sample testing | Tune on the first 70%, freeze and validate on the last 30% | Medium (out-of-sample used once only; must be long enough) |
| Walk-forward | Rolling: tune on the front window → validate on the back window → slide forward; every decision uses only "past data" | Low (closest to the live cadence) |

### 7.2 Practical advice to reduce overfitting

- **Fewer parameters**: every extra parameter raises overfitting risk exponentially; if 2 parameters work, don't use 5.

::: warning ⚠️ Out-of-sample testing can only be used once
**Out-of-sample testing is not repeatable — the out-of-sample window can be tested once; repeatedly "test then retune" turns out-of-sample into in-sample.** Parameters must be "flat": performance around the optimum should change slowly; if moving the parameter from 19 to 21 crashes performance, it is noise fitting.
:::
- **Parameters must be "flat"**: performance around the optimum should change slowly; if moving the parameter from 19 to 21 crashes performance, it is noise fitting.
- **Out-of-sample is one-shot**: the out-of-sample window can be tested once; repeatedly "test then retune" turns out-of-sample into in-sample.
- **Constraints + penalties**: cap returns at plausible ranges (e.g., flag any factor with >100% annualized return as suspicious) and penalize high turnover and extreme positions.
- **Multi-period, multi-instrument validation**: bear-market samples from 2015, 2018, and 2022 are mandatory; the same logic holding across instruments boosts credibility a lot.

---

## 8. The Paper-to-Live Gap

| Dimension | Paper assumption | Live reality | Countermeasure |
|---|---|---|---|
| Slippage | Often fixed ticks or zero | Impact cost rises nonlinearly with size | Model impact as "book depth × order size" |
| Capacity | Unlimited | Oversized single orders move the price | Constrain order size with ATS (volume participation) |
| Latency | Instant fills | Network + OMS + market data latency 10ms–1s | Record the gap between signal time and fill time |
| Matching | Simplified matching model | Queueing, partial fills, limit-locked fills impossible | Replay with tick/book-level matching models |
| Emotion | None | Afraid to enter after losing streaks; oversizing after wins | Discipline + automation + pre-trade risk checks |
| Data | Complete and clean | Outages, bad prints, adjustment changes | Data validation and outage alerts |
| Costs | Fixed fees | Exchange rebates / block discounts exist; real costs are messier | Backfill with the real account fee schedule |

> Rule of thumb: a paper-trading strategy at 30% annualized mostly keeps only 10–20% after real slippage and fees; if paper returns are only 10% to begin with, don't go live.

::: danger 💀 Paper trading at 30% annualized mostly keeps only 10-20% after real slippage and fees
**A paper-trading strategy at 30% annualized mostly keeps only 10–20% after real slippage and fees; if paper returns are only 10% to begin with, don't go live.** The paper-to-live gap is not in the strategy itself but in slippage, capacity, latency, matching differences, and emotion — miss any one of the five and it eats your returns.
:::

---

## 9. Execution Algorithms

The strategy decides "what and how much to buy"; execution algorithms decide "how to buy".

| Algorithm | Principle | Fits |
|---|---|---|
| TWAP (time-weighted average price) | Slice a large order evenly across time | Routine accumulation with no strong intraday pattern, low-profile required |
| VWAP (volume-weighted average price) | Slice order size along the historical volume profile | Instruments with uneven liquidity distribution (e.g., stock open/close volume bursts) |
| Iceberg order | Expose only part of the order, hide the rest | Thin liquidity, intent concealment |
| IS / Implementation Shortfall | Optimize between impact cost and opportunity cost; fill fast | Large orders, event-driven, time-sensitive scenarios |

> Quantifying execution quality: compare the "actual average fill price" against the "VWAP at signal time"; the deviation is the execution cost. Use this difference (slippage capture) as the KPI of the execution algorithm.

---

## 10. Live Monitoring

### 10.1 Strategy health

| Metric | Alert threshold (example) | Meaning |
|---|---|---|
| Position drift | Deviation from target position > 20% | Too many cancels/failures drifting the position |
| Per-order slippage | N consecutive orders at 2x benchmark slippage | Liquidity shock or algorithm failure |
| NAV drift vs backtest baseline | 2 consecutive weeks off by > 3 standard deviations | Market structure change or an implementation bug |
| Fill rate | Below 80% | Resting-order strategy failing |
| Order timeout | No report within X seconds | Network or OMS anomaly |

### 10.2 Daily review

- Auto-generate the daily report: strategy NAV, return attribution (factor contribution breakdown), fill details, slippage stats, exception event list.
- Manual review: revisit the day's 3 most contested trades — "was the signal right at the time? Was the execution clean?"

### 10.3 Exception alerts

- Tiered alerts: SMS/messaging (critical) → email/IM group (normal) → weekly report (routine).
- Must-have hard alerts: fund anomalies, positions conflicting with risk rules, N consecutive cancels, market data outage, process crash.
- Alerts must carry **context** (strategy name, instrument, values, time) — otherwise the 3 a.m. page is unreadable.

---

## 11. Engineering the Backtest Platform and Research

- **Parameter and result versioning**: every backtest records parameters, data version, and code version; use Git plus an experiment ledger (or MLflow-style tools) to guarantee "results are reproducible".
- **Parallel backtesting**: parameter sweeps are embarrassingly parallel; multi-core/cluster parallelism is standard equipment for an in-house platform.
- **Data versioning**: re-running after market data changes makes backtest results drift; tag data with versions and bind backtest results to data versions.
- **Signal logs**: persist all live signals in full, so afterwards "strategy sent no signal vs system failed to execute" is obvious at a glance.

---

::: warning ⚠️ Risk Warning
**Backtest returns ≠ live returns.** A backtest is walking repeatedly over known history: it underestimates slippage, overestimates capacity, and misses real-world constraints by construction; a parameter-optimized strategy adds overfitting risk on top. Quantitative trading still faces strategy decay, liquidity droughts, system failures, extreme markets, and more; **<mark>leverage</mark>** amplifies losses in the same proportion as gains. Recommendations: run paper trading for at least 3 months before small-capital live; keep small-capital live stable for 3+ months before adding capital; define "stop conditions" before any strategy goes live (e.g., disable the strategy at X% drawdown). All strategy descriptions here are for study and research only and do not constitute investment advice.
:::
