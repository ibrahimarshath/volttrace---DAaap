"""Thin wrapper around the VoltTrace contract for read-only calls."""

import httpx
from web3 import Web3
from config import RPC_URL, CONTRACT_ADDRESS
from abi import VOLTTRACE_ABI

w3 = Web3(Web3.HTTPProvider(RPC_URL))
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=VOLTTRACE_ABI)

STAGE_NAMES = ["Assembled", "WithOEM", "WithOwner", "WithRecycler", "Closed"]

ROLE_HASHES = {
    "ADMIN_ROLE":     "0x0000000000000000000000000000000000000000000000000000000000000000",
    "ASSEMBLER_ROLE": Web3.keccak(text="ASSEMBLER_ROLE").hex(),
    "OEM_ROLE":       Web3.keccak(text="OEM_ROLE").hex(),
    "OWNER_ROLE":     Web3.keccak(text="OWNER_ROLE").hex(),
    "RECYCLER_ROLE":  Web3.keccak(text="RECYCLER_ROLE").hex(),
    "REGULATOR_ROLE": Web3.keccak(text="REGULATOR_ROLE").hex(),
}

IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/"


def _ipfs_to_http(uri: str) -> str:
    """Convert ipfs:// URI to an HTTP gateway URL."""
    if uri.startswith("ipfs://"):
        return IPFS_GATEWAY + uri[7:]
    return uri


def _fetch_metadata(uri: str) -> dict:
    """Fetch JSON metadata from IPFS. Returns {} on failure."""
    try:
        url = _ipfs_to_http(uri)
        resp = httpx.get(url, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def get_total_minted() -> int:
    return contract.functions.totalMinted().call()


def get_passport(token_id: int) -> dict:
    # Contract returns: (batteryId, stage, stolen, createdAt)
    result = contract.functions.getPassport(token_id).call()
    owner = get_owner_of(token_id)
    token_uri = get_token_uri(token_id)

    # Fetch metadata from IPFS to get model, serial, capacity, chemistry
    meta = _fetch_metadata(token_uri)
    attrs = {}
    for a in meta.get("attributes", []):
        attrs[a.get("trait_type", "")] = a.get("value", "")

    return {
        "tokenId": token_id,
        "batteryId": result[0],
        "model": attrs.get("Model", result[0]),
        "serialNumber": attrs.get("Serial Number", ""),
        "capacity": int(attrs.get("Capacity (Wh)", 0)),
        "chemistry": attrs.get("Chemistry", ""),
        "stage": STAGE_NAMES[result[1]] if result[1] < len(STAGE_NAMES) else str(result[1]),
        "stageIndex": result[1],
        "stolen": result[2],
        "createdAt": result[3],
        "currentOwner": owner,
        "tokenURI": token_uri,
    }


def get_documents(token_id: int) -> list[dict]:
    docs = contract.functions.getDocuments(token_id).call()
    return [
        {
            "docHash": "0x" + d[0].hex(),
            "uri": d[1],
            "addedBy": d[2],
            "addedAt": d[3],
        }
        for d in docs
    ]


def get_roles(address: str) -> list[str]:
    """Return list of role names the address holds."""
    addr = Web3.to_checksum_address(address)
    roles = []
    for name, role_hash in ROLE_HASHES.items():
        try:
            has = contract.functions.hasRole(
                bytes.fromhex(role_hash[2:]) if role_hash.startswith("0x") else bytes.fromhex(role_hash),
                addr
            ).call()
            if has:
                roles.append(name.replace("_ROLE", ""))
        except Exception:
            continue
    return roles


def get_token_uri(token_id: int) -> str:
    return contract.functions.tokenURI(token_id).call()


def get_owner_of(token_id: int) -> str:
    return contract.functions.ownerOf(token_id).call()
