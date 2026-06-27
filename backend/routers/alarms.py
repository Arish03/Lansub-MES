"""Alarms router."""

from fastapi import APIRouter, Depends, Query
from database import get_db
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/alarms", tags=["alarms"])


@router.get("/")
async def list_alarms(
    severity: str = Query(None),
    acknowledged: bool = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {}
    if severity:
        query["severity"] = severity.upper()
    if acknowledged is not None:
        query["acknowledged"] = acknowledged

    alarms = await db.alarms.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    for a in alarms:
        a["_id"] = str(a["_id"])
    return alarms


@router.put("/{alarm_id}/acknowledge")
async def acknowledge_alarm(alarm_id: str, current_user=Depends(get_current_user)):
    from bson import ObjectId
    db = get_db()
    result = await db.alarms.update_one(
        {"_id": ObjectId(alarm_id)},
        {"$set": {"acknowledged": True, "acknowledged_by": current_user["username"], "acknowledged_at": datetime.utcnow()}},
    )
    return {"modified": result.modified_count}


@router.get("/summary")
async def alarm_summary(current_user=Depends(get_current_user)):
    db = get_db()
    critical = await db.alarms.count_documents({"severity": "CRITICAL", "acknowledged": False})
    warning = await db.alarms.count_documents({"severity": "WARNING", "acknowledged": False})
    total = await db.alarms.count_documents({"acknowledged": False})
    return {"critical_count": critical, "warning_count": warning, "total_unacknowledged": total}
