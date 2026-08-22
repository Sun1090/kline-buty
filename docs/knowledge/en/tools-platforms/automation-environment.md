---
title: "Runtime & Automation Environment"
description: "From server selection to deployment, operations, and a security baseline — keeping quant scripts running stably and automatically for the long term."
---

# Runtime & Automation Environment

> Your analysis scripts are written; next comes making them **run long-term, stably, and automatically** — and this step hides no fewer pitfalls than strategy itself: wrong server choice, misaligned time zones, leaked keys, lost logs, a crashed program nobody notices at 3 a.m. …
>
> Written for individual quant/automation players: from server selection (which providers, how to solve network problems) to configuration advice (is 2C4G really enough), from deployment & ops (systemd/cron/pm2) to logging, monitoring, time sync, and budget — ending with a security baseline you must memorize.

> **⚠️ Risk Warning**
>
> Every oversight in an automation environment can turn into real monetary loss: **<mark>API key leaks</mark>**, server compromise, time-zone misalignment sending orders at the wrong hour, silent crashes that make you miss your **<mark>stop loss</mark>**. Crypto exchange API use is governed by platform terms and local regulations — confirm compliance yourself when accessing overseas services. Prices and config parameters here are reference values only; defer to each provider's latest pricing. Everything here is for learning and research only and constitutes no investment advice. Markets carry risk; invest with caution.

---

## 1. Choosing a Personal Server

### 1.1 Cloud Server Comparison

| Provider | Positioning | Strengths | Best for |
|---|---|---|---|
| Alibaba Cloud/Tencent Cloud | Leading domestic cloud providers | Fast domestic nodes, easy ICP filing, complete ecosystem | Accessing A-share/futures data, domestic services |
| BandwagonHost and other overseas VPS | Value-priced line providers | Direct optimized routes, cheap | Accessing overseas APIs (crypto exchanges, international data sources) |
| AWS/GCP/Azure international regions | Global giants | Worldwide nodes, ceiling-level stability | Production environments demanding reliability |
| Providers' lightweight servers | Entry level | Low specs at low prices (e.g., 2C2G for a few hundred yuan/year) | Enough for personal daily-bar strategies |

### 1.2 Network Problems Accessing Exchange APIs from Mainland China

- Crypto exchange API domains (Binance/OKX/Bybit etc.) are **unreachable directly or highly unstable** from within mainland China; domestic servers reach foreign APIs through international exits with high latency, jitter, and blocking risk;
- Common solutions (each with trade-offs; assess compliance yourself):
  - **Overseas servers (Hong Kong/Singapore/Tokyo/US West)**: deploy directly on overseas nodes for lowest physical latency — the mainstream choice for individual quants;
  - Proxy/relay: domestic server + proxy to foreign APIs — adds failure points; not recommended for automation;
- Conclusion: **put the server in the region whose market data/API you access** — A-shares → domestic (or mainland-reachable routes), crypto → overseas.

### 1.3 Why Crypto Exchanges Favor Overseas Servers

- Exchanges treat **datacenter IPs more consistently** (cloud IP ranges are rarely collateral-blocked) and offer low latency: Hong Kong/Singapore nodes give good access to Binance, OKX, Bybit and other Asia-centered exchanges;
- Residential or small-datacenter IPs are actually less stable — **any reputable cloud provider's overseas node works**;
- Note: some exchanges restrict service to specific regional IPs; your IP location should also match your account's compliance status — defer to each platform's terms.

---

## 2. Server Sizing: Is 2C4G Enough?

| Scenario | Suggested spec | Notes |
|---|---|---|
| Daily-bar research/scheduled jobs (once after each close) | From 1C2G | Scripts run minutes then exit — nowhere near capacity |
| Minute-level collection + resident **<mark>WebSocket</mark>** | 2C2G–2C4G | Memory goes mostly to quote buffers and logs |
| Backtesting/parameter optimization | Scale up as needed | Big backtests eat CPU and RAM; downscale afterward |
| Multi-instrument tick-level HFT | 4C8G+ | HFT data volumes and latency needs are beyond personal tutorials |

**Conclusion**: **2C4G is entirely sufficient for the vast majority of individual quants.** What actually blows up isn't the spec but:

- Unrotated logs filling the disk (see Section 4);
- Memory leaks never restarted;
- No cleanup policy as data accumulates (historical quote files growing forever).

::: tip 💡 Sizing Principle: Start Small
The sizing principle is **start small, grow as needed** — begin at 1C2G, upgrade when you hit a bottleneck; upgrades are one click on every cloud provider. Save budget for "stability" (see Section 6).
:::

---

## 3. Operating System & Deployment

### 3.1 Basic Linux Commands (Enough-to-Work List)

```bash
# These few cover most needs
ssh user@ip            # log into the server
ls / cd / pwd          # directories
mkdir -p /opt/trader   # create directories
nano / vim file        # edit files
htop / top             # check resource usage
df -h                  # check disk
crontab -e             # scheduled jobs
systemctl status xxx   # check service status
```

### 3.2 Process Management: pm2 vs systemd

| Method | Strengths | Use when |
|---|---|---|
| pm2 | Common in the Node ecosystem; one-command daemonize/restart/log aggregation | Quick starts, varied scripts (supports python too) |
| systemd | System-level service management; boot start, crash restart, unified logs | Recommended for production; built into Ubuntu |

systemd example (`/etc/systemd/system/trader.service`, teaching illustration):

```ini
[Unit]
Description=trader bot
After=network-online.target

[Service]
User=trader
WorkingDirectory=/opt/trader
ExecStart=/usr/bin/python3 /opt/trader/main.py
Restart=always
RestartSec=10
EnvironmentFile=/opt/trader/.env   # secrets live here, never in code

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now trader
journalctl -u trader -f        # follow logs live
```

::: warning ⚠️ Don't Run Bare with nohup
**Don't run bare under `nohup`**: once you disconnect or it crashes, nothing pulls it back up — that's not automation.
:::

### 3.3 cron Scheduled Jobs

- Add daily jobs with `crontab -e`, e.g.: run review at 15:05, incremental fetches at 20:00;
- **cron pitfalls**: its environment differs from your login shell (use absolute paths in scripts, specify Python explicitly); time zones covered in Section 5.

---

## 4. Logs & Monitoring

### 4.1 Log Rotation

- Append-only logs will fill the disk (the most common "program fine, system dead" incident);
- Use `logrotate` daily splits + 7–14 day retention, or `logging.handlers.RotatingFileHandler` inside Python;
- Log levels: **keep trading logs (fills/orders) separate from debug logs** so troubleshooting doesn't cross-contaminate.

### 4.2 Error Alerts: Pushing to Your Phone

Alerts exist so "when things break at night, you get woken up." Common channels and approaches (examples in [15 - Quant Practice - 04](../quant-practice/live-automation.md)):

| Channel | Approach |
|---|---|
| Telegram Bot | Most common overseas; one HTTP request per push; supports Markdown/images |
| DingTalk/WeCom bots | Convenient domestically; implement webhook signing per official docs |
| Email | Fallback channel — higher latency but reliable (inbox alert rules forward to phone push) |

```bash
# Idea example: push to DingTalk when the script errors (keys/webhooks per official docs)
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"text","text":{"content":"Trading script error: check /opt/trader/logs"}}'
```

::: tip 💡 Alerts Need Context
**Alerts need context**: time, instrument, error type, blast radius — waking up to a bare "an error occurred" equals getting no alert at all.
:::

### 4.3 What to Monitor

| Item | Method |
|---|---|
| Process alive | systemd Restart + **<mark>heartbeat reporting</mark> (script periodically sends alive messages; timeout triggers alert) |
| Data freshness | Check latest candle/data update timestamps; alert if stale beyond N minutes |
| Disk/memory | Scheduled script checks `df -h`, `free -m`; alert over thresholds |
| Strategy signals | N consecutive candles without signals, or abnormal signal frequency, warrant human review |

---

## 5. Time Sync: The Time-Zone Traps of Trading Servers

