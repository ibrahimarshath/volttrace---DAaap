"""SQLite event index — stores on-chain events for fast queries."""

import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "events.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_name TEXT NOT NULL,
                token_id INTEGER,
                tx_hash TEXT NOT NULL UNIQUE,
                block_number INTEGER NOT NULL,
                log_index INTEGER NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sync_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_block INTEGER NOT NULL
            )
        """)
        await db.commit()


async def get_last_synced_block() -> int | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT last_block FROM sync_state WHERE id = 1")
        row = await cursor.fetchone()
        return row[0] if row else None


async def set_last_synced_block(block: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sync_state (id, last_block) VALUES (1, ?) "
            "ON CONFLICT(id) DO UPDATE SET last_block = excluded.last_block",
            (block,),
        )
        await db.commit()


async def insert_event(event_name: str, token_id: int | None, tx_hash: str,
                       block_number: int, log_index: int, data: str) -> bool:
    """Insert event, returns False if duplicate (tx_hash already exists)."""
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute(
                "INSERT INTO events (event_name, token_id, tx_hash, block_number, log_index, data) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (event_name, token_id, tx_hash, block_number, log_index, data),
            )
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False  # duplicate


async def get_events(token_id: int | None = None, event_name: str | None = None,
                     limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = "SELECT * FROM events WHERE 1=1"
        params: list = []
        if token_id is not None:
            query += " AND token_id = ?"
            params.append(token_id)
        if event_name:
            query += " AND event_name = ?"
            params.append(event_name)
        query += " ORDER BY block_number DESC, log_index DESC LIMIT ?"
        params.append(limit)
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
