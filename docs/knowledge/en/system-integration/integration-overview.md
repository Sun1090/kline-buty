---
title: "01 · Integration Overview and Role Division: Draw the Map Before Writing Code"
description: "Integration map, module checklist, and role division for trading systems, clarifying system boundaries and team responsibilities."
---

# 01 · Integration Overview and Role Division: Draw the Map Before Writing Code

> When a software company takes on a "trading system integration" project, the most common failure mode is not weak technology but **starting to dig the foundation before the map exists**: developers don't know who owns market data, which module the risk controls hang on, where backtest data comes from, or where the boundary with the client lies. This article solves the "big picture" problem first — one system map, one module checklist, one set of role divisions, then milestones and risk points.
>
> After reading you should be able to answer three questions: **Which modules does the system have? Whom does each module integrate with? Who on the team owns what?**

---

## 1. Trading Software System Map

Start with the whole. Any trading software that "can place real orders and lose real money", no matter how large it grows, dissects down to this one diagram:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client Frontend (user side)               │
│   Desktop / Web / Mobile: charts, order panel, positions,   │
│   statements, risk panel                                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal API (REST / WebSocket / gRPC)
┌──────────────────────────────▼──────────────────────────────┐
│                     Gateway Layer (API Gateway)              │
│  Unified auth / rate limiting / routing / protocol           │
│  conversion / multi-client access / request idempotency      │
└──────────────┬─────────────────┬────────────────┬────────────┘
               │                 │                │
     ┌─────────▼──────┐  ┌───────▼───────┐  ┌─────▼───────────┐
     │  Market data   │  │   Trading     │  │ Account & funds │
     │  service       │  │   service     │  │ service         │
     │ MD gateway/    │  │ Order routing/│  │ Balance/freeze/ │
     │ subscription   │  │ state machine │  │ positions       │
     │ Snapshot/      │  │ Report        │  │ Deposits/       │
     │ incremental/   │  │ handling/     │  │ withdrawals/    │
     │ storage        │  │ reconciliation│  │ settlement      │
     └─────────┬──────┘  └───────┬───────┘  └─────┬───────────┘
               │                 │                │
     ┌─────────▼─────────────────▼────────────────▼───────────┐
     │                Risk control service (separate process)  │
     │  Pre-trade checks / real-time monitoring / circuit      │
     │  breaker / audit trail — can block all order submission │
     └──────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                OMS / Exchange API (integration layer)         │
│   CTP DLL │ Hundsun UFT │ Esunny │ Crypto REST/WS │ FIX │ IB │
└───────────────────────────────┬──────────────────────────────┘
                                │ Exchange leased line / public network / private network
