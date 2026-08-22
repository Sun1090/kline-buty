---
title: "05 · ADR and Cross-Border Listing"
description: "ADRs and cross-border listings — depositary receipts, the full history of US-listed Chinese companies, the hidden risks of the VIE structure, cross-border listing routes, and risks unique to Chinese ADRs"
---

# 05 · ADR and Cross-Border Listing

> US-listed Chinese companies ("Chinese ADRs") are both familiar and strange to many Chinese investors: you see the tickers BABA, PDD, JD every day, but in what form exactly do they list in the US? Why does the same company price differently in the US and Hong Kong? And why could a single regulatory document halve the entire sector in 2021?
> This article starts from the ADR, lays out the past and present of Chinese ADRs and the routes of cross-border listing, dissects the hidden mines of the VIE structure, and closes with the ways investors can participate and the sector's unique risks. **Before buying Chinese ADRs, get clear on "what it actually is, on whose exchange it hangs, and by what structure it lives".**

---

## 1. What an ADR Is: How Foreign Companies Trade in the US

### From Ordinary Shares to Depositary Receipts

The US market does not reject foreign companies — in theory a foreign company can issue ordinary shares and list directly on the NYSE/Nasdaq, but settlement, delivery, dividend distribution, and information disclosure are all extremely cumbersome. Hence the "wrapper" known as a **depositary receipt (DR)**:

| Concept | Description |
|---|---|
| Depositary receipt (DR) | A "substitute certificate" for a foreign company's shares, circulating in markets outside the home country |
| **ADR** | **American Depositary Receipt** — a depositary receipt trading in the US market |
| Depositary bank | Citibank, JPMorgan, BNY Mellon and others; they issue and cancel ADRs and custody the underlying shares |
| Underlying ordinary shares | The company's ordinary shares custodied at clearing institutions in Hong Kong, the Cayman Islands, etc.; the per-share correspondence is set by the company |

**Issuance mechanism (simplified)**:

```text
Company ordinary shares → custodied at a custodian → depositary bank issues ADRs → listed and traded on the NYSE/Nasdaq
```

- Every ADR an investor buys is backed by real ordinary shares locked at the custodian
- The depositary bank converts the company's dividends into US dollars for ADR holders and collects the depositary fee on the side
- ADRs and the underlying ordinary shares **are inter-convertible** (issuance/cancellation), which keeps the ADR price from detaching from underlying value for long

### 1 ADR = N Underlying Shares

The conversion ratio (ADR Ratio) is set by each company — **not necessarily 1:1, and it changes after splits/consolidations**:

| Company | Ticker | Ratio (1 ADR = N ordinary shares) | Notes |
|---|---|---|---|
| Alibaba | BABA | 8 shares | Following the 2022 ratio change |
| PDD | PDD | 4 shares | — |
| JD | JD | 2 shares | — |
| Baidu | BIDU | 8 shares | — |
| NetEase | NTES | 5 shares | — |

> Ratios all defer to **each company's latest announcement**. An ADR's price ≈ the ordinary share's price × the conversion ratio (then FX-adjusted), so never compare "ADR price" with "HK price" directly — convert to per-share price first.

### Sponsored vs Unsponsored ADRs (nice to know)

| Type | Description |
|---|---|
| Sponsored | The company participates actively and disclosure is standardized; Chinese ADRs are almost all of this type |
| Unsponsored | Issued by the depositary bank on its own, without the company; poor transparency — ordinary investors should stay away |

### ADR Holders' Rights Are Diluted

| Right | Description |
|---|---|
| Voting | Held via the depositary bank; exercising votes personally is extremely cumbersome |
| Dividends | Paid in US dollars, minus depositary and misc fees |
| Conversion | You may apply to convert into the underlying ordinary shares (usually above a minimum size) |

---

## 2. The Past and Present of Chinese ADRs: From Portals to the Regulatory Storm

### Timeline

| Period | Milestones |
|---|---|
| 2000-2009 | The first wave offshore: Sina (2000), Sohu, NetEase and other portal/game companies landed on Nasdaq; the decade after remained a handful of Chinese pioneers testing the water |
| 2010-2019 | The mass migration: **Alibaba's 2014 USD 25 billion IPO set the global record of its day**, igniting a wave of ten-billion-dollar listings; short sellers (Muddy Waters etc.) launched their sniping campaigns in the same period |
| 2020 | The US signed the **Holding Foreign Companies Accountable Act (HFCAA)**: auditors must submit to PCAOB inspection or the company joins the delisting list — the audit working-paper dispute moved front and center |
| 2021 | **Year one of the regulatory storm**: in July, Didi was hit by a cybersecurity review two days after its US listing and soon announced a US delisting process; the SEC began publishing its "delisting-risk list"; the domestic crackdown on tutoring and platform economies tightened, Chinese ADRs crashed repeatedly in single sessions and the sector's full-year loss set a record |
| 2022 | Chinese ADRs fell across the board; most leading names launched Hong Kong listings (dual primary or secondary) |
| 2023 | **The PCAOB inspection agreement landed**: in December 2022 the PCAOB announced it had completed its first inspection of audit working papers and confirmed it "can inspect completely"; inspections became routine in 2023, the delisting threat was defused for the time being, and the SEC gradually removed companies from the list |
| 2024- | The regulatory climate eased; Chinese ADR valuations recovered but remain torn between US-China relations, the macro economy, and the AI narrative |

