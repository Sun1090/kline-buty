---
title: "02 · Data & Research Platforms"
description: "A layered tour of quant data sources, historical quotes, macro and industry data, and research reports, with a zero-cost research toolkit."
---

# 02 · Data & Research Platforms

> "Watching charts relies on software; research relies on data." Most people get stuck at step one: where does data come from, does it cost money, and how do you make sure it's right once you have it?
>
> This article organizes data platforms into four layers: quant data sources (code/terminals), channels for historical quotes, macro & industry data, news & research reports — plus a primer on "alternative data," ending with a zero-cost research toolkit. Solve the data problem first, then talk strategy (see [Chapter 15 - Quant Practice](../quant-practice/)).

> **⚠️ Risk Warning**
>
> Data interfaces' fields, free quotas, and terms of use change at any time (defer to each platform's latest announcements and official docs); free data can contain gaps, delays, and abandoned endpoints — cross-check before using it for live decisions. Evaluate the return on any paid data service yourself. Markets carry risk; invest with caution. Nothing here constitutes investment advice.

---

## 1. Quant Data Sources: Five Steps from Free to Paid

| Source | Free/Paid | Market coverage | Form | Strengths & limits |
|---|---|---|---|---|
| AKShare | Free, open source | A-shares/futures/HK/US/crypto/macro | Python library | Extremely broad coverage, active updates; but interfaces are scraped from public pages, so **stability and timeliness are mediocre**, fields change frequently, commercial licensing needs your own confirmation |
| Tushare Pro | Free + **<mark>points system</mark>** | Mainly A-shares/futures/macro | Python library | Basic interfaces usable after free registration; **high-tier data (financials, minute bars, etc.) requires points** (earned or paid); well-documented; mainstream choice for individual researchers |
| JoinQuant | Free/paid | A-shares/futures/US | Online platform + Python | Online research environment, factor library, integrated **<mark>backtesting</mark>** and **<mark>paper trading</mark>**, rich community; data export is limited |
| RiceQuant RQData | Mostly paid | A-shares/futures/US/options | SDK/API | High data quality, solid docs, individual pricing available; relatively friendly among professional-grade options |
| Wind terminal | Paid | All markets | Terminal + Excel | Institutional standard, most complete data, includes lots of hand-curated data (ratings, consensus estimates, etc.); expensive |

**Selection logic**:

- Just want to prove a concept, don't need stability → start free with **AKShare**;
- Serious A-share research that must be reproducible → **Tushare Pro** (upgrade points as needed);
- Don't want to maintain data yourself, backtest on a platform environment → **JoinQuant** online;
- Prioritize data quality and API standards, willing to pay → **RiceQuant / terminals**;
- Institution-level or deep research → **Wind** (see the professional terminal section in [01 - Market Data Software](charting-platforms.md)).

::: warning ⚠️ Backtests and Live Quotes Are Two Different Systems
Note: on quant platforms, **backtest results and live quotes are two different systems** — platforms differ in data sources and **<mark>price adjustment</mark>** rules, so backtest conclusions can diverge widely. Run the same strategy through two independent data sources for cross-validation.
:::

---

## 2. Channels for Historical Market Data

### 2.1 Exchange Official Websites

The most authoritative first-hand channel — and free:

| Market | Channel | Downloadable content |
|---|---|---|
| A-shares | SSE/SZSE/BSE official sites | Daily quotes, monthly statistics, historical trades (some by application), disclosures |
| Futures | SHFE/DCE/CZCE/CFFEX/GFEX official sites | Daily quotes, open interest, delivery data, historical statistics |
| US stocks | Exchange websites (NYSE/Nasdaq data portals) | Some history free; tick-level data paid |
| Crypto | Each exchange's site | See section 2.3 |

### 2.2 The Tushare Pro Points System

- Registration is free; basic interfaces (daily bars, instrument lists, trading calendars) require few points;
- **High-value data** (financial indicators, minute-level data, dragon-tiger lists) requires more points — earned via contribution, sponsorship, or payment; see official docs for exact rules;
- Usage notes: **daily call counts are capped**, so fetching whole-market history means batched loops + rate limiting — never write a one-shot pull-everything script.

### 2.3 Crypto Exchange Public APIs

Crypto offers **the easiest-to-obtain first-hand historical data of any market**:

- Binance/OKX/Bybit all expose public candlestick history endpoints (e.g., `/api/v3/klines`), accessible without an API key;
- You can page backward from fairly early points (e.g., Binance BTCUSDT daily bars go back to 2017; check official docs for exact ranges);
- Well-specified fields, no price-adjustment issues (spot has no corporate actions) — the best dataset for personal quant practice;
- Limits: **rate limited by weight**, so control request frequency when pulling full history; endpoint paths and parameters change between versions — defer to official docs.

```python
# Teaching example: fetch Binance daily candles (real fields per official docs)
import requests
resp = requests.get(
    "https://api.binance.com/api/v3/klines",
    params={"symbol": "BTCUSDT", "interval": "1d", "limit": 100},
    timeout=10,
)
data = resp.json()   # [open time, open, high, low, close, volume, ...]
```

### 2.4 Data Quality Checks: Reconcile Numbers Before Research

The first thing after getting data isn't modeling — it's **reconciling numbers against market software** (method detailed in [Chapter 15 - Quant Practice - 02](../quant-practice/data-acquisition.md)):

| Check | How |
|---|---|
| Latest candle | Verify OHLC and volume against live software quotes |
| Historical sampling | Pick 3–5 random dates and verify against software/exchange historical data |
| Completeness | Check missing dates: exclude suspension days for A-shares, exclude holidays (calibrate with a trading calendar) |
| Timestamp convention | Confirm local time vs UTC and which time zone aggregates candle boundaries |
| Adjustment consistency | Never mix forward/back/no adjustment; document which one you use |

---

## 3. Macro & Industry Data

### 3.1 Official First-Hand Data (Free)

| Data | Official source | Contents |
|---|---|---|
| National economy | National Bureau of Statistics | GDP, CPI/PPI, industrial output, retail sales, investment, population |
| Money & finance | People's Bank of China | Aggregate financing, M0/M1/M2, rates and reserve ratios, LPR |
| Foreign trade | General Administration of Customs | Import/export values, trade by commodity and country |
| Fiscal | Ministry of Finance | Fiscal revenue/spending, treasury issuance |
| Industry output | MIIT/National Energy Administration et al. | Power generation, auto production, steel output, etc. |

### 3.2 Commercial Macro Data (Paid)

- **CEIC**: global macro/industry data platform, broad coverage, institutional subscriptions;
- **Wind macro module**: most used domestically, macro data and quotes in one terminal, easy export;
- **Eastmoney Choice / THS iFinD**: also cover macro data at lower prices than Wind.

Free personal alternative: the NBS website carries every key series; combined with the "China Data" portal and the PBOC's statistical reports it covers ~90% of macro research needs — but **you'll have to assemble time series yourself**.

### 3.3 Examples of Industry Data Sources

| Industry | Common sources |
|---|---|
| Autos | CPCA (monthly passenger-car sales), CAAM (overall production/sales) |
| Real estate | NBS (development investment/floor space sold), CRIC (top-100 developer monthly sales) |
| Power | National Energy Administration (electricity use/generation), China Electricity Council |
| Baijiu | China Alcoholic Drinks Association, listed companies' monthly channel data |
| Shipping | Shanghai International Shipping Institute (SCFI and other freight indices) |

Industry association data is usually free or low-barrier, but **its definitions may differ from official statistics** — cite source and methodology when referencing.

---

## 4. News & Research

### 4.1 Flash News & Media

| Source | Positioning | Access |
|---|---|---|
| CLS (Cailianshe) | Benchmark of domestic finance flash news; real-time "telegram-style" updates, very fast | Free app; embedded in professional terminals like Choice/iFinD |
| Wallstreetcn (Huaerjie Jianwen) | High-quality macro and market interpretation, often exclusive content | App/site, some deep content paid |
| Bloomberg | Global information standard, strongest speed and breadth | Paid terminal; individuals can access some web content |
| Reuters | Global wire service, strong objectivity and coverage | Free website portion; assess accessibility from mainland China yourself |

### 4.2 Channels for Broker Research Reports

| Channel | Notes |
|---|---|
| Eastmoney Research Center | Free report summaries and ratings, wide industry coverage (site/app) |
| Hibor | Report database, strong search; some content paid |
| Broker websites/apps | Own-house reports published free |
| cninfo (Juchao) | First-hand source of listed-company announcements (a must-read beyond sell-side reports) |

::: tip 💡 How to Read Research Reports Properly
**How to read research reports properly** was covered in [12 - Market Ecosystem - 04 Information Ecosystem](../market-ecosystem/information-ecosystem.md): read the logic and the data, ignore the rating conclusions — reports are research tools, not order instructions.
:::

---

## 5. Alternative Data: Institutions' "Information Edge"

