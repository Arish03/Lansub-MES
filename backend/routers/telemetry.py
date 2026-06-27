"""Telemetry router — historical trend data."""

from fastapi import APIRouter, Depends, Query
from database import get_db
from routers.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


@router.get("/{asset_id}")
async def get_telemetry(
    asset_id: str,
    hours: int = Query(1, ge=1, le=168),
    limit: int = Query(200, ge=10, le=1000),
    current_user=Depends(get_current_user),
):
    db = get_db()
    since = datetime.utcnow() - timedelta(hours=hours)
    docs = await db.telemetry.find(
        {"asset_id": asset_id, "timestamp": {"$gte": since}},
        {"_id": 0, "raw": 0},
    ).sort("timestamp", 1).limit(limit).to_list(limit)

    # Convert datetimes to ISO strings
    for d in docs:
        if isinstance(d.get("timestamp"), datetime):
            d["timestamp"] = d["timestamp"].isoformat()
    return docs


@router.get("/latest/all")
async def get_latest_all(current_user=Depends(get_current_user)):
    """Get the latest telemetry record for all assets."""
    db = get_db()
    asset_ids = ["MOTOR_01", "GEARBOX_01", "COMPRESSOR_01"]
    result = {}
    for aid in asset_ids:
        cursor = db.telemetry.find(
            {"asset_id": aid},
            {"_id": 0, "raw": 0},
        ).sort("timestamp", -1).limit(1)
        docs = await cursor.to_list(1)
        doc = docs[0] if docs else None
        if doc and isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"].isoformat()
        result[aid] = doc
    return result