> One line of history: **the fate of Chinese ADRs = company fundamentals × the regulatory variables of two countries stacked on top**. Few appreciated the weight of the second term before 2021; nobody has forgotten it since.

### Secondary Listing vs Dual Primary Listing

In the 2022 back-to-HK wave, the difference between the two listing forms mattered enormously:

| Dimension | Secondary listing | Dual primary listing |
|---|---|---|
| Primary venue | The US remains the primary listing venue | The US and HK **are both primary venues** |
| Rules applied | Exemptions from some HKEX rules; mainly follows US disclosure standards | Must comply with both regimes — higher compliance cost |
| Prices in both venues | Theoretically one price (ADRs and HK shares are fungible); the **spread** is usually small | The two markets price independently; spreads can be wider |
| Stock Connect inclusion | Not at first; eligible names included after 2022 (per the latest rules) | Meets Stock Connect inclusion criteria more directly |
| Conversion | ADRs and HK ordinary shares are inter-convertible | Also convertible, with more **arbitrage** room |
| Typical companies | The first 2019 returners such as Alibaba | The post-2022 mainstream: Alibaba, JD, Baidu, Bilibili, etc., completed one after another |

> Practical meaning for ordinary investors: **most Chinese ADRs returning to HK after 2022 upgraded to dual primary listing, which means the stock keeps trading normally in HK even if the US listing ends** — the old script of "US delisting = assets going to **<mark>zero</mark>**" is losing force. That does not mean the risk is gone.

---

## 3. ADRs vs Ordinary Shares: Same Share, Same Rights, Different Price

### Same Share, Different Price: Discount and Premium

For the same company, the ADR (US) and the HK ordinary share usually **do not price identically**:

| Phenomenon | Description |
|---|---|
| Discount / premium | The ADR below (discount) or above (premium) the HK price; common in large-cap, highly **liquid** names |
| Causes | Different trading hours, different investor structures in the two markets, liquidity differences, FX expectations, capital controls |
| Arbitrage | Institutions profit by "buy in the cheap market → convert into ADRs → sell in the dear market"; arbitrage squeezes the spread back into line |

> A common retail mistake: seeing "HK is 5% cheaper than the US" and concluding HK is undervalued. **That spread mixes FX, time zones, liquidity, and conversion costs** — it is not that arbitrage opportunities are absent, but retail lacks the infrastructure to run them; never make buy/sell decisions directly off the "price gap".

### Time Zones and Liquidity

- US hours (21:30-4:00 Beijing): Chinese ADRs see their **largest volume and narrowest spreads**; institutions and **hedge** funds are active
- HK hours: the same company's HK line trades far more thinly; the price is easier to push around with big orders
- Practical meaning: when you need liquidity (large trades, **<mark>stop-loss</mark>**), operate in US hours first

---

## 4. Alternative Routes of Cross-Border Listing

| Route | Description | Typical companies |
|---|---|---|
| HK secondary / dual primary listing | The main channel for Chinese ADRs returning to HK; standard after 2022 | Alibaba, JD, Baidu, NetEase, Bilibili |
| A+H dual listing | The same company listed on both A-shares and HK; the classic route for mainland large caps | ICBC, SMIC, BYD |
| Red-chip structure | Company registered offshore (Cayman etc.) with main business and assets in the mainland; the offshore entity controls the onshore operator directly or indirectly | Most HK-listed Chinese names |
| VIE structure | Industries restricted for foreign capital (internet, education, media) control the onshore operator through "contractual control" rather than equity | Most US-listed Chinese names |

### The AH Premium

- The same company's A-shares trade persistently **above** the H-shares (average premium 20%-50%, highly variable)
- Causes: the A-share liquidity premium, Stock Connect eligibility constraints, different investor structures in the two markets, dividend tax differences
- Reverse arbitrage (sell A, buy H) is blocked by the absence of a share-swap mechanism — retail cannot do it

### The Legal Risks of the VIE Structure

The VIE (Variable Interest Entity) is the most ingenious institutional design in China-US cross-border listing — and its biggest hidden mine:

| Risk | Description |
|---|---|
| Structural | The offshore listed company controls the onshore entity by **contract, not equity**; enforcing those contracts in court is uncertain |
| Policy | When policy tightens in foreign-restricted industries (internet, education), VIEs are hit first — the 2021 "double reduction" directly crushed education VIEs |
| Regulatory stance | Chinese regulators have repeatedly assessed VIE legality; the current approach is "case by case, gradual normalization", but **the room for a policy turn always exists** |
| Extreme scenario | If contractual control were ruled invalid, offshore shareholders' claims could shrink drastically or go to zero |

