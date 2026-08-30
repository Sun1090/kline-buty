---
title: "05 · A-Share Special Plays"
description: "Seven signature A-share plays dissected one by one — limit-up chasing, IPO subscriptions, convertible bond T+0, and ST delisting risk."
---

# 05 · A-Share Special Plays

> The reason A-shares feel "hard to understand" is that the market has many plays unique to it: price limits, T+1, limit-up chasing, IPO subscriptions, convertible bond T+0, ST delisting, theme speculation... These plays are both wealth amplifiers and meat grinders. This article dissects all seven: **the logic of each play, its operational essentials, and its risk points**, ending with a beginner pitfall-avoidance checklist.

> **Scope boundary:** This is the A-share tactics and behavioral-risk casebook. Opening hours, call auction, T+1, price limits, accounts, and fees are maintained in [A-share Trading Rules](../stocks/a-share-rules.md); this article does not duplicate the full rule tables.

---

## 1. Limit-Up Chasing (The Limit-Up Play)

### 1.1 The logic

The limit-up board is A-shares' most distinctive phenomenon: main-board stocks can rise at most 10% in a day, and once the price hits it, buy orders can only queue. **Limit-up chasing means buying at (or just before) the moment a stock seals its limit, betting on momentum to carry a gap-up open the next day** — you earn the relay of sentiment premium.

- **First limit-up**: a stock's first seal; the ignition point of market sentiment;
- **Consecutive-limit ladder**: stocks with consecutive limit-ups form a height ladder — 3 boards, 5 boards, 7 boards, 9 boards... When sentiment is strong, high boards keep "promoting", setting the space benchmark;
- **Identifying the leader**: within one theme, the stock that **limit-ups first, seals fastest, has the thickest sealed order book, and climbs highest on consecutive boards** is the leader ("the head dragon"); the rest are theme followers. Capital only respects leaders — their premium far exceeds followers'.

### 1.2 Operational essentials

| Step | Essentials |
|---|---|
| Stock selection | Only take the **front-rank leader** of the day's strongest theme, never back-rank followers; check seal time (earlier = stronger) and sealed volume (sealed orders / float > 5% counts as strong) |
| How to enter | Place a buy at the limit price right before sealing ("sweep"); or "queue" when sealed orders look about to pull ("board queuing" — risk is uncertainty) |
| Entry points | First boards on "popularity names"; consecutive boards on "leaders"; **buy first boards when sentiment is frozen, only take the strongest at sentiment peaks** |
| Exit points | Next-day open <3% and weakening → sell at open; open >5% with fast spike → scale out; one-word board continues next day → hold for now |
| **Position size** | ≤ 20% of capital per name; strict **<mark>stop-loss</mark>** (unconditional exit if the board breaks or near next-day limit-down) |

### 1.3 Risk points

- **Nuclear button**: hot money pulls orders, the board breaks instantly ("board blast"), sealed capital dumps together — 10%+ loss in a day;
- **Sky-to-floor board**: from limit-up straight slammed to limit-down (e.g. +10% flips to −10%, nearly 20% lost in one day); the reverse "floor-to-sky" is extreme washing;
- **Ebb phase**: after the leader tops, followers fall for days while chasers are deeply trapped;
- **Liquidity risk**: you bought at the limit price; tomorrow it may open limit-down and you **cannot sell**;
- **Why beginners must not touch it**: no chart feel, no order-pulling speed, no understanding of sentiment cycles — you most likely become the exit liquidity.

::: danger 💀 Beginners chasing boards mostly become someone's exit liquidity
**Limit-up chasing is zero-sum, against professional hot money, quant seats, and well-informed institutions.** Statistically, the expectation after a next-day gap-up on consecutive-board stocks is negative — losing odds far exceed winning ones. Without 3+ years of screen time and strict stop-loss discipline, treat this section as "cognitive enrichment", not an operating manual.
:::

---

## 2. Convertible Bonds (T+0 and Low-Risk Games)

### 2.1 The logic

A convertible bond is issued by a listed company and **can be converted into its stock at a preset price**. It has three natural properties:

| Property | Description |
|---|---|
| Bond nature | Repays principal + interest at maturity, with a "bond floor" cushion (strong support around 90-110 CNY) |
| Equity nature | When the underlying rises, the bond follows (via conversion value) |
| T+0 | **Buy today, sell today** — one of the few instruments allowing intraday round-trips in A-shares, with no stamp duty (sell side exempt; since 2023 stamp duty applies only to stocks) |

### 2.2 Operational essentials

**Price-limit rules (2025 framework; defer to latest)**:

| Scenario | Rule |
|---|---|
| Listing day | No price limit but circuit breakers apply: ≥20% gain halts trading 30 minutes, ≥30% halts until 14:57 |
| From day two | ±20% on SSE/SZSE main-board bonds; ±20% on ChiNext/STAR bonds |
| Forced redemption clause | If the underlying closes ≥ 130% of conversion price on at least 15 of 30 consecutive trading days, the company **may** redeem at face + interest (bond value must stay >130 to be safe) |

**Convertible bond IPO subscription**: like stock IPOs but **requires no market value** — subscribe even with an empty account, pay after allocation (typically 1 lot = 10 bonds = 1,000 CNY). First-day premiums usually run 5%-30% with low break risk — the friendliest IPO play for retail.

**Double-low strategy (with formula)**:

```text
Double-low value = bond price + conversion premium × 100
Conversion premium = (bond price ÷ conversion value − 1) × 100%
Conversion value = 100 ÷ conversion price × underlying price
```

- Example: bond at 105 CNY, conversion price 10, underlying at 9 → conversion value = 100÷10×9 = 90 → premium = (105÷90−1)×100% ≈ 16.7% → **double-low ≈ 105 + 16.7 = 121.7**.
- Screening: periodically (weekly) pick bonds with **double-low < 125 and price < 110**, hold 10-20 diversified names, rotate replacements. With enough bond-floor cushion losses are small; if equity nature ignites, you ride the underlying up.

**Downward-revision game**: when prolonged declines push a bond toward its floor, issuers often **revise the conversion price down** rather than repay, instantly lifting conversion value — the bond rallies on the news. Watch the sequence: **board proposes revision → shareholders vote → implementation**; buying the day after the proposal announcement is the mainstream play.

### 2.3 Risk points

- **Forced-redemption crush**: after redemption announcements, bond prices fall toward 100 — late buyers can lose 20%+ in a day;
- **High-premium speculation**: once "demon bonds" (hot-money playgrounds) see their underlying fade, they halve;
- **Delisting/default risk**: if the underlying delists, the bond loses conversion value and may be treated as default (recent cases exist);
- **T+0 double edge**: same-day escape also means same-day losses — intraday overtrading stacks fees just the same.

::: danger 💀 Demon bonds at 200%+ premium halve the moment the underlying fades
**High-premium speculation: demon bonds can run above 300 CNY at 200%+ premium — when the underlying fades, they halve outright.** The stronger the equity nature, the crueler the fall — "the bond floor can't catch it and the equity can't support it". Those who bought treating it as a bond die at premium normalization.
:::

---

## 3. New Share Subscription (IPO Play)

### 3.1 The logic

A-share IPOs generally carry listing premiums (breaks became normal under the registration system, but quality new listings still have meat). **IPO subscription = exchange holding market value for quota; if allocated, buy cheap and sell on listing**, capturing the primary-secondary market **spread**.

### 3.2 Operational essentials

**Market-value allocation rules (defer to latest regulations)**:

| Rule item | Description |
|---|---|
| Eligibility | Average daily holdings ≥10,000 CNY over the 20 trading days before T−2 (Shanghai/Shenzhen counted separately) |
| Quota | Every 10,000 CNY of market value = 1 subscription unit; Shanghai 1,000 shares/unit, Shenzhen 500 shares/unit |
| Subscription hours | SSE 9:30-11:30, 13:00-15:00; SZSE 9:15-11:30, 13:00-15:00 |
| Payment | Funds available by 16:00 on T+2 after allocation; **3 skipped payments within 12 months bars IPO subscriptions for 6 months** |
| Full subscription | Requires more market value — typically 200k-1M CNY |

