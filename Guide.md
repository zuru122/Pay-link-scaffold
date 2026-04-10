# PayLink — Team Build Guide

> This is the single source of truth for the entire project.
> Read it fully before writing a single line of code.
> Every human and every AI agent must follow this guide.

---

## The product

**PayLink** turns every payment into a permanent on-chain receipt.

> "Create a link. Get paid. Keep the proof — forever."

A freelancer creates a payment link in seconds. Anyone opens it, logs in with Google, and pays instantly on Monad. Every payment stores the amount, description, payer address, and timestamp permanently on-chain. The link is just the delivery mechanism. The receipt is the product.

---

## The pitch (memorize this)

**One line:**

> "Stripe invoices for the permissionless web — with on-chain proof of every transaction."

**Why it needs to exist:**

> "Every payment on PayLink becomes a permanent, verifiable receipt on Monad. The freelancer doesn't just get paid — they build an on-chain payment history that belongs to them forever. No Stripe. No bank. No middleman."

**Why Monad:**

> "Because the receipt is confirmed in under a second. On Ethereum you wait minutes. On Monad, the moment the client pays, the proof exists. The speed is the product."

**Why not Coinbase payment links:**

> "Coinbase owns your payment history. Here it lives on-chain — yours forever, queryable by anyone, verifiable without trusting any company."

**Why users come back:**

> "Every freelancer builds an on-chain payment history. After 10 payments, your history page is a verified portfolio of work. That's your reputation — on-chain, permanent, portable."

---

## The team

| Person | Role            | Owns                                            |
| ------ | --------------- | ----------------------------------------------- |
| P1     | Smart Contract  | `/contracts` — Foundry, Solidity, tests, deploy |
| P2     | Frontend Core   | Pages, lib, providers, contract integration     |
| P3     | UX & Components | Components, styles, animations, toast system    |

---

## The stack

| Layer            | Tool                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Next.js 14 (App Router)                                           |
| Styling          | Tailwind CSS + CSS variables                                      |
| Fonts            | Syne (headings), Inter (body), JetBrains Mono (numbers/addresses) |
| Auth & Wallets   | Privy (`@privy-io/react-auth`)                                    |
| Web3             | ethers.js v6                                                      |
| Chain            | Monad Testnet (id: 10143)                                         |
| Contract tooling | Foundry (forge)                                                   |
| Deployment       | Vercel                                                            |

---

## The 4-day plan

| Day       | P1                                                                                  | P2                                                                                       | P3                                                                                   |
| --------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Day 1** | Set up Foundry, write `PaymentLink.sol`, write all 5 tests, `forge test -vv` passes | Scaffold Next.js + Tailwind, set up fonts, wire Privy, Google login works                | Set up `globals.css` with all CSS vars, build `Navbar`, `Button`, `Card`, `Skeleton` |
| **Day 2** | Deploy to Monad Testnet, export ABI, share contract address with P2                 | Build `/` (create link page) and `/pay/[linkId]` (payment page) with real contract calls | Build `PaymentCard`, `ReceiptCard`, `HistoryItem` components                         |
| **Day 3** | Standby for contract fixes, prepare pitch answers                                   | Build `/history` page, wire `utils.ts` helpers everywhere                                | Build `Toast` system, wire toasts on all pages, mobile polish pass                   |
| **Day 4** | Know every pitch answer cold                                                        | End-to-end test full flow, deploy to Vercel                                              | Record backup demo video, final mobile test                                          |

**The one rule:** Nobody moves to the next day until today's output works and is pushed to `main`.

---

## The folder structure

