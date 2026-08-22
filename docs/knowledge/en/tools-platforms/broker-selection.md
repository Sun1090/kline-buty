---
title: "Broker & Futures Broker Selection"
description: "A comparison across four channel types — A-share brokers, futures brokers, HK/US brokers, and crypto exchanges — with safety checklists."
---

# Broker & Futures Broker Selection

> Quotes, data, tools — all set. The last multiple-choice question is: **where to keep your money and where to place orders.** That choice directly determines your trading costs (commissions, interest, **<mark>slippage</mark>**) and fund safety.
>
> This article covers four channel types: A-share brokers, futures brokers, HK/US brokers, and crypto exchanges — for each, "how to compare, what to compare, where the pitfalls are" — ending with a **safety checklist that applies no matter which account you open**.

### Four Channels at a Glance

| Channel | Core selection variables | Main costs | Safety core |
|---|---|---|---|
| A-share brokers | Commission (1–3 bps), app, margin-financing rates | Commission + stamp duty (uniform) | Third-party **<mark>custody</mark>** (funds sit in banks) |
| Futures brokers | **<mark>Margin</mark>** markup, **<mark>CTP</mark>** channels, fee **<mark>rebates</mark>** | Fees (both sides) | Custody via the margin monitoring center |
| HK/US brokers | Licenses, deposits/withdrawals, commission structure | Commission + FX/wire fees | Licensing and investor protection schemes |
| Crypto exchanges | **<mark>KYC</mark>**, fiat rails, compliance status | Fees + **<mark>funding rates</mark>** (perps) | Platform reputation + self-custody fallback |

> **⚠️ Risk Warning**
>
> All commissions, rates, margin ratios, rebates, and similar figures here reflect common industry practice and change with markets and each firm's policies — **always defer to each institution's latest official announcements**. Overseas brokers and crypto exchanges vary widely in compliance status and accessibility from mainland China; confirm local laws before opening accounts or depositing. All platform descriptions here are a selection framework only and imply no recommendation or endorsement. Markets carry risk; invest with caution. Nothing here constitutes investment advice.

---

## 1. How to Choose an A-Share Broker

### 1.1 Commission Rates: The Common 1–3 bps Knowledge

- Common industry commission runs about **1 to 3 bps** (0.01%–0.03%), with a CNY 5 minimum per trade (some brokers waive it; check latest policies);
- Commissions consist of "net commission (broker revenue) + regulatory fees (levied by regulators/exchanges)" — **when comparing, ask whether the quote is "all-in" or "net"**; only all-in is the true single price;
- Stamp tax (sell-side only) and transfer fees are collected uniformly by the state/exchange regardless of broker — don't be misled by "zero commission" marketing;
- Negotiation point: at account opening, directly ask "can you do 1.5–2 bps all-in?" Most brokers will negotiate; larger capital negotiates better — **the final agreement governs**.

### 1.2 App Experience

- Is the trading software stable, are order entry/cancels smooth, does it support conditional orders, grids, etc.;
- Whether quote delays affect fast trading (see data traps in [01 - Market Data Software](charting-platforms.md));
- **Separate your trading channel from your charting software**: the broker's app handles orders only; watch charts with your own tool combination.

### 1.3 Margin Financing Rates