┌───────────────────────────────▼──────────────────────────────┐
│                          Exchange                             │
│   Matching engine / clearing / settlement / risk controls    │
└──────────────────────────────────────────────────────────────┘
```

Three points to remember the first time you see this diagram:

- **Risk controls are not inside the trading path; they are a gate mounted across the path.** Every order submission request must pass through the risk control service, and risk controls are separated from strategies and trading code (see [05-risk-systems.md](risk-systems.md) for details).
- **Market data and trading are two independent paths.** Market data is high-frequency (hundreds to thousands of messages per second) while trading is low-frequency (tens of milliseconds per order); any system that couples them into one queue will drag both to death.
- **The integration layer (OMS/exchange APIs) is the least stable, least controllable part of the system.** It is not yours to manage, and every engineering measure (timeouts, retries, reconciliation, redundancy) is designed around "the other side cannot be trusted".

::: tip 💡 One-line principle for module boundaries
**The market data system only produces data, the trading system only moves orders, the account system only records money, the risk control system only says no, and the data warehouse only archives.** Whoever crosses a boundary has the hardest bugs to trace — market data and trading are two independent paths, and any system that couples them into one queue will drag both to death.
:::

---

## 2. System Module Checklist

| Module | Responsibility | Key outputs | Owner (typical split) |
|---|---|---|---|
| Market data system | Feed ingestion, subscription distribution, snapshot/incremental, storage | Tick stream, K-lines, order book depth | Backend engineers + MD gateway |
| Trading system | Order submission, cancellation, order state machine, report handling | Order flow, trade reports | Backend engineers (core) |
| Account & funds | Balance, frozen funds, positions, deposits/withdrawals, settlement | Account snapshots, fund flow | Backend engineers |
| Risk controls | Pre-trade checks, real-time monitoring, circuit breaker, audit trail | Block records, risk logs | Risk + backend engineers |
| Clearing, settlement & reconciliation | Reconcile orders and fills with the OMS/exchange, handle discrepancies | Reconciliation reports | Backend engineers + risk |
| Reporting | Statements, position reports, P&L reports, regulatory reports | PDF/Excel reports | Backend engineers |
| Monitoring & alerting | System metrics, market data latency, order success rate, fund anomalies | Alert notifications | SRE |
| Data warehouse | Historical archiving and querying of market data, orders, funds | Analysis tables, APIs for backtesting | Data engineers |
| Backtesting & research | Validate strategies on historical data, produce parameters | Backtest reports, strategy parameters | Quant researcher + strategy engineer |

The one-line principle of module boundaries: **The market data system only produces data, the trading system only moves orders, the account system only records money, the risk control system only says no, and the data warehouse only archives.** Whoever crosses a boundary has the hardest bugs to trace.

---

## 3. Integration Targets

A trading software integrates with far more external parties than typical software, and each kind has a completely different integration posture:

| Integration target | What you integrate | Characteristics | Owner |
|---|---|---|---|
| Exchange (direct) | Crypto exchange REST/WebSocket, CME FIX, etc. | Public protocols, full documentation, no middle layer | Backend engineers |
| OMS (futures/securities) | CTP, Hundsun, Esunny and other OMS APIs | Binary/C++ DLL, AppID authentication, closed documentation | Backend engineers (permission application required) |
| Data vendors | Wind, JoinQuant, TinySoft, TickData, etc. | Historical data completion, adjusted prices, fundamentals data | Data engineers |
| Banks | Deposits/withdrawals, bank-futures transfer, bank-securities transfer | Corporate interfaces, long approval flows, messy reconciliation | Backend + business |
| Brokers / futures firms | Account opening, settlement statements, **<mark>margin</mark>** calls, risk notices | Many manual processes; joint debugging schedules depend on others | Project manager + compliance |

> A counter-intuitive point: **the hardest integrations are not with exchanges but with OMSs and banks.** Exchanges (especially crypto exchanges) have public documentation, open test environments, and self-service testing; OMS documentation requires a signed agreement to obtain, the interfaces are proprietary binary protocols, and joint debugging windows are controlled by the OMS provider's schedule; bank interfaces involve key certificates and online-banking approvals, often measured in "weeks".

::: warning ⚠️ The hardest integrations are OMSs and banks, not exchanges
**The hardest integrations are not with exchanges but with OMSs and banks.** OMS documentation requires a signed agreement to obtain, the interfaces are proprietary binary protocols, and joint debugging windows are controlled by the other side's schedule; bank interfaces involve key certificates and online-banking approvals, often measured in "weeks".
:::

---

## 4. Role Division

### Quant Researcher

The person who studies "how to make money". Responsible for strategy hypotheses, factor mining, backtest validation on historical data, and performance attribution. **Never touches production code** — a crashed research script wastes compute, a crashed production function loses real money. Hands over to the strategy engineer via "strategy spec + backtest report", and is the only role on the team without on-call duty.

### Quant Trader

The person who bridges the researcher and live trading. Responsible for understanding strategy logic, watching live operation, judging abnormal markets and strategy behavior, and deciding when to pause/restart a strategy. The trader is the **first responder when risk controls trigger**, and the person most often woken by midnight phone calls. Confirms "strategy go-live parameters" with the strategy engineer and "strategy exposure caps" with risk.

### Strategy Engineer

The person who turns the researcher's ideas into runnable programs. Responsible for engineering the strategy code, wiring data interfaces, parameter and version management, and simulation validation. **Code written by the strategy engineer runs in the strategy process and never directly holds trading privileges** — it can only emit "proposed orders" through the trading interface, adjudicated by the risk gate. This is the role most easily confused with "backend engineer"; the split between the two is in the table below.

### Backend Engineer

The builder of the system skeleton, and the sole owner of the integration layer. Responsible for the market data gateway, trading service, account service, reconciliation module, and most critically the **OMS/exchange API integration**. Backend engineers are the only people who directly hold OMS/exchange keys and directly reach the order submission path, so they must write idempotency, write retries, write state machines — every rule of the integration layer (see [04](order-lifecycle.md)) is addressed to this role.

### Frontend Engineer

Responsible for the client interface: market data charts, the order panel, position and statement pages, the risk panel, alert display. The frontend never talks to the OMS, but **must understand the semantics of the order state machine** (which states can be canceled, which states are already filled), because the order panel is the most direct exit point for every error. Collaborates with backend via interface documentation and mock services.

### SRE (Site Reliability Engineer)

The person who keeps the system "alive". Responsible for servers and network, market data latency monitoring, process supervision, log collection, database operations, disaster recovery and drills, releases and rollbacks. The SRE's KPIs are availability metrics (market data latency P99, order success rate, system availability), and they own the iron rule that "no releases during trading hours — emergency fixes only".

### Risk Manager / Risk Engineer

The person who "says no". Responsible for defining risk rules (funds/position/frequency/**<mark>stop-loss</mark>**), configuring risk parameters, circuit-breaker decisions, periodic review of audit logs, and double-checking reconciliation discrepancies. The risk role holds the system's only super privilege: **one-click circuit breaker for all accounts**. Risk does not write strategy code, but risk rules are defined and accepted by them — a classic case of "the referee cannot be a player".

### Compliance

The most easily overlooked role in integration, and the most important one when things go wrong. Responsible for account-opening documents, exchange/OMS permission applications, trading-code management, regulatory reports, periodic audits of keys and permissions, and self-inspection of abnormal trading behavior. Compliance writes no code, but every "permission request form", "key rotation", and "trading code cancellation" process is gate-kept by compliance.

### Role Collaboration (one diagram)

```text
Quant researcher ──strategy spec──▶ Strategy engineer ──implementation──▶ Backend engineer ──order submission──▶ OMS/Exchange
     ▲                      │                      ▲
     │                      ▼                      │
  Backtest report        Risk parameter confirmation      │
     │                      │                      │
  Quant trader ──live monitoring/decisions────┴──────────risk gate────┘
     ▲                      │
     │                      ▼
     └────────────── Risk / Compliance / SRE (independent of the strategy path)