**Board differences**:

| Board | Access requirements | Traits |
|---|---|---|
| SSE/SZSE main boards | None extra | Low break rate, low allocation odds (~0.02%-0.05%) |
| ChiNext | 2 years experience + 100k CNY assets | High elasticity, medium break rate |
| STAR Market | 2 years experience + 500k CNY assets | Highest elasticity, higher break rate — pick fundamentals carefully |
| BSE | 2 years experience + 1M CNY assets (2025 threshold changes subject to latest rules) | Relatively better odds, but break and **liquidity** risks coexist |

**Allocation-odds common sense**: retail per-account odds run ~0.02%-0.05%; **a full year typically yields only 1-5 allocations** — treat IPOs as lottery tickets, not income. Break risk: under the registration system, richly priced issues can list below offer — **skip any IPO whose issue P/E clearly exceeds industry peers or whose fundamentals are weak**.

### 3.3 Risk points

- **Breaks**: allocated shares can list underwater, losing up to 20%-50% per allocation;
- **Market-value volatility exceeds IPO income**: holding volatile stocks just for quota risks "picking up sesame seeds while dropping watermelons" — **an IPO base position should be dividend-type low-volatility stocks** (see Section 6).

---

## 4. Themes and Concept Speculation

### 4.1 The logic

A large share of short-term A-share moves runs on **sentiment and themes**: policy (rate cuts, domestic substitution), events (AI launches, price-hike letters), earnings previews, restructuring announcements... Every theme passes through a standard sentiment cycle. **Theme speculation isn't speculation about companies — it trades "expectation + sentiment + chips"; essentially a capital relay game.**

### 4.2 News fermentation rhythm: ignition → fermentation → climax → ebb

| Phase | Traits | What to do |
|---|---|---|
| Ignition | News just out, leader's first board, market half-believing | Gauge theme level (policy-level > industry-level > single-stock), watch capital attitude |
| Fermentation | Leader strings boards, sector peers follow, discussion heats up | Confirm the leader; small positions into divergence-to-consensus moments |
| Climax | Limit-up count explodes, followers rally broadly, media headlines | **Scale out progressively**, add nothing, beware "good news exhausted" |
| Ebb | Leader blasts off at highs, followers plunge, limit-up count collapses | **Stay in cash and watch**; bottom-fishing forbidden; wait for the sentiment freeze |

### 4.3 Identifying leaders vs followers

| Dimension | Leader | Follower |
|---|---|---|
| Order of first board | First in the theme | 1-2 days behind |
| Consecutive-board height | Highest (3+ boards) | 1-2 boards |
| Sealed orders | Thick, stable | Thin, repeatedly reopened |
| Behavior in decline | Last to fall during ebb | First to fall, worst falls |
| Capital behavior | Big money repeatedly involved | Retail + small hot money relaying |

**How you die in the ebb**: on T+1 after the leader breaks its board, followers commonly gap far down — chasers can't even leave. Bottom-fishing "oversold leaders" in the ebb looks cheap but is actually a **continuation pattern** — until the sentiment cycle completes, every bounce is distribution. **Ebb marker: space heights compressing consecutively (7 boards → 5 boards → 3) means sentiment is degrading — exit then, don't catch falling knives.**

### 4.4 Risk points

- **News lag**: by the time you read the news, institutional capital has been positioned for days — what you buy is their exit;
- **Good news exhausted**: announcement day is often the top;
- **Regulatory risk**: concept frenzy invites exchange inquiry letters and trading halts; resumption often gaps down to fill;
- **T+1 trap**: bought today, unsellable today; if it spikes and fades intraday, all you can do is watch tomorrow's lower open.

> Beginners should only "observe and record" — never put real money into round one.

---

## 5. ST Stocks and Delisting

### 5.1 The logic

ST (Special Treatment) is the exchange's **risk-warning tag** for troubled companies. The old play was "gamble restructuring, gamble cap removal" — buy cheap problem stocks hoping for rebirth. **After the new delisting rules, that road is effectively closed: delisting is normalized, and ST stocks turned from "lottery tickets" into "poison".**

