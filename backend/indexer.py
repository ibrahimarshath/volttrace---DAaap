"""Event indexer — polls eth_getLogs and stores in SQLite, broadcasts via WebSocket."""

import asyncio
import json
import logging
from web3 import Web3
from config import RPC_URL, CONTRACT_ADDRESS
from abi import VOLTTRACE_ABI
from database import get_last_synced_block, set_last_synced_block, insert_event

logger = logging.getLogger("indexer")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=VOLTTRACE_ABI)

# Collect event signatures we care about
EVENT_NAMES = ["PassportCreated", "StageChanged", "StolenFlagChanged", "DocumentAdded"]
EVENT_NAMES = ["PassportCreated", "StageAdvanced", "PackFlaggedStolen", "DocumentAdded", "PassportClosed"]

# WebSocket subscribers
ws_subscribers: set = set()

POLL_INTERVAL = 4  # seconds
MAX_BLOCK_RANGE = 10000  # Alchemy allows larger ranges but stay safe
# Deploy block of VoltTrace on Sepolia (approximate — avoids scanning from genesis)
DEPLOY_BLOCK = 9_400_000


async def broadcast(message: dict):
    """Send to all connected WebSocket clients."""
    dead = set()
    for ws in ws_subscribers:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    ws_subscribers -= dead


async def process_logs(from_block: int, to_block: int) -> int:
    """Fetch and process logs in the given range. Returns count of new events."""
    count = 0
    try:
        logs = w3.eth.get_logs({
            "address": CONTRACT_ADDRESS,
            "fromBlock": from_block,
            "toBlock": to_block,
        })
    except Exception as e:
        logger.warning(f"get_logs failed ({from_block}-{to_block}): {e}")
        return 0

    for log in logs:
        tx_hash = log["transactionHash"].hex()
        block_number = log["blockNumber"]
        log_index = log["logIndex"]

        # Try to decode against our known events
        for name, event_abi in EVENT_ABIS.items():
            try:
                decoded = event_abi().process_log(log)
                token_id = decoded["args"].get("tokenId")
                data = json.dumps({k: (v.hex() if isinstance(v, bytes) else v)
                                   for k, v in decoded["args"].items()})

                inserted = await insert_event(
                    event_name=name,
                    token_id=token_id,
                    tx_hash=tx_hash,
                    block_number=block_number,
                    log_index=log_index,
                    data=data,
                )
                if inserted:
                    count += 1
                    await broadcast({
                        "type": "event",
                        "event": name,
                        "tokenId": token_id,
                        "txHash": tx_hash,
                        "blockNumber": block_number,
                        "data": json.loads(data),
                    })
                break  # matched an event
            except Exception:
                continue  # not this event type
    return count


async def run_indexer():
    """Main indexer loop — runs forever, polling every POLL_INTERVAL seconds."""
    logger.info("Indexer starting...")

    last_block = await get_last_synced_block()
    if last_block is None:
        last_block = DEPLOY_BLOCK
        await set_last_synced_block(last_block)
        logger.info(f"First run — starting from block {last_block}")

    while True:
        try:
            current_block = w3.eth.block_number
            if last_block >= current_block:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            # Process in chunks to respect RPC limits
            from_block = last_block + 1
            to_block = min(from_block + MAX_BLOCK_RANGE - 1, current_block)

            count = await process_logs(from_block, to_block)
            if count > 0:
                logger.info(f"Indexed {count} events in blocks {from_block}-{to_block}")

            await set_last_synced_block(to_block)
            last_block = to_block

            # If we caught up, sleep; otherwise continue immediately
            if to_block >= current_block:
                await asyncio.sleep(POLL_INTERVAL)

        except Exception as e:
            logger.error(f"Indexer error: {e}")
            await asyncio.sleep(POLL_INTERVAL)