```

---

## 5. Common Organizational Structures

### Big-tech quant teams (top hedge funds, proprietary desks)

- Extreme role specialization: researchers split further into factor/fundamental/high-frequency, backend splits into market data/trading/data/infrastructure.
- Risk controls are an **independent department** with their own development and operations; an "isolation wall" from the strategy team — strategy teams are not allowed to touch risk code.
- High in-house infrastructure ratio: homegrown market data gateways, homegrown matching simulators, own data centers or leased lines.

### Startups / small software companies (the typical reader of this article)

- One person, many hats: usually 3-6 engineers carry all modules. A typical setup is "1 backend (market data + trading), 1 backend (accounts + reconciliation), 1 frontend, 1 full-stack (risk + data), 0.5 SRE, 0 dedicated risk — covered part-time by the trader".
- Part-time risk coverage is the biggest hidden danger; at minimum do this: **risk parameter changes require two-person confirmation, and risk logs are stored independently**.
- OMS/exchange API integration is rarely outsourced, but market data, historical data, and colocation are often purchased from third parties.

::: danger 💀 No role may modify risk parameters without an audit trail
**No role is allowed to modify risk parameters without leaving a trail.** The order submission path and strategy code must be physically isolated (a strategy crash must not affect the trading path), keys are held by exactly one person with a rotation mechanism, and risk checks are independent of trading logic — even with only two people, these red lines must never be crossed.
:::

### Organizational red lines for small teams (even with only two people)

1. **Physical isolation between the order submission path and strategy code**: a strategy crash must not affect the trading path.
2. **Risk checks independent of trading logic**: risk code is invoked by the trading system, not casually written as an if inside the trading logic.
3. **Keys held by exactly one person**, with a rotation mechanism.
4. **No role may modify risk parameters without leaving an audit trail**.

---

## 6. Project Milestones

```text
① Research (2-4 weeks)     → ② Joint debugging (4-8 weeks) → ③ Simulation (4-8 weeks)
   Requirement sorting/OMS      CTP/exchange interfaces      Full-flow simulation
   selection                    Market data + orders +      Two-person confirmation
   Permission applications/     accounts integration         + reconciliation running
   document requests            Abnormal-path testing

