---
title: "05 · Secure Storage & Wallet Management"
description: "A complete guide to storing crypto assets safely — hot wallets, cold wallets, and hardware wallets compared; seed phrase management; exchange risk assessment; multi-sig schemes; and an anti-theft anti-loss checklist"
---

# 05 · Secure Storage & Wallet Management

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

### 2.3 From Unboxing to Self-Custody: The Full Hardware-Wallet Procedure

The first time you move serious money onto a hardware wallet, what kills you is rarely a hack — it is **skipping steps yourself**. Five steps, none optional:

1. **Buy from the official channel only**: use the vendor's own store or an authorized reseller — **never second-hand, never a "cheaper" third-party listing**. A tampered device ships with a seed phrase the attacker already knows; your assets belong to someone else from day one;
2. **Inspect the seals**: check the packaging seal and device shell. Reputable vendors use tamper-evident packaging and firmware self-checks; **a printed seed phrase card inside the box = 100% fake** — no real vendor ever generates your seed for you;
3. **Initialize on the device**: generate the seed **on the device itself** (never "import an existing seed"), write it down **offline** onto steel or paper;
4. **Verify the backup with a small amount**: transfer only an amount you can afford to lose (say 50 USDT equivalent), then **deliberately factory-reset the device → restore from your written seed → confirm the addresses and balances match**. Until this test passes, your backup is not a backup;
5. **Then move the real amount in**, and store backups in separate locations (see §3).

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

### 4.4 Withdrawing to Self-Custody: Four Common Failure Points

Once you decide to withdraw, mistakes concentrate in the transfer itself:

- **Pick the right network**: the same asset often exists on several chains (USDT on Omni/ERC-20/TRC-20, etc.). **Choose only a network the receiving end supports** — funds sent over an unsupported network are usually unrecoverable (recovery requires manual exchange intervention, with luck as the cost);
- **Memo/tag**: some chains (XRP/ATOM between exchanges) require a memo — omit it and the funds arrive but cannot be attributed, forcing a manual recovery process;
- **Small test first**: before a large withdrawal, send the minimum amount, confirm it arrives at the right address, then send the rest — those few minutes of fees are the cheapest insurance available;
- **Verify the address**: check the first 6 and last 6 characters of the full address (see the §7 checklist), and beware clipboard-hijacking malware that swaps the address you copied for the attacker's — **the address on the hardware wallet's screen outranks the address on your monitor**.

---

## 5. Token Approvals and On-Chain Scams

### 5.1 Token Approvals: DeFi's Invisible Backdoor

On EVM chains (Ethereum, L2s, BNB Chain, etc.), "approval" is unavoidable when interacting with a dApp: **you are asking your wallet to let a contract spend tokens from your wallet**. The key facts:

- What you approve is **the ERC-20 token itself**, not your private key — once approved, the contract can move that token within the granted limit **without any further confirmation**;
- The most dangerous signature is an **unlimited approval**: the price of saving one gas fee is "this contract can spend as much as it wants" until you revoke;
- **Revoke approvals you no longer use**: connect your wallet to a tool like revoke.cash to see every historical approval and its allowance, and revoke item by item (each revocation is an on-chain transaction costing a little gas);
- Deciding whether to approve: stick to battle-tested mainstream protocols; read what you sign — **"SET APPROVAL FOR ALL" (all NFTs) and "unlimited" are default-refuse signals**.

### 5.2 Three On-Chain Scams: Your Address Doesn't Expire, the Trap Waits for Your Mistake

| Scam | How it works | Defense |
|---|---|---|
| **Address poisoning** | The attacker sends a zero-value transfer from an address matching your usual counterparty on the first/last characters but differing in the middle, polluting your transaction history — later you copy the fake address from that history | Keep an address book verified through official channels; verify first-6/last-6 characters; use exchange whitelists |
| **Dust attack** | Many tiny transfers from unknown addresses, luring you to trace them, click the attached phishing link, or interact with the token | Ignore, don't interact, don't scan links; never try to "sell" an unknown token from your wallet (that step is the malicious contract's approval trap) |
| **Fake token** | An airdropped token with the same name and icon as your real holdings (fake USDT) creating an illusion of windfall gains, inducing you to approve and sell | Verify the contract address against the official site and block explorers; treat any "money that appears out of nowhere" as a scam first |

::: danger ⚠️ One-Line Anti-Scam Rule
There is no "free money" on-chain — only traps waiting for your signature. **Don't interact with what you don't recognize, don't sign what you don't understand, don't transfer to what you haven't verified.**
:::

---

## 6. Advanced Security: Multi-Sig and Social Recovery

### 6.1 Multi-Signature (Multi-Sig)

Moving funds requires N of M private keys (e.g. 2/3, 3/5). Any single stolen key cannot move assets on its own.

```text
2/3 multi-sig example:
Key A (carried daily)
Key B (home safe)
Key C (held by a trusted family member/lawyer)

A transfer requires any 2 keys to sign together
Lose any 1 key, and the remaining 2 still recover the funds
```

### 6.2 Social Recovery

No traditional private key; instead you designate multiple "guardians". If access is lost, a majority of guardians vote to restore it. Suited to users who do not want to manage keys.

---

## 7. Anti-Theft, Anti-Loss Checklist

Run through this before every asset operation:

- [ ] Have I confirmed the first 6 and last 6 characters of the receiving address?
- [ ] Is this website's URL correct? (check spelling, HTTPS)
- [ ] Is this signature request reasonable? (does it ask for unlimited approval?)
- [ ] Has my seed phrase ever appeared on any internet-connected device?
- [ ] Are my large assets on a hardware wallet?
- [ ] Do I have at least two physically separated seed phrase backups?
- [ ] Do I periodically clean up unused contract approvals with an allowance checker?
- [ ] Before a large withdrawal, have I walked the full flow on that network with a small amount?

::: tip 💡 One iron rule
Anyone (including people claiming to be exchange support, the police, or a project team) asking for your seed phrase, or asking you to click a link and enter it — **is 100% a scammer**. No exceptions.
:::

::: warning ⚠️ Risk Warning
All content in this article is for learning and research only and does not constitute investment advice. Cryptocurrency trading carries high risk; safeguard your private keys and seed phrases carefully — any loss is unrecoverable.
:::
