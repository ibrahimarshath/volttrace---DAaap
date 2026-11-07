# VoltTrace — EV Battery Passport dApp

A full-stack decentralized application for tracking EV battery pack lifecycles on Ethereum. Each battery gets an NFT-based passport that records its journey from assembly to recycling, with role-based access control and IPFS document storage.

**Contract:** [`0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e`](https://sepolia.etherscan.io/address/0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e) (Sepolia Testnet) — [Verified Source (Blockscout)](https://eth-sepolia.blockscout.com/address/0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e#code)

[Verified Source (Blockscout)](https://eth-sepolia.blockscout.com/address/0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e#code)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js     │────▶│  FastAPI      │────▶│  Ethereum    │
│  Frontend    │◀────│  Backend     │◀────│  (Sepolia)   │
│  + MetaMask  │     │  + Indexer   │     │  VoltTrace   │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Pinata     │
                    │   (IPFS)     │
                    └──────────────┘
```

- **Smart Contract** (Solidity) — ERC-721 NFT with AccessControl, 5 lifecycle stages, stolen-flag, document attachments
- **Backend** (Python FastAPI) — REST API reads blockchain state, indexes events into SQLite, proxies IPFS uploads to Pinata
- **Frontend** (Next.js + TypeScript) — Dashboard, passport detail pages, MetaMask wallet signing for all write operations

## Lifecycle Stages

```
Assembled → WithOEM → WithOwner → WithRecycler → Closed
```

Each transfer advances the stage. A regulator can flag a pack as stolen at any point, which freezes all transfers.

## Roles

| Role | Can Do |
|------|--------|
| ADMIN | Grant/revoke all roles |
| ASSEMBLER | Create new passports |
| OEM | Receive from assembler |
| OWNER | Receive from OEM |
| RECYCLER | Receive from owner, close passport |
| REGULATOR | Flag packs as stolen |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- MetaMask browser extension (connected to Sepolia)
- Sepolia ETH for gas (use a faucet)

### 1. Clone and install

```bash
git clone https://github.com/ibrahimarshath/volttrace---DAaap.git
cd volttrace---DAaap
npm install
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your RPC_URL, CONTRACT_ADDRESS, PINATA_JWT, CORS_ORIGINS
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — connect MetaMask to Sepolia and start creating passports.

### 4. Smart Contract (already deployed)

The contract is already deployed at `0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e`. To redeploy:

```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/VoltTrace.ts --network sepolia
npx hardhat run scripts/grant-roles.ts --network sepolia
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Alchemy/Infura Sepolia RPC endpoint |
| `CONTRACT_ADDRESS` | Deployed VoltTrace contract address |
| `PINATA_JWT` | Pinata API JWT for IPFS uploads |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `http://localhost:3000`) |

### Hardhat (root `.env`)

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Sepolia RPC URL |
| `PRIVATE_KEY` | Deployer wallet private key |
| `ETHERSCAN_API_KEY` | For contract verification |

## Project Structure

```
├── contracts/VoltTrace.sol          # Solidity smart contract
├── backend/
│   ├── main.py                      # FastAPI routes + WebSocket
│   ├── contract.py                  # Web3.py blockchain reads + IPFS fetch
│   ├── abi.py                       # Contract ABI
│   ├── indexer.py                   # Event scanner (blocks → SQLite)
│   ├── database.py                  # SQLite event store
│   ├── ipfs.py                      # Pinata upload helper
│   ├── config.py                    # Environment config
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/app/page.tsx             # Dashboard — list + create passports
│   ├── src/app/passport/[id]/       # Passport detail — actions + documents
│   ├── src/components/StageBar.tsx   # Visual lifecycle progress bar
│   ├── src/components/WalletButton.tsx # MetaMask connect/disconnect
│   ├── src/lib/contract.ts          # Contract address + write ABI
│   ├── src/lib/wallet.ts            # MetaMask signer helper
│   └── src/lib/api.ts               # Backend API client
├── scripts/
│   ├── grant-roles.ts               # Assign roles to wallets
│   ├── check-roles.ts               # Verify role assignments
│   └── demo.ts                      # CLI demo script
├── test/VoltTrace.test.ts           # Hardhat unit tests
├── docs/
│   ├── SCOPE.md                     # Project scope
│   └── TECHNICAL.md                 # Technical architecture
└── hardhat.config.ts                # Hardhat network config
```

## Testing

```bash
npx hardhat test
```

## Demo Video

<!-- Add your demo video link here -->
_Coming soon_

## Tech Stack

- **Blockchain:** Solidity 0.8.24, OpenZeppelin (ERC-721, AccessControl), Hardhat, Sepolia testnet
- **Backend:** Python 3.12, FastAPI, Web3.py, aiosqlite, httpx
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, ethers.js v6
- **Storage:** Pinata (IPFS) for metadata and documents
- **Wallet:** MetaMask (browser extension)

## Author

Ibrahim Arshath — Atria University, Bengaluru
Course: dApp Development with Python | Faculty: Mr. Pavan Kumar N
