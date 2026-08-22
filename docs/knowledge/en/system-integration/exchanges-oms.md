---
title: "02 · Exchanges and OMSs: Which Layer Your System Actually Connects To"
description: "The engineering shapes and selection trade-offs of four integration paths: direct exchange access, futures OMSs, crypto APIs, and overseas markets."
---

# 02 · Exchanges and OMSs: Which Layer Your System Actually Connects To

> Once an integration project kicks off, the engineer's first question is usually not "how do I write this" but "what am I connecting to" — direct exchange access? Through a futures firm's OMS? A crypto exchange's official API? These three paths differ completely in engineering shape, authentication, and test environments; pick the wrong one and everything after it is wasted work.
>
> This article covers four paths in depth — domestic futures OMSs, securities counter systems, crypto exchanges, and overseas markets — and ends with a comparison table and integration watch-outs.

---

## 1. What Is an OMS: Why Domestic Futures Cannot Connect Directly to the Exchange

### 1.1 Definition of an OMS

An OMS (Trading Counter / Front System) is a **trading system deployed inside a futures firm or brokerage**; every client order must pass through it to reach the exchange. It does four things:

1. **Forwarding**: relays client order requests to the exchange in the exchange's protocol, and pushes reports back in the client's protocol.
2. **Funds management**: maintains client **<mark>margin</mark>**, available funds, and fees; rejects orders exceeding available funds per risk rules.
3. **Risk floor**: **<mark>forced liquidation</mark>**, margin calls, abnormal trading monitoring (self-matches, excessive cancel rates, etc.).
4. **Settlement**: daily settlement and settlement statements.

### 1.2 Why the OMS is mandatory

- **Regulatory requirements**: China's futures market runs a "one account, one code" system with trading codes; client positions sit under the futures firm's name, and exchanges recognize futures firm members only, not individual clients (subject to official rules). To connect directly to SHFE/CZCE/DCE/INE you must first become a member — ordinary companies and individuals have no such path.
- **Funds safety**: client funds sit in the futures firm's **<mark>margin</mark>** account; the exchange settles with the settlement member as a whole.
- **Risk responsibility**: **<mark>forced liquidation</mark>** and margin calls are the futures firm's statutory obligations; this responsibility is not waived because your engineering is good.

> In one sentence: **for domestic futures, the "integration layer" is always the OMS; the exchange protocol is invisible to software companies.** The lowest-level interface you can obtain is the OMS API (such as CTP).

---

## 2. Domestic Futures OMS Landscape

