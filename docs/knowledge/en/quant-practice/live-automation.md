---
title: "Live Automation"
description: "The compliance boundaries of personal automation, a complete crypto spot playbook, and the semi-automatic 'signal alert + manual execution' route for China A-shares."
---

# Live Automation

> The biggest hurdle after backtesting is going live. This article first maps the compliance boundaries, then gives a complete crypto spot automation playbook (API keys, order placement, WebSocket, reconnection, VPS deployment), and closes with the reality of China A-shares and the "signal alert + manual execution" semi-automatic route. **<mark>Read compliance first, talk code second</mark>**.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets are risky; invest with caution.

---

## 1. Compliance Boundaries of Personal Automation

Different markets treat individual programmatic trading very differently — facts first (**policy details subject to latest regulations**):

| Market | Status | Room for Individual Quant |
|---|---|---|
| China A-shares | Programmatic trading regulated: registration regime phasing in since 2023 (SSE/SZSE/BSE programmatic trading rules), with focused monitoring of high-frequency/abnormal trading | High compliance cost; brokers essentially don't open quant order APIs to individuals |
| Futures | Programmatic trading common but must be registered through futures brokers, monitored via cancel ratios/declaration counts etc. | Feasible through broker APIs (e.g., CTP); thresholds and capital requirements are high |
| Crypto spot/perps | No unified regulatory gate; each exchange sets its own API policy and risk controls | Easiest for individuals, but watch platform terms and regional restrictions |
| Offshore brokers | Interactive Brokers et al. offer official APIs, but docs and compliance reporting target institutions; usable individually if you verify terms yourself | Some barrier; cross-border capital compliance involved |

### 1.1 Key Points of China A-Share Programmatic Trading Regulation

- In September 2023 the SSE/SZSE/BSE published draft implementation rules for programmatic trading: core points are **registration of programmatic trading, declaration of account capital scale, monitoring of abnormal behavior** (frequent order placement/cancellation, instant large orders, self-trades, etc.);
- 2024 brought further rules such as the "Administrative Provisions on Programmatic Securities Trading (Trial)"; programmatic traders must register per exchange and broker requirements;
- Individuals automating even indirectly fall under the same monitoring and registration requirements once identified as programmatic traders.
- **The above is a general summary; specific scope and standards are governed by the latest SSE/SZSE/BSE announcements and CSRC rules.**

### 1.2 Crypto Platform Risk Controls

Crypto has no regulatory gate, but **<mark>platform-side risk control is a hard constraint</mark>**:

::: warning 🛑 API Key Permission Red Line
Enable **trading + read-only only**, **never withdrawal permission** — then even a stolen key cannot move your funds.
:::

- High-frequency API calls trigger rate limiting or outright bans;
- Some platforms (e.g., Binance) restrict access from certain regions in their terms — **confirm the rules of your jurisdiction before use**.

### 1.3 Offshore Broker APIs

::: info 📖 Offshore Broker API Notes
Interactive Brokers offers an official API (TWS API) suitable for programmatic trading, but it rides on the desktop TWS client and requires a resident process; US/HK order frequency and patterns (IBKR also enforces limits and risk controls) follow its documentation. For deposits/withdrawals and taxes, do your own compliance verification.
:::

---

## 2. Crypto Automation in Practice

This section uses Binance spot as the example (OKX/Bybit are analogous; fields and rate limits per their official docs).

### 2.1 Creating an API Key and Setting Permissions

