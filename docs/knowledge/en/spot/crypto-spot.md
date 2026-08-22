---
title: "Crypto Spot Deep Dive"
description: "A crypto spot special — what cryptocurrency is, CEX vs DEX, wallets and seed phrases, funding channels, stablecoin de-pegs, on-chain transfers, and crypto-specific risks"
---

# Crypto Spot Deep Dive

> Crypto spot may look like "the crypto version of spot", but hidden reefs are everywhere: decentralization, private keys, Gas, de-pegs,
> hackers, exit scams… any one of these concepts can wipe out a beginner.
> This article gives you a systematic tour: cryptocurrency itself, exchanges, wallets, funding channels, stablecoins, on-chain transfers, and crypto-specific risks.

---

## 1. What Is Cryptocurrency

**Cryptocurrency** is a digital asset built on cryptography and blockchain technology, issued and accounted for without relying on any central authority (banks, governments).

### Three Key Concepts

| Concept | One-line explanation | Plain analogy |
|---|---|---|
| Blockchain | A public ledger distributed across countless computers worldwide, viewable by anyone, hard to tamper with | An open master ledger where everyone holds a copy |
| Bitcoin (BTC) | The first cryptocurrency, born in 2009, total supply fixed at 21 million — "digital gold" | Digital gold with a fixed total supply |
| Ethereum (ETH) | A smart contract platform born in 2015; beyond transfers it can run programs (DeFi, NFT) | A globally shared "world computer" |

### Typical Characteristics of Crypto Assets

- **Open supply/rules**: issuance and inflation are hard-coded (BTC fixed at 21 million, ETH partially burned).
- **Decentralized**: no company or individual in charge; the network is maintained collectively by miners/validators worldwide.
- **24 hours × 365 days**: no market close, nonstop worldwide.
- **Violent price swings**: ±10% in a day is normal; there are historical records of -50% in a single week.

### Major Coins at a Glance

| Coin | Positioning | Market cap rank (order of magnitude) | Notes |
|---|---|---|---|
| BTC | Store of value / digital gold | #1 | The most stable coin, yet still hugely volatile |
| ETH | Smart contract platform | #2 | Infrastructure for DeFi and NFT |
| USDT/USDC | Stablecoins | Top 3 | Pegged 1:1 to the dollar (see Section 5) |
| SOL/BNB etc. | High-performance public chains | Top 10 | Each with its own ecosystem, higher risk |
| Altcoins | Tokens of all kinds of projects | Extremely volatile | Most eventually go to **<mark>zero</mark>** |

> ⚠️ Risk Warning: the industry is less than 20 years old and regulation is still unsettled. Apart from a tiny handful of assets such as BTC and ETH, the vast majority of coins have no intrinsic cash flow — **the price is determined entirely by supply/demand and sentiment**, and the risk of going to zero is extremely high. Never buy a coin because it is "cheap" — a low unit price does not mean a low valuation.

---

## 2. Centralized Exchange (CEX) vs Decentralized Exchange (DEX)

### The Essence of the Two Models

- **CEX (centralized exchange)**: Binance, OKX, Coinbase, etc. User assets are held in platform custody; trades run on the platform's internal ledger — fast execution, good depth, full customer service.
- **DEX (decentralized exchange)**: Uniswap, PancakeSwap, etc. No custodian; users connect their own wallets and trade via smart contracts (AMM automated market making); assets stay in your own hands the whole time.

### Comparison Table

| Dimension | CEX (Binance/OKX) | DEX (Uniswap etc.) |
|---|---|---|
| Asset custody | Platform custody (platform exit scam = assets gone) | Self-custody (lost private key = assets gone) |
| Account opening | KYC identity check, regional restrictions | Just connect a wallet, no identity required |
| Trade speed | Extremely fast (internal matching) | Limited by on-chain confirmation speed |
| Depth and **<mark>slippage</mark>** | Good depth, small slippage on large orders | Depth depends on pool liquidity, large slippage on large orders |
| Fees | Low (0.02%-0.15%) | On-chain Gas + pool fee of about 0.3% |
| Listing review | Strict, mostly mainstream coins | Anyone can issue a token — a scammer's paradise |
| Feature richness | **<mark>Leverage</mark>**, futures, earn, new listings | Mostly spot swaps |
| Support/remedy | Customer service exists, but claims are painful | No customer service; mistakes are your own loss |

