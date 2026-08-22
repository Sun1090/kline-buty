# Trading Practice

> The earlier chapters covered "knowledge": what markets are, how to read candlesticks, how to use indicators, how to measure risk. This chapter covers "how to turn knowledge into daily practice" — not another new theory, but **stringing together what you have already learned into the few steps you will actually execute from morning to night**.
>
> **Everything in this chapter unfolds along one main line: before entry, during the position, after exit.** Each article covers one trading style (day trading, swing, range/grid, event-driven), and every one follows the same three steps: "how to prepare before entry → how to manage during the position → how to review after exit". By the end you will understand: the difference between skilled traders and bagholders is not some magic indicator, but having rules at every step.

---

## Chapter Overview

### 01 · Day Trading in Practice

Complete the full loop of "enter, exit, review" within a single day. This article first runs the numbers: **with 20 trades a day at 0.05% one-way fees, how much do fees cost over a year** — once you see it, you will understand why 90% of day traders lose to costs; then it covers which instruments suit day trading, the patterns of the first 30 minutes after the open, four commonly used day trading methods, and finally a fill-in end-of-day review template plus a "ways to die" checklist.

### 02 · Swing and Trend in Practice

Capture a 5%-30% move and move on — no guessing tops, no guessing bottoms. This article covers how to confirm a trend three ways (Dow highs/lows structure, moving average alignment, ADX), how to weigh breakout entry versus pullback entry (a comparison table shows the win rate versus risk-reward trade-off directly), how to keep profits during the position with trailing stops and scaled take-profits, and **how to lose less in a range-bound market** — first judge the market state, then decide whether to trade at all.

### 03 · Range Markets and Grid Trading in Practice

The natural enemy of trends is the range; the natural home of ranges is the grid. This article covers how to identify a range-bound market with three criteria (flat moving averages, Bollinger squeeze, clear highs/lows), then fully dissects grid trading: how to allocate the upper/lower bounds, grid count, per-grid capital, and total capital, **uses mathematical expectation to prove why grids must lose in a trending market**, and covers which platforms offer grid bots and whether to pull the grid when a range turns into a trend.

### 04 · Event-Driven Trading

Earnings, NFP, CPI, rate hikes, elections, geopolitical conflicts — the windows around major events are when retail traders lose money fastest, and also one of the few plays you can participate in by **preparing rather than predicting**. This article covers how to prepare in advance with an event calendar, the pricing principle of expectation gaps ("buy the rumor, sell the fact") with numeric examples, the typical price action in the 30 minutes before and after a data release, and the **half-position rule** for event-driven markets.

### 05 · A-Share Special Plays

(Created in a parallel session) Limit-up chasing, convertible bond T+0, IPO subscription, theme speculation, ST delisting, fund-style DCA stock buying, low-risk arbitrage — the seven signature A-share playbooks, each dissected one by one: **the logic, the operational essentials, and the risk points of each play**, ending with a pitfall-avoidance checklist for beginners. Special warning: limit-up chasing is a zero-sum game with negative statistical expectation — treat it as "cognitive enrichment", not an operating manual.

### 06 · Arbitrage in Practice

(Created in a parallel session) No directional bets, only the money of spread convergence: cash-and-carry, calendar, cross-market, cross-commodity, ETF, crypto, and statistical arbitrage — seven plays, each with its principle, operational steps, and risk points. **The core takeaway: arbitrage is not risk-free — when the spread refuses to converge, you are the one being harvested.**

### 07 · Crypto Airdrops and Airdrop Farming

(Created in a parallel session) Everything about "free tokens": why airdrops exist, the scale benchmarks of classic cases like Uniswap/Arbitrum/Optimism/zkSync, the on-chain interactions, testnets, quest platforms, multi-wallet matrices, and Gas cost accounting of airdrop farming, the expected return math and anti-Sybil mechanisms, plus risks such as seed-phrase security, insider allocations, and tax compliance. **Remember: airdrop farming is labor-intensive "mining", not investing.**

### 08 · On-chain Data Trading

(Created in a parallel session) Timing driven by the public ledger: six indicators and their mechanisms — active addresses, exchange netflows, whale movements, stablecoin flows, miner behavior, and proof of reserves — a comparison of Glassnode/CryptoQuant/Nansen/Dune tools, recognizing bull-market tops and bear-market bottoms, the truth and limits of "smart money" copy trading, data traps such as wash activity and consolidation misreads, and a weekly on-chain health checklist. **Remember: on the chain, what is honest is the transactions themselves; what is dishonest is the people reading the data.**

---

## Where This Chapter Fits

- **The earlier chapters cover "what it is"; this chapter covers "how to do it".** When you meet a term you do not understand (ORB, ADX, funding rate, expectation gap), go back to the relevant chapter for review: [06-Technical Analysis](../technical-analysis/), [07-Trading Systems](../trading-system/).
- **All content is organized around the three steps "before entry → during the position → after exit".** Build the habit: run through the rules for all three steps before every order; no rules, no order.
- Every method in this chapter has its applicable scenario (day trading suits high-volatility instruments, grids suit range markets, trend methods suit trending markets). **Methods are not good or bad — only well-placed or misplaced.**

---

## Suggested Learning Order

```text
① 02-Swing and Trend in Practice (learn to judge the market state first: trend or range?)
   ↓
② 01-Day Trading in Practice / 03-Range Markets and Grid Trading in Practice (pick one style and master it first)
   ↓
③ 04-Event-Driven Trading (only for major events; a "supplementary play")
   ↓
   ④ 05-A-Share Special Plays + 06-Arbitrage in Practice (expansion plays for A-share players and advanced traders)
   ↓
⑤ 07-Crypto Airdrops and Airdrop Farming + 08-On-chain Data Trading (optional for crypto players; 07 emphasizes security, 08 works with chapter 09)
```

- Start with **one** article from ② and master it, rather than rotating through all four — the cost of switching styles is far higher than you think.
- ④ is extended reading: 05 suits A-share players (the limit-up chasing section is best read-only, never practiced), 06 suits advanced traders with meaningful capital; **beginners should skip 06 for now**.
- ⑤ is optional crypto reading: 07 suits readers who want to understand the airdrop ecosystem (focus on the security and compliance parts), 08 should be used together with the crypto chapter of [09-Markets and Instruments](../markets-instruments/).
- Whatever the style, **first run 20-30 trades on a demo account or with minimal size** before scaling up.
- The methods in this chapter pair with the risk management of earlier chapters ([07-Trading Systems](../trading-system/)): methods decide "when to enter", risk management decides "what to do when it goes wrong" — neither works without the other.

---

## Content Conventions

- All statistics, win rates, and volatility characteristics are **historical, not predictive; actual market conditions always prevail**.
- Prices, fee rates, and capital figures in the examples only illustrate the calculation process and do not constitute trading advice.
- Specific fees, slippage, and platform capabilities are subject to the real-time rules of each broker/exchange/platform.
- Block anyone selling "guaranteed profits" or "high win rate, teach-and-learn" day trading signal groups or grid software.

---

> **⚠️ Risk Warning**
>
> Everything in this chapter is for study and research only and does not constitute investment advice. High-frequency day trading fees and slippage erode capital quickly, grid trading can leave you fully positioned and trapped in a one-sided market, and event-driven volatility can blow through a stop-loss in an instant. Participate only with money you can afford to lose; leveraged trading can wipe out your capital and even produce a negative balance.

---

## Table of Contents

<DocCards dir="trading-practice" />