1. Log into the exchange console → API management → create an API key;
2. Check only **spot trading** and **read** permissions — **never withdrawals** (a stolen key can't move funds);
3. Enable an IP whitelist (allow only your VPS's fixed IP);
4. Store key and secret in local environment variables — **never in code or git**.

```bash
export BINANCE_API_KEY="xxxx"
export BINANCE_API_SECRET="xxxx"
```

### 2.2 Order Placement Example

Uses the officially maintained `binance-connector` (`pip install binance-connector`). Teaching example only; live-trading risk is yours:

```python
import os
from binance.spot import Spot

client = Spot(
    api_key=os.environ["BINANCE_API_KEY"],
    api_secret=os.environ["BINANCE_API_SECRET"],
)

# Query spot account (key needs read permission)
acct = client.account()
usdt = [b for b in acct["balances"] if b["asset"] == "USDT"][0]
print("available USDT:", usdt["free"])

# Check symbol filters before ordering (min quantity, step size) — skipping this always bites
info = client.exchange_info(symbol="BTCUSDT")
print(info["symbols"][0]["filters"])

# Market buy (example quantity; validate against filters in live use)
order = client.new_order(
    symbol="BTCUSDT",
    side="BUY",
    type="MARKET",
    quantity="0.001",
)
print("order id:", order["orderId"])
```

### 2.3 Rate Limits and Weights

- Trading endpoints bill by weight; exhausting it returns 429/418. After being limited you must retry with **exponential backoff** (wait 1s→5s→30s→120s);
- Order requests need **idempotency protection**: generate a unique `newClientOrderId` locally and reuse it on retries so network jitter can't duplicate orders;
- Reconcile local positions against the exchange account hourly — any difference is a missed or duplicated order signal.

### 2.4 WebSocket Market Data

Use WebSocket instead of polling REST for real-time data (saves weight, lower latency). Teaching example only:

```python
import json
import time
import websocket

def on_message(ws, message):
    data = json.loads(message)
    k = data.get("k")
    if k and k["x"]:                       # k["x"]=True means this candle closed
        print("candle closed:", k["s"], k["t"], "close =", k["c"])

def on_open(ws):
    ws.send(json.dumps({
        "method": "SUBSCRIBE",
        "params": ["btcusdt@kline_1m"],
        "id": 1,
    }))

def on_close(ws, *args):
    print("connection lost, reconnecting in 3s")
    time.sleep(3)
    ws.run_forever()

ws = websocket.WebSocketApp(
    "wss://stream.binance.com:9443/ws",    # per official docs
    on_message=on_message, on_open=on_open, on_close=on_close,
)
ws.run_forever()
```

::: warning ⚠️ Reconnecting the Right Way
The above is the simplest demo. Production scripts should loop with exponential backoff plus heartbeat checks (no messages for N seconds → treat as dead, reconnect proactively), and after reconnecting **<mark>pull a REST snapshot to fill any gap</mark>** — otherwise missing candles corrupt signals.
:::

### 2.5 Running on a Server: VPS Deployment and Logs

A resident environment for personal automation means a VPS. Key points:

| Item | Advice |
|---|---|
| OS | Ubuntu LTS; low spec (2C2G) suffices for daily-bar strategies |
| Deployment | Code on server + managed by `systemd` (`Restart=always`); no bare nohup |
| Logging | All logs to `logs/`, rotated daily; fills, errors, anomalies each in their own stream |
| Monitoring | Heartbeat reporting (failure pushes Telegram/DingTalk alerts) — see Section 5 |
| Time zone | Server stays UTC; convert inside scripts; never trust server-local time |
| Keys | Keys in `~/.env` (mode 600), injected via systemd `EnvironmentFile`; never in code |

---

## 3. China A-Share Automation Reality: Facts and Risks

For individuals, the reality of A-share automation is that **the interface is closed**:

1. Broker standard trading channels offer no APIs to individuals; a few brokers have "programmatic trading" channels aimed at institutions and qualified investors, with registration required;
2. "Bolt-on" hacks (simulated clicks, memory injection, packet replay) generally violate broker agreements, carry ban and compliance risks, and some acts may violate securities law prohibitions — **do not attempt by any means**;
3. Programmatic trading regulation since 2023 has further squeezed unregistered automation;
4. The compliant path: quant trading requires registration (latest regulations govern) and individual barriers are high → in practice most individuals start with "signals + manual execution".

::: tip 💡 Verdict
For A-share personal automation, set expectations at "**<mark>semi-automatic</mark>**" — machines handle research, computation, and alerts; humans execute. Compliant, and it sidesteps the interface black hole.
:::

---

## 4. The Semi-Automatic Route: Signal Alerts + Manual Execution

Signal push is the highest value-per-effort form of personal quant: the strategy computes entries/exits, pushes conclusions to your phone, and you confirm and place orders manually. Teaching example only; live-trading risk is yours.

### 4.1 Telegram Bot Push

```python
import requests

def send_telegram(text: str, bot_token: str, chat_id: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)

# Example: push today's signal at 15:05 daily
send_telegram("BTC daily: broke above 20-day MA, suggest buying 0.01 BTC (manual confirmation required)",
              bot_token="your_bot_token", chat_id="your_chat_id")
```

### 4.2 DingTalk Group Bot Push

```python
import base64
import hashlib
import hmac
import time
import urllib.parse
import requests

def send_ding(text: str, webhook: str, secret: str):
    ts = str(round(time.time() * 1000))
    sign = urllib.parse.quote_plus(base64.b64encode(
        hmac.new(secret.encode(), f"{ts}\n{secret}".encode(), hashlib.sha256
        ).digest()))
    url = f"{webhook}&timestamp={ts}&sign={sign}"   # signing scheme per DingTalk official docs
    requests.post(url, json={"msgtype": "text", "text": {"content": text}}, timeout=10)
```

- Every push must carry **context**: instrument, direction, suggested size, trigger time, strategy name — an alert you can't decode at 3 a.m. is no alert;
- Never "mindlessly follow" any signal: pushes assist; decisions belong to humans.

---

## 5. Live Trading Checklist

| Item | Concrete Practice |
|---|---|
| Start small | Fund live trading only with money whose total loss wouldn't affect your life; add capital only after 3+ months of stability |
| Monitoring & alerts | Push on crashes, abnormal signals, failed orders, equity <mark>drawdowns</mark> beyond threshold; "unattended" presumes "alerted" |
| Two-factor protection | Human double-confirmation for critical actions (flatten, withdraw); hard-code position caps and daily loss limits where strategies cannot override them |
| Key security | Keys only in env vars / mode-600 files; **IP whitelist on, withdrawal off**; real incident pattern: leaked keys circulating in quant groups get swept by scripts within minutes — bots scan public `git` repos for secrets routinely — treat any key that ever touched git history as leaked and revoke/recreate immediately |
| Reconciliation | Daily script compares local vs exchange positions; differences alarm |
| Data source redundancy | At least two independent market data feeds; fail over from A to B — never trade on bad data |

---

::: danger 💀 Automating a Losing Strategy Loses Faster and More Evenly
**Automation solves execution discipline, not strategy validity — a losing strategy automated just loses faster and more evenly.** The correct value order: strategy works (hardest part) → execution reliable (engineering challenge) → automation (icing). Never reverse it.
:::

## 6. "Automation ≠ Automatic Money"

Last point, and the most important:

- Automation solves **<mark>execution discipline</mark>**, not **<mark>strategy validity</mark>** — losing strategies automated lose faster and more evenly;
- Backtest-to-live degradation is normal: <mark>slippage</mark>, rate limits, disconnects, API changes, and platform rule changes all eat backtest profits;
- The true value order: **strategy works (hardest) → execution reliable (engineering) → automation (bonus)**. Never reverse it.
- Crypto spot trades 7×24 with automatic execution — meaning the system takes risk for you while you're away. Ask yourself first: if this code ran for a week without any intervention from me, could I sleep?

---

## 7. Next Step

Before automating, confirm your strategy pool is deep enough. Read [05-Strategy Coding in Practice](strategy-coding.md) for five complete examples and their applicable boundaries, then plan your own research roadmap.

---

::: warning ⚠️ Risk Warning
Live automation combines real money with machine execution, scaling every risk proportionally: leaked keys, duplicate orders, corrupted state after reconnects, bad market data feeds, platform risk-control/terms changes, failed orders in extreme markets — any link can cause losses. China A-share programmatic trading carries registration and monitoring requirements; crypto and offshore markets involve regional compliance issues, and **all compliance details are governed by the latest regulations and platform terms**. All code and schemes here are for learning and research only and do not constitute investment advice; before any automation goes live, complete long-cycle small-capital validation, key security hardening, and manual-intervention contingency plans.
:::
