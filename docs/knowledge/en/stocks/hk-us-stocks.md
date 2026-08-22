---
title: "HK and US Stocks"
description: "HK and US stock trading rules — HK T+0 round trips with T+2 settlement, US pre-market and after-hours sessions, the VCM and circuit breakers, compliant account opening and funding, ADRs and index ETFs"
---

# HK and US Stocks

> Before allocating to HK or US stocks, understand two entirely different sets of rules: HK stocks trade T+0 round trips but settle T+2, with no price limits but a volatility control mechanism; US stocks trade pre-market and after-hours, with no price limits but circuit breakers. This article also covers the HK vs US differences, broker selection and compliant account opening and funding, plus ADRs and US index ETFs. **When investing offshore, compliance is always the first premise.**

---

## 1. Hong Kong Stocks

### Trading Hours (Hong Kong time)

| Session | Time | Notes |
|---|---|---|
| Pre-opening auction | 9:00 - 9:30 | Orders cancellable 9:00-9:20, not cancellable 9:20-9:22, matched 9:22-9:28 |
| Morning session | 9:30 - 12:00 | Followed by the lunch break |
| Afternoon session | 13:00 - 16:00 | 16:00-16:10 is the closing auction |
| Stock Connect trading days | Days when both the mainland and HK are open | Typhoon/black-rain signals may close the market ad hoc |

> HK stocks **break for lunch** (12:00-13:00), same as A-shares; but Stock Connect pauses on special days (a mainland holiday while HK still trades), so the actual number of tradable days is smaller than for local HK investors.

### T+0 Round Trips and T+2 Settlement

| Rule | Description |
|---|---|
| T+0 round trip | **Shares bought today can be sold today**, repeatedly |
| T+2 settlement | Shares and funds actually settle only on the **2nd trading day after the trade**; during that window sale proceeds **cannot immediately be reused to buy** (unlike A-shares) |

> Note the distinction: A-shares are "shares T+1, funds usable the same day, withdrawable the next"; HK is "shares T+0, funds T+2". HK's T+2 means that when doing intraday round trips, **sale proceeds take two days to become buyable again** — a completely different rhythm.

### No Price Limits, but a Volatility Control Mechanism (VCM)

| Mechanism | Description |
|---|---|
| Price limit | **None** — a stock can in theory move without bound in a single day |
| VCM | For major stocks such as Hang Seng Index / Hang Seng China Enterprises Index constituents: **deviating ±5% from the reference price within 5 minutes** triggers a 5-minute "cooling-off", during which trading is limited to a defined price band |
| Futures linkage | Hang Seng index futures have a ±5% pre-open price limit; the cash market has none |

> The VCM covers only the major blue chips; **a large number of small and mid-cap HK stocks carry no limits at all** — a 50% single-day drop is entirely possible, and illiquid penny stocks can go to **<mark>zero</mark>** in an instant.

::: danger 💀 HK stocks have no price limits — a 50% down day is possible, and penny stocks can hit zero instantly
**A large number of small and mid-cap HK stocks carry no limits at all — a 50% single-day drop is entirely possible, and illiquid penny stocks can go to zero in an instant.** The VCM covers only the major blue chips; everything else is priced freely by the market — always check liquidity before buying.
:::

### Trading Units and Odd Lots

| Rule | Description |
|---|---|
| Trading unit | The board-lot size is set by each listed company: 100, 200, 500, 1000, or 2000 shares |
| Buying | Must be in whole board lots |
| Odd lots | Sub-lot holdings trade on the odd-lot market, usually at a discount to the round lot |
| Minimum tick | Tied to the price band — cheaper stocks have finer ticks |

### Trading Fees (Hong Kong market)

| Fee | Rate | Notes |
|---|---|---|
| Stamp duty | 0.1% → 0.07% | Charged on both buys and sells; 0.1% from November 2023, cut to 0.07% from November 2025 (defer to the latest announcement) |
| Brokerage commission | Negotiable, typically 0.03%-0.25% | Varies by broker; zero-commission promos exist |
| Transaction levy | 0.0027% | Both sides |
| Transaction fee | 0.00565% | Both sides |
| Trading system usage fee | About 0.5-3 HKD per trade | Broker-dependent |

