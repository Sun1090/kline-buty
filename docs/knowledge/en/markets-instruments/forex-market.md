---
title: "Forex Market: The World's Largest Financial Battlefield"
description: "Forex market explained — currency pairs, the US Dollar Index DXY, quote mechanics, pip value calculation, four-city trading sessions, leverage characteristics, and what drives exchange rates"
---

# Forex Market: The World's Largest Financial Battlefield

> The foreign exchange (FX / Forex) market is the world's **largest, most **<mark>liquid</mark>**, and longest-trading** financial market. It has no central exchange and no price limits, and it never stops from Monday to Friday, 24 hours a day — you have to wait for the evening session to buy US stocks, but forex always has a counterparty.
>
> But large scale does not mean easy money: this is the **institutions' home ground**, and retail traders who enter with high **<mark>leverage</mark>** mostly end up eaten alive by time, the **<mark>spread</mark>**, and rogue platforms. This article explains the rules and the traps.

---

## 1. How Big Is This Market

| Data point | Scale | Notes |
|---|---|---|
| Average daily turnover | **About USD 7.5 trillion** (2022 BIS triennial survey) | Far exceeds stocks and bonds combined |
| Trading venue | **Over-the-counter (OTC)** | No central exchange; banks match directly interbank |
| Trading centers | London (~40% share) > New York > Singapore > Hong Kong > Tokyo | London is the absolute hegemon |
| Participants | Banks dominate (~45%), the rest are **<mark>hedging</mark>** funds, central banks, corporations, retail | Retail share is under 10% |

> Data basis: the BIS (Bank for International Settlements) publishes a global forex market survey every three years; the table above uses the most recent public data (2022). **Defer to the latest survey for exact figures.**

Why OTC? Because forex trades are "bank-to-bank" over-the-counter agreements with no unified exchange tape. Thousands of market-making banks worldwide quote simultaneously; your broker throws the order to a liquidity provider (usually a bank) rather than to some exchange's matching engine. This is one reason rogue platforms can pose as "legitimate brokers" — **no official exchange means regulation relies on licenses, and licenses can be faked** (see [11 - Rogue Forex Platform Warning](#11-rogue-forex-platform-warning)).

---

## 2. Currency Pairs: What Trades Against What

Forex trades are always **in pairs**: buying one currency while selling another. The notation is `Base Currency/Quote Currency` (e.g., EUR/USD), read as "euro versus US dollar".

### Major Pairs (Straight Pairs)

| Pair | Name | Characteristics |
|---|---|---|
| **EUR/USD** | Euro / US dollar | The largest share of global turnover (~22%); best liquidity and the narrowest **<mark>spread</mark>** |
| USD/JPY | US dollar / Japanese yen | Dual "safe haven + rate differential" character; heavily influenced by BOJ policy |
| GBP/USD | British pound / US dollar | Volatile, slightly wider spread; nicknamed "Cable" |
| USD/CHF | US dollar / Swiss franc | The Swiss franc is the traditional safe-haven currency, often moving with gold |
| USD/CAD | US dollar / Canadian dollar | The loonie is highly correlated with oil prices — the "petro currency" |
| AUD/USD | Australian dollar / US dollar | Linked to iron ore and Chinese demand; rate-sensitive |
| NZD/USD | New Zealand dollar / US dollar | Linked to dairy products and to the AUD |

### Commodity Currencies

**AUD / CAD / NZD** are known as "commodity currencies" — their economies depend heavily on resource exports, so their exchange rates correlate strongly with commodity prices:

- AUD tracks iron ore, coal, and Australian exports
- CAD tracks crude oil (Canada is a major oil producer)
- NZD tracks dairy and agricultural products

> Rule of thumb: **when oil surges, CAD tends to strengthen; when iron ore is strong, AUD benefits**. This "commodity character" is a linkage logic retail traders can actually observe.

### Crosses

Pairs that do not include the US dollar are called **crosses**, e.g., EUR/GBP, EUR/JPY, GBP/JPY. Cross traders are usually "expressing the relative strength of two countries" rather than a view on the dollar. GBP/JPY is extremely violent and is a disaster zone for retail **<mark>blow-ups</mark>**.

---

## 3. The US Dollar Index DXY: The Ruler of Global Assets