```
paylink/
├── GUIDE.md                          ← you are here
├── .gitignore
├── README.md
│
├── contracts/                        ← P1 owns everything here
│   ├── foundry.toml
│   ├── .env                          ← PRIVATE_KEY (never commit)
│   ├── src/
│   │   └── PaymentLink.sol
│   ├── test/
│   │   └── PaymentLink.t.sol
│   └── script/
│       └── Deploy.s.sol
│
└── frontend/                         ← P2 and P3 share this
    ├── .env.local                    ← Privy + contract address (never commit)
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    │
    ├── app/
    │   ├── layout.tsx                ← P2
    │   ├── page.tsx                  ← P2  (create link)
    │   ├── pay/
    │   │   └── [linkId]/
    │   │       └── page.tsx          ← P2  (payment page)
    │   └── history/
    │       └── page.tsx              ← P2  (history page)
    │
    ├── components/
    │   ├── Navbar.tsx                ← P3
    │   ├── ui/
    │   │   ├── Button.tsx            ← P3
    │   │   ├── Card.tsx              ← P3
    │   │   ├── Skeleton.tsx          ← P3
    │   │   └── Toast.tsx             ← P3
    │   └── payment/
    │       ├── PaymentCard.tsx       ← P3
    │       ├── ReceiptCard.tsx       ← P3
    │       └── HistoryItem.tsx       ← P3
    │
    ├── lib/
    │   ├── wagmi.ts                  ← P2  (chain config)
    │   ├── contract.ts               ← P2  (ABI + address — filled by P1 on Day 2)
    │   └── utils.ts                  ← P2  (shared helpers — everyone imports from here)
    │
    ├── hooks/
    │   ├── usePaymentLink.ts         ← P2  (contract call logic)
    │   └── useToast.ts               ← P3  (global toast state)
    │
    ├── providers/
    │   └── PrivyProvider.tsx         ← P2
    │
    └── styles/
        └── globals.css               ← P3
```

---

## Rules for AI agents

These rules apply to every person and every AI tool (Cursor, Codex, Bolt, v0, etc.). When your AI suggests something that breaks a rule — reject it and correct the prompt.

---

### Rule 1 — One job per session

Never give your AI two things to do at once. One session = one output. If the output is not working, fix it before moving on.

```
BAD:  "Set up Privy and also build the create link page"
GOOD: "Set up Privy. Output: Google login works, wallet address shows in Navbar."
```

---

### Rule 2 — Always give context

Every prompt must state what already exists and what must not be touched.

```
EXAMPLE:
"Privy is already set up in providers/PrivyProvider.tsx.
The Navbar already imports usePrivy. Do not touch those files.
This task only: build app/page.tsx — the create link form."
```

---

### Rule 3 — Design system is locked

All colors, fonts, spacing, and border styles come from `globals.css`. No AI agent may hardcode a color, change a font, or introduce a new visual pattern. If the AI suggests it — reject it.

**CSS variables (locked):**

```css
:root {
  --bg: #0e091c;
  --surface: #160d2e;
  --primary: #6e54ff;
  --highlight: #ddd7fe;
  --border: rgba(110, 84, 255, 0.18);
  --success: #3ddc97;
  --error: #ff5a5a;
  --text: #ffffff;
  --text-muted: rgba(221, 215, 254, 0.55);
  --glow-purple: 0 0 24px rgba(110, 84, 255, 0.35);
  --glow-green: 0 0 24px rgba(61, 220, 151, 0.35);
  --transition: 0.2s ease;
  --radius: 12px;
}
```

**Font rules:**

- Headings → `font-family: 'Syne', sans-serif` · Bold
- Body text → `font-family: 'Inter', sans-serif`
- Numbers, addresses, tx hashes, amounts → `font-family: 'JetBrains Mono', monospace`

**Card rule:**

```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 2rem;
```

**Interactive hover rule:**

```css
box-shadow: var(--glow-purple);
transition: var(--transition);
```

---

### Rule 4 — Never invent contract functions

The ABI is fixed. There are exactly 4 functions. No additions. No modifications. If P2 or P3 needs data the contract doesn't return — talk to P1 before changing anything.

```
createLink(bytes32 linkId, uint256 amount, string description)  — write
pay(bytes32 linkId)                                             — write, payable
getLink(bytes32 linkId)                                         — read, view
getCreatorLinks(address creator)                                — read, view
```

---

### Rule 5 — Read calls never need a wallet

`getLink()` and `getCreatorLinks()` are read calls. They use the public RPC directly. No Privy, no signer, no wallet. Only `createLink()` and `pay()` need a wallet. This must never be confused.

```typescript
// READ — no wallet needed, use public RPC
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
const [creator, amount, description, paid, payer, paidAt] =
  await contract.getLink(linkId);

// WRITE — needs Privy embedded wallet signer
const { wallets } = useWallets(); // from Privy
const ethersProvider = await wallets[0].getEthersProvider();
const signer = await ethersProvider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
await contract.createLink(linkId, parseEther(amount), description);
```

