---
title: "US and Global Regulation"
description: "A regulatory map of major global markets, covering the US two-tier system, the licensing logic of Hong Kong, Singapore, and the EU, and the choice of offshore domiciles."
---

# US and Global Regulation

> If you trade US stocks, offshore futures, HK/US equities, or forex, you face an entirely different rulebook. US regulation is "two-tier": federal agencies set the floor while self-regulatory organizations manage day-to-day conduct — and Hong Kong, Singapore, and the EU each have their own licensing logic. This article lays out a regulatory map of major markets, then answers one soul-searching question: **why do crypto exchanges and forex platforms all love to register on offshore islands?**

::: warning ⚠️ Risk Warning
This article is an objective compilation of public knowledge, for study and research only, and **does not constitute legal advice**. National regulations, license types, and enforcement practices change continuously — **all specifics are subject to the latest regulations**. Cross-border trading involves foreign exchange and tax issues; consult professionals.
:::


---

## 1. The US Two-Tier Regulatory System

### 1.1 Three Layers: Federal + Self-Regulatory + State

| Tier | Institution | Regulates |
|---|---|---|
| Federal (commodities) | **<mark>CFTC</mark>** (Commodity Futures Trading Commission) | Commodity futures, options, derivatives, retail forex (**<mark>leverage</mark>**), some crypto derivatives |
| Federal (securities) | **<mark>SEC</mark>** (US Securities and Exchange Commission) | Securities issuance and trading, listed-company disclosure, broker-dealers and investment advisers, funds |
| Self-regulatory | **FINRA** (Financial Industry Regulatory Authority) | Broker-dealer registration and daily conduct oversight, exams (Series 7 etc.), dispute arbitration |
| State | State securities regulators | In-state securities registration and anti-fraud, parallel to federal oversight |

**The division in one sentence**: **securities go to the SEC, futures to the CFTC, over-the-counter retail brokerage to FINRA — and who regulates crypto is still contested** (see [crypto-regulation.md](crypto-regulation.md)).

### 1.2 Why Chinese Investors Keep Hearing About Different "Regulators"

| What You Trade | Corresponding US Regulator |
|---|---|
| US stocks, ETFs, listed options | SEC + FINRA + exchanges |
| US futures (CME, CBOE, etc.) | CFTC + NFA |
| Retail forex (leveraged **<mark>margin</mark>**) | CFTC + NFA (non-US clients additionally governed by home-country rules) |
| Crypto spot | Unsettled: the contest between the SEC (if a security) and CFTC (if a commodity) |

---

## 2. Key SEC Legislation

### 2.1 Two Foundational Laws

| Law | Regulates |
|---|---|
| **Securities Act of 1933** | Securities **issuance**: any public offering must register or qualify for an exemption; information disclosure is the core |
| **Securities Exchange Act of 1934** | Securities **trading**: source of SEC enforcement power; governs ongoing disclosure, <mark>insider trading</mark>, manipulation, broker-dealer registration |

Common-sense points:

- "Registration" is not merit review — the 1933 Act demands **full disclosure**, not approval of good or bad; fundamentally different from the approval-based logic of A-shares in earlier eras.
- **Insider trading enforcement** under the 1934 Act is the signature move of US regulation: the SEC brings civil suits (disgorgement + injunctions), while the DOJ can bring criminal charges.

### 2.2 Dodd-Frank Act Essentials (2010, common-sense summary)

| Point | Content |
|---|---|
| Financial stability oversight | Created the Financial Stability Oversight Council to identify systemically important institutions |
| Volcker Rule | Restricts banks from proprietary trading (speculating with their own money) and from investing in **<mark>hedge</mark>** funds / private equity |
| Derivatives reform | OTC derivatives (swaps etc.) moved into central clearing; CFTC's remit expanded |
| Consumer protection | Created the Consumer Financial Protection Bureau (CFPB) |
| Whistleblower rewards | Whistleblower program: monetary awards for major violation tips to the SEC |

**Why it matters**: Dodd-Frank was the direct legislative response to the 2008 financial crisis and became the global template of the "subprime crisis → regulatory tightening" chain — subsequent regulatory reforms in the EU and China share this lineage.

### 2.3 Reg BI (Regulation Best Interest, effective 2019)

- Broker-dealers recommending transactions to retail customers must act **in the customer's best interest**, not prioritize their own commission incentives.
- The companion CRS (Customer Relationship Summary) requires brokers to give retail clients concise disclosures: brokerage or advisory relationship, conflicts of interest.
- **Parallel to China's dual recording / suitability**: the US addresses the same problem with "conflict-of-interest disclosure + standards of conduct" — sellers owe care; buyers bear outcomes.

