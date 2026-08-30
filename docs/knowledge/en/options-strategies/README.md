# 27 · Advanced Options Strategies

> Options are the **king of derivatives**: non-linear payoffs, precise risk tailoring, unlimited strategy combinations — the "smartest" of all financial instruments, and the one that best showcases professional edge.
>
> But they are also **the instrument where beginners blow up most easily**: buyers get silently wiped out by time value, and sellers can be driven into negative equity by a single black swan. There are 99 ways to die here, and every one of them comes from "placing bets before understanding pricing and risk."
>
> So this chapter's route is: **pricing and risk first (01, 02), then strategies (03), and finally practice, risk control, and tool-based review (04, 05)**. Until you have fully digested pricing and risk, no strategy is worth touching.

---

> ⚠️ Risk Warning
>
> All content in this chapter is for learning and research only and does not constitute investment advice. All prices, premiums, volatility figures, Greeks, and P/L numbers in these articles are fictional teaching examples. **Always defer to each exchange's latest contract rules and live market data.** Options (especially short positions and leveraged products) carry extremely high risk — options sellers can face theoretically unlimited losses. Before participating, complete your broker's required investor education, pass suitability assessments, and evaluate your own risk tolerance.

---

## Prerequisites

- **Required**: [Options Basics](../markets-instruments/options-basics.md) — Call/Put, the four elements, ITM/OTM, premium (the shortest-path primer). This chapter assumes you already know these concepts and dives straight into a systematic deep dive.
- For practical context, pair with: [US Stock Options Primer](../stocks/us-stock-options.md) (US equity options in practice) and [Commodity Options](../futures/commodity-options.md) (futures and commodity options).
- For a full picture of VIX and volatility indices, pair with: [Volatility and VIX](../markets-instruments/volatility-vix.md).

---

## Article Guide

### 01 · Option Pricing and Volatility

Option prices are not "guessed" — they are computed from **five inputs + volatility**. This article breaks down option price composition into "intrinsic value + time value" and explains why time value is essentially "volatility value"; builds intuition (not formulas) for how Black-Scholes' five inputs jointly determine price; then dives into implied volatility IV — the market expectation reverse-engineered from option prices — why IV is a "fear gauge," and why the volatility surface shows smiles and skews (why tail risk is expensive); finally it gives methods to judge whether IV is high or low and common IV levels across markets (stocks/commodities/crypto).

### 02 · The Greeks in Practice

Options traders read the Greeks the way pilots read instrument panels. This article dissects the meaning and computational intuition of five Greeks one by one: Delta is directional sensitivity, Gamma is acceleration (largest near the money — the decisive battleground), Theta is daily time decay (options are "rented time"), Vega is volatility sensitivity, and Rho is interest-rate sensitivity (mostly ignorable for retail). The core methodology is the "Greeks balance sheet": view your portfolio as a set of Greek exposures, understand Delta-neutral hedging (long Gamma + selling time — the institutional core play), map strategies to Greek profiles (what a long straddle buys, what a short straddle sells), and close with the full Greek profile table of buying one ATM Call.

### 03 · The Complete Catalog of Option Combinations

More strategies are not better — **every category has a distinct P/L profile**. This article classifies 16 mainstream strategies into four groups by risk-return type: directional strategies (long Call/Put, bull/bear spreads, ratio spreads), volatility strategies (straddles, strangles, iron condors, iron butterflies, calendars, diagonals), income strategies (covered call, cash-secured put, collar, synthetic stock), and hedging strategies (protective put, index put hedge, tail-risk hedge). Each strategy comes with its construction, ASCII payoff shape, expiration P/L formula, and numeric breakeven examples, closing with a "strategy-to-market-environment matching table."

### 04 · Options Practice and Risk Control

Between armchair theory and real money lies practice and risk control. This article covers buyers first: why 90% of long options expire worthless (time decay + IV decline), the timing principle of "buy at low IV, sell at high IV," and the danger of 0DTE gambling; then sellers: premium income vs margin usage, the essence of "collecting insurance premiums," stop-losses and rolling positions, and common knowledge of blow-ups in extreme markets. Then come portfolio margin concepts, trading costs, position sizing, backtesting difficulties, and finally a hands-on pre-trade checklist.

### 05 · Options Tools and Trade Review

Knowing how to compute is inferior to knowing how to read; reading is inferior to reviewing. This article teaches you to read the option chain (strike grid, IV, Greeks, open interest and volume), surveys domestic and overseas IV data tools and strategy builders, provides a per-trade review template, emphasizes the long-term value of "IV percentile logging" (building your own volatility calendar), and lays out a step-by-step learning path: understand pricing first → then spreads → only later selling — practicing on paper accounts along the way.

---

## Content Conventions

- All formulas, prices, premiums, and Greek values in these articles are **fictional teaching examples**, intended to clarify logic rather than quote real markets.
- Anything involving margin, permissions, or contract specifications **always defers to each exchange's latest rules and brokers' live data**.
- Options are extremely high-risk derivatives. Every article contains a "Risk Warning" box — **read the risks before dreaming about returns**.

---

## Article List

<DocCards dir="options-strategies" />