### 5.2 The risk-warning regime

| Tag | Meaning | Impact |
|---|---|---|
| ST | Abnormal operations / financial problems | 5% daily price limit (main board); regular accounts may trade after signing a risk disclosure |
| *ST | Delisting risk warning | Same as above, facing possible delisting |
| Delisting arrangement period | Final 15 trading days before formal delisting | Code suffixed "退" (delisted), ±10% daily limit |

### 5.3 Key triggers of the new delisting rules (defer to latest regulations)

**Financial-class delisting**:

| Indicator | Trigger (examples) |
|---|---|
| Net profit + revenue | Negative net profit and revenue < 300M CNY (main board) |
| Net assets | Negative net assets plus negative adjusted net profit |
| Audit opinion | Financial report issued a disclaimer or adverse opinion |
| Retroactive adjustment | Fraud found retroactively hitting the above standards |

**Trading-class delisting**:

| Indicator | Trigger (examples) |
|---|---|
| Par-value delisting | Closing price below 1 CNY for 20 consecutive trading days |
| Market-cap delisting | Total market cap below 300M CNY for 20 consecutive trading days (main board) |
| Volume delisting | Cumulative volume below prescribed standard over 120 consecutive trading days |
| Shareholder-count delisting | Fewer than 2,000 shareholders for 20 consecutive trading days |

**Major-violation delisting**: fraudulent issuance, major information-disclosure violations, financial fraud (e.g. inflating profits to standard for 2 straight years) — immediate forced delisting, **no grace period**.

### 5.4 Risk points

- **Relocation to the Old Third Board after delisting**: extremely poor liquidity; another 50% price halving is routine;
- **Cap removal doesn't save you**: an un-ST'd stock's fundamentals aren't necessarily better — only its indicators passed;
- **Tightening regulation**: with the delisting channel clear, shell value is gone; ST stocks no longer carry a "restructuring rescue" expectation. **Don't touch them, don't bottom-fish them, don't listen to "restructuring rumors".**

::: danger 💀 ST stocks turned from lottery tickets into poison
**Any "gamble on ST restructuring" mindset should be abandoned** — under the new rules this is a negative-sum game: win rate extremely low, payoff asymmetric (best case +30%-50%, worst case −100%). Par-value delistings offer nothing to gamble on — below 1 CNY comes a chain of limit-downs you cannot sell into; after delisting, another 50% halving on the Old Third Board is routine. Don't touch, don't bottom-fish, don't listen to rumors.
:::

---

## 6. Fund-DCA Style Stock Buying

### 6.1 The logic

If you won't watch markets or gamble, treat stock buying like **buying wealth-management products**: pick high-dividend, low-volatility companies, accumulate via DCA, and earn mainly **dividends + slow price repair**. This is among the highest-win-rate plays for A-share retail — returns aren't sexy, but the probability of losing money is low.

### 6.2 Operational essentials

**Dividend-strategy screening framework**:

| Screen | Example criteria |
|---|---|
| Dividend yield | Trailing 3-year yield > 4% (banks, coal, utilities, highways, telecom operators) |
| Payout sustainability | 5 consecutive years of dividends, payout ratio (dividends/net profit) 30%-60% |
| Financial health | Debt ratio < 70%, positive operating cash flow |
| Valuation | P/E below industry average, low P/B (below book even better) |
| Avoid | Cyclical tops (peak coal prices), landmines (high goodwill, heavy pledge) |

**Bank-stock income**: take the big four banks — long-term yields ~4.5%-6%. Holding 1M CNY of bank stocks pays ~45k-60k CNY yearly dividends while serving as your IPO-quota base position — **one fish, two dishes**.

**DCA discipline**:

```text
Buy a fixed amount on a fixed date monthly (e.g. 10k CNY on the 1st)
Build in batches: target position across 4-6 purchases spanning 3-6 months
Reinvest dividends: compound payouts as they arrive
Take-profit discipline: partially trim when dividend yield falls below 3% (price ran too much)
```