---

## 3. The CFTC and Futures Markets

### 3.1 What the CFTC Regulates

| Object | Notes |
|---|---|
| Commodity futures and options | Exchange-traded products at CME, ICE, CBOE |
| OTC derivatives | Clearing and reporting regimes for swaps (post-Dodd-Frank) |
| Retail forex | Brokerage supervision for leveraged (margined) FX trading |
| Crypto derivatives | Bitcoin/Ethereum futures etc. (has clashed with the SEC over classification of certain products) |

### 3.2 NFA (National Futures Association) Membership

- The NFA is the **futures industry's self-regulatory organization**, authorized by the CFTC — functionally FINRA's counterpart for futures.
- Futures commission merchants (FCMs), retail foreign exchange dealers (RFEDs), introducing brokers (IBs), floor brokers/traders and others **must be NFA members**.
- The NFA handles registration review, compliance exams, and **arbitration and reparations mechanisms** (customer complaints against members).

::: tip 💡 Practical value for retail traders: the hard channel to verify offshore platforms
To check a forex/futures platform's compliance, search the firm name in the **NFA's BASIC database (www.nfa.futures.org)** and look for membership status and disciplinary records — one of the hardest public channels for verifying whether an "offshore platform" is legit.
:::

### 3.3 Retail Forex Regulation Basics

- The US retail forex <mark>leverage cap</mark> is **50:1** (major pairs; lower for some products) — a hard limit set by the CFTC for retail customers.
- Platforms offering far higher leverage without NFA membership are almost certainly **not regulated in the US** (likely offshore licenses — see "regulatory **<mark>arbitrage</mark>**" below).

---

## 4. Hong Kong: The SFC Licensing System

### 4.1 The SFC and Type 1–13 Licenses

Hong Kong operates a **<mark>license-based regime</mark>**: any regulated activity (dealing in securities, dealing in futures contracts, asset management, etc.) requires the corresponding SFC license. A brief table of the 13 regulated activities:

| License | Regulated Activity |
|---|---|
| Type 1 | Dealing in securities |
| Type 2 | Dealing in futures contracts |
| Type 3 | Leveraged foreign exchange trading |
| Type 4 | Advising on securities |
| Type 5 | Advising on futures contracts |
| Type 6 | Advising on corporate finance (investment banking sponsorship) |
| Type 7 | Providing automated trading services (ATS) |
| Type 8 | Securities margin financing |
| Type 9 | Asset management |
| Type 10 | Providing credit rating services |
| Types 11–13 | Other niche activities (OTC derivatives trading/clearing, alternative assets, etc.) |

**Common-sense reading**: a broker holding Type 1+4+9 licenses (trading + advisory + asset management) is standard; a legitimate HK/US stock broker serving retail investors generally holds at least a Type 1. Licenses can be checked in the **SFC's Public Register of Licensed Persons and Registered Institutions**.

### 4.2 Stock Connect and Mutual Market Access

- **Mutual market access**: Shanghai–Hong Kong Stock Connect, Shenzhen–Hong Kong Stock Connect, Bond Connect — two-way investment channels between mainland and Hong Kong markets.
- Mainland investors buying HK stocks via Stock Connect **neither need nor are allowed to open separate accounts with Hong Kong brokers**; funds circulate within the domestic account system under cross-border supervisory agreements.
- Opening HK/US accounts directly with internet brokers (the so-called "HK Stock Express") is another compliant path (requires your own overseas bank card), but **unlicensed account-opening agents in the mainland violate regulations** — detailed in [compliance-taxes.md](../pitfalls/compliance-taxes.md) in [Chapter 08 · Pitfalls](../pitfalls/).

---

## 5. Singapore: The MAS Framework

| Dimension | Content |
|---|---|
| Regulator | Monetary Authority of Singapore (MAS), which doubles as the central bank (central banking + financial regulation integrated) |
| Securities/Futures | Licensing under the Securities and Futures Act (SFA): Capital Markets Services License (CMSL) |
| Retail forex | MAS regulates leveraged FX dealers; leverage caps have tightened in recent years (subject to the latest regulations) |
| Crypto payments | Crypto licensing under the Payment Services Act (PSA) — see [crypto-regulation.md](crypto-regulation.md) |
| Character | Institutional-friendly, high policy certainty, strict enforcement — positioned as "Asia's compliance hub" |

