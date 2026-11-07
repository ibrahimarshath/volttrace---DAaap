"""VoltTrace contract ABI — read-only functions + events."""

VOLTTRACE_ABI = [
    # ── Read functions ──────────────────────────────────────────────
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getPassport",
        "outputs": [
            {"internalType": "string",  "name": "batteryId",  "type": "string"},
            {"internalType": "uint8",   "name": "stage",      "type": "uint8"},
            {"internalType": "bool",    "name": "stolen",     "type": "bool"},
            {"internalType": "uint64",  "name": "createdAt",  "type": "uint64"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getDocuments",
        "outputs": [
            {
                "components": [
                    {"internalType": "bytes32", "name": "docHash",  "type": "bytes32"},
                    {"internalType": "string",  "name": "uri",      "type": "string"},
                    {"internalType": "address", "name": "addedBy",  "type": "address"},
                    {"internalType": "uint64",  "name": "addedAt",  "type": "uint64"},
                ],
                "internalType": "struct VoltTrace.Document[]",
                "name": "",
                "type": "tuple[]",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalMinted",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "role",    "type": "bytes32"},
            {"internalType": "address", "name": "account", "type": "address"},
        ],
        "name": "hasRole",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getStage",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "batteryId", "type": "string"}],
        "name": "isBatteryIdUsed",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    # ── Events ──────────────────────────────────────────────────────
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "uint256", "name": "tokenId",   "type": "uint256"},
            {"indexed": False, "internalType": "string",  "name": "batteryId", "type": "string"},
            {"indexed": True,  "internalType": "address", "name": "assembler", "type": "address"},
        ],
        "name": "PassportCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "uint256", "name": "tokenId",   "type": "uint256"},
            {"indexed": False, "internalType": "uint8",   "name": "from",      "type": "uint8"},
            {"indexed": False, "internalType": "uint8",   "name": "to",        "type": "uint8"},
            {"indexed": True,  "internalType": "address", "name": "newHolder", "type": "address"},
        ],
        "name": "StageAdvanced",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "uint256", "name": "tokenId",   "type": "uint256"},
            {"indexed": False, "internalType": "bytes32", "name": "docHash",   "type": "bytes32"},
            {"indexed": False, "internalType": "string",  "name": "uri",       "type": "string"},
            {"indexed": True,  "internalType": "address", "name": "addedBy",   "type": "address"},
        ],
        "name": "DocumentAdded",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId",   "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "regulator", "type": "address"},
        ],
        "name": "PackFlaggedStolen",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId",  "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "recycler", "type": "address"},
        ],
        "name": "PassportClosed",
        "type": "event",
    },
]