**The US Dollar Index (US Dollar Index, ticker DXY)** measures the dollar's overall strength against a basket of major currencies, compiled and published by ICE (Intercontinental Exchange). It is in essence the price gauge of "how much the dollar buys" — global commodities are priced in dollars, so **a rising DXY tends to pressure gold/oil/non-US assets**.

### Basket Composition (weights per the latest index methodology)

| Currency | Weight (historical reference) |
|---|---|
| Euro EUR | ~57.6% |
| Japanese yen JPY | ~13.6% |
| British pound GBP | ~11.9% |
| Canadian dollar CAD | ~9.1% |
| Swedish krona SEK | ~4.2% |
| Swiss franc CHF | ~3.6% |

> The basket weights were set after the 1973 collapse of the Bretton Woods system and are updated rarely. **Defer to ICE's latest methodology for exact weights.** Note: the renminbi is not yet in the DXY basket (there are other baskets such as the CNH index).

How to read it: DXY up = dollar stronger, usually corresponding to weaker non-US currencies (EUR/USD down, USD/JPY up); and vice versa. It is the "steering wheel" for cross-border investors and macro traders.

---

## 4. Quote Mechanics: Reading the Number 1.0850

Take EUR/USD = 1.0850/1.0852:

- **Base currency (Base)**: EUR — the "commodity" on the left side
- **Quote currency (Quote)**: USD — the "money" used for pricing
- **<mark>Bid</mark>** 1.0850: the price at which the broker is willing to buy euros (i.e., the price at which **you sell**)
- **<mark>Ask</mark>** 1.0852: the price at which the broker is willing to sell euros (i.e., the price at which **you buy**)
- **Bid-ask **<mark>spread</mark>** (Spread) 0.0002**: the difference between the two — one of the broker's income sources

**What the price means**: 1 EUR is worth 1.0850 USD. If you expect the euro to appreciate, you "buy EUR/USD"; if the euro rises to 1.09, your **<mark>position</mark>** profits. **On every trade you first buy at the Ask and sell at the Bid — the spread is your first cost.**

---

## 5. Pip Value Calculation (with Numeric Examples)

**A pip (Point in Percentage)** is the minimum increment of an exchange rate:

- Most pairs are quoted to 5 decimal places, where **the 4th decimal = 1 pip** (e.g., 1.0850 → 1.0851 is a rise of 1 pip)
- USD/JPY is quoted to 3 decimal places, where **the 2nd decimal = 1 pip** (e.g., 150.25 → 150.26 is a rise of 1 pip)

### Example 1: EUR/USD standard lot

- 1 standard lot = 100,000 units of the base currency (EUR)
- A 1 pip move = 0.0001
- Value per pip = 100,000 × 0.0001 = **USD 10**

### Example 2: USD/JPY standard lot

- 1 standard lot = 100,000 USD
- A 1 pip move = 0.01
- If USD/JPY = 150.00, value per pip = 100,000 × 0.01 ÷ 150.00 ≈ **USD 6.67** (converted from the quote currency JPY back to USD)

### Example 3: Mini lots and the distance to a forced liquidation (blow-up)

- A mini lot (0.1 lot) = USD 1 per pip; a micro lot (0.01 lot) = USD 0.1 per pip
- Account of USD 1,000, 100:1 leverage, 1 standard lot of EUR/USD requires **<mark>margin</mark>** of USD 1,000
- Profit/loss of USD 10 per pip → **100 pips against you and the account is wiped out** (before even counting the spread). And a 100+ pip day in EUR/USD is utterly routine.

::: danger 💀 The math of a blow-up lives inside ordinary daily moves
**Account of USD 1,000, 100:1 **<mark>leverage</mark>**, 1 standard lot of EUR/USD with USD 1,000 margin, USD 10 per pip → 100 adverse pips wipes out the account.** A 100+ pip day in EUR/USD is routine, which means blowing up is not an extreme event but a possible landing point of daily volatility.
:::

> **This is the mathematical truth of retail forex**: high leverage + large swings + spreads = most positions do not survive a week. **<mark>Volatility</mark>** and spreads follow the latest market quotes; the above are teaching-basis figures.