---

## 6. The EU: MiFID II Essentials

| Point | Content |
|---|---|
| Full name | Markets in Financial Instruments Directive II (implemented 2018) |
| License passporting | Licensed institutions in any member state can operate EU-wide via "passporting" |
| Client categorization | Three tiers: retail, professional, eligible counterparty — protection decreases stepwise |
| Cost disclosure | Mandatory disclosure of all transaction costs and fees; hidden kickbacks banned |
| Product governance | Suitability requirements across product manufacturing and distribution (same logic as China's dual recording) |
| High-frequency trading | Reporting, monitoring, and rate-limit requirements for algorithmic/HFT (echoes [algo-trading-compliance.md](algo-trading-compliance.md)) |

**Key takeaway**: MiFID II set the global benchmark for cost transparency in investor protection — "what's hidden inside your trading commission" must be laid on the table in the EU.

---

## 7. Regulatory Arbitrage: Why Exchanges Choose Offshore Islands

### 7.1 What Regulatory Arbitrage Is

The same financial business faces different costs across jurisdictions (licensing thresholds, capital requirements, disclosure obligations, leverage limits, tax rates). **Choosing to incorporate where regulation is loosest and costs lowest is <mark>regulatory arbitrage</mark>**.

### 7.2 Common Offshore Choices and Motives

| Domicile | Common Vehicles | Arbitrage Motive |
|---|---|---|
| British Virgin Islands (BVI), Cayman | Funds, SPVs, crypto exchanges | Low taxes, no capital gains tax, confidentiality |
| Seychelles, Malta, Dubai | Forex platforms, crypto exchanges | Low licensing barriers, fast approval |
| Gibraltar, Bermuda | Insurance/reinsurance, exchanges | Special regulatory frameworks + tax benefits |
| Delaware, USA | Corporate entities | Flexible state law (corporate governance), not really regulatory arbitrage |

### 7.3 Warnings for Traders

| Claim | What It Really Means |
|---|---|
| Platform claims to be "regulated by Seychelles/St. Vincent" | Such licenses are mostly registration permits rather than substantive regulation; protection is extremely weak |
| "Regulated by UK FCA" | Verify whether it's a **UK domestic license** or merely an "EEA branch" or "restricted license" — borderline marketing is common |
| Offshore entity + marketing to mainland users | Double compliance problem: neither local substantive regulation nor a license where services are offered (see [crypto-regulation.md](crypto-regulation.md)) |

::: warning ⚠️ Common Sense: a license is worth exactly as much as its issuer's enforcement capability
A license's value equals **the enforcement will and capacity of the regulator that issued it**. A Cayman license and a Hong Kong Type 1 license carry entirely different weight — the former proves identity, the latter constrains behavior. **Judge a license by who issued it and its enforcement record, not how pretty it looks.** An offshore island's "regulation" usually means: when things go wrong, there is no one to hold accountable.
:::

::: warning 🛑 An Offshore License Is Identity Proof, Not Regulation
**Judge a license by who issued it and its enforcement record, not how pretty it looks.** A Cayman license and a Hong Kong Type 1 carry entirely different weight — the former proves identity, the latter constrains behavior; an offshore island's "regulation" usually means nobody pays you back when things go wrong.
:::

---

## 8. Global Regulatory Quick Reference

| Market | Securities | Futures/Derivatives | Broker Self-Regulation | Retail Investor Protection |
|---|---|---|---|---|
| United States | SEC | CFTC | FINRA (securities) / NFA (futures) | Reg BI, SIPC coverage (securities accounts) |
| Hong Kong | SFC | SFC (futures licensing) | HKEX/SFC | Investor Compensation Fund |
| Singapore | MAS | MAS | SGX | — |
| EU | ESMA + national authorities | ESMA + national authorities | National competent authorities | MiFID II suitability & disclosure |
| UK | FCA (independent post-Brexit) | FCA | FCA | FSCS compensation scheme |

---

## Further Reading

- Crypto assets' special place in global regulation: [crypto-regulation.md](crypto-regulation.md)
- License types, requirements, and verification methods: [licensing-access.md](licensing-access.md)
- Trading rules for US/HK stocks themselves: [hk-us-stocks.md](../stocks/hk-us-stocks.md) in [Chapter 04 · Stocks](../stocks/)
- Spotting fake forex platform regulation (scam-platform tactics): [scam-detection.md](../pitfalls/scam-detection.md) in [Chapter 08 · Pitfalls](../pitfalls/)