### How to Choose

- **Beginners**: start with a CEX — simple registration, friendly interface, experiment with small amounts.
- **Advanced**: learn DEX, master self-custody, and participate in the on-chain ecosystem (airdrops, early projects).
- **Fund safety principle**: **large funds in a cold wallet, trading funds on a CEX or a little on a DEX — everything in its right place.**

> ⚠️ Risk Warning: anyone can issue a token on a DEX, and the contract code can contain backdoors (minting more tokens, pulling user-approved assets). Before trading any "unfamiliar coin" on a DEX, verify that the contract is open-source and audited and that the project has a real business. **The vast majority of "new coins" you meet on a DEX are scams.**

---

## 3. Wallets: Hot Wallet / Cold Wallet / Seed Phrase

### What Is a Wallet

A wallet is the tool that manages your private keys. **The private key = sole control over your assets.** Whoever holds the private key owns the assets — an exchange balance is merely a debt the platform owes you, while on-chain assets always follow the private key.

### Wallet Categories

| Type | Examples | Characteristics | Use case |
|---|---|---|---|
| Hot wallet (software) | MetaMask, TP Wallet, exchange apps | Private key stored on an internet-connected device; convenient but risky | Everyday small trades |
| Cold wallet (hardware) | Ledger, Trezor, OneKey | Private key stored on an offline chip; most secure | Long-term storage of large holdings |
| Paper/brain wallet | Handwritten seed phrase | Extremely secure in theory but easy to mis-copy or lose | Not recommended; modern cold wallets are more reliable |

### Iron Rules of Seed Phrase Security

The seed phrase (usually 12/24 English words) = a backup of the private key = the only key to your assets. **Lose it and it cannot be recovered; leak it and you are handing over money.**

| Item | ✅ Do | ❌ Never |
|---|---|---|
| Storage | Write it on paper, keep it in a safe, or use a metal seed plate | Photograph it on your phone, screenshot it into a chat app |
| Entry | Type it only into official wallet software | Enter it on websites/customer service/so-called "verification" pages |
| Sharing | You and only you should know it | Tell anyone, send it to any "customer service" |
| Backup | At least 2 copies, stored separately | Keep only one electronic copy |

> ⚠️ Risk Warning: **anyone or any site asking for your seed phrase/private key in the name of "account verification, airdrop claiming, unfreezing" is a scammer.** Officials never need your seed phrase. Once a private key leaks, assets can be moved within seconds, and on-chain transfers are irreversible and unrecoverable.

::: danger 💀 Seed phrase/private key: a leak = assets wiped out
**Anyone or any site asking for your seed phrase/private key in the name of "account verification, airdrop claiming, unfreezing" is a scammer.** Officials never need your seed phrase; once a private key leaks, assets can be moved within seconds, and on-chain transfers are irreversible and unrecoverable.
:::

---

## 4. Funding Channels and Compliance Risks

### Common Fiat Deposit Routes

| Method | How it works | Characteristics | Risk |
|---|---|---|---|
| CEX fiat channel | Buy USDT etc. with a bank card/payment method inside the platform | Fast, credited in seconds | Channel stability depends on platform compliance |
| P2P (OTC) | Post offers to buy/sell; platform holds coins in escrow until payment confirms | Flexible but you may meet scammers and get your card frozen | You may receive funds of unknown origin |
| Offshore bank wire | Deposit/withdraw via an overseas account | Compliant but slow (1-3 days) | Wire fees and FX losses |
| Off-platform private trades | Swap cash or transfer in person | No platform guarantee | **Extremely high risk; the vast majority are scams** |

