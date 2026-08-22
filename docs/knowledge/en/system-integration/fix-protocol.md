---
title: "09 · FIX Protocol Deep Dive: The Common Language of Global Institutional Trading"
description: "FIX message format, core message types, session keep-alive, and a selection guide for overseas institutional markets."
---

# 09 · FIX Protocol Deep Dive: The Common Language of Global Institutional Trading

> Domestic futures have CTP; crypto exchanges have REST/WebSocket — but the common language of overseas institutional markets (CME, Interactive Brokers, interbank) is FIX. It is finance's oldest and most widely deployed "text exchange format" — no SDK, no private binary, just a field dictionary and line after line of `Tag=Value`.
>
> This article explains what FIX is, what messages look like, how the core message types are used, how sessions stay alive and how state stays aligned — ending with selection advice and derivative specs (FAST compression, the crypto exchange landscape).

---

## 1. What Is FIX

FIX (Financial Information eXchange) is the de facto standard messaging protocol for global financial trading. Key facts:

| Fact | Detail |
|---|---|
| Nature | A **message format standard** for trading (a text protocol): it defines "how messages are organized, what fields are called, how state is expressed" |
| Origin | Developed in 1992 by Fidelity Investments and Salomon Brothers for equity trading, to escape the coupling of proprietary formats |
| Governance | Maintained by FIX Protocol Ltd (FPL, formerly FIX Protocol Organization) together with counterparties |
| Today | Widely used for institutional direct connectivity in global equities, futures, fixed income, and FX; CME, ICE, LSEG, Interactive Brokers are all FIX members/supporters |
| Versions | Mainstream is FIX 4.2 / 4.4 (Session layer); FIX 5.0+ introduced componentized message catalogs; **defer to the version your counterparty actually supports** |

A widely repeated saying: **FIX is not software or an interface library — it is a "dictionary"**. It specifies how bytes are encoded, how messages are numbered, how state is represented; how you transport them (direct TCP, dedicated lines, authenticated networks) is each firm's own business.

> FIX was born in a world where "every bank had its own private format": in the 90s, connecting to N counterparties meant writing N parsers. FIX's ambition was one format with an industry-maintained field dictionary — an idea later inherited by the XML/JSON era, but in low-latency text messaging FIX remains the old master.

---

## 2. Where FIX Sits in the Trading Chain

```text
Strategy / Order Management System (OMS)
        │ internal order intent
        ▼
┌───────────────────────────────┐
│      FIX engine (client side)     │  ← owned by the software company / buy-side
│  message assembly / parsing / session management │
│  sequence maintenance / heartbeat / resend       │
└──────────────┬────────────────┘
               │ FIX connection (dedicated line / authenticated network / public internet + encryption)
┌──────────────▼────────────────┐
│      FIX gateway (counterparty side)   │  ← exchange / market maker / bank / clearing house
│  usually they provide the onboarding docs and test environment │
└──────────────┬────────────────┘
               ▼
     Exchange matching / market maker internals / interbank market
```

One-line positioning: **FIX is the last-mile protocol between your OMS and the counterparty**. Inside your own system you can use any stack (message queues, REST, gRPC), but once traffic leaves through institutional channels, the exit is FIX.

Typical users:

| Role | What they use FIX for |
|---|---|
| Buy side (**<mark>hedge</mark>** funds, asset managers) | Connect to sell-side execution channels (brokers/banks): place orders + receive reports |
| Sell side (**<mark>market makers</mark>**, banks) | Expose FIX interfaces, accept client orders |
| Exchanges/clearing houses (CME etc.) | Provide FIX/FAST direct access for members and ISVs |
| Brokers (Interactive Brokers etc.) | Institutional clients use FIX instead of desktop terminals |

---

## 3. FIX Message Structure

### 3.1 Three Sections: Header / Body / Trailer

Every FIX message has exactly three parts (using FIX 4.x as example):

| Section | Tags | Role |
|---|---|---|
| Header | 8=BeginString, 35=MsgType, 49=SenderCompID, 56=TargetCompID, 34=MsgSeqNum, 52=SendingTime | Identifies version, message type, sender/receiver, sequence number, time |
| Body | Message-type-specific fields (e.g., 55=Symbol, 54=Side, 44=Price, 38=OrderQty) | Business content |
| Trailer | 10=CheckSum | Integrity check, **must be the very last field** |

