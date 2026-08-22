---
title: "CTP Integration in Practice: From Zero to First Order"
description: "The full CTP futures interface workflow in practice, from environment setup and the development flow to a minimal runnable example and common pitfalls."
---

# CTP Integration in Practice: From Zero to First Order

> The previous article covered FIX; this one covers the de facto standard for domestic Chinese futures — CTP. It is the interface most quant teams and software companies deal with: C++ DLL, callback model, GBK encoding, authentication + double login… every step has its traps.
>
> This article walks through a real project in order: what CTP is → environment setup → development flow → key call conventions → flow control → connection management → minimal runnable example → common pitfalls.

---

## 1. What Is CTP

CTP (Comprehensive Transaction Platform) was developed by **SFIT (Shanghai Futures Information Technology Co., Ltd.)** and is the **de facto standard trading and market data interface of China's domestic futures market**:

| Fact | Detail |
|---|---|
| Developer | SFIT (the technical company under SHFE) |
| Standing | The most widely deployed counter interface among domestic futures brokers, highest market share, the de facto standard |
| Audience | Futures brokers / software companies, not retail traders (retail uses broker trading software) |
| Interface shape | Native C++ dynamic libraries (Windows DLL / Linux .so), exporting two APIs: Trader and MD (market data) |
| Official docs | Interface headers (`.h`) and documents must be requested through a futures broker under an NDA; after version iterations, fields are governed by the official headers |
| Derivatives | CTPMini (simplified), SPT (Esunny's analogue), etc., with behavioral and field differences — defer to each one's documentation |

**API shape: C++ DLL + language wrappers**

- The official release is C++ only; the industry wraps it in C#/Java/Python (open-source projects like `ctp-python`, plus in-house wrappers at various companies). A wrapper is essentially just "a bridge to the DLL's exported functions".
- The wrapper version must strictly match the actual counter version — **version mismatch is the single most common first-class problem in CTP integration** (struct sizes, added/removed fields all go out of sync).
- The market data API and the trading API are **two independent objects with two separate connections**: `CThostFtdcMdApi` (market data) + `CThostFtdcTraderApi` (trading), each with its own login and its own callbacks.

> Comparison with FIX: FIX is an industry-standard protocol of "text + dictionary"; CTP is a proprietary interface of "private binary structs + callbacks". CTP's advantage is easy integration (call it as soon as you have the DLL); its disadvantage is that all behavior is defined by the official implementation — details you can't see in the docs can only be learned by testing.

---

## 2. Environment Setup

### 2.1 Downloading the Interface and Choosing a Version

| Item | Notes |
|---|---|
| Official interface | Obtained by request from the broker's IT department (most brokers have a "programmatic trading" section on their site); SFIT's website also provides some materials |
| Version choice | Confirm the broker's counter version, then pick the matching API version; upgrading the counter requires upgrading the API in sync — **mixing is forbidden** |
| Sim vs production | SimNow (simulation) and production interfaces are usually the same version, different addresses |

### 2.2 Production vs Simulation (SimNow)

| Environment | Purpose | How to get it | Characteristics |
|---|---|---|---|
| Production | Live trading | Open an account with a broker + apply for trading/market data permissions + AppID | Real money; strict monitoring (abnormal trading behavior, cancel rate); **strictly forbidden for integration debugging** |
| SimNow (SFIT simulation) | Development, integration testing, strategy validation | Register a simulation account on SFIT's website | Market data is real simulated data; matching rules approximate live; funds are virtual; **interface behavior matches production, but latency/rate limits/order book depth differ** |
| Broker simulation counter | Integration against a specific broker's counter | Apply to the futures broker | Closer to that production counter's behavior; offered by some brokers |

> Iron rule: **all development, integration testing, and regression testing happens in simulation; the production account is only for final pre-launch verification.** One important SimNow detail: it is unavailable between the daily close and next day's open (not 7×24); automation scripts must handle "connection failure outside trading hours".

### 2.3 Credentials and Version Differences

- **The three authentication pieces**: the broker-assigned `AppID` and `AuthCode`, plus the broker-provided trading/market data server addresses and ports, and the investor account and password.
- **Version differences**: across versions, the auth flow, the login sequence after `OnRspAuthenticate`, and field naming may all differ; some counters use the newer trading interface (e.g. `v6.x`) while a few old counters still run older versions — **your header files are the only source of truth**.

> What the industry calls "trade/quote" or "md/trader" interfaces are just different names for the same thing: `TraderApi` (trading / orders / queries) + `MdApi` (market data). The former handles authenticate → login → query → order → report; the latter handles market data login → subscription.

---

## 3. Development Flow

Standard flow (each step has a matching request function and callback):

```text
① Initialize: create MdApi / TraderApi instances, register callbacks, connect to servers
        │
        ▼
② Authenticate: ReqAuthenticate (AppID + AuthCode) ──▶ OnRspAuthenticate
        │
        ▼
③ Login: ReqUserLogin (separate logins for trading and market data) ──▶ OnRspUserLogin
        │
        ▼
④ Settlement confirmation (trading side): ReqSettlementInfoConfirm ──▶ OnRspSettlementInfoConfirm
        │
        ▼
⑤ Queries: ReqQryInstrument / ReqQryTradingAccount / ReqQryInvestorPosition
        │    (query results arrive via OnRspQry* callbacks; today's orders/fills come via
        │     OnRtnOrder/OnRtnTrade or query callbacks)
        ▼
⑥ Market data: ReqSubscribeMarketData (subscribe contracts) ──▶ OnRtnDepthMarketData (tick stream)
        │
        ▼
⑦ Place order: ReqOrderInsert ──▶ OnRspOrderInsert (accepted or not)
        │                      └─▶ OnRtnOrder (order status) / OnRtnTrade (fill reports)
        ▼
⑧ Cancel: ReqOrderAction ──▶ OnRtnOrder (cancel result) / OnRspOrderAction
```

Two easily misunderstood points:

- **The OnRsp family ≠ the OnRtn family**: `OnRspOrderInsert` only means "the counter received your request" (or rejected it), which **does not mean the order filled**; the order's true status lives in `OnRtnOrder`, and fills in `OnRtnTrade`.

::: warning ⚠️ Order accepted does not mean filled
**`OnRspOrderInsert` only means "the counter received your request" (or rejected it) — it does not mean the order filled.** The order's real status lives in `OnRtnOrder`, and fills in `OnRtnTrade`. If you treat "order accepted" as "filled" just by watching OnRsp, your positions will never reconcile.
:::
- **Query callbacks are batched**: when results are large, one query triggers multiple `OnRspQry*` callbacks (with an `IsLast` flag); only when `IsLast=true` is the query complete.

---

## 4. Key Structs and Call Conventions

### 4.1 Request/Callback Pairing

All CTP interaction falls into three categories: "**request (Req prefix) → response callback (OnRsp prefix) → push notification (OnRtn prefix)**":

| Category | Examples | Semantics |
|---|---|---|
| Request | `ReqUserLogin`, `ReqOrderInsert`, `ReqOrderAction`, `ReqQryInstrument` | Initiated by the client |
| Response | `OnRspUserLogin`, `OnRspOrderInsert`, `OnRspQryInstrument` | The counter's answer about "the request itself" (accepted/rejected) |
| Push notification | `OnRtnOrder`, `OnRtnTrade`, `OnRtnTradingAccount`, `OnRtnDepthMarketData` | Event stream pushed proactively by the counter |

Each request function takes a `CThostFtdcInputXXXField*` (input struct) and an `int nRequestID` (request ID); each callback carries a `CThostFtdcRspXXXField*` (response struct) and a `CThostFtdcRspInfoField*` (error info, where `ErrorID != 0` means failure).

### 4.2 Threading Model: Callbacks Fire on a Separate Thread

This is the single most important concept in CTP integration:

- The API maintains its own internal thread, and **all callbacks fire on that API-internal thread** — not on your business thread.
- **Never do slow work inside a callback** (database writes, HTTP calls, heavy logging, synchronous waits): it blocks every subsequent report, causes market data gaps and delayed order reports, and can even trigger counter-side timeouts.
- Standard practice: **callbacks do nothing but fast enqueue; business threads consume the queue** (producer-consumer). Data shared between callbacks and business threads must be locked or passed via queue — no naked sharing.

::: danger 💀 Never do slow work inside a callback
**Never do slow work inside a callback (database writes, HTTP calls, heavy logging, synchronous waits): it blocks every subsequent report, causing market data gaps, delayed order reports, and even counter-side timeouts.** Standard practice: callbacks only fast-enqueue; business threads consume the queue — shared data must be locked or passed via a queue; no naked sharing.
:::

```text
CTP callback thread ──▶ thread-safe queue ──▶ business thread (consumes: persistence / state machine updates / strategy notifications)
    (pushes only)                     (all processing logic lives here)
```

### 4.3 Commonly Used Structs

| Struct | Purpose | Key fields (official headers are authoritative) |
|---|---|---|
| `CThostFtdcReqUserLoginField` | Login | BrokerID, UserID, Password |
| `CThostFtdcReqAuthenticateField` | Authentication | BrokerID, UserID, AppID, AuthCode |
| `CThostFtdcInputOrderField` | Order placement | InstrumentID, ExchangeID, Direction, CombOffsetFlag, LimitPrice, VolumeTotalOriginal, OrderPriceType, TimeCondition |
| `CThostFtdcInputOrderActionField` | Cancel | InstrumentID, OrderSysID (counter order ID), or OrderRef + FrontID/SessionID |
| `CThostFtdcOrderField` | Order report | OrderStatus, VolumeTraded, VolumeTotal, LimitPrice |
| `CThostFtdcTradeField` | Fill report | TradeID, Price, Volume, Direction, OffsetFlag |
| `CThostFtdcDepthMarketDataField` | Market data tick | LastPrice, Volume, BidPrice1/2/3…, AskPrice1/2/3… |

---

## 5. Flow Control: Query and Order Frequency

CTP publishes no fixed rate-limit table; the following is common industry knowledge (**defer to official docs and observed counter behavior**):

| Operation type | Industry rule of thumb | Notes |
|---|---|---|
| Queries (ReqQry*) | About **once per second** | Too-frequent queries get rejected by the counter (flow-control error code), e.g. ReqQryTradingAccount / ReqQryPosition |
| Orders (ReqOrderInsert) | About **twice per second** | High-frequency ordering triggers counter/exchange flow control and abnormal-trading surveillance |
| Cancels (ReqOrderAction) | Same as orders | Cancels are also throttled, and frequent place-and-cancel draws exchange scrutiny |
| Market data subscription | Connection/subscription caps exist | Manage subscriptions by reusing connections and aggregating subscriptions |

Engineering countermeasures:

- **Query queue**: route all ReqQry* calls into a single rate-limited serial queue, spaced at least 500ms apart (conservatively 1s).
- **Order throttler**: control order pacing per instrument/account; an intraday order-to-cancel ratio above limits triggers exchange abnormal-trading alerts — reduce useless cancels at the strategy level too.
- **Distinguish error codes**: on receiving a flow-control error code (e.g. "CTP: too many requests"), back off and wait instead of resending immediately (resending only makes it worse).
- Note: **SimNow's flow control is looser than production**; a frequency that passes on SimNow may be flat-out rejected in production — re-verify frequency parameters against production before launch.

---

## 6. Connection Management

### 6.1 Disconnect and Reconnect

- CTP connections have no heartbeat message (you detect disconnection only via the `OnFrontDisconnected` callback, plus self-checks when market data stops updating).
- Standard recovery sequence: **clean up the old connection → reconnect → re-authenticate → re-login → re-confirm settlement → re-subscribe market data → pull today's orders/positions to rebuild local state → resume ordering**. State rebuild must complete before resuming orders (see [04-Trading Interfaces and Order Lifecycle.md](order-lifecycle.md)).
- Reconnects need backoff (e.g. 1s/2s/5s… capped at 30s) to avoid a reconnect storm against the counter; allow only one reconnect flow at a time.

### 6.2 Settlement Confirmation (SettlementConfirm)

- **Why the first login each day must confirm settlement**: Chinese futures settle daily; after settlement, floating P&L rolls into the balance. The counter requires clients to **confirm the day's settlement statement (funds / positions / fee breakdown) before trading is allowed** — this is how brokers fulfill their disclosure obligation, implemented directly as "settlement unconfirmed → reject orders/reject fund queries".
- Flow: after successful login call `ReqSettlementInfoConfirm`; only after receiving a successful `OnRspSettlementInfoConfirm` may you continue querying funds/positions and placing orders.
- Common bug: **confirming settlement only on first startup**, then crossing into a new trading day without re-confirming → every morning order gets rejected with "CTP: please confirm settlement statement first".
- Recommendation for automated systems: login → query settlement info (`ReqQrySettlementInfo`) → confirm → then enter business logic; encode "settlement confirmed" as a precondition in your startup state machine.

::: warning ⚠️ Confirming settlement only on first startup means morning orders get rejected after the day rollover
**If you confirm settlement only on first startup and never re-confirm on a new trading day, all your morning orders get rejected with "CTP: please confirm settlement statement first".** The CTP counter requires clients to confirm the day's funds, positions, and fee breakdown after daily settlement before trading is allowed — always redo settlement confirmation after a day rollover.
:::

---

## 7. Example Code: Minimal Python Skeleton

> The following is a **teaching-oriented pseudocode-style snippet** (based on typical CTP Python wrappers). It demonstrates only the minimal closed loop of "connect + login + subscribe + print ticks" and is not production-ready.

```python
# Teaching example: minimal CTP skeleton (connect + login + subscribe + print ticks)
# Requires: some CTP Python wrapper (vnpy's core, ctpbee, or in-house), matched to the counter version

class MdHandler:
    def on_front_connected(self):
        # 1. Market data login
        self.api.req_user_login(user_id=CFG.USER, password=CFG.PWD)

    def on_rsp_user_login(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("market data login failed:", error)
            return
        # 2. Subscribe contracts after successful login
        self.api.subscribe_market_data(contracts=["rb2610", "cu2610"])

    def on_rtn_depth_market_data(self, tick):
        # 3. Tick callback: printing only (teaching); enqueue in production, never do slow work here
        print(f"{tick.instrument_id} last={tick.last_price} "
              f"bid1={tick.bid_price_1}@{tick.bid_volume_1} "
              f"ask1={tick.ask_price_1}@{tick.ask_volume_1} time={tick.update_time}")


class TradeHandler:
    def on_front_connected(self):
        self.api.req_authenticate(app_id=CFG.APP_ID, auth_code=CFG.AUTH_CODE)

    def on_rsp_authenticate(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("authentication failed:", error); return
        self.api.req_user_login(user_id=CFG.USER, password=CFG.PWD)

    def on_rsp_user_login(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("trading login failed:", error); return
        # First login each day must confirm settlement, otherwise no trading
        self.api.req_settlement_info_confirm()

    def on_rsp_settlement_info_confirm(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("settlement confirmation failed:", error); return
        print("settlement confirmed; queries and orders now allowed")
        # Query funds / positions (mind rate limits: about once per second)
        self.api.req_qry_trading_account()


def main():
    md_api = create_md_api(MdHandler())      # market data: connect to the MD address
    trade_api = create_trader_api(TradeHandler())  # trading: connect to the trade address
    md_api.connect(CFG.MD_HOST, CFG.MD_PORT)
    trade_api.connect(CFG.TRADE_HOST, CFG.TRADE_PORT)
    # Production: main thread consumes the callback queue and processes signals; teaching example just idles
    wait_forever()
```

Key takeaways (teaching vs production gap):

- Callbacks only enqueue; business logic runs on the main thread. Direct printing in the example is for demonstration only.
- Market data and trading are two connections with two callback sets, each with independent disconnect/reconnect.
- Field names follow the wrapper and counter version's official headers (names in this example are just a common mapping).

---

## 8. Common Pitfall Checklist

| # | Pitfall | Symptom | Countermeasure |
|---|---|---|---|
| 1 | GBK encoding | Garbled Chinese contract names/error messages, unreadable logs | Decode CTP strings as GBK before they enter your system (see [02-Exchanges and OMSs.md](exchanges-oms.md) 9.2) |
| 2 | Time field formats | Order/market timestamps look like `20260816 10:00:00` or concatenated `yyyymmdd-hh:mm:ss` values | Parse per official field definitions, normalize to timestamps for storage |
| 3 | Order accepted ≠ filled | Treating `OnRspOrderInsert` as a fill, positions don't reconcile | Trust fills only from `OnRtnTrade`; trust status only from `OnRtnOrder` |
| 4 | Cancel conflicts | Canceling right as the order fills → cancel fails / already fully filled; duplicate cancels | Check status before canceling (only cancel when `OrderStatus` allows); treat failed cancels as exceptions |
| 5 | Forgetting daily settlement confirmation | First order of a new trading day rejected: "confirm settlement statement first" | Make "settlement confirmed" a mandatory precondition in the login state machine |
| 6 | Unthrottled queries | High-frequency ReqQry* rejected by flow control; retries pile up | Query queue: about once per second |
| 7 | Slow work inside callbacks | Reports/market data back up, latency spikes | Callbacks only enqueue |
| 8 | Version mismatch | Misaligned structs, garbage field values, crashes | Wrapper version must strictly match the counter version |
| 9 | Night session/day rollover | Friday night session belongs to the next trading day; connections dropped during settlement window | Drive everything off the trading calendar; re-confirm settlement after rollover |
| 10 | Order ID conflicts | Duplicate OrderRef/ClOrdID rejected by the counter | Globally auto-incremented IDs that survive restarts |

---

## Risk Warning

::: warning ⚠️ Risk Warning
A direct CTP connection is a channel for real money, and the error window is tiny: cancel conflicts, status corruption, missed settlement confirmation after a day rollover, callback blocking backing up reports — any one of them can cause irreversible losses within seconds. Always remember: **development and integration testing happen only on SimNow/broker simulation environments; production accounts are strictly off-limits for debugging**. Production must enable order throttling, query rate limiting, and an independent risk-control process; complete fault-injection tests for reconnect, rejection, and cancel conflicts before launch; all fields, rate-limit values, and flows defer to the official CTP API documentation and the broker's technical specs — this article reflects common industry knowledge only.
:::