> HK fees look low, but **stamp duty hits both sides** (A-shares charge sells only), and odd lots, FX, and custody fees all erode returns — the real friction cost is not cheap.

### Phenomena Unique to HK Stocks

| Phenomenon | Description |
|---|---|
| Penny stocks | Stocks priced below 1 HKD — thin liquidity, easily manipulated |
| Cap-churning stocks | Stocks that repeatedly dilute minority shareholders via share consolidations, rights issues, and placements — a trap unique to HK |
| Consolidation / split | After a 10-to-1 consolidation the price is 10x but you hold 1/10 the shares; nothing real has changed |
| High dividends | Some central-SOE H-shares yield markedly more than their A-shares |
| AH premium | The same company's A-shares and H-shares rarely price alike; the A-shares usually trade at a premium |

### Stock Connect (the main compliant channel for mainland buyers)

| Item | Description |
|---|---|
| Threshold | Daily average assets ≥ 500,000 CNY over 20 trading days + risk assessment |
| Universe | Stocks on the Stock Connect list (several hundred, mostly blue chips and major tech names) |
| Restrictions | No HK IPO subscription, excluded from some corporate actions such as rights issues, trading hours constrained by both markets' holidays |
| Settlement | T+2, settled in CNY at the FX rate set by the clearing institution |

---

## 2. US Stocks

### Trading Hours (US Eastern ↔ Beijing time)

| Session | US Eastern | Beijing (daylight saving) | Beijing (standard) |
|---|---|---|---|
| Pre-market | 4:00 - 9:30 | 16:00 - 21:30 | 17:00 - 22:30 |
| Regular hours | 9:30 - 16:00 | 21:30 - next day 4:00 | 22:30 - next day 5:00 |
| After-hours | 16:00 - 20:00 | 4:00 - 8:00 | 5:00 - 9:00 |

> Daylight saving (from the second Sunday of March to the first Sunday of November) shifts times by one hour. **Pre-market and after-hours trading is offered by only some brokers, with thin liquidity and wide spreads** — go easy on large orders. US hours do not overlap A-share hours (9:30-15:00) at all; watching the tape means staying up late.

### T+0 Round Trips and T+1 Settlement

| Rule | Description |
|---|---|
| T+0 round trip | Buy today, sell today |
| T+1 settlement | Since May 28, 2024, the settlement cycle shortened from T+2 to **T+1** |
| PDT rule | In a **<mark>margin</mark>** account with **equity below USD 25,000**, at most 3 day trades are allowed within any 5 trading days, or the account is restricted for 90 days |
| Cash account | Unclear funds cannot be reused; T+0 is even more restricted |

> The PDT rule is the biggest obstacle to "free T+0" in US stocks: **below USD 25,000, more than 3 day trades in a window freezes the account for 90 days**.

### No Price Limits, but Circuit Breakers

| Circuit-breaker level | Trigger (S&P 500 vs prior close) | Consequence |
|---|---|---|
| Level 1 | ±7% | 15-minute halt (if triggered before 15:35 ET; afterwards only Levels 2/3 apply) |
| Level 2 | ±13% | Another 15-minute halt |
| Level 3 | ±20% | **Market closes for the day**, reopening the next day |

Single-stock circuit breakers (by price band):

| Price | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| < $1 | ±25% | ±50% | ±75% |
| $1 ~ $100 | ±5% | ±10% | ±20% |
| > $100 | ±10% | ±20% | ±30% |

> A triggered single-stock halt pauses trading for 5 minutes. A stock halving in a day is not rare in the US market (earnings blow-ups, delisting names) — **"no price limit" cuts both ways**.

### Minimum Trading Unit and Fractional Shares

| Rule | Description |
|---|---|
| Whole shares | Buy from 1 share; no board-lot requirement |
| Fractional shares | Some brokers support fractional trading from 0.001 share, handy for DCA into high-priced names |

> Buying a single share means an extremely low entry threshold, but **fees are charged per trade** — mind the cost when DCA-ing small amounts.

### Choosing a Broker

| Type | Examples | Characteristics |
|---|---|---|
| Chinese online brokers | Futu, Tiger, Longbridge | Chinese UI, user-friendly, HK + US trading |
| International brokers | Interactive Brokers (IBKR), Schwab, Vanguard | Low cost, full product range; for advanced and long-term investors |
| Zero-commission platforms | Robinhood, Webull, etc. | Commission-free, monetized by payment for order flow; for simple trading |

