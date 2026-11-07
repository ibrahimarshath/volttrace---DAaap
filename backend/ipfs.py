"""IPFS upload via Pinata."""

import httpx
from config import PINATA_JWT

PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"


async def upload_to_pinata(file_bytes: bytes, filename: str) -> dict:
    """Upload a file to IPFS via Pinata. Returns {cid, uri}."""
    if not PINATA_JWT:
        raise ValueError("PINATA_JWT not configured in .env")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            PINATA_URL,
            headers={"Authorization": f"Bearer {PINATA_JWT}"},
            files={"file": (filename, file_bytes)},
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
        cid = data["IpfsHash"]
        return {
            "cid": cid,
            "uri": f"ipfs://{cid}",
            "gateway": f"https://gateway.pinata.cloud/ipfs/{cid}",
        }