---

### Rule 6 — linkId is always generated the same way

Always use `generateLinkId()` from `lib/utils.ts`. Never let an AI invent a different approach.

```typescript
// lib/utils.ts
export function generateLinkId(creatorAddress: string): string {
  return ethers.solidityPackedKeccak256(
    ["address", "string", "string"],
    [
      creatorAddress,
      Math.random().toString(36).substring(2),
      Date.now().toString(),
    ],
  );
}
```

---

### Rule 7 — Errors show as toasts, never silent

Every error a user might encounter must produce a visible toast notification. No bare `console.error` as the only response.

| Situation                  | Toast type    | Message                     |
| -------------------------- | ------------- | --------------------------- |
| Tx rejected by user        | error         | "Transaction rejected"      |
| Wrong network              | error         | "Switch to Monad Testnet"   |
| RPC timeout / network fail | error         | "Network error. Try again." |
| Link not found             | page message  | "This link doesn't exist."  |
| Link already paid          | receipt state | Show receipt — not an error |
| Link copied                | success       | "Copied!"                   |
| Link created               | success       | "Link created!"             |
| Connecting wallet          | info          | "Connecting wallet..."      |
| Tx pending                 | info          | "Confirm in your wallet..." |

---

### Rule 8 — Payment page shows context before login

When a payer opens `/pay/[linkId]`, the amount, description, and creator address must be visible **before** any login prompt. This is a read call — no wallet needed.

```
CORRECT:
  1. Page loads
  2. getLink(linkId) called → read, no wallet
  3. Amount + description + "From: 0x3f2a...c91d" shown
  4. "Pay with Google" button shown below

WRONG:
  1. Page loads
  2. "Connect wallet" shown immediately
  3. Data loads only after login → user has no idea what they're paying for
```

---

### Rule 9 — Mobile first, always

Every component must work on a 375px wide screen.

- Minimum touch target height: `44px`
- All text inputs: `font-size: 16px` minimum (prevents iOS Safari from zooming)
- Amount display: use `clamp(32px, 8vw, 48px)` for font size
- Test on a real phone before marking any task done

---

### Rule 10 — main is always demo-ready

Work on your own branch. Only merge to `main` when your feature works end to end and has been tested on mobile.

```bash
# Your branch
git checkout -b p1/contract
git checkout -b p2/frontend
git checkout -b p3/components

# Pull main every morning
git pull origin main

# Merge only when done
git checkout main
git merge p2/frontend --no-ff
git push origin main
```

---

## The smart contract

### `src/PaymentLink.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PaymentLink {

    struct Link {
        address payable creator;
        uint256 amount;
        string  description;
        bool    paid;
        address payer;
        uint256 paidAt;
    }

    mapping(bytes32 => Link) public links;
    mapping(address => bytes32[]) public creatorLinks;

    event LinkCreated(bytes32 indexed linkId, address indexed creator, uint256 amount, string description);
    event LinkPaid(bytes32 indexed linkId, address indexed payer, uint256 paidAt);

    error LinkExists();
    error LinkNotFound();
    error AlreadyPaid();
    error WrongAmount();

    function createLink(bytes32 linkId, uint256 amount, string calldata description) external {
        if (links[linkId].creator != address(0)) revert LinkExists();
        links[linkId] = Link(payable(msg.sender), amount, description, false, address(0), 0);
        creatorLinks[msg.sender].push(linkId);
        emit LinkCreated(linkId, msg.sender, amount, description);
    }

    function pay(bytes32 linkId) external payable {
        Link storage link = links[linkId];
        if (link.creator == address(0)) revert LinkNotFound();
        if (link.paid)                  revert AlreadyPaid();
        if (msg.value != link.amount)   revert WrongAmount();
        link.paid   = true;
        link.payer  = msg.sender;
        link.paidAt = block.timestamp;
        link.creator.transfer(msg.value);
        emit LinkPaid(linkId, msg.sender, block.timestamp);
    }

    function getLink(bytes32 linkId) external view returns (
        address creator, uint256 amount, string memory description,
        bool paid, address payer, uint256 paidAt
    ) {
        Link memory l = links[linkId];
        return (l.creator, l.amount, l.description, l.paid, l.payer, l.paidAt);
    }

    function getCreatorLinks(address creator) external view returns (bytes32[] memory) {
        return creatorLinks[creator];
    }
}
```

### Deploy commands

```bash
# From /contracts