### Account Opening and Funding: Compliant Channels

| Channel | Description | Compliance |
|---|---|---|
| Online account at an offshore broker | Open with a passport / overseas identity | Opening itself is not illegal, but **moving the funds out is the crux** |
| Direct deposit from a mainland bank card | Under FX control, the USD 50,000 convenience quota may not be used for securities investment | **Non-compliant; the account can be frozen** |
| Overseas remittance (study, work, and other legitimate reasons) | Requires a genuine background and must not fund securities | Misuse carries compliance risk |
| Stock Connect | A compliant mainland channel, but limited to Stock Connect names | Fully compliant |
| QDII funds/ETFs | A compliant mainland channel into offshore assets, but no active stock picking | Fully compliant |

> ⚠️ Risk Warning: **the biggest landmine in "buying US stocks" is not the market but funding compliance** — converting personal FX for offshore securities investment is a prohibited use under the FX regulations; funding through gray channels (underground banks, crypto conversion, salami-sliced transfers) risks frozen funds, closed accounts, and FX penalties. Prefer compliant mainland channels such as Stock Connect and QDII, or open an account only once you hold a legal overseas identity or legal offshore funds.

::: danger 💀 The biggest landmine in US stocks is not the market — it is funding compliance
**The most common blow-up in "buying US stocks" is not the market but funding compliance — converting personal FX for offshore securities investment is a prohibited use under the FX regulations.** Funding through gray channels (underground banks, crypto conversion, salami-sliced transfers) risks frozen funds, closed accounts, and FX penalties. Compliance is always the first premise.
:::

### ADR (American Depositary Receipt)

| Concept | Description |
|---|---|
| Definition | Foreign-company shares listed and traded in the US as depositary receipts |
| Common names | Alibaba BABA, PDD, JD, Baidu BIDU and other Chinese ADRs |
| Conversion ratio | 1 ADR corresponds to a number of ordinary shares (set by each company) |
| Risks | Underlying-asset and delisting risk, liquidity, FX, limited voting rights |

> The Chinese-ADR delisting saga (PCAOB audit working papers, delisting threats) has repeatedly crashed ADRs — **before buying an ADR, get clear on the underlying company's place of registration and the delisting clauses**.

### US Indexes and ETFs

| Index | Tracking ETF | Description |
|---|---|---|
| S&P 500 | SPY / VOO / IVV | The core US allocation; the world's mainstream benchmark |
| Nasdaq 100 | QQQ | Tech growth style |
| Dow Jones Industrial | DIA | 30 blue chips |
| Russell 2000 | IWM | US small caps |
| China internet | KWEB / CQQQ | A basket of Chinese ADRs |

> **<mark>Leveraged</mark>** ETFs (e.g. TQQQ, 3x Nasdaq) and inverse ETFs are **for intraday/short-term use only**; long-term holding bleeds value through "volatility decay" — ordinary investors should stay away.

---

## 3. HK vs US Quick Comparison

| Dimension | HK stocks | US stocks |
|---|---|---|
| Round trip | T+0 | T+0 (PDT-restricted) |
| Settlement | T+2 | T+1 |
| Price limit | None (VCM on blue chips) | None (circuit breakers) |
| Minimum unit | Board lots (100-2000 shares) | From 1 share; fractional available |
| Hours | 9:30-16:00 with a lunch break | 9:30-16:00 plus pre/after hours, no lunch break |
| Stamp duty | Yes (both sides) | None |
| Retail shorting | Possible (stock borrowing) | Easy |
| Mainland channel | Stock Connect | No direct link; mostly offshore brokers |

---

## ⚠️ Risk Warning

::: warning ⚠️ Risk Warning
HK and US stocks have no price limits; earnings blow-ups, delistings, and regulatory events can inflict 50%+ single-day losses. HK cap-churning stocks and US-listed Chinese ADRs each carry their own particular risks. Mainland capital going offshore faces strict FX controls — **gray funding channels can lead to frozen accounts and administrative penalties**. All rates, thresholds, and mechanisms in this article may change; defer to the latest exchange and regulatory rules. This article is educational only and does not constitute investment advice.
:::
