# VoltTrace — Technical Architecture

## Overview

VoltTrace is a three-tier decentralized application:

1. **Smart Contract** (on-chain) — source of truth for passport state
2. **Backend** (off-chain) — reads the chain, indexes events, proxies IPFS
3. **Frontend** (client) — UI + MetaMask wallet for signing transactions

All write operations (create, transfer, flag, close, add document) are signed by the user's MetaMask wallet and sent directly to the contract. The backend never holds private keys — it is read-only for blockchain data.

## Smart Contract

**File:** `contracts/VoltTrace.sol`
**Address:** `0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e` (Sepolia)
**Compiler:** Solidity 0.8.24
**Dependencies:** OpenZeppelin ERC721URIStorage, AccessControl

### Data Model

```solidity
struct Passport {
    string  batteryId;   // Unique battery identifier
    Stage   stage;       // Assembled | WithOEM | WithOwner | WithRecycler | Closed
    bool    stolen;      // Frozen if true — no transfers allowed
    uint64  createdAt;   // Block timestamp at creation
}

struct Document {
    bytes32 docHash;     // keccak256 hash of the IPFS CID
    string  uri;         // IPFS URI (ipfs://Qm...)
    address addedBy;     // Who uploaded the document
    uint64  addedAt;     // Block timestamp
}
```

### Roles (AccessControl)

```
DEFAULT_ADMIN_ROLE  = 0x00  (deployer)
ASSEMBLER_ROLE      = keccak256("ASSEMBLER_ROLE")
OEM_ROLE            = keccak256("OEM_ROLE")
OWNER_ROLE          = keccak256("OWNER_ROLE")
RECYCLER_ROLE       = keccak256("RECYCLER_ROLE")
REGULATOR_ROLE      = keccak256("REGULATOR_ROLE")
```

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `createPassport(batteryId, uri)` | ASSEMBLER | Mints NFT with IPFS metadata URI |
| `transferFrom(from, to, tokenId)` | Current owner | Advances stage; recipient must have next role |
| `flagStolen(tokenId)` | REGULATOR | Sets `stolen = true`, freezes transfers |
| `closePassport(tokenId)` | RECYCLER | Marks passport as Closed (end of life) |
| `addDocument(tokenId, docHash, uri)` | NFT owner | Attaches document hash + IPFS URI |
| `getPassport(tokenId)` | Public | Returns `(batteryId, stage, stolen, createdAt)` |
| `getDocuments(tokenId)` | Public | Returns array of Document structs |

### Stage Transitions

```
transferFrom enforces:
  Assembled   → WithOEM       (recipient must have OEM_ROLE)
  WithOEM     → WithOwner     (recipient must have OWNER_ROLE)
  WithOwner   → WithRecycler  (recipient must have RECYCLER_ROLE)
  WithRecycler / Closed → revert
  stolen == true → revert
```

### Events

- `PassportCreated(tokenId, batteryId, assembler)`
- `StageAdvanced(tokenId, fromStage, toStage, newHolder)`
- `DocumentAdded(tokenId, docHash, uri, addedBy)`
- `PackFlaggedStolen(tokenId, regulator)`
- `PassportClosed(tokenId, recycler)`

### Custom Errors

The contract uses custom errors instead of `require` strings for gas efficiency:
`EmptyBatteryId`, `DuplicateBatteryId`, `RecipientNotApproved`, `InvalidTransition`, `PassportIsStolen`, `PassportIsClosed`, `AlreadyFlaggedStolen`, `NotPassportHolder`, `NotReadyForClosure`, `InvalidDocument`, `BurnNotAllowed`

### Security Features

- **Role-based access** — each action requires a specific role; no single wallet can do everything
- **Stolen battery lockdown** — flagged packs cannot be transferred or closed, preventing stolen batteries from re-entering the supply chain
- **Document integrity** — `keccak256` hash stored on-chain ensures documents cannot be tampered with after upload
- **No burn** — passports cannot be destroyed, preserving the full audit trail
- **Custom errors** — gas-efficient reverts with descriptive selectors

## Backend

**Stack:** Python 3.12, FastAPI, Web3.py, aiosqlite, httpx

