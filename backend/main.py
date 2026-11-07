"""VoltTrace FastAPI backend — REST + WebSocket for the EV battery passport dApp."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from contract import (
    get_total_minted, get_passport, get_documents, get_roles,
    get_token_uri, get_owner_of, STAGE_NAMES
)
from database import init_db, get_events
from indexer import run_indexer, ws_subscribers
from ipfs import upload_to_pinata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("volttrace")


# ---------------------------------------------------------------------------
# Lifespan — start DB + indexer on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    indexer_task = asyncio.create_task(run_indexer())
    logger.info("VoltTrace backend ready")
    yield
    indexer_task.cancel()


app = FastAPI(
    title="VoltTrace API",
    description="Backend for the VoltTrace EV battery passport dApp",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "totalMinted": get_total_minted()}


# ---------------------------------------------------------------------------
# Passport endpoints
# ---------------------------------------------------------------------------
@app.get("/api/passports/count")
async def passport_count():
    return {"count": get_total_minted()}


@app.get("/api/passports/{token_id}")
async def passport_detail(token_id: int):
    try:
        passport = get_passport(token_id)
        passport["documents"] = get_documents(token_id)
        return passport
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Passport #{token_id} not found: {e}")


@app.get("/api/passports")
async def list_passports(limit: int = Query(20, ge=1, le=100)):
    """List all passports (most recent first). Token IDs start at 1."""
    total = get_total_minted()
    passports = []
    # Token IDs are 1-based: 1, 2, ..., total
    start = max(1, total - limit + 1)
    for i in range(total, start - 1, -1):
        try:
            passports.append(get_passport(i))
        except Exception:
            continue
    return {"total": total, "passports": passports}


# ---------------------------------------------------------------------------
# Role check
# ---------------------------------------------------------------------------
@app.get("/api/roles/{address}")
async def check_roles(address: str):
    try:
        roles = get_roles(address)
        return {"address": address, "roles": roles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Events (from SQLite index)
# ---------------------------------------------------------------------------
@app.get("/api/events")
async def list_events(
    token_id: int | None = None,
    event_name: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    events = await get_events(token_id=token_id, event_name=event_name, limit=limit)
    # Parse the JSON data field
    for e in events:
        if isinstance(e.get("data"), str):
            e["data"] = json.loads(e["data"])
    return {"events": events}


# ---------------------------------------------------------------------------
# IPFS upload
# ---------------------------------------------------------------------------
@app.post("/api/ipfs/upload")
async def ipfs_upload(file: UploadFile = File(...)):
    """Upload a file to IPFS via Pinata. Returns CID and gateway URL."""
    try:
        content = await file.read()
        result = await upload_to_pinata(content, file.filename or "document")
        return result
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


# ---------------------------------------------------------------------------
# Stage names helper
# ---------------------------------------------------------------------------
@app.get("/api/stages")
async def stages():
    return {"stages": STAGE_NAMES}


# ---------------------------------------------------------------------------
# WebSocket — live event feed
# ---------------------------------------------------------------------------
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    ws_subscribers.add(websocket)
    logger.info(f"WebSocket client connected ({len(ws_subscribers)} total)")
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        ws_subscribers.discard(websocket)
        logger.info(f"WebSocket client disconnected ({len(ws_subscribers)} total)")


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
