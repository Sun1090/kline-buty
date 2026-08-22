---
title: "Market Data and Tooling Compliance"
description: "Covers data rights and licensing, permissions for displaying real-time quotes, the boundary with investment advice, and a compliance checklist for open-source projects."
---

# Market Data and Tooling Compliance

> Build a charting tool, a market data site, or a quant terminal — however elegant the code, three questions remain: **where does market data come from, can you display it to others, and how should you disclaim when you do**. This article approaches from four angles — data rights and licensing, permissions for real-time quotes, the boundary between tools and "investment advice", and common compliance points for open-source projects — to give developers an actionable checklist.

::: warning ⚠️ Risk Warning
This article is an objective compilation of public knowledge, for study and research only, and **does not constitute legal advice**. Data licensing terms, exchange API policies, and financial marketing rules change at any time; before launch, defer to **data vendor contracts, the latest exchange terms, and licensed counsel's opinions**.
:::


---

## 1. The "Rights and Licensing" Problem of Market Data

### 1.1 Data Has Owners

Market data (quotes, candles, trade ticks, order book depth) usually comes from **exchanges or data vendors**, bound by contract terms, and in some jurisdictions may also implicate database rights. **<mark>"Findable online" does not mean "free to use"</mark>**.

| Data Form | Common Licensing Source | Common Restrictions |
|---|---|---|
| Public web quotes | Exchange websites/portals | Usually personal non-commercial viewing only; bulk scraping and redistribution banned |
| API data (REST/WS) | Exchange API terms | Rate limits, use restrictions, resale banned, attribution required |
| Aggregated data (paid feeds) | Data vendor contracts | Billed per seat/use; redistribution and cache abuse prohibited |
| Delayed vs real-time data | Different license tiers | Real-time licenses typically cost far more than delayed |

### 1.2 Common Pitfalls

::: warning ⚠️ Common Pitfalls

- **Resale and redistribution**: packaging scraped quotes into a "data service" sold to third parties violates most API terms outright — a **<mark>breach of contract</mark>** risk.
- **Long-term caching**: some terms require market data to be **used for immediate display only**, banning long-term storage followed by offline redistribution.
- **Attribution**: even when display is allowed, prominently marking "Data source: XX" is typically required — both contractual duty and liability protection.
:::

## 2. Displaying Real-Time Quotes: Permissions and Boundaries

### 2.1 An Exchange API Being "Free" ≠ Free for Commercial Use

Many exchanges offer public market APIs for personal learning, but terms commonly state:
- **Personal non-commercial** use only (commercial products need applications/payment/agreements);
- No **high-frequency polling** or endpoint abuse (exceeding rate limits may trigger throttling or bans);
- No **redistribution** to third-party terminals.

::: tip 💡 Practical advice: check the terms before commercializing
Before building a public-facing quote site/app, review the target exchange's `Terms of Use` to confirm whether "commercial display" requires authorization; if unsure, email the exchange officially and keep the written reply.
:::

### 2.2 Delays, Disconnections, and Disclaimers

- Real-time data arrives with latency; futures/derivatives **last prices and order books may already have moved** — UIs should note "data may be delayed";
- Reconnections are normal; the presentation layer needs "connecting/reconnecting" states so users don't mistake frozen prices for current ones;
- Disclaimers should cover: third-party source errors, network delays, local computation errors (indicators/drawings based on historical snapshots).

## 3. Tools vs "Investment Advice": The Boundary

### 3.1 Tools ≠ Advice: Guard the Content Form

| Safe Practice | Dangerous Practice |
|---|---|
| Displaying indicator results (MA/BOLL/MACD) | Popping up "System verdict: buy/sell" deterministic signals |
| Providing drawing tools, replay, multi-chart sync analysis | Promising "follow the signals for 100% profits" |
| Publishing educational content (knowledge bases/tutorials) | One-on-one targeted signal calling for specific users |
| Attributing data sources with disclaimers | Hiding delay and error risks |

### 3.2 Special Regulatory Attention to "Marketing" in the EU/Hong Kong etc.

- **EU MiFID II / <mark>MiCA</mark>**: marketing financial products (including crypto assets) to retail users has explicit rules — promotional material must not mislead and must highlight risks; pure tool/information display usually isn't "marketing", but adding "recommendation" flavor can trigger reclassification.
- **Hong Kong SFC**: licensing and content constraints apply to "investment advice/promotion"; tools serving HK users that include personalized advice need assessment against licensing requirements.
- **General principle**: **<mark>the more specific the recommendation (specific instrument + timing + direction), the closer to regulated advisory activity</mark>**; tool apps should position themselves as "information and learning tools that do not provide investment advice".

## 4. Compliance Checklist for Open-Source Projects

For charting/trading-tool open-source projects specifically, common compliance points:

- [ ] **Data sources and terms**: note quote sources and license scope in README/settings pages; re-check API terms before commercial deployment.
- [ ] **Disclaimer**: show "for study and reference only, not investment advice" in both UI (footer/chart watermark) and docs.
- [ ] **Risk warnings**: features involving **<mark>leverage</mark>**/derivatives/futures must prominently warn "you may lose your entire principal".
- [ ] **Geographic restrictions**: if your exchange/data sources bar certain jurisdictions, restrict access accordingly and document it.
- [ ] **No return promises**: example strategies and backtests must carry "past/simulated results do not represent future returns".
- [ ] **User data**: self-hosted services collecting user info (watchlists, alerts, **<mark>positions</mark>**) must comply with local data protection laws (e.g., GDPR/PIPL) with privacy statements.
- [ ] **Trademarks and logos**: confirm trademark boundaries before using exchange names/logos in promotion (factual statements like "supports XX data" are usually safer than official logos).

---

## Summary

The core compliance posture of market-data tooling: **licensed data, attributed display, explicit disclaimers, advice never overstepped**. Personal-study and commercial products face different requirements; spending half a day checking data terms and target-market rules before launch beats receiving takedown notices or lawyer letters afterward.

::: tip 💡 Tools provide information; humans make decisions
**Tools provide information, people make decisions; data needs licenses, disclaimers must be in place.** The core compliance posture of market-data tooling: licensed data, attributed display, explicit disclaimers, advice never overstepped.
:::

> In one sentence: **tools provide information, people make decisions; data needs licenses, disclaimers must be in place.**