> Buying a Chinese ADR = buying a bet that "both Chinese and US regulators keep tolerating it". The VIE will not be dismantled in a day, but **its fragility is equally structural** — diversify it, never concentrate it.

::: danger 💀 VIE fragility is structural — diversify only, never concentrate
**The VIE will not be dismantled in a day, but its fragility is equally structural — diversify it, never concentrate it.** Buying a Chinese ADR = buying a bet on "tolerated by both regulators"; the fragility of contractual control lasts the entire life of the structure.
:::

---

## 5. How Investors Access Chinese ADRs: A Comparison

| Method | Channel | Threshold | Pros | Cons |
|---|---|---|---|---|
| US broker directly | Offshore brokerage account | Offshore account + **compliant outbound funds** | Full universe, T+0, fractional shares, options and other tools | Funding compliance is the biggest hurdle |
| US ADRs | Same as above | Same as above | Trades under the same rules as US ordinary shares | Subject to the conversion ratio, depositary fees, delisting risk |
| Stock Connect | Enabled at a mainland broker | Daily average assets ≥ 500,000 CNY | **Fully compliant**, CNY settlement | Stock Connect names only, no T+0, holiday constraints |
| QDII funds/ETFs | Mainland fund account | Low | Compliant, hands-off, diversified | Fees, possible purchase caps, frequent premiums on exchange |

> Priority advice: **compliance is always the first premise**. When funds cannot leave the mainland legally and gray channels are dangerous, Stock Connect and QDII are the only two legitimate roads; consider a US broker only once you hold legal offshore funds.

---

## 6. Risks Unique to Chinese ADRs

| Risk | Description |
|---|---|
| Delisting | The audit working-paper dispute once pushed the whole sector to the edge of delisting; the 2023 PCAOB agreement defused it, but **a shift in the political wind can reverse it at any time** |
| Audit uncertainty | Chinese ADR auditors must submit to PCAOB inspection — historically unmet for years, and still the Damocles sword invoked to this day |
| FX | Underlying assets are in CNY while ADRs trade in USD; CNY appreciation directly erodes USD-denominated returns |
| Two-regulator divergence | China side: data security, antitrust, sector rectification (education/games/platforms); US side: disclosure, sanctions, entity lists |
| VIE structural risk | See above; contractual-control fragility lasts the entire life of the structure |
| Transparency | Different reporting languages and disclosure habits; short sellers (Muddy Waters etc.) habitually target Chinese ADRs, amplifying volatility |

> Chinese ADRs swing far beyond ordinary US stocks on single days: 2021-2022 saw multiple sessions down more than 10% and halvings within a week. **Treat them as a "high-volatility satellite position", not a "core holding"** — that is how most seasoned investors handle it.

::: tip 📡 Chinese ADRs are satellites, never the core
**Treat them as a "high-volatility satellite position", not a "core holding"** — that is how most seasoned investors handle it. Chinese ADRs swing far beyond ordinary US stocks on single days — 2021-2022 saw multiple sessions down more than 10% and halvings within a week.
:::

---

## 7. What Is the Nasdaq Golden Dragon China Index?

| Item | Description |
|---|---|
| Name | Nasdaq Golden Dragon China Index (ticker HXC) |
| Publisher | Nasdaq |
| Constituents | Shares of US-listed Chinese companies (major Nasdaq + NYSE Chinese names) |
| Positioning | The **bellwether index** for watching the overall performance and sentiment of Chinese ADRs |

- When the news says "the Golden Dragon index rose 5%", this is the index meant — a thermometer of market sentiment, like the Nasdaq or the S&P
- Note: **no ETF tracks the Golden Dragon index directly**. The common China-tracking ETFs are KWEB / CQQQ (tracking the CSI Overseas China Internet Index) and FXI (FTSE China 50); do not equate "Golden Dragon" with them
- Usage: rather than obsessing over the exact constituents, use it as the dashboard of "Chinese ADRs expensive or cheap overall", cross-checked against China-internet QDII NAVs

---

## ⚠️ Risk Warning

::: warning ⚠️ Risk Warning
**Chinese ADRs are a high-volatility class that stacks "company fundamentals + the regulatory variables of China and the US"**; the core risks:

① **Delisting and audit risk**: PCAOB inspection is routine under the 2023 agreement, but Congressional politics in the US can revive the HFCAA list at any time; delisting would drain ADR liquidity and force a violent repricing;
② **VIE structural risk**: contractual control is legally uncertain; when policy tightens (the 2021 tutoring rectification), prices can halve within days;
③ **FX and liquidity**: ADRs price in USD over CNY assets, and liquidity evaporates outside US hours;
④ **Compliance**: mainland funds must go offshore through compliant channels (Stock Connect, QDII, etc.); gray funding risks frozen accounts and administrative penalties.

ADR ratios, listing forms, and regulatory dynamics in this article can all change at any time — **defer entirely to company announcements and the latest filings of the exchanges, the SEC, and the CSRC**. This article is educational only and does not constitute investment advice.
:::