::: warning ⚠️ Leverage is bait, not a benefit
**The higher the leverage, the faster retail traders blow up and the more the platform earns** (spread + overnight interest + lost balance) — this is not a benefit, it is bait. What leverage amplifies is "speed", not "**<mark>win rate</mark>**".
:::

---

## 6. Trading Sessions: A Four-City Relay

The forex market runs **24 hours nonstop** from Monday (Sydney open) to Friday (New York close), with the four main centers taking over in turn:

| Session | Hours (Beijing time) | Characteristics |
|---|---|---|
| Sydney | ~06:00–14:00 | Thin, wide spreads |
| Tokyo | ~08:00–15:30 | Yen active, still thin overall |
| London | ~15:30–00:30 next day | **The world's largest center; volatility expands** |
| New York | ~20:00–05:00 next day | The London overlap (about 20:00–00:30) is **the most volatile window of the day** |

> The table reflects daylight saving time (March–October); in winter everything shifts 1 hour later. **Platform market open/close times follow platform announcements.**

Why it matters: **most volatility happens in the London-New York overlap**, while Asian retail traders are most prone to heavy positions in the "thin session" — wide spreads, few breakouts, pure spread-paying labor.

---

## 7. Leverage: The Signature Feature and Trap of Forex

| Market | Typical leverage | Notes |
|---|---|---|
| Domestic A-shares | None (margin financing ~1x, i.e., 2x cap, threshold CNY 500k) | Strictly limited by regulation |
| Domestic futures | ~6–20x (margin system) | Set by the exchanges |
| Offshore retail forex | **Commonly 1:100 – 1:500**, some platforms higher | Broker-determined; caps vary by regulator |

- Retail forex leverage is far above any legitimate domestic market — **US/EU regulators generally cap it around 1:30 (retail)**, while offshore-regulated platforms routinely offer 1:500 or even 1:1000.
- Why do platforms dare to offer 1:500? Because **the higher the leverage, the faster retail traders blow up and the more the platform earns** (spread + overnight interest + lost balance). It is not a benefit; it is bait.
- Domestic comparison: with the same USD 10,000 of capital, domestic futures can control at most about USD 200,000 notional, while a 1:500 platform can control 5 million — **one 0.2% adverse move and the account is gone**.

::: danger 💀 Offshore high leverage is bait, not a benefit
**The higher the leverage, the faster retail traders blow up and the more the platform earns** — spreads, overnight interest, and lost balances are all platform income. A 1:500 platform lets a 0.2% adverse move wipe out the account outright; this is not a perk for retail traders but a carefully designed harvesting bait.
:::

> Leverage ratios follow the latest regulations and platform rules. Core insight: **leverage amplifies "speed", not "win rate"** — see the "excessive leverage" section of [08 - Pitfalls / 01 - Why Traders Lose](../pitfalls/why-traders-lose.md).

---

## 8. Participants: Who Plays in This Market

| Participant | Role | Trading purpose |
|---|---|---|
| **Central banks** | The ultimate heavyweights | Exchange-rate policy, reserve management, market intervention |
| **Commercial banks** | **<mark>Market makers</mark>** | Quote for clients, earn the spread, manage their own exposure |
| **Hedge funds / asset managers** | The speculative main force | Macro bets, **<mark>arbitrage</mark>**, volatility trading |
| **Multinationals** | Hedgers | Settle payments, hedge FX risk |
| **Retail traders (you)** | The weak side | Speculation — mostly losing money under high leverage |

Key insight: **retail traders are at a comprehensive disadvantage in information, speed, cost, and capital size**. Banks see client order flow; hedge funds employ teams of PhDs — the retail trader's only edge is "flexibility", and leverage turns that flexibility into a disadvantage too. **In this market, 9 out of 10 retail traders ultimately losing is not a joke, it is data (public figures differ across platforms; this is a common-sense conclusion only).**

---

## 9. Core Drivers: What Moves Exchange Rates

In the short run an exchange rate is "a vote of money"; in the long run it is "a reflection of the economy". Five drivers:

### 1. Interest-rate differentials (the most important)

**Money flows toward higher rates**. If US rates are above euro rates → funds buy dollars → the dollar strengthens. Expectations of hikes/cuts by central banks are the largest one-sided force in forex. This is the famous **Carry Trade**: borrow the low-rate currency (e.g., JPY) to buy the high-rate currency (e.g., USD).

