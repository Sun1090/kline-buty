# 10 · System Integration

> Every earlier chapter was written for **traders**: how to read the market, how to manage positions, how to avoid pitfalls. This chapter switches perspective completely — it is written for **software companies / engineering teams**: when you take on the job of "building a trading system for a client" and need to integrate with futures OMSs, securities counter systems, or crypto exchange APIs, this chapter covers all the engineering knowledge you need.
>
> From what an OMS is, how market data is ingested, and how orders are managed, to how risk controls are designed and how the team is staffed — this chapter is about systems only, not trading.

---

## Chapter Guide

### Integration Overview and Role Division

The first thing to do after receiving the requirement is not writing code — it is drawing the map. This article lays out a complete trading software architecture diagram (client frontend → gateway layer → core services → OMS/exchange APIs → exchanges), then breaks down nine system modules one by one (market data / trading / account & funds / risk controls / clearing & reconciliation / reporting / monitoring / data warehouse / backtesting research), and clarifies what exactly each of the four kinds of integration targets (exchanges, OMSs, data vendors, banks & brokers) involves and who owns it. Then it lands on people: the responsibilities and collaboration boundaries of eight roles (quant researcher, quant trader, strategy engineer, frontend/backend engineers, SRE, risk, compliance), ending with the five project milestones from research to go-live.

### Exchanges and OMSs

"Why can't we connect directly to SHFE — why must we go through CTP?" This is the question clients ask most, and it is the core of this article. It explains the domestic futures OMS landscape in depth: how SFIT CTP (a C++ DLL interface) became the de facto standard; the API shapes and use cases of Hundsun UFT/UFX, Esunny, Cinda, and Kingstar; securities counter systems (Hundsun/Kingdom/Founder and the LTS low-latency interface); crypto exchanges that have no OMS concept at all (Binance/OKX/Bybit official REST/WebSocket direct access); and overseas markets (Interactive Brokers IB API, the CME clearing member model). It includes a direct-connection vs OMS comparison table, authentication methods (AppID/API Key + HMAC signing), and a checklist of simulation and test environments.

### Market Data Systems

Market data is the eyes of a trading system. This article explains the three kinds of market data sources (raw exchange feeds / OMS feeds / third-party data vendors), the difference between Level-1 snapshots and Level-2 tick-by-tick data, snapshot vs incremental subscription models, and the protocol differences between domestic OMS market data APIs and crypto WebSocket channels (kline/depth/trade). A single event timeline explains where every segment of latency lives "from order book change to client rendering" and why it matters. Then it covers market data gateway engineering (connection / subscription / fan-out / ordering guarantees / primary-backup switching), gap-filling strategy after reconnects, storage choices for tick data, and latency measurement and reconciliation methods.

### Trading Interfaces and Order Lifecycle

This is the most critical and most incident-prone part of a trading system. Which scenarios suit REST/WebSocket/FIX/CTP proprietary binary interfaces; the definitions and use cases of limit / market / stop-loss & take-profit / IOC / FOK / iceberg / conditional / best-level orders; a complete plain-text state machine from "NEW (not yet submitted)" to "filled / canceled / rejected"; price-time priority matching. Then it goes into the engineering deep water: order tracking and idempotent retries, local order ID to exchange order ID mapping, trade report (tick-by-tick / batch) handling, client-vs-exchange state reconciliation, restart recovery, rate-limit queueing and multi-account concurrency control, ending with a hard-earned list of common integration bugs.

### Risk Controls and Capital Management

"The exchange will do risk control for you" is the biggest misconception — OMS risk controls are the floor, not the guardrail. This article explains why the client must build its own risk control layer, and provides a complete risk module checklist (four categories: funds / position / frequency / stop-loss), the four pre-trade gates before order submission (funds → position → frequency → blocklist/allowlist & manual approval) and post-trade real-time monitoring (floating P&L, margin usage, liquidation alerts, large-position surveillance), exception handling and the three-level circuit breaker (account / strategy / global) design, the log structure and retention recommendations for full-chain audit trails, and the architecture red lines of "risk controls as an independent process, independent of strategies, configuration-driven, cold-standby ready".

### Quantitative Strategies and Backtesting

Strategies are not written inside the trading system — they run in a strategy system and go live only after backtesting validation. This article covers the complete quant R&D pipeline (data → factors → strategy → backtest → parameter optimization → paper trading → live trading), the strategy type landscape and factor system, backtest framework selection (vectorized vs event-driven) and core performance metrics (Sharpe / drawdown / win rate), and a backtest pitfall checklist — data alignment, survivorship bias, overfitting prevention — ending with the gap between paper trading and live trading, execution algorithms, and live monitoring.

### Data and Infrastructure

A system reaches production on the strength of its second-half infrastructure. This article covers the data architecture of a trading system (storage choices and strong-consistency requirements for market data / orders / funds / fundamentals data), time-series database selection, real-time caching and message middleware, task scheduling and batch processing, plus the monitoring and alerting system (market data latency / order failure rate / risk trigger rate), deployment architecture, network security (key management / least privilege), and data compliance and data quality governance.