# 1. Install forge-std
forge install foundry-rs/forge-std

# 2. Run tests — all 5 must pass before deploying
forge test -vv

# 3. Deploy to Monad Testnet
forge script script/Deploy.s.sol \
  --rpc-url monad_testnet \
  --broadcast \
  --private-key $PRIVATE_KEY \
  -vvvv

# 4. Copy the deployed address → share with P2 for .env.local
```

### `foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"

[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"
```

---

## The contract ABI

P1 exports this on Day 2. P2 places it in `lib/contract.ts`. Never define the ABI anywhere else.

```typescript
// lib/contract.ts
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export const CONTRACT_ABI = [
  "function createLink(bytes32 linkId, uint256 amount, string calldata description) external",
  "function pay(bytes32 linkId) external payable",
  "function getLink(bytes32 linkId) external view returns (address creator, uint256 amount, string memory description, bool paid, address payer, uint256 paidAt)",
  "function getCreatorLinks(address creator) external view returns (bytes32[] memory)",
];
```

---

## Monad Testnet config

Never change these values anywhere in the project.

```typescript
// lib/wagmi.ts
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
};
```

---

## Shared utility file

P2 creates `lib/utils.ts` on Day 1. Everyone imports from here. Never duplicate these functions.

```typescript
// lib/utils.ts
import { ethers } from "ethers";

// Generate linkId before calling createLink()
export function generateLinkId(address: string): string {
  return ethers.solidityPackedKeccak256(
    ["address", "string", "string"],
    [address, Math.random().toString(36).substring(2), Date.now().toString()],
  );
}

// "0x3f2a1c...c91d"
export function truncateAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// "Jan 4, 2025 · 3:42 PM"
export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "2.50 MON"
export function formatMON(wei: bigint): string {
  return `${parseFloat(ethers.formatEther(wei)).toFixed(2)} MON`;
}
```

---

## Privy config

```typescript
// providers/PrivyProvider.tsx
import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "email"],
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

---

## Environment variables

### `contracts/.env`

```bash
PRIVATE_KEY=your_deployer_wallet_private_key
```

### `frontend/.env.local`

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
```

**Who fills what and when:**

| Variable                       | Who               | When                                      |
| ------------------------------ | ----------------- | ----------------------------------------- |
| `PRIVATE_KEY`                  | P1                | Day 1 — deployer wallet only, never share |
| `NEXT_PUBLIC_PRIVY_APP_ID`     | P2                | Day 1 — create app at privy.io            |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | P1 fills, P2 uses | Day 2 — after deployment                  |

**Never commit `.env` or `.env.local` to GitHub.** Both are in `.gitignore`.

---

## External services

| Service           | Purpose                         | API key       | Who       | When          |
| ----------------- | ------------------------------- | ------------- | --------- | ------------- |
| Privy             | Embedded wallets + Google login | Yes           | P2        | Day 1         |
| Monad Testnet RPC | Reads + writes                  | None (public) | Config    | Day 1         |
| Monad Faucet      | Testnet MON tokens              | None          | All 3     | Day 1 morning |
| Monad Explorer    | Tx receipt links                | None          | URL only  | Day 3         |
| Vercel            | Live frontend hosting           | GitHub login  | P2        | Day 3         |
| GitHub            | Code collaboration              | None          | P2        | Day 1         |
| Google Fonts      | Syne, Inter, JetBrains Mono     | None          | next/font | Day 1         |

### Critical: get testnet MON on Day 1

Go to `https://faucet.monad.xyz` and request MON for 3 wallets:

- P1's deployer wallet (for contract deployment gas)
- Alice's demo wallet (freelancer — creates links)
- Bob's demo wallet (payer — pays links)

Faucets can be slow or rate-limited. Do not wait until hackathon day.

---

## Component states — exact specification

### Pay button (4 states — no exceptions)