### 2. Economic data

| Data | Impact |
|---|---|
| Nonfarm payrolls (NFP) | First Friday of each month; the biggest market-moving machine |
| CPI inflation | Directly shifts central-bank rate expectations |
| GDP | The economic baseline |
| PMI / retail sales / unemployment | Secondary but frequent |

### 3. Central-bank policy

**Rate decisions and official speeches** from the Fed, the ECB, the BOJ, and the BOE are hard catalysts. Markets trade the "expectation gap": good news already priced in is not good news — **only the surprise moves the market**.

### 4. Risk sentiment

When the regime flips between "risk-off" and "risk-on", money rushes into the dollar, yen, franc, and gold (safe assets) and out of the AUD, NZD, and emerging-market currencies (risk assets). When geopolitical conflict escalates (war, sanctions), the dollar and gold rising together is a familiar picture.

### 5. Geopolitics and politics

Trade wars, sanctions, elections, and energy crises can all reset a currency's long-term valuation anchor. Examples: the ruble's violent depreciation during sanctions on Russia; sterling's long pressure during Brexit.

---

## 10. Dollar Strength: The Linkage with Gold/Oil/Crypto

The dollar is the "anchor currency" of global asset pricing, and its strength transmits directly to other assets:

| Asset | Linkage logic | Common pattern |
|---|---|---|
| **Gold** | Priced in dollars + gold as the dollar's "substitute" | **Strong dollar → gold pressured; weak dollar → gold stronger** (negative correlation, not absolute) |
| **Crude oil** | Priced in dollars; a stronger dollar raises other countries' purchase cost | Strong dollar → oil tends to be pressured (still dominated by supply-demand) |
| **EM stocks and bonds** | Strong dollar → EM dollar-debt stress, capital flows back to the US | A strong dollar often suppresses emerging-market assets |
| **Crypto (BTC etc.)** | Some funds treat it as "digital gold" with high volatility | Crypto often benefits when dollar liquidity is loose (the Fed cutting); pressured when liquidity is tight |

> These are **statistical correlations, not causal laws** — in 2020-2021 the dollar and BTC even rose together. In practice, treat the dollar index as "background music", not "the only signal".

---

## 11. Rogue Forex Platform Warning

Forex's OTC nature + high leverage + offshore regulation = **a scam hotbed**. Typical playbook:

- Claiming regulation by "US NFA / UK FCA" when it is actually a **cloned or cancelled license**
- Deposits via personal accounts or crypto top-ups; withdrawals hit sky-high fees or the platform simply vanishes
- The back office can **manipulate quotes** (**<mark>slippage</mark>**, disconnects, widened spreads) so you "almost made it"
- "Mentor"-led group trading plus high rebates: a combined harvest

**For identification and defense, you must read: [08 - Pitfalls / 02 - Scam Detection](../pitfalls/scam-detection.md) (especially the section "④ Fake exchanges (rogue platforms)").**

Three bottom lines:

1. Use only brokers **licensed in your own country / a mainstream jurisdiction**, and **verify the license number on the regulator's official website** (not from the counterparty's screenshot)
2. Withdrawal test: deposit a small amount → withdraw a small amount immediately → only consider adding funds after it succeeds
3. **Treat any forex promotion promising "guaranteed returns / no risk of loss" as a scam**

::: danger 💀 The iron rule for spotting rogue platforms
**Treat any forex promotion promising "guaranteed returns / no risk of loss" as a scam.** Remember the bottom lines: use only licensed brokers regulated in your own country / a mainstream jurisdiction, verify the license number on the regulator's official website, and run a small withdrawal test before depositing.
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
Forex margin trading carries **extreme leverage risk** and can drive your principal quickly to **<mark>zero</mark>** or even into debt (**<mark>negative balance</mark>**). Globally, **the share of retail forex investors who are consistently profitable is extremely small**; fraud risk on unregulated platforms is far higher than in legitimate markets. All figures on this page are teaching-basis (referencing 2022 BIS data and industry common sense); **always defer to the latest quotes, regulations, and platform rules**. This article does not constitute investment advice.
:::