- Margin financing/securities lending has capital and experience thresholds (CNY 500k + six months' experience, per latest rules);
- Financing rates vary widely: above the industry benchmark rate, big brokers and mid/small brokers differ noticeably — **it's negotiable, usually cheaper with more capital**;
- Margin financing is a **<mark>leverage</mark>** tool; interest is a cost item, not a return item — get good at trading on a cash account first.

### 1.4 Account Opening & the Three-Account Rule

- **Three accounts per person**: one investor may open at most three securities accounts per market (Shanghai/Shenzhen governed by their own rules; check latest regulations); adding or closing accounts can be handled offline;
- Opening process: video verification via mobile app; most brokers take effect within 1–3 business days;
- Tip: compare fees and apps before opening — once all three slots are used, switching gets costlier;
- Switching brokers: transfers (moving holdings within the same market) are now online, but pending funds and pledged/margin positions complicate things — **think it through first and avoid frequent back-and-forth**.

### 1.5 Branch Offices vs Online Brokers

| Dimension | Branch-office service | Online brokers (major firms' online channels) |
|---|---|---|
| Strengths | Face-to-face guidance; complex services (margin products, options, offline closure) easy to handle | Fast opening, transparent fees, fast app iteration, fully digital workflows |
| Best for | Older/high-net-worth users needing personal service and offline transactions | Younger users comfortable online, self-learners |

::: tip 💡 Bottom Line: Major Broker + Online Channel
**Bottom line**: most individual traders want "low fees + stable app + complete online services," which major brokers plus online channels deliver; firms with many branches handle emergencies and offline matters more comfortably.
:::

---

## 2. How to Choose a Futures Broker

### 2.1 Margin Ratios: The Customary 3–5 Percentage Point Markup

- Futures brokers typically **add a markup** on top of exchange margins (industry norm is 3–5 percentage points, negotiable downward); higher markup means more capital tied up;
- Negotiable: after depositing, ask your account manager for "margin concessions" or exchange-standard levels — **exact ratios defer to the broker's latest policy**;
- Note: lower margin means higher leverage — double-edged. Do your risk math before negotiating.

### 2.2 CTP Channel Stability

- The mainstream domestic futures trading channel is **CTP** (by Shanghai Futures Technology); brokers differ in CTP access quality, quote/trade line latency, and failure rates (principles in [Chapter 10 - System Integration](../system-integration/));
- High-frequency/programmatic traders should check: whether there's a **dedicated channel separating trade from quotes**, support for **secondary CTP seats / multi-channel**, intraday order latency and cancel ratios;
- Ordinary manual traders: differences are barely perceptible — picking a large firm gives baseline assurance.

### 2.3 Fees & Rebates

- Fees = exchange standard + broker markup; brokers generally mark up little or negotiate discounts;
- **Fee rebates**: brokers return part of the fees to traders under exchange rebate rules (common practice; ratio and conditions vary by firm, per latest policy) — high-frequency/high-volume traders care most; limited impact for ordinary traders;
- Distinguish carefully: rebates are broker concessions, not the same thing as illegal "allocation/agency" schemes; be wary of any channel promising "unconditional high rebates."

### 2.4 Access Thresholds & Special Product Permissions

| Product | Threshold (per latest rules) |
|---|---|
| Commodity futures (ordinary) | No capital threshold; open an account as yourself |
| Designated products/options (iron ore, PTA, index options, etc.) | CNY 500k capital verification + trading experience + knowledge test (designated commodity products require 100k) |
| Index futures/Treasury futures | CNY 500k verification + experience + test |
| Crude oil futures | CNY 500k verification + experience + test |

- Thresholds follow CSRC and each exchange's latest rules; every broker's site has application guides;
- Beginner path: start with ordinary commodities (rebar, soybean meal), run **<mark>paper trading</mark>** alongside **<mark>live trading</mark>**, then consider permission upgrades.

### 2.5 Paper Trading First

- Most futures brokers offer free CTP simulation accounts (SimNow, etc.) — real rules, no real money;
- Suggested flow: run the full loop on paper — "open account → deposit/withdraw → order → delivery/**<mark>liquidation</mark>**" — before funding; see [03 - Futures](../futures/).

### 2.6 Quick Decision Table for Choosing a Futures Broker

| Your situation | What to prioritize |
|---|---|
| Manual trend/swing trading | Reasonable fee markup, app/order software experience, customer service responsiveness |
| Intraday HFT/programmatic | CTP channel stability, trade/quote separation, cancel ratios and latency, rebate percentage |
| Large capital | Margin concessions, rebate percentages, dedicated account manager |
| Beginners | Paper-trading experience, investor education content, friendly minimum-capital terms |

---

## 3. HK & US Stock Brokers

| Dimension | Interactive Brokers (IBKR) | Futu | Tiger Brokers |
|---|---|---|---|
| Positioning | Global multi-market brokerage, institutional grade | Internet broker for HK/US stocks | Internet broker for HK/US stocks |
| Licenses | Licensed in the US/Europe and other jurisdictions; mature regulation | Licensed in Hong Kong/US and elsewhere | Licensed in Hong Kong/US and elsewhere |
| Strengths | Broad global coverage (US/HK/options/futures/bonds), transparent rates, open API (TWS API) | Good Chinese-language experience, strong community/news, good IPO subscription experience | Good Chinese-language experience, full options/US stock features |
| Commissions | Per-share/per-trade tiered; complex structure but low overall | Fixed rates, clear | Fixed rates, clear |
| Deposits/withdrawals | Mostly wire transfers, multi-currency accounts | Wire + some express deposit methods | Wire + some express deposit methods |

**Key points**:

- **Fund safety starts with licenses**: verify license numbers with regulators (SEC/FINRA in the US, SFC in Hong Kong) and investor protection schemes (e.g., SIPC insurance scope for securities assets, Hong Kong Investor Compensation Fund) — **coverage and limits defer to official statements**;
- Deposits/withdrawals: domestic bank card → overseas broker constitutes **cross-border fund movement subject to FX management rules**; confirm a compliant path yourself (see [08 - Pitfalls - 03 Compliance & Taxes](../pitfalls/compliance-taxes.md));
- Commission structure: compute a "mock bill" — IBKR's tiered pricing favors high-frequency/large orders; fixed rates suit ordinary retail;
- For programmatic needs prioritize the **official API** (IBKR TWS API is open to individuals; Futu/Tiger also have open platforms) — policies and rate limits per official docs;
- Extra details: dividend withholding tax, stamp duty, and FX settlement rules for HK/US accounts differ from A-shares — include them in cost accounting (details in [04 - Stocks - 03](../stocks/hk-us-stocks.md)).

---

## 4. Choosing a Crypto Exchange

| Dimension | Binance | OKX | Bybit | Coinbase |
|---|---|---|---|---|
| Strengths | Leading global spot/derivatives **<mark>liquidity</mark>** | Full derivatives product line, professional interface | Distinctive contracts and derivatives focus | US-compliance exemplar, beginner-friendly |
| KYC policy | Mandatory KYC (must verify before trading) | Mandatory KYC | Mandatory KYC | Mandatory KYC (stricter, finer identity checks) |
| Fiat rails | Multiple fiat deposits (regional restrictions apply) | Multiple fiat deposits | Multiple fiat deposits | USD/EUR etc., bank-grade compliant rails |
| Spot vs derivatives | Spot + USDT-/coin-margined futures | Spot + futures | Spot + futures | Spot-focused; derivatives for specific regions |
| Compliance status | Frequent licensing changes across regions | Licenses and restrictions vary by region | Licenses and restrictions vary by region | US-compliant operation, licensed in many states |

**Key points**:

- **First confirm accessibility and compliance where you live**: users in mainland China face restrictions and policy risk accessing most overseas exchanges — this is a basic principle; confirm yourself before opening any account;
- For derivatives, look at whether **mark price mechanics, funding rates, liquidation rules, and the insurance fund** are transparent (mechanisms in [05 - Crypto Perpetuals](../crypto-perpetuals/));
- Separate spot from derivatives: beginners start with spot; isolate derivatives-account funds strictly — never mix spot **<mark>positions</mark>** with futures margin;
- Exchange "earn products," "loans," and "dual investments" carry their own terms and risks — see [05 - Crypto Perpetuals - 03](../crypto-perpetuals/crypto-derivatives.md);
- **Platform custody vs self-custody**: assets on-exchange are platform-custodied (platform risk); moving to your own wallet is fully self-managed (**<mark>private key</mark>** loss risk) — the heavier your position, the more you should diversify; see [02 - Spot - 03](../spot/crypto-spot.md) for handling large holdings.

---

## 5. Safety Checklist Before Choosing Any Platform

Whichever account you open, walk through this checklist:

| Check | How |
|---|---|
| License lookup | Take the license number shown on the site/app and verify it on the regulator's own website (CSRC/SEC/FINRA/SFC/licensed exchange sites) |
| Fund custody | Ask whether client funds are independently custodied/segregated (A-share brokers use third-party custody, futures use the monitoring center, crypto uses platform self-management — different mechanisms, different risks) |
| Deposit/withdrawal test | Do one small deposit and one small withdrawal each; record arrival times and fees to prove the rails work |
| Customer feedback | Check regulator penalties and complaint cases (regulator sites, consumer complaint platforms); judge the nature of negatives: poor service vs fund-safety issues |
| Exit-scam signals | Blacklist immediately any platform matching several of: "high returns, recruitment schemes, unreasonably high rebates, unverifiable credentials, withdrawal failures"; for crypto platforms also check: whether wallet withdrawals stay smooth over time, whether platform news updates normally |
| Fees in writing | Get commissions/rates/rebates into agreements or saved service transcripts; verbal promises aren't reliable |
| Support responsiveness | Test customer support outside working hours (weekends/late night) — can you reach a human when markets go extreme? |

---

## 6. From Account Opening to First Trade: Action Checklist

The full path using "opening an A-share account" as the example (futures/HK-US/crypto steps analogous):

| Step | Action | Checkpoint |
|---|---|---|
| 1. Pick a broker | Compare fees and apps of 2–3 candidates using Section 1's framework | Confirm "all-in vs net" commission; keep chat records |
| 2. Open account | Mobile video verification, link bank card | Confirm you have a free slot under the three-account rule |
| 3. Deposit | Bank transfer to the third-party custody account | Small amount first; confirm arrival time |
| 4. Test order | Buy 100 shares of a low-priced stock or an ETF | Verify fill price and fees match the agreed schedule |
| 5. Validate | Check fees and app features against Section 2's checklist | Conditional orders, Level-2 permissions granted as promised |
| 6. Go live | Scale up after familiarization | Don't take a heavy position on day one |

::: danger 💀 Beware High-Rebate Channels
**Blacklist immediately any platform matching several of: "high returns, recruitment schemes, unreasonably high rebates, unverifiable credentials, withdrawal failures."** Platform choice is the first line of defense for fund safety — unlicensed operation, cross-region anomalies, and promised high rebates are all red flags.
:::

**FAQ quick answers**:

| Question | Quick answer |
|---|---|
| Can't negotiate the rate down? | Try another broker — around 2 bps is already normal territory; the key point is confirming it includes regulatory fees |
| How long until the account works? | A-shares generally 1–3 business days; HK/US/crypto varies by firm |
| How many futures accounts can one person hold? | Futures uses one-account-one-code (accounts work nationwide); switching means "re-signing with a new broker," not opening anew — per latest rules |
| Do I need a specific bank card? | Most brokers support third-party custody with major banks; cardholder must match the account holder |
| Are account-opening gifts legit? | Opening perks (quote tools, fee discounts) are normal; "free picks, free signal groups, strategy chats" are always marketing |
| Are HK/US/crypto money flows painful? | They involve cross-border movement and FX management — confirm the compliant path first; see [08 - Pitfalls - 03](../pitfalls/compliance-taxes.md) |
| Is switching futures brokers hard? | Just re-sign; holdings and funds migrate per the new broker's process, usually faster than switching equity brokers |

---

## 7. Next Steps

Once the platform is chosen and the account opened, go back to [01 - Market Data Software](charting-platforms.md) to wire up your charting tools, or jump straight into [04 - Analysis & Scripting](analysis-scripting.md) to start running your research workflow.

---

::: warning ⚠️ Risk Warning
Platform selection is the first line of defense for fund safety: unlicensed operations, cross-region anomalies, promised high rebates, and withdrawal failures are all danger signs; crypto exchanges and overseas brokers carry regional compliance and policy risks, and money flows involve FX management — confirming compliance yourself is a precondition for opening any account. All fees, rates, margins, rebates, thresholds, and licensing information here defer to each institution's latest official announcements and regulators' current rules. Everything here is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.
:::