### 6.3 Risk points

- **Dividend-yield trap**: a crashed share price mechanically raises the yield (smaller denominator); "high dividend" may signal deteriorating fundamentals — always cross-check payout ratio;
- **Cyclical misjudgment**: banks too can fall 20%-30% on property risk or falling rates — patience required to hold;
- **Opportunity cost**: in bull markets this strategy lags the index; watching others double while you collect coupons tests your psyche;
- **Not principal-protected**: share prices still fluctuate — just with far smaller **volatility** than theme stocks.

---

## 7. Low-Risk Arbitrage Beyond IPO Subscriptions

### 7.1 The logic

A-share public rules hide several **event-driven low-risk arbitrages**: the spread converges with certainty; only patience and discipline are needed. Single-shot returns are modest but certainty is high — the closest thing to "risk-free" money ordinary investors can touch.

### 7.2 Tender-offer arbitrage

- Logic: a controlling shareholder or acquirer offers a **fixed tender price** for the float (offer 6 CNY vs market 5.8); if the deal succeeds, buy at market, tender to the offeror, pocket the 0.2 spread;
- Operation: buy after the offer announcement (the bigger the premium over market, the safer), then tender your shares to the acquirer during the offer period;
- Keys: **check whether the offer is "full" and whether acceptance will be 100%** (partial offers prorate — you may not get everything sold), and whether conditions exist (e.g. cancelled if thresholds unmet);
- Risks: the offer may fail; during the window the stock may sink further below the offer price (time risk).

### 7.3 Convertible-bond discount arbitrage

- Logic: when bond price < conversion value (negative conversion premium, i.e. discount), **buy the bond → apply for conversion same day → sell the shares next day**, capturing the discount closing;
- Example: conversion value 105, bond at 102 → 3 CNY discount; convert and sell next day, ~3% gross;
- Risks: **T+1 overnight risk** — the shares may open down 2%+ next day, eating the whole discount or worse; if the underlying limit-ups that day, conversion value jumps (but you cannot sell same-day — settlement happens at next-day prices);
- Suited to advanced players confident in the underlying's next-day behavior who tolerate single-day swings; **under A-share T+1 there is no such thing as mindless "risk-free" conversion arbitrage**.

---

## Beginner A-Share Pitfall-Avoidance Checklist

| # | Pitfall | Correct posture |
|---|---|---|
| 1 | Chasing limit-up boards | Paper-trade small first; observe at least one complete sentiment cycle |
| 2 | All-in on one stock | ≤20% position per name, diversify across sectors |
| 3 | Bottom-fishing ST/delisting stocks | Don't touch — ST is poison, not a lottery ticket |
| 4 | Overtrading | Commissions + stamp duty are hidden costs; cut meaningless actions |
| 5 | Forgetting IPO payment deadlines | Set reminders; 3 skipped payments bans subscriptions for 6 months |
| 6 | Chasing themes on tips | By the time you hear it, you're three beats late |
| 7 | Using **<mark>leverage</mark>** (margin financing/off-exchange funding) | Beginners stay away from leverage — one **<mark>liquidation</mark>** resets everything |
| 8 | Buying tops without stops | Define the stop (-5%~-8%) before entering |
| 9 | Running T-trades on an all-in base position | Failed T-trades raise cost basis; beginners shouldn't |
| 10 | Trading without studying rules | Read latest announcements first: forced redemption, delisting, market-value allocation |

---

::: warning ⚠️ Risk Warning
A-shares are a market where **institutional dividends and institutional traps coexist**: IPO subscriptions, double-low converts, tender offers, and dividend income are relatively friendly plays; limit-up chasing, theme speculation, and ST gambling are high-risk plays. All rules cited here (price limits, market-value thresholds, delisting indicators, fees) **are subject to the latest announcements of the SSE/SZSE/BSE exchanges and the CSRC** — verify each one before acting.

**Markets carry risk; invest with caution. No "guaranteed profit" strategy exists, and this article does not constitute investment advice.**
:::