### Compliance Risk Essentials

- **Funding must go through the platform's official channels**. Private FX exchange = no fund protection + possible money-laundering exposure.
- **Mainland China regulatory status**: virtual-currency-related business activities are deemed illegal financial activity; domestic banks apply risk controls to crypto-related transactions, and bank cards can be frozen — resolution takes months.
- The boundaries of services offered to mainland users by offshore platforms change frequently; accounts can be restricted at any time.
- **Tax**: most countries treat crypto assets as property; gains on disposal must be reported as capital gains tax. See [08-Pitfalls/03-Compliance & Taxes](../pitfalls/compliance-taxes.md).

> ⚠️ Risk Warning: funding is **the step where crypto investing most often goes wrong**. Frozen bank cards, platforms refusing withdrawals, private FX scams — the casebook is endless. There is only one principle: **use only the exchange's official funding channels, keep records of every transfer, and refuse any "low-fee deposit/withdrawal agent" service.**

---

## 5. Stablecoins (USDT / USDC) and De-peg Risk

### What Is a Stablecoin

A stablecoin is a crypto asset whose price is pegged to fiat currency (usually the dollar), used inside the crypto world for pricing, risk-off moves, and transfers; 1 USDT ≈ 1 USD. It is the "money" of the crypto ecosystem, and the vast majority of trading pairs are quoted in it.

### Major Stablecoins Compared

| Stablecoin | Issuer | Backing | Transparency | Degree of centralization |
|---|---|---|---|---|
| USDT | Tether | Claims 100% reserves + short-term treasuries | Audit transparency historically questioned | Centralized |
| USDC | Circle | Compliant + regular audits (partially regulated) | Higher transparency | Centralized |
| DAI | MakerDAO | Over-collateralized by crypto assets | Fully transparent on-chain | Decentralized |
| Algorithmic stablecoins | Various projects | Maintained by algorithms and **<mark>arbitrage</mark>** | Transparent but fragile | Decentralized |

### De-peg Risk

A **de-peg** means the stablecoin's price deviates from 1 dollar. Once it happens, holders can suffer instant heavy losses:

- **The 2022 Terra (LUNA) event**: after the algorithmic stablecoin UST de-pegged, it collapsed all the way — UST went to zero, LUNA plunged 99.99% in a week, dragging the entire market down; hundreds of thousands of people were badly hurt.
- **USDT discount**: during the LUNA crash in May 2022, USDT briefly fell to $0.95, panicking the market.
- **USDC de-peg**: in March 2023, due to the Silicon Valley Bank (SVB) event, USDC fell to $0.87.

### Usage Recommendations

- The "USDT balance" inside an exchange is merely the platform's liability; preferring USDC or an exchange's own stablecoin can reduce single-issuer exposure.
- Do not park all idle long-term funds in stablecoin interest products (CeFi meltdowns are common: FTX, Celsius, etc. — see Section 7).
- For large stablecoin holdings, spread across 2-3 mainstream stablecoins and understand each one's backing logic.

> ⚠️ Risk Warning: stablecoins are not "equivalent to dollars" — they are a credit bet on the issuer. When a crisis hits (issuer blow-up, bank failure, regulatory strike), a stablecoin can lose 10% in a day or go to zero. **The "cash" of the crypto world is not safe; never convert all your assets into stablecoins.**

---

## 6. Basic On-chain Transfer Flow

On-chain transfers (withdrawals/transfers) differ from bank transfers: **no customer service, no error-correction mechanism, wrong address = gone forever.**

### Standard Flow

```text
Initiate a withdrawal on platform A
→ select the correct "network" (chain) — the most important step
→ enter the receiving address (must be an address on the same chain)
→ pay the on-chain fee (Gas)
→ broadcast to the blockchain → packaged and confirmed by miners/validators
→ address B receives the assets
```

### Key Points