- **<mark>Time zone</mark> rules**: store and run everything on servers in UTC; convert to local time only at the display layer; **scheduled job execution times must be converted into the target exchange's timezone**;
- **<mark>NTP sync</mark>**: keep clocks synced with `timedatectl set-ntp true`; clock drift makes your timestamps disagree with the exchange's (affecting WebSocket heartbeats, rate-limit windows, candle boundaries);
- **Classic incident**: a server set to UTC-8 (US West) running an A-share 15:00 close job actually fires at Beijing time 07:00; or a crypto script splitting daily bars at "server-local midnight" actually cuts at US Eastern boundaries — **candle close times, **<mark>funding rate</mark>** settlement times, delivery times all defer to the exchange's official timezone**;
- Advice: specify timezones explicitly in scripts (Python: `zoneinfo`/`pytz`; never rely on system local time); use `CRON_TZ` for cron.

---

## 6. Budget: What Personal Quant Costs Monthly

| Item | Reference price (per latest quotes) | Notes |
|---|---|---|
| Overseas VPS (2C2G) | ~USD 10–30/month | BandwagonHost/lightweight cloud; mainstay of crypto automation |
| Domestic lightweight server (2C2G) | ~CNY 30–100/month (cheaper with new-user promos) | A-share data scheduled jobs |
| Data sources | CNY 0–100/month | Mostly free interfaces; Tushare points/RiceQuant as needed |
| Alert channels | CNY 0 | Telegram/DingTalk webhooks are free |
| Domain (optional) | ~tens of yuan/year | For reaching admin interfaces |

**Total: a personal quant "starter setup" runs about CNY 50–200/month, fully capable of daily-bar strategies and scheduled research.** Spending order: server > data > everything else; start at 1C2G — don't buy top spec first.

---

## 7. Security Baseline (Must Memorize)

### 7.1 SSH & Firewall

- Disable password login; use **SSH keys** only (`PermitRootLogin no` + `PasswordAuthentication no`);
- Firewall allows only necessary ports (SSH, app ports); default-deny everything else;
- Reference flow: generate a keypair → put the public key in `~/.ssh/authorized_keys` on the server → confirm key login works before turning passwords off.

### 7.2 API Key Isolation

| Rule | Explanation |
|---|---|
| **<mark>Least privilege</mark>** | Enable "trade + read" only; **never enable withdrawal permission**; enable **<mark>IP whitelisting</mark>** wherever available |
| Never in code/disk | Keys go in `.env` (mode 600); systemd injects via `EnvironmentFile` |
| Never in git | Keys that entered git history count as leaked — revoke and reissue immediately |
| Isolated accounts | Automation uses a dedicated sub-account/sub-key, funds separated from your main account |
| Regular rotation | Reissue API keys every 3–6 months |

### 7.3 Common Leak Paths for Exchange API Keys

1. **Code repositories**: committing Key/Secret to GitHub — coin-stealing scripts scan public repos for keys constantly (real cases in [15 - Quant Practice - 04](../quant-practice/live-automation.md));
2. **Chats/cloud drives**: screenshots, documents, group files carrying keys;
3. **Server compromise**: password login enabled, SSH keys chmod 777, weak panel passwords — first thing attackers look for is `.env`;
4. **Third-party tools**: pasting keys into unknown "quant tools/copy-trading software";
5. **Log leakage**: `print(secret)` in code or keys written into log files.

**After a leak**: revoke the key at the exchange immediately (possible via mobile app) → move affected assets → trace the leak path → issue new keys.

::: danger 💀 A Key That Entered Git History Counts as Leaked
**Enable "trade + read" only, never withdrawal permission; any key that entered git history counts as leaked — revoke and reissue immediately.** Coin-stealing scripts scan public repos for keys constantly — replace anything that touched git, chats, or logs.
:::

---

## 8. Next Steps

With the environment ready, deploy your strategy code — code and strategies start at [15 - Quant Practice](../quant-practice/); cross-check system design against the monitoring and security chapters of [Chapter 10 - System Integration](../system-integration/) for gaps.

---

::: warning ⚠️ Risk Warning
A server is automation trading's front line: intrusion, key leakage, timezone errors, silent crashes, full disks, network dropouts — any single failure can cause irreversible losses. Using overseas servers and crypto APIs requires confirming local laws and platform terms yourself; all prices and configs here are reference values deferring to providers' latest pricing. All commands and schemes here are for learning and research only and constitute no investment advice. Before going live, complete security hardening, small-capital validation, and manual-intervention plans. Markets carry risk; invest with caution.
:::
