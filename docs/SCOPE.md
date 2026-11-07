# VoltTrace — Project Scope

## Problem Statement

Electric vehicle batteries are high-value, safety-critical components. Today there is no transparent, tamper-proof way to track a battery pack's lifecycle from the assembly line to recycling. Counterfeit packs, stolen batteries re-entering the supply chain, and missing maintenance records create safety and liability risks for OEMs, vehicle owners, and regulators.

## Proposed Solution

VoltTrace issues each battery pack an ERC-721 NFT on Ethereum that acts as a digital passport. The passport records:

- **Identity** — unique battery ID and IPFS-hosted metadata (manufacturer, chemistry, capacity, model)
- **Lifecycle stage** — Assembled → WithOEM → WithOwner → WithRecycler → Closed
- **Custody chain** — every transfer is an on-chain transaction between role-verified wallets
- **Stolen flag** — a regulator can freeze a pack, blocking all further transfers
- **Documents** — inspection reports, test certificates, and maintenance records stored on IPFS with on-chain hash anchors

## Scope — What Is Included

### Smart Contract (Solidity)
- ERC-721 NFT with URI storage for IPFS metadata
- OpenZeppelin AccessControl with 6 roles (Admin, Assembler, OEM, Owner, Recycler, Regulator)
- 5 lifecycle stages enforced on every transfer
- `flagStolen` — regulator-only action that freezes transfers
- `addDocument` — owner-only, stores `keccak256(cid)` on-chain with IPFS URI
- `closePassport` — recycler-only, marks end of life
- Custom errors for clear revert reasons
- Full Hardhat test suite

### Backend (Python FastAPI)
- REST API: list passports, get passport detail, get documents
- Event indexer: scans blockchain blocks, stores events in SQLite for fast queries
- IPFS proxy: accepts file uploads, pins to Pinata, returns CID and gateway URI
- WebSocket: pushes new events to connected frontends in real time

### Frontend (Next.js + TypeScript)
- Dashboard: lists all passports with stage badges, create-passport form
- Passport detail page: stage progress bar, transfer/flag/close actions, document upload
- MetaMask integration: wallet connect/disconnect, role badge display, transaction signing
- Tailwind CSS styling

## Scope — What Is NOT Included

- Mainnet deployment (Sepolia testnet only)
- Mobile app
- Off-chain identity verification / KYC
- Battery telemetry or IoT sensor integration
- Multi-chain or L2 deployment
- Production-grade key management (users sign with MetaMask; backend holds no keys)
- Token economics or marketplace features

## Users and Roles

| Actor | Role | Actions |
|-------|------|---------|
| Battery factory | ASSEMBLER | Creates passports with battery metadata |
| Vehicle manufacturer | OEM | Receives packs from assembler |
| Vehicle buyer | OWNER | Receives packs from OEM, uploads documents |
| Recycling facility | RECYCLER | Receives end-of-life packs, closes passports |
| Government authority | REGULATOR | Flags stolen packs (freezes transfers) |
| System administrator | ADMIN | Grants and revokes all roles |

## Deliverables

1. Deployed and verified smart contract on Sepolia
2. Python FastAPI backend with event indexer and IPFS integration
3. Next.js frontend with MetaMask wallet connection
4. Documentation (this file, TECHNICAL.md, README.md)
5. Git repository with full source code
6. Demo showing full passport lifecycle

## Course

dApp Development with Python — Atria University, Bengaluru
Faculty: Mr. Pavan Kumar N
