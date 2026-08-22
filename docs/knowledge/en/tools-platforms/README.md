# Tools & Platforms

> The earlier chapters taught you to **read the market, build a system, and recognize risk**. This chapter answers a different question: what to use for looking, where to get data, which platform to trade on, and in what environment to run your research.
>
> "A craftsman must sharpen his tools before he can do good work." This chapter covers market data software, data platforms, broker selection, analysis tools, and runtime environments in one pass — but the emphasis is on **"how to choose," not "how to use"**: there are hundreds of similar tools, and what most people lack is never a feature list but a decision table for **choosing based on your own needs**.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute any investment advice. Markets carry risk; invest with caution.

---

## Chapter Overview

### 01 · A Panorama of Market Data Software

From THS, Eastmoney, and TDX to Wind, iFinD, Binance, TradingView, and Yahoo Finance — who each of the four classes of market data tools serves, their pitfalls, and how to combine them. Includes essential knowledge about candlestick charting engines (TradingView's dominance, lightweight-charts, klinecharts), echoing the charting side of Chapter 10 - System Integration.

### 02 · Data & Research Platforms

Data is the starting point of research. Where the free/paid line falls for AKShare/Tushare/JoinQuant/RiceQuant/Wind, where to get historical quotes, where to look up macro and industry data, where to read research reports, what alternative data is — ending with a zero-cost research toolkit.

### 03 · Broker & Futures Broker Selection

"Where you trade" directly determines your costs and safety. The landscape of A-share commissions (1-3 bps), futures margin and fee rebates, licensing and fund flows for HK/US brokers, KYC and compliance status of crypto exchanges — plus a safety checklist that works no matter which account you open.

### 04 · Analysis & Scripting

Upgrading "watching the market" into "reproducible analysis." Advanced TradingView usage, what TDX formulas can do, Excel review sheets, a Python analysis workflow (connecting to Chapter 15 - Quant Practice), the uses and limits of AI-assisted report reading — and the scripting principle of "logic first, code second."

### 05 · Runtime & Automation Environment

When your scripts need to run 24×7, hardware and operations determine success or failure. How to choose servers at home and abroad, whether 2C4G is enough, how to use systemd/cron/pm2, how to push alerts, how to handle time zones, how to guard API keys — with a cost-and-security baseline for a personal quant server.

---

## Suggested Learning Path

```text
① 01-Market data software panorama (know your tools first)
   ↓
② 02-Data & research platforms (build the data foundation for research)
   ↓
③ 03-Broker & futures broker selection (choose the trading channel)
   ↓
④ 04-Analysis & scripting (turn methods into reproducible processes)
   ↓
⑤ 05-Runtime & automation environment (put those processes into a 24×7 environment)
```

- ①②③ are the **must-read main line for everyone**: whether or not you write code, choosing the right tools and platforms directly affects cost and safety.
- ④ leans analytical: purely manual traders can still read the TradingView/TDX/Excel parts; the Python and AI sections connect to [Chapter 15 - Quant Practice](../quant-practice/).
- ⑤ leans engineering: go deeper when you plan to keep scripts running permanently (scheduled jobs, automated trading); it complements the engineering perspective of [Chapter 10 - System Integration](../system-integration/).

---

## Content Conventions

- All rates, commissions, interest figures, and policy details in this chapter reflect **common industry practice**, change dynamically with markets and regulation, and should always be checked against each provider's latest official announcements.
- Descriptions of specific software, platforms, and brokers are only meant to illustrate the market landscape and selection framework; they imply no recommendation or endorsement.
- Compliance questions about crypto exchanges and overseas brokers are governed by the laws of your jurisdiction — please verify yourself.
- Every article ends with a "⚠️ Risk Warning" block.

---

> **⚠️ Risk Warning**
>
> Tool and platform choices directly affect fund safety and trading costs, but no tool makes money for you: golden crosses drawn by software, perks gifted by platforms, and vendor APIs can all become instruments of misleading marketing. Everything here is for learning and research only and does not constitute investment advice. Verify platform credentials and the latest rules yourself before opening accounts, depositing funds, or trading. Markets carry risk; invest with caution.

---

## Article Index

<DocCards dir="tools-platforms" />