### Role Skills Map

The final piece of the engineering view is people. This article breaks down, role by role, the responsibility boundaries, hard skills, tech stacks, and growth paths of the eight core positions (quant researcher / quant trader / strategy engineer / backend / frontend / SRE / risk / compliance), gives a minimum 4-6 person staffing recommendation for small startup teams, and ends with a full tech stack recommendation table and a learning path for engineers entering the field.

### FIX Protocol In Depth

The lingua franca of institutional markets. This article explains what FIX is (originated 1992, maintained by FIX Protocol Ltd, the de facto global standard for institutional direct connectivity), where it sits in the trading chain (order management → FIX gateway → exchange / market maker / interbank); the three-part message structure (Header/Body/Trailer), Tag=Value encoding, and the checksum algorithm, with a minimal readable 35=D order submission example; the key fields of core message types (login / order entry / reports / cancel-replace), the Session lifecycle (logon → heartbeat → sequence numbers → logout), and the dual-state reading of order status and ExecType. Finally it covers the pros and cons of FIX and how to choose it (vs exchange proprietary APIs, when you need FIX direct access), plus the FAST compression protocol and the current state of FIX support at crypto exchanges.

### CTP Integration in Practice

Turning the "domestic futures de facto standard" from documentation into code. This article follows project execution order: what CTP is (SFIT, C++ DLL + language wrappers), environment preparation (obtaining the interface, SimNow simulation vs production, AppID/AuthCode authentication, version differences); the complete development flow (initialize → authenticate → dual login → query → subscribe → submit order → receive reports); key calling conventions (the three callback families Req/OnRsp/OnRtn, the callback threading model — why you must not do heavy work in the callback thread); flow-control facts (queries about once per second, order submission about twice per second) and connection management (disconnect-reconnect, settlement statement confirmation flow); ending with an educational minimal Python framework example and a ten-item pitfall checklist (GBK encoding, time fields, order submission ≠ fill, cancel conflicts).

### Matching Engine Principles

How an order becomes a trade — the most core mechanism of a trading system. This article covers the definition of matching and the price-time priority rules (where limit and market orders sit in the queue), Level-2 order book and incremental updates (add/update/delete events, order book rebuild), matching algorithms (simple matching loop, continuous auction pseudocode, call auction maximum-volume pricing); advanced topics (market makers and minimum tick size, time priority in limit-up/limit-down queues, block trades matched off-book, flash crashes and matching latency); and explains centralized matching vs blockchain AMM in a comparative view (the x·y=k constant product formula, slippage and impermanent loss); ending with matching engine design essentials (in-memory order book, non-droppable event log, microsecond-level performance targets).

---

## Learning Order for This Chapter

```text
① Integration overview (get the map first: which modules the system has, who owns what)
   ↓
② Exchanges and OMSs (then learn the roads: who the integration targets are, what protocols, how to authenticate)
   ↓
③ Market data systems (then ingest the data: where market data comes from, how to keep it complete)
   ↓
④ Trading interfaces and order lifecycle (the core difficulty: how orders are submitted without errors)
   ↓
⑤ Risk controls and capital management (the survival layer: how to block wrong orders, how to keep the audit trail)
   ↓
⑥ Quant strategies → ⑦ Infrastructure → ⑧ Roles (strategy layer, ops layer, organization layer)
```

- ① → ⑤ **must be read in order**: 05 depends on the order model of 04, 04 depends on the market data model of 03, and 02 is the foundation of it all.
- ⑥ → ⑧ cover strategies, data infrastructure, and roles; best read after ① → ⑤ have built the system-wide view.
- Throughout this chapter, "integration" is used in a narrow sense: **software-engineering interface integration only** — it does not cover business development, account opening, or regulatory filing procedures.

---

## Content Conventions

- All interface specifications, rate-limit figures, and field definitions in the text follow **common industry practice**; the actual implementation prevails (for CTP, the official "CTP API Documentation" prevails; for crypto exchanges, their developer documentation prevails). Wherever a specification is involved, it is flagged as "subject to the official documentation".
- Descriptions of real companies are included only to illustrate the market landscape and technical shapes; they do not constitute any recommendation or endorsement.
- The regulatory status of crypto exchanges in mainland China is out of scope for this chapter; confirm your local regulations before any integration.
- Every article ends with a "⚠️ Risk Warning" block.

---

> **⚠️ Risk Warning**
>
> Trading system integration is high-risk engineering: leaked keys, duplicate orders, corrupted state, failed risk controls — a single failure at any link can cause real financial loss, often within milliseconds. Everything in this chapter is for engineering study and research only. Before going to production, make sure you have completed full-flow validation in a simulation environment, an internal code audit, and disaster recovery drills.

---

## Article Index

<DocCards dir="system-integration" />