The domestic futures OMS market is essentially divided among SFIT, Hundsun, Esunny, Kingstar, and a few other vendors; software companies must choose the API to integrate based on the OMS actually deployed at each futures firm (each OMS's specifications are subject to official documentation).

| OMS | Vendor | Mainstream language/API shape | Characteristics |
|---|---|---|---|
| CTP (Comprehensive Transaction Platform) | SFIT (Shanghai Futures Information Technology) | C++ (DLL-exported interface), plus the trimmed CTPMini | Highest market share, de facto standard; interface documentation requires permission; secondary development mostly via C++/C#/Java wrappers |
| UFT / UFX | Hundsun Electronics | C++ interface (UFT is the new-generation low-latency OMS) | Common to brokerages and futures, common for institutional clients; the new UFT OMS targets low latency |
| Esunny | Zhengzhou Esunny Information Technology | C++ / Java / Python wrappers, plus overseas STP interfaces | Products for both domestic and overseas markets (overseas futures); integrating overseas markets via Esunny is one of the mainstream paths |
| Cinda | Cinda-related counter systems | Similar shape to CTP (subject to official documentation) | Adopted by some futures firms, lower market share than CTP |
| Kingstar | Kingstar Software | C++ / Java | Used by brokerages, futures firms, gold firms and other financial institutions; long history |

### 2.1 CTP Interface Notes (key points)

CTP is the interface domestic software companies integrate most often; a few things you must know:

- **Shape**: dynamic-link libraries written in C++ (Windows `.dll` / Linux `.so`), exporting two families of objects: `CThostFtdcTraderApi` (trading) and `CThostFtdcMdApi` (market data).
- **Calling model**: subscription requests + callback responses. Request functions such as `ReqOrderInsert`, `ReqOrderAction` (cancel); reports are pushed to the client via callbacks `OnRspOrderInsert` (request response), `OnRtnOrder` (order report), `OnRtnTrade` (trade report), `OnRtnTradingAccount` (funds update).
- **Threading model**: callbacks fire on API-internal threads; the client must handle inter-thread communication itself (common practice: only enqueue in the callback, consume the queue on business threads).
- **Authentication**: besides market data/trading logins, an AppID + AuthCode authentication step is required (see section 7).
- **Languages**: officially C++; the industry commonly uses C++/C#/Java wrapper packages (such as Python wrappers for CTP) and open-source solutions. The wrapper layer must match the OMS version strictly; field structs follow the official header files.

---

## 3. Securities Counter Systems

Securities (A-share) integration resembles futures: it must go through the brokerage's counter system. The mainstream landscape (subject to official documentation):

| Counter system | Vendor | Notes |
|---|---|---|
| UF2.0 / Hundsun brokerage counter | Hundsun Electronics | One of the most widely deployed counters at domestic brokerages |
| Kingdom (Kingdom) counter | Kingdom Technology | Widely deployed at brokerages/funds/banks |
| Founder (VTOP) counter | Founder Software | Common at brokerages |
| Low-latency counters (LTS / Huarui etc.) | SSE Technology and others | Low-latency counters for quant/institutional clients; the interface shape differs from ordinary counters and usually requires separate permission |

- **Securities authentication**: generally counter login + trading password/certificate; some institutional counters support a dedicated trading terminal (e.g., LTS has a separate low-latency trading interface).
- **Differences from futures**: A-shares are T+1 with price limits and no night session; the counter handles the 9:15-9:25 call auction and post-9:30 continuous trading differently; cancel and amend rules also differ from futures (see [04-trading-interfaces-and-order-lifecycle.md](order-lifecycle.md)).
- **Stock options**: brokerage option counters are usually based on the same vendors (e.g., SSE Technology LTS supports options), but the interface is not identical to equities.

---

## 4. Crypto Exchanges: No OMS Concept

Crypto exchanges (Binance, OKX, Bybit, etc.) **have no "OMS" layer** — the exchange itself plays matching, clearing, and risk roles in the same system, and opens **official API direct access** to individuals and companies alike:

- **Interface shape**: REST (orders/queries) + WebSocket (market data/account pushes); documentation is public, testnets exist.
- **Authentication**: API Key + Secret; requests are signed with HMAC SHA256 (see section 7).
- **Characteristics**: deployed on overseas clouds; mainland access requires you to assess network connectivity and regulatory compliance yourself; no "trading code" concept, funds sit directly in the exchange account.
- **Watch out**: rate-limit rules, order types, and report fields differ heavily between venues, and they **upgrade frequently with occasional breaking changes** — the integration layer needs version management and canary releases.

> Crypto exchanges have no OMS, which means risk controls, reconciliation, and auditing are all on the client — that is exactly why [05-risk-systems.md](risk-systems.md) exists.

::: danger 💀 No OMS at crypto exchanges means risk control, reconciliation and audit are all yours
**Crypto exchanges have no OMS, which means risk controls, reconciliation, and auditing are all on the client.** Without the OMS's margin-call and forced-liquidation backstop, there is no second line of defense the moment risk controls fail; every order submission in your program without idempotency can turn into irreversible loss within milliseconds.
:::

---

## 5. Overseas Market Integration

### 5.1 Interactive Brokers

- Interface shape: **TWS API / IB API** (Java/C++/C#/Python client libraries), plus FIX access for institutional clients.
- Characteristics: one account covers global markets (US stocks/HK stocks/futures/options); documentation is public; official test accounts (paper trading) available.
- Fits: software companies wanting one interface to global markets; watch IB's rate limits (the default guardrail of one restrictive message per 10 seconds) and order type mapping.

### 5.2 CME clearing member model

- CME (Chicago Mercantile Exchange) and other overseas futures exchanges support **direct market access (DMA)**, but only as a clearing member or through a clearing member/ISV.
- Interface shape: **FIX/FAST protocols**; certificates and a leased line or dedicated network (e.g., the Bloomberg network or an exchange-designated network provider) required.
- Barriers: membership qualifications, capital thresholds, and technical certification are all far higher than integrating a domestic OMS; non-member institutions usually access indirectly via brokers/clearing firms (e.g., IB, JPM).

---

## 6. Direct Access vs OMS: Comparison Table

| Dimension | Domestic OMS (CTP etc.) | Crypto exchange API | Overseas (IB / CME clearing member) |
|---|---|---|---|
| What you connect to | Futures firm OMS | Exchange official API | IB / clearing member |
| Protocol | C++ DLL, proprietary binary | REST / WebSocket / public internet | FIX/FAST / leased line |
| Latency | Low (~1ms at the OMS side, depends on OMS and line; subject to measurement) | Low, network-bound (cross-border latency is the main cost) | Extremely low (leased line), but high entry barrier |
| Cost | Permission applications + OMS seat fees (per futures firm) | API free, testnet free | Membership/clearing/software certification fees |
| Barrier | Must be opened via a futures firm; AppID authentication | Register an account + generate an API Key | Capital threshold + qualification certification |
| Whose risk controls | OMS provides forced liquidation/margin calls/abnormal trading monitoring | Only exchange-level floor risk controls | Settlement member's responsibility |
| Client-side risk controls | Must build your own | Must build your own | Must build your own |

> Conclusion: **whichever path you take, client-side risk controls are mandatory.** OMS/exchange risk controls are the "floor", not the "guardrail" (see [05-risk-systems.md](risk-systems.md)).

::: warning ⚠️ OMS and exchange risk controls are the floor, not the guardrail
**Whichever path you take, client-side risk controls are mandatory.** OMS/exchange risk controls are the "floor", not the "guardrail" — OMS forced liquidation is the futures firm's statutory obligation, exchanges recognize members not individuals, and any approach that relies on the other side's risk controls to protect you collapses before your first line of defense is even tested.
:::

---

## 7. Interface Authentication

### 7.1 Domestic OMSs: AppID authentication + dual login

Taking CTP as the example (other OMSs are similar; official documentation prevails):

- **AppID / AuthCode**: the application identifier and authorization code the futures firm assigns to the software vendor; send an authentication request (`ReqAuthenticate`) before logging in; only after it passes can you proceed.
- **Market data login**: `ReqUserLogin` (market data); subscribe to contract market data after a successful login.
- **Trading login**: `ReqUserLogin` (trading); after login, verify the investor account (`ReqQryTradingAccount` / `ReqQryInvestorPosition`).
- **Note**: authentication credentials are separate from the trading account — the program authenticates with the AppID, and order submission binds to a specific investor account.

### 7.2 Crypto exchanges: API Key + HMAC signing

- Generate **API Key (public) and Secret (private)** in the exchange console; the Secret is shown exactly once at creation.
- Every request carries: timestamp + parameter string + signature; signature = HMAC-SHA256(Secret, string-to-sign). The exact concatenation rules differ per venue; official documentation prevails.
- **Permission separation**: API Keys support independent permissions such as "read-only / spot trading / futures trading / withdrawal". In production, always **disable withdrawal permission**.
- **IP allowlist**: bind the key to the server's egress IP; even after a leak it cannot be used from other IPs.
- **Recommended practice**: one dedicated key per production machine, least privilege, regular rotation.

::: danger 💀 Keys are forbidden in code repositories, logs, and screenshots
**Leaked production API keys are the most typical and most directly damaging security incident in trading systems.** One team committed a Secret-containing config to a public repository and had the account drained by automated scanners within minutes. Keys must never enter a repository, log, or screenshot; production keys need IP allowlisting, least privilege, and regular rotation; on leakage, revoke immediately and rotate everything.
:::

---

## 8. Simulation and Test Environments

| Environment | Use | Notes |
|---|---|---|
| CTP simulation (SimNow / futures firm simulation OMS) | Domestic futures joint debugging and validation | Market data and trading are both simulated matching with near-production rules; apply to the futures firm for a simulation account and simulation AppID |
| Crypto testnet (Binance Testnet / OKX Testnet / Bybit Testnet) | Crypto interface joint debugging | Same API shape as production with simulated market data; note testnets occasionally have separate rate limits |
| IB Paper Trading | IB simulation | Officially provided; virtual account balance |
| Self-built mock OMS | Regression testing/fault injection | Simulates reports per CTP callback semantics; can inject disconnects/rejections/out-of-order events for unit and integration tests |

> Iron rule: **production accounts are never used for joint debugging.** Debug only in simulation/test environments; simulation report semantics match production, but latency, rate limits, and matching rules differ — re-validate during the trial-run stage before go-live.

---

## 9. Integration Watch-outs

### 9.1 Protocol differences between OMSs

- CTP, Hundsun UFT, and Esunny differ in request/report fields and behavioral details (whether a partially filled order can be canceled, whether amend is supported, report ordering, etc.). **Do not hard-code for one vendor**: abstract a unified "order model" above the integration layer and confine OMS differences to the adapter layer.
- Crypto exchanges differ just as much: Binance uses `orderId` as the unique identifier, OKX has `clientOid` and `ordId`, and order status enums differ — the adapter layer must map venue by venue.

### 9.2 Encoding: the GBK trap

- String fields (contract names, exchanges, error messages) in domestic OMSs (CTP etc.) are **GBK-encoded**, while modern development environments are UTF-8 — **outputting without transcoding guarantees mojibake**, and garbled error messages make troubleshooting painful.
- Fix: decode all OMS return values as GBK before they enter the system; convert to UTF-8 before writing to the database; add test cases asserting on Chinese contract names/error codes.

### 9.3 Trading days and settlement time

- Futures night sessions belong to the **next trading day** (e.g., Friday night counts as Monday's trading day). The "date" for order submission, positions, and reconciliation must follow the **trading day**, not the calendar day.
- Daily settlement happens after the close (around 15:00); during settlement some OMSs are briefly unavailable or restrict order submission.
- Crypto exchanges run 7×24, but **<mark>funding rate</mark>** settlement, contract delivery, and maintenance windows occur on schedule (per official announcements) — monitoring must cover these times.

### 9.4 Other engineering watch-outs

- **Connection keep-alive**: CTP triggers heartbeat/timeout mechanics after long idle periods; implement active heartbeats and reconnect (see [03-market-data-systems.md](market-data-systems.md) and [04-trading-interfaces-and-order-lifecycle.md](order-lifecycle.md)).
- **Log time zones**: OMS-returned times are mostly server-local/UTC-offset; crypto APIs are uniformly UTC millisecond timestamps — store UTC internally, convert to local time zone at display.
- **Obtaining documentation**: OMS API documentation must be requested through the futures firm's/brokerage's technical contact under an NDA; crypto documentation is just the official developer docs.

---

## Risk Warning

::: warning ⚠️ Risk Warning
Leaked production API keys are the most typical and most directly damaging security incident in trading systems: one team committed a Secret-containing config to a public repository and had the account drained by automated scanners within minutes; another team's leaked key was used across networks because the IP allowlist was off. Always follow these rules: keys never enter repositories/logs/screenshots; production keys use IP allowlists, least privilege (trading only, withdrawal disabled), and regular rotation; on leakage, revoke and rotate everything immediately and audit all trades and fund flows in the window. Confirm the regulatory status of crypto exchanges against your local laws yourself.
:::