| Point | Explanation | Cost of getting it wrong |
|---|---|---|
| Pick the right network | USDT exists on multiple networks: TRC-20 (Tron), ERC-20 (Ethereum), etc. | Wrong network = assets lost outright, unrecoverable |
| Address verification | Check the address character by character; copy only from official sources | Wrong address = funds gone forever |
| Minimum deposit test | Send a 5-10 CNY test before any large transfer | Unfamiliarity with the full pipeline causes large losses |
| Gas fees | At peak times Ethereum Gas can run to tens of dollars | Transaction stuck; fee exceeds the amount |
| Confirmations | 1 confirmation is enough for small amounts; wait for 3-6 on large ones | Transaction re-orged (very rare) |

### On-chain vs In-platform Transfers

| Scenario | Method | Cost |
|---|---|---|
| Binance ↔ OKX (transfer within the same platform) | None; internal ledger | Free, instant |
| Binance → your own wallet | On-chain withdrawal | Gas fee (tens of cents to tens of dollars) |
| Wallet → wallet | On-chain transfer | Gas fee |

> ⚠️ Risk Warning: on-chain transfers are **irreversible and cannot be disputed**. Wrong network, wrong address, or an address swapped by a phishing link (clipboard hijacking) — the assets are gone for good. Always follow: small test → large transfer → confirm arrival immediately afterward.

::: danger 💀 On-chain transfers are irreversible
**On-chain transfers are irreversible and cannot be disputed.** Wrong network, wrong address, or an address swapped by a phishing link (clipboard hijacking) — the assets are gone for good. Always follow: small test → large transfer → confirm arrival immediately afterward.
:::

---

## 7. Crypto-Specific Risks

### 1. Hacks

| Type | Cases | Loss magnitude |
|---|---|---|
| Exchange hacked | Mt.Gox, FTX bankruptcy | Tens of billions of dollars |
| DeFi protocol hacked | Cross-chain bridges, lending protocol exploits | Hundreds of millions per incident |
| Private key leak/phishing | Phishing sites, malicious extensions, fake support | Individual assets wiped out |

- No target is too small: minor exchanges, new protocols, and personal wallets are all fair game.
- **Response**: keep large assets in a cold wallet; never click strange links; download apps only from official stores; double-check before approving any contract.

### 2. Platform Exit Scams / Bankruptcy

- **The FTX event (2022)**: the world's second-largest exchange misappropriated customer assets, went bankrupt overnight, and users could not withdraw tens of billions of dollars.
- Common exit-scam precursors: sudden tightening of withdrawal limits, suspended withdrawals, frequent "system maintenance", executives resigning.
- **Response**: never keep all assets on a single platform; **an exchange balance is not your asset — it is the platform's debt to you**.

### 3. Coins Going to Zero

- Cases of -90% in a day or zero within a week happen every year: Luna, all kinds of altcoins, MEME coins.
- Paths to zero: the team dumping, regulatory bans, ecosystem collapse, **<mark>liquidity</mark>** drying up.
- **Response**: diversify **<mark>positions</mark>**; cap each coin's weight; follow the "double your money, pull the principal out" discipline; never touch coins of unknown origin.

### 4. Other Peculiar Risks

| Risk | Explanation |
|---|---|
| Fake/impersonation coins | Counterfeit contracts with nearly identical names; any transfer solicitation is a scam |
| Contract vulnerabilities | Unaudited smart contracts can mint, freeze, or drain funds |
| Sybil attacks | Airdrops/projects flag batch accounts; rewards canceled |
| Regulatory raids | A country bans crypto overnight; exchanges shut down, withdrawal routes severed |
| Fake trading apps | The top ads in search engines may lead to phishing apps |

::: warning ⚠️ Risk Warning
The crypto market's risk level is not in the same league as other markets — it combines **equities' volatility, forex's 24-hour clock, private equity's illiquidity, and unregulated counterparty risk**. Strictly cap crypto funds as "the portion of total assets you can accept going to zero" (recommended no more than 5%-10%), and follow: do not use an exchange as a bank, do not keep large sums in a hot wallet, and never touch any "benefit" that requires you to pay money to claim.
:::