**<mark>Alternative data</mark>** means **data outside traditional financial datasets that reflects real economic activity**. Institutions pay heavily for it; individuals just need to grasp the concept:

| Type | Examples | Uses |
|---|---|---|
| Satellite imagery | Parking-lot car counts, oil-tank shadows, mall foot traffic | Inferring retail/energy/real estate momentum |
| Hiring data | Job posting counts and seniority shifts | Signs of company expansion/contraction, pre-earnings guesses |
| Card/payments data | Spending category aggregates, merchant flows | Forecasting consumer companies' revenue |
| Web scraping | E-commerce prices/sales, app download counts | Shifts in industry competitive structure |
| Social sentiment | Social media discussion volume, sentiment indices | Sentiment side-input (limited accuracy) |

- For individuals: **alternative data is extremely costly and noisy**, and most people lack the processing capability — knowing it exists suffices. Your informational edge more likely comes from careful reading of public data than from chasing novel datasets;
- Collecting and using alternative data has privacy and compliance boundaries (cross-border transfer of personal data, collection consent, etc.), and institutions run dedicated compliance reviews before use.

---

## 6. Personal Free Stack: A Zero-Cost Research Toolkit

You can build a usable research foundation without spending a cent (with upgrade paths included):

| Need | Free solution | Upgrade path |
|---|---|---|
| Watching charts | THS/Eastmoney + TDX | TradingView paid tier (more indicators/data refreshes) |
| Quote data | AKShare or Tushare Pro base points | Tushare point upgrades / RiceQuant personal edition |
| History archiving | Own scripts writing CSV/SQLite (see [15 - Quant Practice](../quant-practice/)) | Time-series database + bulk vendor purchase |
| Macro data | NBS + PBOC website | Choice/iFinD personal editions → Wind |
| Announcements/reports | cninfo + Eastmoney research center | Hibor professional edition |
| Flash news | CLS free version | News embedded in professional terminals |
| Research environment | Jupyter + Python (local machine) | Cloud server (see [05 - Runtime & Automation Environment](automation-environment.md)) |

**Principle**: the entire cost of the free stack is "your own hours maintaining the data." When data wrangling time exceeds its expected value, consider paying — what stalls most individual researchers isn't lack of money for data, but never putting the free data to work.

::: tip 💡 What Stalls You Isn't Data — It's Unused Free Data
**What stalls most individual researchers isn't lack of money for data, but never putting free data to work.** The entire cost of the free stack is "your own hours maintaining the data" — pay only when wrangling time exceeds expected value.
:::

### Data Copyright & Boundaries of Use

- Quote data copyright usually belongs to exchanges/vendors: **free-interface data may be used for personal study and research; commercial use, redistribution, or external services generally require licenses** — read each source's terms before use;
- Scraping public websites: respect site terms and robots rules, throttle frequency, and avoid stressing target sites;
- Crypto exchange API data: commercial/redistribution rules differ per platform — follow official docs;
- One pragmatic habit: **record "data source + retrieval date" in script comments** — both copyright awareness and part of reproducible research.

### Wiring the Data Pipeline: From Fetching to Usable

Data research isn't "download once and done" — it's a pipeline you maintain daily:

```text
Fetch scripts (scheduled) → raw data landed (CSV/SQLite) → cleaning & reconciliation → standard-format store → research & backtesting
```

- Schedule fetching with cron/system schedulers — see [05 - Runtime & Automation Environment](automation-environment.md);
- Run a **<mark>reconciliation check</mark>** after each fetch (latest date, row counts, outliers) and alert immediately on anomalies;
- Separate data from code: data under `data/`, code under `scripts/`, config under `config/` — directory conventions in [15 - Quant Practice - 01](../quant-practice/quant-toolchain.md).

---

## 7. Next Steps

With data in hand, the next step is getting "data → backtest → strategy" running end-to-end — see [15 - Quant Practice](../quant-practice/). For where to trade these instruments, see [03 - Broker & Futures Broker Selection](broker-selection.md).

---

::: warning ⚠️ Risk Warning
Data is research's foundation and also its biggest hidden risk: free interfaces can be abandoned mid-use, change their fields, contain gaps, or include **<mark>look-ahead bias</mark>**, directly producing wrong backtest conclusions and live decisions; vendors' license terms restrict commercial use and redistribution — confirm before use; alternative data carries privacy and compliance boundaries. All interface fields, point rules, and pricing policies defer to each platform's latest official announcements. Everything here is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.
:::