> Convention: besides `8` and `35` in the Header, `49`/`56`/`34`/`52` are mandatory Session-layer fields too; `10=CheckSum` must be the final field of the entire message — any field appended after it breaks validation.

### 3.2 Tag=Value Format and a Minimal Readable Example

FIX's encoding rule can be stated in one sentence: **each field pair is `<Tag>=<Value><SOH>`, fields separated by SOH (0x01, ASCII 1)**. For human reading SOH is usually written as `|`; when decoding, just split on `|`.

A minimal readable NewOrderSingle:

```text
8=FIX.4.4|35=D|49=SENDER01|56=TARGET01|34=7|52=20260816-10:00:00.000|11=ORD10001|55=ESU6|54=1|60=20260816-10:00:00.000|38=2|40=2|44=4100.50|10=092
```

| Tag | Meaning | Value |
|---|---|---|
| 8 | BeginString protocol version | FIX.4.4 |
| 35 | MsgType message type | D (NewOrderSingle) |
| 49 / 56 | SenderCompID / TargetCompID | Both parties' CompIDs (the login "username") |
| 34 | MsgSeqNum message sequence number | 7 (incremented within this side's session) |
| 52 | SendingTime | UTC time |
| 11 | ClOrdID client order ID | ORD10001 (the key to idempotency) |
| 55 | Symbol instrument | ESU6 |
| 54 | Side | 1=Buy |
| 60 | TransactTime | UTC |
| 38 | OrderQty quantity | 2 |
| 40 | OrdType order type | 2=**<mark>limit</mark>** |
| 44 | Price | 4100.50 |
| 10 | CheckSum | 092 |

> A very practical engineering point: **the `|` is display-only; on the wire the bytes are `\x01` (SOH)**. A raw SOH must never appear inside string values, and text values must not contain `=` either (use another separator). The classic rookie mistake is stuffing text containing `|` into a Value.

### 3.3 CheckSum

The `10=CheckSum` algorithm: sum the ASCII codes of every byte in the whole message (from `8=` through the last SOH before the trailer), take modulo 256, format as 3 decimal digits (zero-padded):

```text
checksum = sum(all bytes) % 256, output like "092"
```

- **The calculation excludes `10=` itself** but includes every field's equals sign and SOH.
- Compute the checksum before parsing the body — **messages failing checksum must be dropped** (usually a sign of packet splits/merges or mismatched field dictionaries).

### 3.4 Session Layer vs Application Layer

FIX splits concerns into two layers, and this is where integrators most often get confused:

| Layer | Governs | Key tags |
|---|---|---|
| Session layer | Login, heartbeats, sequencing, resends, disconnect/reconnect | 8 / 34 / 35=A / 0 / 1 / 2 / 4 |
| Application layer | Orders, cancels/replaces, reports, market data requests | 35=D / F / G / 8 / W etc. |

The two layers must be implemented separately: **when the Session layer breaks (sequence mismatch, dead heartbeats), it takes business down with it** — so make the Session layer robust first (reconnect, resend, sequence persistence), then talk business logic.

::: danger 💀 When the Session layer breaks, business goes down with it
**When the Session layer breaks (sequence mismatch, dead heartbeats), it takes business down with it.** FIX integration demands a robust Session layer first — reconnect, resend, sequence persistence — before any business logic. If order placement and cancellation depend on a fragile Session layer, a single disconnect can make all order state untrustworthy.
:::

---

## 4. Core Message Types

| MsgType (35=) | Name | Direction | Purpose |
|---|---|---|---|
| A | Logon | Both ways | Login, negotiates heartbeat interval |
| 0 | Heartbeat | Both ways | Keep-alive |
| 1 | TestRequest | Both ways | Probe whether the peer is alive |
| 2 | ResendRequest | Both ways | Request retransmission of missed messages |
| 4 | SequenceReset | Both ways | Sequence reset (Gap Fill) |
| 5 | Logout | Both ways | Logout |
| D | NewOrderSingle | Client → counterparty | Place order |
| F | OrderCancelRequest | Client → counterparty | Cancel order |
| G | OrderCancelReplaceRequest | Client → counterparty | Replace order (price/quantity) |
| 8 | ExecutionReport | Counterparty → client | Order status/fill report (**the report carrier**) |
| 9 | OrderCancelReject | Counterparty → client | Cancel was rejected |
| W | MarketDataSnapshot | Counterparty → client | Market data snapshot |
| X / P | MarketDataIncremental / refresh | Counterparty → client | Market data increments |

### 4.1 35=D NewOrderSingle (Placing an Order)

Required fields for ordering:

| Tag | Field | Notes |
|---|---|---|
| 11 | ClOrdID | Client order ID — **the sole credential for idempotency**: globally unique, never reused |
| 55 | Symbol | Instrument/ticker, per the counterparty's dictionary |
| 54 | Side | 1=Buy 2=Sell (market makers have other values like 4/5) |
| 38 | OrderQty | Quantity |
| 40 | OrdType | 1=Market 2=Limit 3=**<mark>stop-loss</mark>** etc. |
| 44 | Price | Required for limit orders; omitted for **<mark>market orders</mark>** |
| 59 | TimeInForce | 0=Day 1=GTC 3=IOC 4=FOK etc. |
| 60 | TransactTime | Transaction time (UTC) |

### 4.2 35=8 ExecutionReport (Fill Report)

The report is FIX's most complex message: **every single status change of an order pushes a new 35=8**, carrying dual states 39=OrdStatus and 150=ExecType. Key fields:

| Tag | Field | Notes |
|---|---|---|
| 11 | ClOrdID | The matching client order ID (may be linked via 41=OrigClOrdID) |
| 37 | OrderID | Counterparty order ID |
| 17 | ExecID | Unique ID of this execution — **the basis for idempotent deduplication** |
| 39 | OrdStatus | Order status (see section 6) |
| 150 | ExecType | Execution type (see section 6) |
| 151 | LeavesQty | Remaining unfilled quantity |
| 14 | CumQty | Cumulative filled quantity |
| 31 | LastPx / 32=LastQty | This fill's price/quantity (one report per partial fill) |
| 103 | OrdRejReason | Rejection reason code |

> Engineering iron rule: **dedupe reports by 17=ExecID; trust status from 39=OrdStatus**. After reconnects and resends the same report may arrive twice; identical ExecID means drop the duplicate.

::: warning ⚠️ In real markets, believing you canceled when you didn't is far more dangerous than knowing you didn't
**ExecType=8 (Rejected) and ExecType=4 (Canceled) must not be conflated** — Rejected means "never became an order", Canceled means "became an order and was then canceled". If after sending a cancel request you don't track the 150=6→4 confirmation chain, you may believe the order is gone when it isn't — in real markets that is far more dangerous than knowing for certain it wasn't canceled.
:::

### 4.3 35=F OrderCancelRequest and 35=G Replace

| Message | Key fields | Semantics |
|---|---|---|
| F cancel | 11=ClOrdID (newly generated), 41=OrigClOrdID (original order ID), 55/54/38 | Request to cancel the original order; result arrives via 35=8 (success) or 35=9 (failure, e.g., already filled) |
| G replace | 11=new order ID, 41=original order ID, new 44/38 | The exchange processes atomically as "cancel old, place new"; some markets treat price changes as cancel+re-place, **possibly losing queue position** |

### 4.4 35=A Logon (Login)

The only entry into a Session; required items:

| Tag | Field | Notes |
|---|---|---|
| 49 / 56 | SenderCompID / TargetCompID | Both parties' CompIDs, equivalent to "accounts" |
| 98 | EncryptMethod | Encryption method, usually 0=none (link-layer encryption instead) |
| 108 | HeartBtInt | **Heartbeat interval (seconds)**, negotiated at login |
| 141 | ResetSeqNumFlag | Y=reset both sides' sequences (first connection/daily reset) |

---

## 5. Session Lifecycle

```text
       Client                                  Counterparty
         │                                      │
         │──────── 35=A Logon (108=30)────────▶│
         │◀─────── 35=A Logon (with peer seq)─────│
         │                                      │
   ┌─────▼─────┐  normal flow: messages themselves keep alive ┌─▼─────┐
   │   Logged in    │◀────────────────────────────▶│ Logged in │
   │           │  idle > N seconds → send 35=0 heartbeat   │       │
   └─────┬─────┘  no response within peer's 35=0 window →          └─┬─────┘
         │        send 35=1 TestRequest probe        │
         │        still no response → disconnect + reconnect          │
         │                                      │
         │──────── 35=5 Logout (closing)──────────▶│
         │◀─────── 35=5 Logout ──────────────────│
         ▼                                      ▼
```

Three core mechanisms:

1. **34=MsgSeqNum (message sequence number)**: every message increments within the session; both sides track "what I've sent" and "what I expect from you". Receiving `34` larger than expected → send 35=2 ResendRequest; smaller than expected → duplicate message, discard directly or handle as Gap Fill.
2. **Heartbeat interval**: negotiated at login via tag 108 (commonly 10s/30s/60s, per counterparty requirements). Send a Heartbeat proactively when idle past the interval; **both sides must hear from the other before timeout** (any application message counts as a heartbeat), otherwise send TestRequest; if that times out too, declare disconnection.
3. **Logout**: at normal close or shutdown, send 35=5 before dropping the connection; **an abrupt goodbye leaves a hung Session on the counterparty side**, which may reject your reconnect or force a sequence reset.

> Sequences are the lifeblood of a FIX session: **they must be persisted** (to disk/database). After a crash-restart you resume from the previous number, not back to 1 — otherwise the counterparty concludes "messages were lost" and demands a full resend.

::: danger 💀 Persist sequences, or orders become untraceable after reconnects
**Sequences are the lifeblood of a FIX session: they must be persisted (to disk/database); after a crash-restart you resume from the previous number, not back to 1.** Otherwise the counterparty concludes "messages were lost" and demands a full resend; overly lenient heartbeat-timeout settings leave you "connected while the market moved on".
:::

---

## 6. Order Status and ExecType

Every order change manifests as a 35=8, where `39=OrdStatus` and `150=ExecType` are two easily confused fields that must be read together:

| 39=OrdStatus | Meaning | Relation to 150=ExecType |
|---|---|---|
| 0 New | Accepted | 150 also 0 (new order confirmed) |
| 1 PartiallyFilled | Partially filled | 150=1 |
| 2 Filled | Fully filled | 150=2 |
| 4 Canceled | Canceled | 150=4 (or cancel subtypes of 150=6/9) |
| 5 Replaced | Replaced | 150=5 |
| 6 PendingCancel | Cancel submitted, not yet confirmed | 150=6 |
| 8 Rejected | Rejected, **order does not exist** | 150=8 (carries 103=RejReason) |
| A PendingNew | Submitted, not yet confirmed | 150=A |
| E PendingReplace | Replacement submitted, not yet confirmed | 150=E |

How to read them (one sentence): **39 describes "what the order looks like now"; 150 narrates "which change this message reports"**. E.g., after sending a cancel you first receive `150=6 PendingCancel`, and only when the `39=4 Canceled` report follows is the cancel actually successful; if `150=6` is followed by `35=9 OrderCancelReject`, the cancel failed and the order lives.

- **ExecType=8 (Rejected) and ExecType=4 (Canceled) must not be conflated**: Rejected means "never became an order", Canceled means "became an order and was then canceled".
- On partial fills, 32/31 (LastQty/LastPx) update per fill and 14/151 (CumQty/LeavesQty) follow — **use 14 and 151 for remaining quantity; don't accumulate 32 yourself** (resends would double-count).

---

## 7. FIX Pros and Cons

### 7.1 Advantages

| Advantage | Notes |
|---|---|
| Standardization | One global field dictionary; low cost migrating across markets/counterparties — "know FIX, know them all" |
| Mature and reliable | Thirty years of industry hardening; the Session layer (sequencing, resend, heartbeat) is extremely robust |
| Full-duplex, full-featured | Orders, cancels/replaces, reports, market data, maker quotes — all in one protocol |
| Rich ecosystem | Open-source engines (QuickFIX/QuickFIXJ, OnixS commercial), test tools, complete dictionaries |

### 7.2 Disadvantages

| Disadvantage | Notes |
|---|---|
| Complexity | Text protocol + sequencing + resend + heartbeat; the Session layer is far more work than REST; dictionary version management is a standing burden |
| No built-in security | Plaintext, no auth encryption; security comes from the link layer (dedicated lines/TLS) |
| Inefficient | Large text payloads, slow parsing; high-throughput scenarios need FAST compression (see section 8) |
| Detail hell | Every firm uses optional fields, subtypes, and error codes differently — same protocol, different counterparties still need per-firm integration testing |

### 7.3 Versus Exchange Proprietary APIs

| Dimension | FIX | Exchange proprietary APIs (crypto REST/WS, CTP binary) |
|---|---|---|
| Generality | Cross-market, cross-counterparty | Each venue has its own formats and authentication |
| Ramp-up cost | High (Session layer + dictionary) | Low (SDK/docs provided) |
| Latency | Relatively high for text; FAST helps compress | Binary/JSON designed per scenario, generally faster |
| Status semantics | Highly standardized (39/150) | Different enums per venue, needs mapping |
| Best fit | Overseas institutional connectivity, unified cross-market egress | Single-market deep integration, crypto HFT |

### 7.4 When You Actually Need Direct FIX Connectivity

- The counterparty **only offers FIX** (CME and other exchanges, most overseas brokers, interbank).
- You need **one codebase for multiple markets**: unify the OMS egress over FIX, hide market differences in configuration.
- You need institution-grade reliability semantics (sequence resend, reconciliation, audit): REST polling can't provide these.
- **Not needed**: domestic futures counters only (use CTP), crypto-only (official REST/WS is simpler) — FIX isn't "more advanced", it's "a requirement of a different market".

---

## 8. Derivative Specs: FAST and the Crypto Landscape

### 8.1 FAST (FIX Adapted for STreaming)

- **What it is**: a compression encoding spec from the FIX Protocol organization for market data/high-throughput scenarios, using templates (XML describing field encoding) + bitmaps to shrink payloads dramatically — market data volume compressed to a tenth of text FIX or lower.
- **Where it's used**: real-time market data direct feeds at CME etc.; order acknowledgments mostly remain plain FIX.
- **Engineering cost**: template management, delta encoding (values only sent when changed from prior field), out-of-order recovery are all new complexity — FAST isn't "readable and done"; the decoder must strictly match their templates.
- **Concept check**: FAST is an **encoding layer inside the same protocol family**, not a new protocol; confirm upfront whether the counterparty wants "FIX Session + FAST market data" or plain FIX.

### 8.2 Crypto Exchanges' Current FIX Support

| Exchange | FIX support | Notes (official docs authoritative) |
|---|---|---|
| Binance | Yes | Institutional-grade FIX interface (with test environment), aimed at makers/institutions |
| OKX | Yes | Offers a FIX interface for institutional clients |
| Bybit | Yes | Offers a FIX interface |
| Other mid/small venues | Mostly REST/WS | FIX mainly appears at top-tier exchanges |

Characteristics of crypto FIX:

- **Authentication is usually a variant of "API Key + pre-shared secret/signature"**, not traditional CompID password pairs — read their docs carefully before integrating.
- Price precision, tick sizes, and order type enums differ entirely from domestic conventions; field mapping must be done item by item.
- For most individuals and small/mid teams, **official REST/WebSocket remains the better choice**; FIX is merely one option on the "institutional channel" menu.

---

## Risk Warning

::: warning ⚠️ Risk Warning
FIX incidents concentrate in the Session layer: unpersisted sequences leaving orders untraceable after reconnects; overly lenient heartbeat timeouts leaving you "connected while the market moved on"; cancel requests sent without tracking the 150=6→4 confirmation chain, so you believe the order is gone when it isn't. **In real markets, "believing you canceled" is far more dangerous than "knowing you didn't".** Always remember: persist sequences and order state; on disconnect reconnect first, then resend, then resume ordering; validate every field against the counterparty's dictionary; complete disconnect-injection drills (pulling cables, sequence rollback, duplicate reports) in the counterparty's test environment before launch. Protocol details here defer to official FIX documentation and the counterparty's onboarding specs.
:::
