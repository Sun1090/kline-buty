---
title: "Secure Storage & Wallet Management"
description: "A complete guide to storing crypto assets safely — hot wallets, cold wallets, and hardware wallets compared; seed phrase management; exchange risk assessment; multi-sig schemes; and an anti-theft anti-loss checklist"
---

# Secure Storage & Wallet Management

> "Not your keys, not your coins." Cryptocurrency's decentralized nature shifts the responsibility for security from banks onto you. One leaked seed phrase, one phishing signature, one exchange blow-up can each take you to zero. This article is about **how not to lose your coins**.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. The Nature of a Wallet: A Key, Not a Safe

::: info 📖 A wallet ≠ a piggy bank
A crypto wallet does not store the coins themselves — coins always live on the blockchain. What a wallet stores is the **private key**: a cryptographic credential proving you own the on-chain assets. Whoever holds the private key controls the assets.
:::

### Private Key → Seed Phrase → Address

```text
Private key (a 64-character hex string)
  ↓ converted per the BIP39 standard
Seed phrase (12 or 24 English words)
  ↓ elliptic curve derivation
Public key → address (the "account number" you give others for payment)

Seed phrase = a human-readable backup of the private key
Losing the seed phrase = permanently losing access to the assets
```

---

## 2. Wallet Types Compared

| Type | Private key storage | Online | Security | Use case |
|---|---|---|---|---|
| Exchange custody | Held by the platform | Yes | Depends on the platform | Small trades, beginners |
| Hot wallet (software) | On the phone/computer locally | **<mark>Yes</mark>** | Medium (hackable) | Everyday small operations |
| Browser extension | Inside the browser | Yes | Medium-low | DeFi interaction |
| Hardware wallet | On an offline chip | **No** | **High** | Large long-term holdings |
| Paper wallet | Handwritten/printed on paper | No | High (vulnerable to physical damage) | Extreme offline backup |

![The security boundary between hot wallets and cold wallets](_assets/wallet-types.svg)

### 2.1 Hot Wallets

Mobile apps (e.g. Trust Wallet, Rainbow) or browser extensions (e.g. MetaMask). Convenient but exposed to the network:

- Malware can read the address in your clipboard
- Phishing sites trick you into signing malicious transactions
- Phone lost without a passcode → drained instantly

::: warning ⚠️ Keep only "pocket money" in a hot wallet
The amount held in a hot wallet should stay within what you can accept losing entirely (say, hundreds to a few thousand CNY). Large assets must sit on a hardware wallet.
:::

### 2.2 Cold Wallets / Hardware Wallets

Private key generation, storage, and signing all happen on an offline chip that never touches the internet. Representative products: Ledger, Trezor, KeepKey.

- **Signing process**: the transaction is built on the computer/phone → sent to the hardware wallet → the hardware wallet's screen shows the transaction details → you physically press a button to confirm → the signature is sent back and broadcast
- **Even if the computer is infected**: the private key never leaves the hardware device; the attacker sees at most the address and balance

---

## 3. Seed Phrase Management: Backing Up a Lifeline

### 3.1 Core Rules

::: danger ⚠️ The life-or-death line of seed phrase management
1. **Never photograph it** — cloud photo sync equals uploading it to a server
2. **Never screenshot it** — same as above
3. **Never type it into any website/app** (except during wallet initialization)
4. **Never tell anyone** — including people claiming to be customer support
5. **Never transmit it online** — no WeChat, no email, no cloud drives
6. **At least two physical backups** — stored separately, against single points of failure
7. **Fireproof and waterproof** — steel-plate etching > handwritten paper > printed paper
:::

### 3.2 Backup Options

| Option | How | Pros | Cons |
|---|---|---|---|
| Handwritten paper | Write on paper × 2 copies, store apart | Free, simple | Fears fire, water, fading |
| Steel-plate etching | Stainless plate + engraving pen | Fireproof, waterproof, corrosion-proof | Requires tools |
| Multi-location dispersion | Two copies in different cities/safes | Disaster-resistant | High management cost |
| Shamir splits | Split the seed into N shares, any M of them restore | A single leaked share does not compromise security | Needs a supporting wallet |

---

## 4. Exchange Custody Risk

### 4.1 Lessons from History

| Event | Year | Loss |
|---|---|---|
| Mt.Gox hack | 2014 | 850,000 BTC (~450 million USD at the time) |
| FTX misused user funds | 2022 | A shortfall of ~8 billion USD in user assets |
| Celsius froze withdrawals | 2022 | ~4.7 billion USD of user assets locked |

### 4.2 A Risk Assessment Framework

```text
Platform risk = technical risk + operational risk + regulatory risk + moral risk

Technical risk: hacked, smart contract exploits
Operational risk: internal management chaos, misappropriated funds
Regulatory risk: policy changes leading to freezes/shutdowns
Moral risk: founder exit scam, Ponzi schemes
```

### 4.3 Practical Advice

| Fund size | Recommendation |
|---|---|
| < 1,000 CNY equivalent | Fine on an exchange; convenient for trading |
| 1,000–10,000 CNY | Withdraw to a hot wallet after trading |
| 10,000–100,000 CNY | Withdraw to a hardware wallet |
| > 100,000 CNY | Hardware wallet + multi-sig + multi-location backups |

---

## 5. Advanced Security: Multi-Sig and Social Recovery

### 5.1 Multi-Signature (Multi-Sig)

Moving funds requires N of M private keys (e.g. 2/3, 3/5). Any single stolen key cannot move assets on its own.

```text
2/3 multi-sig example:
Key A (carried daily)
Key B (home safe)
Key C (held by a trusted family member/lawyer)

A transfer requires any 2 keys to sign together
Lose any 1 key, and the remaining 2 still recover the funds
```

### 5.2 Social Recovery

No traditional private key; instead you designate multiple "guardians". If access is lost, a majority of guardians vote to restore it. Suited to users who do not want to manage keys.

---

## 6. Anti-Theft, Anti-Loss Checklist

Run through this before every asset operation:

- [ ] Have I confirmed the first 6 and last 6 characters of the receiving address?
- [ ] Is this website's URL correct? (check spelling, HTTPS)
- [ ] Is this signature request reasonable? (does it ask for unlimited approval?)
- [ ] Has my seed phrase ever appeared on any internet-connected device?
- [ ] Are my large assets on a hardware wallet?
- [ ] Do I have at least two physically separated seed phrase backups?

::: tip 💡 One iron rule
Anyone (including people claiming to be exchange support, the police, or a project team) asking for your seed phrase, or asking you to click a link and enter it — **is 100% a scammer**. No exceptions.
:::

::: warning ⚠️ Risk Warning
All content in this article is for learning and research only and does not constitute investment advice. Cryptocurrency trading carries high risk; safeguard your private keys and seed phrases carefully — any loss is unrecoverable.
:::