```
STATE A — not connected
  Label:   "Pay with Google"
  Style:   background: var(--primary) · color: white · font: Syne
  Action:  privy.login()
  Hover:   box-shadow: var(--glow-purple)

STATE B — connected, unpaid
  Label:   "Confirm & Pay 2.50 MON"
  Style:   background: var(--primary) · color: white · font: Syne
  Below:   wallet address · JetBrains Mono · 12px · var(--text-muted)
  Action:  contract.pay(linkId, { value: amount })
  Hover:   box-shadow: var(--glow-purple)

STATE C — tx pending
  Content: CSS spinner only (no text)
  Style:   background: var(--primary) · disabled · cursor: not-allowed
  Action:  none

STATE D — success
  Label:   "Payment Sent"
  Style:   background: var(--success) · box-shadow: var(--glow-green)
  Below:   tx hash (mono, truncated) + Monad Explorer link ↗
  Action:  none
```

### Payment page card layout

```
┌──────────────────────────────────┐
│  PAYMENT REQUEST                 │  ← 12px · uppercase · letter-spacing · muted
│                                  │
│  2.50 MON                        │  ← JetBrains Mono · clamp(36px,8vw,52px) · white
│                                  │     pulse animation on mount (scale 1→1.015→1 once)
│  Logo design for Acme Co.        │  ← Inter · 16px · var(--text-muted)
│                                  │
│  ────────────────────────────    │  ← 1px solid var(--border)
│                                  │
│  From   0x3f2a...c91d            │  ← "From" label + mono address · muted
│  To     you                      │  ← updates to payer address after login
│                                  │
│  ────────────────────────────    │  ← 1px solid var(--border)
│                                  │
│  [ Pay with Google           ]   │  ← STATE A button
└──────────────────────────────────┘
```

### History cards (2 variants)

```
PAID:
  Left border:  3px solid var(--success)  (no border-radius on this side)
  Icon:         SVG checkmark circle · var(--success)
  Description:  Inter · 15px · white
  Amount:       JetBrains Mono · 15px · var(--success)
  Meta:         "Paid by 0xabc...1234 · Jan 4, 2025" · Inter · 13px · muted
  Actions:      "View on Explorer ↗"  |  "Copy Link"
  Hover:        translateY(-2px) · box-shadow: var(--glow-purple) · 0.2s

UNPAID:
  Left border:  3px solid var(--border)
  Icon:         SVG empty circle · var(--border)
  Description:  Inter · 15px · white
  Amount:       JetBrains Mono · 15px · var(--text-muted)
  Meta:         "Awaiting payment" amber badge · "Created Jan 3"
  Actions:      "Copy Link"  |  "Share"
  Hover:        translateY(-2px) · box-shadow: var(--glow-purple) · 0.2s
```

### Receipt success state

```
Card:     border → rgba(61,220,151,0.4) · transition 500ms
          box-shadow: var(--glow-green)

Checkmark: SVG path · stroke-dashoffset 120→0 · duration 600ms · ease
           stroke: var(--success) · stroke-width: 4 · fill: none

Text:     "Payment sent" · Syne · 20px · white
          tx hash · JetBrains Mono · 13px · truncated · links to Explorer
          "Paid on Jan 4, 2025 · 3:42 PM" · Inter · 13px · muted
          "This receipt is permanently stored on Monad." · Inter · 12px · muted
```

---

## The integration

```
User opens app (Vercel)
        ↓
Privy SDK initializes
        ↓
Read call → Monad RPC directly (no wallet, instant)
getLink(linkId) → creator, amount, description, paid, payer, paidAt
        ↓
User sees payment context (amount, description, creator)
        ↓
User clicks "Pay with Google"
        ↓
Privy modal → Google OAuth → embedded wallet created silently
        ↓
User clicks "Confirm & Pay"
        ↓
ethers.js gets signer from Privy wallet
        ↓
contract.pay(linkId, { value: amount }) → signed → sent to Monad RPC
        ↓
Monad confirms in ~1 second
        ↓
Tx hash returned → receipt shown → Monad Explorer link
        ↓
Freelancer opens /history
        ↓
getCreatorLinks(address) → array of linkIds
getLink(linkId) for each → full receipt data
        ↓
History renders: paid (green) + unpaid (muted)
```

**The key distinction:**

- `getLink()` and `getCreatorLinks()` → read → public RPC → no wallet → free → instant
- `createLink()` and `pay()` → write → Privy signer → gas required → ~1 second on Monad

---

## The demo script

Run this on a real phone. Not a laptop simulator. A real phone.