### Modules

| File | Responsibility |
|------|---------------|
| `main.py` | FastAPI app — REST routes, WebSocket endpoint, CORS, lifespan |
| `contract.py` | Web3.py reads — `getPassport`, `getDocuments`, `ownerOf`, `tokenURI`, IPFS metadata fetch |
| `abi.py` | Full contract ABI (functions + events) |
| `indexer.py` | Block scanner — polls new blocks, decodes event logs, stores in SQLite, notifies WebSocket subscribers |
| `database.py` | SQLite via aiosqlite — `events` table with `(block, tx_hash, event_name, token_id, data)` |
| `ipfs.py` | Pinata upload — accepts file bytes, pins via Pinata API, returns `{cid, uri}` |
| `config.py` | Reads `.env` — `RPC_URL`, `CONTRACT_ADDRESS`, `PINATA_JWT`, `CORS_ORIGINS` |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/passports` | List all passports (reads `totalMinted`, loops `getPassport`) |
| GET | `/api/passport/{id}` | Single passport detail + documents + owner + metadata |
| POST | `/api/ipfs/upload` | Upload file to Pinata, returns `{cid, uri}` |
| GET | `/api/events` | Query indexed events (optional `token_id` filter) |
| WS | `/ws` | Real-time event stream for frontend |

### Event Indexer

The indexer runs as a background `asyncio` task on startup:

1. Reads last processed block from SQLite
2. Fetches new blocks from Alchemy RPC
3. Decodes VoltTrace event logs using the ABI
4. Stores events in SQLite
5. Pushes events to all WebSocket subscribers
6. Sleeps 5 seconds, repeats

Start block is set to `9_400_000` (before contract deployment) to avoid scanning from genesis.

### IPFS Flow

```
Frontend file input
    → POST /api/ipfs/upload (multipart form)
    → Backend pins to Pinata via JWT auth
    → Returns {cid: "Qm...", uri: "ipfs://Qm..."}
    → Frontend computes keccak256(cid) for docHash
    → Frontend calls contract.addDocument(tokenId, docHash, uri)
```

## Frontend

**Stack:** Next.js 15, TypeScript, Tailwind CSS, ethers.js v6

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Dashboard — passport list + create form |
| `/passport/[id]` | `src/app/passport/[id]/page.tsx` | Detail — stage bar, actions, documents |
| `/lookup` | `src/app/lookup/page.tsx` | Public lookup by token ID |

### Components

| Component | Description |
|-----------|-------------|
| `WalletButton` | MetaMask connect/disconnect, shows address + role badge |
| `StageBar` | Visual 5-step progress indicator for lifecycle stages |

### Libraries

| File | Description |
|------|-------------|
| `src/lib/wallet.ts` | `connectWallet()` — requests MetaMask accounts, returns `{signer, address}` |
| `src/lib/contract.ts` | Contract address + human-readable ABI for write functions |
| `src/lib/api.ts` | `getPassports()`, `getPassport(id)`, `uploadToIPFS(file)` — backend API calls |

### Wallet Integration

- Users sign every write transaction with MetaMask (custody model — backend holds no keys)
- Frontend creates an ethers.js `Contract` instance with the user's `JsonRpcSigner`
- Role badge reads from the backend which role the connected address has
- Network validation ensures Sepolia (chain ID 11155111)

### Transaction Flow (example: create passport)

```
1. User fills battery ID + metadata form
2. Frontend uploads metadata JSON to backend → Pinata → gets IPFS URI
3. Frontend calls contract.createPassport(batteryId, uri) via MetaMask
4. MetaMask prompts user to sign
5. Transaction mined on Sepolia
6. Indexer picks up PassportCreated event
7. WebSocket pushes event to frontend
8. Dashboard re-fetches and shows new passport
```

## Deployment

### Contract Deployment

```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/VoltTrace.ts --network sepolia
npx hardhat run scripts/grant-roles.ts --network sepolia
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
npx hardhat test    # Runs test/VoltTrace.test.ts
```

Tests cover: passport creation, stage transitions, role enforcement, stolen flag, document addition, edge cases (duplicate battery IDs, unauthorized access, closed passport operations).