④ Live trial run (2-4 weeks) → ⑤ Production go-live
   Small capital/single account  Full account migration
   Daily reconciliation/         Monitoring and on-call ready
   issue list                    Freeze on new-feature development
   Circuit-breaker drills/
   disaster recovery drills
```

| Milestone | Entry criteria (DoD) | Common failures |
|---|---|---|
| Research complete | OMS/exchange documentation confirmed, permission application receipts, architecture review passed | Starting work without documentation; never confirming "is the other side's test environment open" |
| Joint debugging complete | Market data, order submission, cancellation, reports, reconciliation all running end to end; fault-injection tests (disconnects / rejections / duplicate reports) passed | Testing only the happy path; testing with production accounts (strictly forbidden) |
| Simulation passed | N consecutive trading days with fully consistent end-of-day reconciliation; 100% risk-control block hit rate | Simulation behavior inconsistent with real-money behavior (**<mark>slippage</mark>**, rate limits) going undetected |
| Trial run passed | M consecutive days of small-capital live trading without major incidents; all monitoring alerts active; daily reconciliation records complete | Opening up large permissions during the trial run |
| Production go-live | Disaster recovery drill passed, on-call roster in place, rollback plan confirmed, compliance filing done | Changing code on go-live day; discovering keys committed to the code repository after go-live |

> Every milestone stage has explicit "entry criteria" and "exit criteria" — **a milestone without a DoD is just a date on the calendar**.

---

## 7. Major Risk Points

The risks of an integration project are mostly planted before the project even starts:

| Risk | Symptom | Countermeasure |
|---|---|---|
| Unclear requirement boundaries | The client assumes "build the system" includes account opening and compliance; the team assumes interfaces only | Write the integration target list and acceptance criteria into the contract (see milestone DoDs) |
| Permission cycles out of control | OMS AppID, exchange API keys, market data permissions stuck for 2 months | File every permission application in the first week of the research phase |
| Documentation/test environment unavailable | Some OMS simulation environments are not open to companies | Confirm early; prepare a "degraded plan without a test environment" (self-built mock OMS) |
| Joint debugging schedule controlled by others | The OMS side offers only one debugging window per week | Treat debugging windows as a resource to schedule; book them full in advance |
| Trial run becomes full deployment | Eager to switch everything on after one week of small-capital testing | Lock it down with milestones: no capital increase while reconciliation discrepancies remain |
| Single-person dependency | Only one person understands the whole system; their resignation stops everything | Mandatory documentation + two-person review + job rotation |

---

## Risk Warning

::: warning ⚠️ Risk Warning
This article is an engineering overview of system integration and does not constitute investment advice. Integrating a trading system for real funds is high-risk engineering: any practice of "go live first, add risk controls later", "debug with production accounts first", or "commit keys to the repository" can directly cause financial loss. Be sure to complete full-flow reconciliation and fault-injection testing on a simulation environment before entering live trading, and keep a complete audit trail of every permission change and every risk parameter modification.
:::