```
SETUP (before demo):
  - Pre-load 5 paid transactions in Alice's history so it looks real
  - Have the /history page open on a second tab
  - Make sure both wallets have testnet MON

DEMO FLOW:

  1. Open paylink.vercel.app on laptop (Alice — the freelancer)
  2. Click "Connect" → log in with Google → address shows in Navbar
  3. Enter: 2.5 · "Logo design for Acme Co."
  4. Click "Create Payment Link" → URL appears
  5. Copy the URL — send to your phone via AirDrop or message

  6. Open link on phone in incognito (Bob — the payer, no wallet)
  7. Point out: "Bob can see exactly what he's paying for — before logging in."
     Page shows: 2.5 MON · "Logo design for Acme Co." · creator address
  8. Click "Pay with Google" → Bob logs in with his Google account
  9. Click "Confirm & Pay 2.50 MON"
  10. ← THIS IS THE MOMENT →
      ~1 second → green glow · checkmark animates · "Payment sent"
      Say: "That confirmation just happened on Monad."
  11. Show tx hash → tap "View on Explorer" → Monad Explorer shows the tx

  12. Switch to laptop → open /history
  13. "Logo design for Acme Co." appears as a green paid receipt with payer + date
  14. Say: "This receipt lives on Monad. Permanently. Nobody can take it away."

TOTAL TIME: under 60 seconds.
```

---

## Day-by-day sync format

Every day, 5 minutes, in this order:

```
P1: "Contract status — [done / deploying / blocked by X]"
P2: "Pages status — [done / in progress / blocked by X]"
P3: "Components status — [done / in progress / blocked by X]"
```

If anyone is blocked, fix the blocker before anything else. The critical path is: P1 deploys → P2 has contract address → P2 wires pages → P3 has pages to wire components into.

---

## Final checklist

```
CONTRACT
[ ] forge test -vv — all 5 tests pass
[ ] payer address stored correctly after pay()
[ ] paidAt timestamp stored correctly after pay()
[ ] getCreatorLinks() returns correct array for a wallet
[ ] Deployed to Monad Testnet
[ ] Contract address shared with P2 and added to frontend .env.local

FRONTEND — AUTH
[ ] NEXT_PUBLIC_PRIVY_APP_ID set in .env.local
[ ] Google login works — wallet address shows in Navbar
[ ] Email login works as a fallback

FRONTEND — CREATE LINK
[ ] Amount + description inputs work
[ ] Disabled when fields empty
[ ] createLink() tx goes through on Monad Testnet
[ ] Shareable URL appears with correct /pay/[linkId] path
[ ] Copy to clipboard works with checkmark feedback
[ ] navigator.share works on mobile

FRONTEND — PAYMENT PAGE
[ ] NEXT_PUBLIC_CONTRACT_ADDRESS set in .env.local
[ ] Open in incognito — context card loads before login prompt
[ ] Amount, description, creator address all visible before login
[ ] "Pay with Google" login works for a fresh Google account
[ ] Payer wallet created silently — no seed phrase shown
[ ] pay() tx goes through with correct value
[ ] Success state: green border, checkmark animation, tx hash, date
[ ] Already-paid link shows as receipt — not an error
[ ] "View on Explorer" links to correct Monad Explorer URL

FRONTEND — HISTORY
[ ] getCreatorLinks() fetches all linkIds for connected wallet
[ ] getLink() fetches details for each linkId
[ ] Paid cards show green border + payer + date + Explorer link
[ ] Unpaid cards show muted border + "Awaiting" badge + copy/share
[ ] Cards sorted: paid first, newest first
[ ] Empty state renders cleanly with "Create a Link" button
[ ] Staggered card animation on load

FRONTEND — POLISH
[ ] Toast system works on all 3 pages
[ ] All inputs have font-size 16px minimum (test on iPhone Safari)
[ ] Full app tested on 375px screen
[ ] Navbar works on mobile — no overflow
[ ] Vercel deployment live with real shareable URL

DEMO
[ ] Pre-loaded 5+ transactions in history for demo
[ ] Full demo flow rehearsed on real phone
[ ] Demo runs under 60 seconds
[ ] Backup demo video recorded
[ ] All 4 pitch answers memorized cold
```

---

_One task at a time. Test before moving on. The demo is everything._
